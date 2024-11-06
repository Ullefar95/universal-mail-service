import { EmailService } from "./EmailService";
import { TemplateService } from "../template/TemplateService";
import { QueueService } from "../queue/QueueService";
import { Logger } from "../../utils/Logger";
import { EmailOptions, EmailJobData } from "../../types/email";
import { EmailError } from "../../errors/AppError";
import nodemailer from "nodemailer";

jest.mock("nodemailer");
jest.mock("../template/TemplateService");
jest.mock("../queue/QueueService");
jest.mock("../../utils/RateLimiter");
jest.mock("../../utils/Logger");

describe("EmailService", () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({}),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateTemplate", () => {
    it("should validate template successfully", async () => {
      const templateId = "template1";
      const variables = { name: "John" };
      await expect(
        emailService.validateTemplate(templateId, variables)
      ).resolves.not.toThrow();
    });

    it("should throw EmailError if template validation fails", async () => {
      const templateId = "template1";
      const variables = { name: "John" };
      (
        TemplateService.prototype.validateVariables as jest.Mock
      ).mockRejectedValue(new Error("Validation failed"));
      await expect(
        emailService.validateTemplate(templateId, variables)
      ).rejects.toThrow(EmailError);
    });
  });

  describe("sendEmail", () => {
    it("should send email and return jobId", async () => {
      const options: EmailOptions = {
        to: ["test@example.com"],
        subject: "Test Email",
        templateId: "template1",
        variables: { name: "John" },
      };
      const jobId = "job123";
      (QueueService.prototype.addJob as jest.Mock).mockResolvedValue(jobId);

      const result = await emailService.sendEmail(options);
      expect(result).toBe(jobId);
      expect(QueueService.prototype.addJob).toHaveBeenCalledWith(
        "email",
        expect.any(Object)
      );
    });

    it("should log error and throw if sending email fails", async () => {
      const options: EmailOptions = {
        to: ["test@example.com"],
        subject: "Test Email",
        templateId: "template1",
        variables: { name: "John" },
      };
      (QueueService.prototype.addJob as jest.Mock).mockRejectedValue(
        new Error("Queue error")
      );

      await expect(emailService.sendEmail(options)).rejects.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe("processEmailJob", () => {
    it("should process email job successfully", async () => {
      const jobId = "job123";
      const jobData: EmailJobData = {
        to: ["test@example.com"],
        subject: "Test Email",
        html: "<p>Hello</p>",
      };

      await expect(
        emailService.processEmailJob(jobId, jobData)
      ).resolves.not.toThrow();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_FROM,
        ...jobData,
      });
    });

    it("should log error and throw if processing email job fails", async () => {
      const jobId = "job123";
      const jobData: EmailJobData = {
        to: ["test@example.com"],
        subject: "Test Email",
        html: "<p>Hello</p>",
      };
      mockTransporter.sendMail.mockRejectedValue(new Error("Send error"));

      await expect(
        emailService.processEmailJob(jobId, jobData)
      ).rejects.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe("getEmailStatus", () => {
    it("should return email status", async () => {
      const jobId = "job123";
      const job = {
        id: jobId,
        status: "completed",
        finishedOn: Date.now(),
        failedReason: null,
      };
      (QueueService.prototype.getJob as jest.Mock).mockResolvedValue(job);

      const result = await emailService.getEmailStatus(jobId);
      expect(result).toEqual({
        jobId: job.id.toString(),
        status: job.status,
        completedAt: expect.any(Date),
        error: job.failedReason,
      });
    });

    it("should return null if job not found", async () => {
      const jobId = "job123";
      (QueueService.prototype.getJob as jest.Mock).mockResolvedValue(null);

      const result = await emailService.getEmailStatus(jobId);
      expect(result).toBeNull();
    });

    it("should log error and throw if getting email status fails", async () => {
      const jobId = "job123";
      (QueueService.prototype.getJob as jest.Mock).mockRejectedValue(
        new Error("Get job error")
      );

      await expect(emailService.getEmailStatus(jobId)).rejects.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
