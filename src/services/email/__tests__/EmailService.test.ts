import "../../../tests/mocks/mongoose.mock";
import "../../../tests/mocks/services.mock";
import { EmailService } from "../EmailService";
import { EmailOptions } from "../../../types/email";

jest.mock("../../../utils/Logger");

describe("EmailService", () => {
    let emailService: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        emailService = EmailService.getInstance();
        (emailService as any).initialized = true;
    });

    describe("sendEmail", () => {
        it("should successfully queue an email", async () => {
            const emailData: EmailOptions = {
                to: ["test@example.com"],
                subject: "Test Subject",
                body: {
                    html: "<p>Test content</p>",
                    text: "Test content",
                },
            };

            const jobId = await emailService.sendEmail(emailData);
            expect(jobId).toBe("test-job-id");
        });

        it("should validate template when templateId is provided", async () => {
            const emailData: EmailOptions = {
                to: ["test@example.com"],
                subject: "Test Subject",
                templateId: "test-template",
                variables: { name: "Test User" },
            };

            const jobId = await emailService.sendEmail(emailData);
            expect(jobId).toBe("test-job-id");
        });
    });

    describe("getEmailStatus", () => {
        it("should return email status", async () => {
            const status = await emailService.getEmailStatus("test-job-id");
            expect(status).toBeDefined();
            if (status) {
                expect(status.jobId).toBe("test-job-id");
                expect(status.status).toBe("pending");
            } else {
                fail("Status should not be null");
            }
        });

        it("should handle non-existent job", async () => {
            const status = await emailService.getEmailStatus("non-existent-id");
            expect(status).toBeNull();
        });
    });
});
