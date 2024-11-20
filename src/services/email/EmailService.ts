import nodemailer, { Transporter } from "nodemailer";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData } from "../../types/email";
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

    async reloadSmtpSettings(): Promise<void> {
        await this.init();
        this.logger.info("SMTP settings reloaded dynamically.");
    }

    async sendEmail(options: EmailOptions): Promise<string> {
        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        try {
            await this.rateLimiter.checkLimit("email");

            let html: string | undefined;
            let text: string | undefined;

            if (options.templateId) {
                html = await this.templateService.processTemplate(
                    options.templateId,
                    options.variables ?? {}
                );
            } else if (options.body) {
                html = options.body.html;
                text = options.body.text;
            }

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
                to: options.to,
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

    async processEmailJob(jobId: string, jobData: EmailJobData): Promise<void> {
        if (!this.transporter) {
            throw new EmailError(
                "SMTP transporter not initialized",
                "SMTP_NOT_INITIALIZED"
            );
        }

        try {
            const formatAddresses = (addresses?: string | string[]) =>
                Array.isArray(addresses) ? addresses.join(",") : addresses;

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
