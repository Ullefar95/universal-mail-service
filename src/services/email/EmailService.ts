import nodemailer, { Transporter, TransportOptions } from "nodemailer";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData, EmailStatus } from "../../types/email";
import { EmailError } from "../../errors/AppError";
import { SmtpSettings } from "../../models/SmtpSettings";

interface BaseSmtpConfig extends TransportOptions {
    auth: {
        user: string;
        pass: string;
    };
}

interface ServiceSmtpConfig extends BaseSmtpConfig {
    service: string;
}

interface CustomSmtpConfig extends BaseSmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    tls: {
        ciphers?: string;
        rejectUnauthorized: boolean;
        minVersion?: string;
    };
    debug?: boolean;
    logger?: boolean;
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    authMethod?: string;
}

type SmtpConfig = ServiceSmtpConfig | CustomSmtpConfig;

export class EmailService {
    private transporter: Transporter | null = null;
    private smtpConfig: SmtpConfig | null = null;
    private readonly templateService: TemplateService;
    private readonly queueService: QueueService;
    private readonly rateLimiter: RateLimiter;
    private readonly logger: Logger;
    private static instance: EmailService;
    private initialized: boolean = false;

    private constructor() {
        this.templateService = new TemplateService();
        this.queueService = new QueueService();
        this.rateLimiter = new RateLimiter();
        this.logger = new Logger();
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    /**
     * Initialize the SMTP transporter with settings from the database.
     */
    async init(): Promise<void> {
        try {
            const settings = await SmtpSettings.findOne();
            if (!settings) {
                throw new EmailError(
                    "SMTP settings not found in the database.",
                    "SMTP_SETTINGS_MISSING"
                );
            }

            // Simplified config based on whether we're using a service (like Gmail) or custom SMTP
            const config = settings.service
                ? ({
                      service: settings.service,
                      auth: {
                          user: settings.user,
                          pass: settings.pass,
                      },
                  } as ServiceSmtpConfig)
                : ({
                      host: settings.host,
                      port: settings.port,
                      secure: settings.secure,
                      auth: {
                          user: settings.user,
                          pass: settings.pass,
                      },
                      requireTLS: true,
                      tls: {
                          rejectUnauthorized: true,
                      },
                  } as CustomSmtpConfig);

            this.logger.info("Initializing email service", {
                service: settings.service ?? "custom SMTP",
                host: settings.host,
                port: settings.port,
            });

            if (this.transporter) {
                this.transporter.close();
            }

            this.transporter = nodemailer.createTransport(config);
            await this.transporter.verify();

            this.initialized = true;
            this.smtpConfig = config;
            this.logger.info("SMTP transporter initialized successfully");
        } catch (error) {
            this.initialized = false;
            this.transporter = null;
            this.logger.error("Failed to initialize SMTP transporter", {
                error: error instanceof Error ? error.message : error,
            });
            throw new EmailError(
                "Failed to initialize SMTP transporter",
                "SMTP_INIT_FAILED",
                error
            );
        }
    }

    /**
     * Ensure the service is initialized and the transporter is ready.
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            try {
                // Initialize Redis connection for rate limiting
                await this.rateLimiter.connect();

                // Initialize SMTP transport
                if (!this.transporter) {
                    const config = await this.getSmtpConfig();
                    this.transporter = nodemailer.createTransport(config);
                }

                this.initialized = true;
            } catch (error) {
                this.logger.error("Failed to initialize email service", {
                    error: error instanceof Error ? error.stack : String(error),
                });
                throw new EmailError(
                    "Failed to initialize email service",
                    "INITIALIZATION_FAILED",
                    error
                );
            }
        }
    }

    /**
     * Reload SMTP settings and reinitialize the transporter.
     */
    public async reloadSmtpSettings(): Promise<void> {
        this.logger.info("Reloading SMTP settings");

        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
        }

        this.initialized = false;
        await this.init();

        if (!this.initialized || !this.transporter) {
            throw new EmailError(
                "Failed to reinitialize SMTP transporter",
                "SMTP_REINIT_FAILED"
            );
        }
    }

    /**
     * Validate the email template with variables.
     */
    async validateTemplate(
        templateId: string,
        variables?: Record<string, any>
    ): Promise<void> {
        try {
            await this.templateService.validateVariables(
                templateId,
                variables ?? {}
            );
        } catch (error) {
            this.logger.error("Template validation failed", error);
            throw new EmailError(
                "Template validation failed",
                "TEMPLATE_VALIDATION_FAILED",
                error
            );
        }
    }

    /**
     * Get the status of an email job.
     */
    async getEmailStatus(jobId: string): Promise<EmailStatus | null> {
        try {
            const job = await this.queueService.getJob(jobId);
            if (!job) {
                return null;
            }

            return {
                jobId: job.id.toString(),
                status: job.status,
                completedAt: job.finishedOn
                    ? new Date(job.finishedOn)
                    : undefined,
                error: job.failedReason,
            };
        } catch (error) {
            this.logger.error("Failed to get email status", { jobId, error });
            throw new EmailError(
                "Failed to get email status",
                "EMAIL_STATUS_FAILED",
                error
            );
        }
    }

