import nodemailer, { Transporter, TransportOptions } from "nodemailer";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData, EmailStatus } from "../../types/email";
import { EmailError } from "../../errors/AppError";
import { SmtpSettings } from "../../models/SmtpSettings";

interface SmtpConfig extends TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    requireTLS: boolean;
    tls: {
        ciphers: string;
        rejectUnauthorized: boolean;
        minVersion: string;
    };
    debug?: boolean;
    logger?: boolean;
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    authMethod?: string;
}

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

            const config: SmtpConfig = {
                host: settings.host,
                port: settings.port,
                secure: false,
                auth: {
                    user: settings.user,
                    pass: settings.pass,
                },
                requireTLS: true,
                tls: {
                    ciphers: "SSLv3",
                    rejectUnauthorized: true,
                    minVersion: "TLSv1.2",
                },
                debug: true,
                logger: true,
                authMethod: "LOGIN",
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                socketTimeout: 30000,
            };

            this.logger.info("Initializing with config", {
                host: config.host,
                port: config.port,
                secure: config.secure,
                user: config.auth.user,
            });

            if (this.transporter) {
                this.logger.info("Closing existing transporter");
                this.transporter.close();
            }

            this.transporter = nodemailer.createTransport(config);

            try {
                await this.transporter.verify();
                this.logger.info("SMTP connection verified successfully");
                this.initialized = true;
            } catch (verifyError) {
                this.logger.error("SMTP verification failed", {
                    error:
                        verifyError instanceof Error
                            ? verifyError.message
                            : verifyError,
                    config: {
                        host: config.host,
                        port: config.port,
                        secure: config.secure,
                        user: config.auth.user,
                    },
                });
                throw new EmailError(
                    "SMTP verification failed",
                    "SMTP_VERIFICATION_FAILED",
                    verifyError
                );
            }

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
        try {
            if (!this.initialized || !this.transporter) {
                this.logger.info("Initializing email service");
                await this.init();
                return;
            }

            try {
                await this.transporter.verify();
            } catch (verifyError) {
                this.logger.warn(
                    "Transporter verification failed, reinitializing",
                    {
                        error:
                            verifyError instanceof Error
                                ? verifyError.message
                                : verifyError,
                    }
                );
                this.initialized = false;
                await this.init();
            }
        } catch (error) {
            this.logger.error("Failed to ensure initialization", {
                error: error instanceof Error ? error.message : error,
            });
            throw new EmailError(
                "Failed to ensure email service initialization",
                "INITIALIZATION_FAILED",
                error
            );
        }
    }

    /**
     * Reload SMTP settings dynamically.
     */
    async reloadSmtpSettings(): Promise<void> {
        this.transporter = null;
        this.initialized = false;
        await this.init();
        this.logger.info("SMTP settings reloaded dynamically.");
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
    async sendEmail(options: EmailOptions): Promise<string> {
        await this.ensureInitialized();

        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        try {
            await this.rateLimiter.checkLimit("email");

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
                subject: options.subject,
                html: options.body?.html,
                text: options.body?.text,
                attachments: options.attachments,
            };

            this.logger.info("Sending email with jobData", { jobData });

            await this.processEmailJob("direct", jobData);
            return "direct";
        } catch (error) {
            this.logger.error("Failed to send email", {
                error: error instanceof Error ? error.stack : error,
                to: options.to,
                subject: options.subject,
            });
            throw new EmailError(
                `Failed to send email: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                "EMAIL_SEND_FAILED",
                error
            );
        }
    }

    /**
     * Process a queued email job or send a direct email.
     */
    async processEmailJob(jobId: string, jobData: EmailJobData): Promise<void> {
        await this.ensureInitialized();

        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        this.logger.info("Preparing to send email", {
            jobId,
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
                : `"Universal Mail Service" <${from}>`;

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
                headers: {
                    "X-Priority": "3",
                    "X-MSMail-Priority": "Normal",
                    Importance: "Normal",
                    "X-Mailer": "Universal Mail Service",
                },
            };

            this.logger.info("Sending email with options", {
                ...mailOptions,
                html: mailOptions.html
                    ? "HTML content present"
                    : "No HTML content",
                text: mailOptions.text
                    ? "Text content present"
                    : "No text content",
            });

            const result = await this.transporter.sendMail(mailOptions);

            this.logger.info("Email sent successfully", {
                jobId,
                messageId: result.messageId,
                response: result.response,
            });
        } catch (error) {
            this.logger.error("Failed to send email", {
                jobId,
                error: error instanceof Error ? error.stack : error,
                config: {
                    host: this.smtpConfig?.host,
                    port: this.smtpConfig?.port,
                    secure: this.smtpConfig?.secure,
                },
            });

            throw new EmailError(
                `Failed to process email job: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                "EMAIL_JOB_FAILED",
                error
            );
        }
    }

    /**
     * Get the default sender address from SMTP settings.
     */
    private async getSenderAddress(): Promise<string> {
        const settings = await SmtpSettings.findOne();
        if (!settings || !settings.from) {
            throw new EmailError(
                "Default sender address not configured",
                "DEFAULT_SENDER_MISSING"
            );
        }
        return settings.from;
    }
}
