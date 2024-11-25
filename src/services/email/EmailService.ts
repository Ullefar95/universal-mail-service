import nodemailer, { Transporter } from "nodemailer";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData, EmailStatus } from "../../types/email";
import { EmailError } from "../../errors/AppError";
import { SmtpSettings } from "../../models/SmtpSettings";

export class EmailService {
    private transporter: Transporter | null = null;
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
        if (this.initialized) {
            this.logger.info("SMTP transporter already initialized.");
            return;
        }

        try {
            const settings = await SmtpSettings.findOne();
            if (!settings) {
                throw new EmailError(
                    "SMTP settings not found in the database.",
                    "SMTP_SETTINGS_MISSING"
                );
            }

            this.transporter = nodemailer.createTransport({
                host: settings.host,
                port: settings.port,
                secure: settings.secure,
                auth: {
                    user: settings.user,
                    pass: settings.pass,
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                connectionTimeout: 6000000, // Timeout for forbindelser
                greetingTimeout: 3000000, // Timeout for EHLO/HELO hilsen
                socketTimeout: 6000000, // Timeout for socket-aktivitet
            });

            this.logger.info("SMTP transporter initialized successfully.");
            this.initialized = true;
        } catch (error) {
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
     * Ensure the service is initialized.
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.init();
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

            const html = options.templateId
                ? await this.templateService.processTemplate(
                      options.templateId,
                      options.variables ?? {}
                  )
                : options.body?.html;

            const text = options.body?.text;

            const jobData: EmailJobData = {
                to: options.to,
                cc: options.cc,
                bcc: options.bcc,
                subject: options.subject,
                html,
                text,
                attachments: options.attachments,
            };

            this.logger.info("Sending email with jobData", { jobData });

            await this.processEmailJob("direct", jobData);

            this.logger.info("Email sent successfully");

            return "direct";
        } catch (error) {
            this.logger.error("Failed to send email", {
                error: error instanceof Error ? error.message : error,
                to: options.to,
                subject: options.subject,
            });
            throw new EmailError(
                "Failed to send email",
                "EMAIL_SEND_FAILED",
                error
            );
        }
    }

    /**
     * Process a queued email job or send a direct email.
     */
    async processEmailJob(jobId: string, jobData: EmailJobData): Promise<void> {
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
            from: jobData.from,
        });

        try {
            const formatAddresses = (addresses?: string | string[]): string =>
                Array.isArray(addresses)
                    ? addresses.join(", ")
                    : addresses ?? "";

            await this.transporter.sendMail({
                from: jobData.from ?? (await this.getSenderAddress()),
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
            });

            this.logger.info("Email sent successfully", {
                jobId,
                to: jobData.to,
                subject: jobData.subject,
            });
        } catch (error) {
            this.logger.error("Failed to send email", {
                jobId,
                error: error instanceof Error ? error.message : error,
                to: jobData.to,
                subject: jobData.subject,
            });

            throw new EmailError(
                "Failed to process email job",
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