    /**
     * Send an email.
     */
    public async sendEmail(options: EmailOptions): Promise<string> {
        try {
            // Ensure initialization at the start
            await this.ensureInitialized();

            // Check rate limit
            try {
                await this.rateLimiter.checkLimit("email");
            } catch (error: unknown) {
                if (
                    error instanceof Error &&
                    error.message === "The client is closed"
                ) {
                    // Try to reconnect and check again
                    await this.rateLimiter.connect();
                    await this.rateLimiter.checkLimit("email");
                } else {
                    throw error;
                }
            }

            if (!options.to || !options.subject) {
                throw new EmailError(
                    "Missing required fields: to, subject",
                    "VALIDATION_ERROR"
                );
            }

            this.logger.info("Attempting to send email", {
                to: options.to,
                subject: options.subject,
                cc: options.cc,
                bcc: options.bcc,
            });

            const jobData: EmailJobData = {
                to: options.to,
                cc: options.cc,
                bcc: options.bcc,
                from: options.from,
                subject: options.subject,
                html: options.body?.html ?? "",
                text: options.body?.text ?? "",
                attachments: options.attachments,
            };

            try {
                await this.processEmailJob(jobData);
                return "Email sent successfully";
            } catch (error) {
                this.logger.error("Failed to process email job", {
                    error: error instanceof Error ? error.stack : String(error),
                    to: options.to,
                    subject: options.subject,
                });
                throw new EmailError(
                    "Failed to send email",
                    "EMAIL_SEND_FAILED",
                    error
                );
            }
        } catch (error) {
            this.logger.error("Email service error", {
                error: error instanceof Error ? error.stack : String(error),
            });
            throw error;
        }
    }

    /**
     * Process a queued email job or send a direct email.
     */
    private async processEmailJob(jobData: EmailJobData): Promise<void> {
        await this.ensureInitialized();

        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        this.logger.info("Preparing to send email", {
            to: jobData.to,
            subject: jobData.subject,
        });

        try {
            const formatAddresses = (addresses?: string | string[]): string =>
                Array.isArray(addresses)
                    ? addresses.join(", ")
                    : addresses ?? "";

            const from = jobData.from ?? (await this.getSenderAddress());
            const formattedFrom = from.includes("<")
                ? from
                : `Universal Mail Service <${from}>`;

            const mailOptions = {
                from: formattedFrom,
                to: formatAddresses(jobData.to),
                cc: formatAddresses(jobData.cc),
                bcc: formatAddresses(jobData.bcc),
                subject: jobData.subject,
                html: jobData.html,
                text: jobData.text,
                attachments: jobData.attachments?.map((attachment) => ({
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                })),
            };

            const result = await this.transporter.sendMail(mailOptions);

            this.logger.info("Email sent successfully", {
                messageId: result.messageId,
                response: result.response,
            });
        } catch (error) {
            this.logger.error("Failed to send email", {
                error: error instanceof Error ? error.stack : String(error),
                config: this.getConfigForLogging(),
            });
            throw error;
        }
    }

    /**
     * Get the default sender address from SMTP settings.
     */
    private async getSenderAddress(): Promise<string> {
        const settings = await SmtpSettings.findOne();
        if (!settings?.from) {
            throw new EmailError(
                "Default sender address not configured",
                "DEFAULT_SENDER_MISSING"
            );
        }
        return settings.from;
    }

    private getConfigForLogging(): Record<string, any> {
        if (this.smtpConfig && "service" in this.smtpConfig) {
            return {
                service: this.smtpConfig.service,
                auth: { user: this.smtpConfig.auth.user },
            };
        }

        if (this.smtpConfig && "host" in this.smtpConfig) {
            return {
                host: this.smtpConfig.host,
                port: this.smtpConfig.port,
                secure: this.smtpConfig.secure,
            };
        }

        return { type: "No config available" };
    }

    private async getSmtpConfig(): Promise<SmtpConfig> {
        const settings = await SmtpSettings.findOne();
        if (!settings) {
            throw new EmailError(
                "SMTP settings not found in the database.",
                "SMTP_SETTINGS_MISSING"
            );
        }

        return settings.service
            ? {
                  service: settings.service,
                  auth: {
                      user: settings.user,
                      pass: settings.pass,
                  },
              }
            : {
                  host: settings.host,
                  port: settings.port,
                  secure: settings.secure,
                  auth: {
                      user: settings.user,
                      pass: settings.pass,
                  },
                  requireTLS: true,
                  tls: {
                      rejectUnauthorized: true,
                  },
              };
    }
}
