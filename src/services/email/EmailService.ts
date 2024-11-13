// src/services/email/EmailService.ts
import nodemailer, { Transporter } from "nodemailer";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData } from "../../types/email"; // Removed unused EmailJob import
import { EmailError } from "../../errors/AppError";

interface EmailStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  completedAt?: Date;
  error?: string;
}

export class EmailService {
  private readonly transporter: Transporter;
  private readonly templateService: TemplateService;
  private readonly queueService: QueueService;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.templateService = new TemplateService();
    this.queueService = new QueueService();
    this.rateLimiter = new RateLimiter();
    this.logger = new Logger();
  }

  async validateTemplate(
    templateId: string,
    variables?: Record<string, any>
  ): Promise<void> {
    try {
      await this.templateService.validateVariables(templateId, variables || {});
    } catch (error) {
      throw new EmailError(
        "Template validation failed",
        "TEMPLATE_VALIDATION_FAILED",
        error instanceof Error ? error.message : error
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<string> {
    try {
      await this.rateLimiter.checkLimit("email");

      let html: string | undefined;
      let text: string | undefined;

      // Process template if provided
      if (options.templateId) {
        html = await this.templateService.processTemplate(
          options.templateId,
          options.variables ?? {}
        );
      } else if (options.body) {
        // Use direct content if templateId is not specified
        html = options.body.html;
        text = options.body.text;
      }

      // Create job data
      const jobData: EmailJobData = {
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html,
        text,
        attachments: options.attachments,
      };

      // Add job to queue
      const jobId = await this.queueService.addJob("email", jobData);

      this.logger.info("Email queued", {
        jobId,
        to: options.to,
        templateId: options.templateId,
      });

      return jobId;
    } catch (error) {
      this.logger.error("Failed to send email", {
        error,
        to: options.to,
        templateId: options.templateId,
      });
      throw error;
    }
  }

  async processEmailJob(jobId: string, jobData: EmailJobData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: jobData.to,
        cc: jobData.cc,
        bcc: jobData.bcc,
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
      });
    } catch (error) {
      this.logger.error("Failed to process email job", {
        error,
        jobId,
        to: jobData.to,
      });
      throw error;
    }
  }

  async getEmailStatus(jobId: string): Promise<EmailStatus | null> {
    try {
      const job = await this.queueService.getJob(jobId);

      if (!job) {
        return null;
      }

      const status: EmailStatus = {
        jobId: job.id.toString(),
        status: job.status,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        error: job.failedReason,
      };

      return status;
    } catch (error) {
      this.logger.error("Failed to get email status", { error, jobId });
      throw error;
    }
  }
}
