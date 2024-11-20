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

    constructor() {
        this.templateService = new TemplateService();
        this.queueService = new QueueService();
        this.rateLimiter = new RateLimiter();
        this.logger = new Logger();
    }

    /**
     * Initialize the transporter with SMTP settings.
     */
    async init(): Promise<void> {
        try {
            const settings = await SmtpSettings.findOne();
            if (!settings) {
                throw new Error("SMTP settings not found in the database.");
            }

            this.transporter = nodemailer.createTransport({
                host: settings.host,
                port: settings.port,
                secure: settings.secure,
                auth: {
                    user: settings.user,
                    pass: settings.pass,
                },
            });

            this.logger.info("SMTP transporter initialized successfully.");
        } catch (error) {
            this.logger.error("Failed to initialize SMTP transporter", {
                error,
            });
            throw new EmailError(
                "Failed to initialize SMTP transporter",
                "SMTP_INIT_FAILED",
                error
            );
        }
    }

    /**
     * Reload SMTP settings dynamically.
     */
    async reloadSmtpSettings(): Promise<void> {
        await this.init();
        this.logger.info("SMTP settings reloaded dynamically.");
    }

    /**
     * Validate a template's variables.
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
     * Fetch email job status.
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
        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        try {
            await this.rateLimiter.checkLimit("email");

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

            const jobId = await this.queueService.addJob("email", jobData);

            this.logger.info("Email queued successfully", {
                jobId,
                to: Array.isArray(options.to)
                    ? options.to.join(", ")
                    : options.to,
                subject: options.subject,
                templateId: options.templateId,
            });

            return jobId;
        } catch (error) {
            this.logger.error("Failed to queue email", {
                error,
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
     * Process a queued email job.
     */
    async processEmailJob(jobId: string, jobData: EmailJobData): Promise<void> {
        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

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
                error,
                to: jobData.to,
            });
            throw new EmailError(
                "Failed to process email job",
                "EMAIL_JOB_FAILED",
                error
            );
        }
    }

    /**
     * Get the default sender address.
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
