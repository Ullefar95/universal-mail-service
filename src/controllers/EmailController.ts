// src/controllers/EmailController.ts
import { Request, Response, NextFunction } from "express";
import { EmailService } from "../services/email/EmailService";
import { EmailError } from "../errors/AppError";
import { Logger } from "../utils/Logger";
import { EmailOptions } from "../types/email";

interface SendEmailRequest extends Request {
  body: EmailOptions;
}

interface SendBatchEmailRequest extends Request {
  body: EmailOptions[];
}

interface GetEmailStatusResponse {
  jobId: string;
  status: string;
  completedAt?: Date;
  error?: string;
}

export class EmailController {
  private readonly emailService: EmailService;
  private readonly logger: Logger;

  constructor() {
    this.emailService = new EmailService();
    this.logger = new Logger();
  }

  sendEmail = async (
    req: SendEmailRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const emailOptions = req.body;

      // Validate template if templateId is provided
      if (emailOptions.templateId) {
        await this.emailService.validateTemplate(
          emailOptions.templateId,
          emailOptions.variables
        );
      }

      const jobId = await this.emailService.sendEmail(emailOptions);

      this.logger.info("Email queued", { jobId });

      res.status(202).json({
        status: "success",
        message: "Email queued successfully",
        data: {
          jobId,
          estimatedDelivery: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes estimate
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        next(
          new EmailError("Failed to send email", "SEND_FAILED", {
            originalError: error.message,
          })
        );
      } else {
        next(error);
      }
    }
  };

  sendBatchEmail = async (
    req: SendBatchEmailRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const emails = req.body;

      if (!Array.isArray(emails)) {
        throw new EmailError("Invalid batch format", "INVALID_FORMAT");
      }

      if (emails.length > 100) {
        // Limit batch size
        throw new EmailError("Batch size too large", "BATCH_TOO_LARGE", {
          maxSize: 100,
          providedSize: emails.length,
        });
      }

      // Process emails in parallel
      const jobIds = await Promise.all(
        emails.map(async (email) => {
          if (email.templateId) {
            await this.emailService.validateTemplate(
              email.templateId,
              email.variables
            );
          }
          return this.emailService.sendEmail(email);
        })
      );

      this.logger.info("Batch emails queued", {
        count: jobIds.length,
        jobIds,
      });

      res.status(202).json({
        status: "success",
        message: `${jobIds.length} emails queued successfully`,
        data: {
          jobIds,
          estimatedDelivery: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes estimate
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        next(
          new EmailError("Failed to send batch emails", "BATCH_SEND_FAILED", {
            originalError: error.message,
          })
        );
      } else {
        next(error);
      }
    }
  };

  getEmailStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const status = await this.emailService.getEmailStatus(id);

      if (!status) {
        throw new EmailError("Email job not found", "JOB_NOT_FOUND");
      }

      res.status(200).json({
        status: "success",
        data: status,
      });
    } catch (error) {
      if (error instanceof Error) {
        next(
          new EmailError("Failed to get email status", "STATUS_CHECK_FAILED", {
            originalError: error.message,
          })
        );
      } else {
        next(error);
      }
    }
  };
}
