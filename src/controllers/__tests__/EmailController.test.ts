import "../../tests/mocks/mongoose.mock"; // Dette skal være først
import { EmailController } from "../EmailController";
import { Request, Response, NextFunction } from "express";
import { EmailOptions } from "../../types/email";
import { EmailService } from "../../services/email/EmailService";

// Mock dependencies
jest.mock("../../services/email/EmailService");
jest.mock("../../utils/Logger");

describe("EmailController", () => {
    let controller: EmailController;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let mockEmailService: jest.Mocked<EmailService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock EmailService
        mockEmailService = {
            sendEmail: jest.fn().mockResolvedValue("test-job-id"),
            getEmailStatus: jest.fn().mockResolvedValue({
                jobId: "test-job-id",
                status: "pending",
            }),
        } as any;

        (EmailService.getInstance as jest.Mock).mockReturnValue(
            mockEmailService
        );

        controller = new EmailController();
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
    });

    describe("sendEmail", () => {
        it("should queue email and return 202 status", async () => {
            const emailData: EmailOptions = {
                to: ["test@example.com"],
                subject: "Test Email",
                body: { text: "Test content" },
            };
            req.body = emailData;

            await controller.sendEmail(req as Request, res as Response, next);

            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(emailData);
            expect(res.status).toHaveBeenCalledWith(202);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.objectContaining({
                        jobId: "test-job-id",
                    }),
                })
            );
        });
    });

    describe("getEmailStatus", () => {
        it("should return email status", async () => {
            req.params = { id: "test-job-id" };

            await controller.getEmailStatus(
                req as Request,
                res as Response,
                next
            );

            expect(mockEmailService.getEmailStatus).toHaveBeenCalledWith(
                "test-job-id"
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "success",
                    data: expect.objectContaining({
                        jobId: "test-job-id",
                        status: "pending",
                    }),
                })
            );
        });
    });
});
