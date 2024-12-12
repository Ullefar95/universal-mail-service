import "../mocks/mongoose.mock";
import "../mocks/services.mock";
import { EmailService } from "../../services/email/EmailService";
import { QueueService } from "../../services/queue/QueueService";
import { EmailOptions } from "../../types/email";

describe("Email Flow Integration", () => {
    let emailService: EmailService;
    let queueService: QueueService;

    beforeEach(() => {
        jest.clearAllMocks();
        emailService = EmailService.getInstance();
        queueService = new QueueService();
    });

    it("should process email through entire flow", async () => {
        const emailData: EmailOptions = {
            to: ["test@example.com"],
            subject: "Integration Test",
            body: {
                html: "<p>Test content</p>",
                text: "Test content",
            },
        };

        const jobId = await emailService.sendEmail(emailData);
        expect(jobId).toBeDefined();

        const job = await queueService.getJob(jobId);
        expect(job).toBeDefined();
        expect(job?.status).toBe("pending");
    });
});
