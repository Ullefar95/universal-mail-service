import { QueueService } from "../QueueService";
import { EmailJobData } from "../../../types/email";
import { Logger } from "../../../utils/Logger";

// Mock the Logger class
jest.mock("../../../utils/Logger", () => {
    return {
        Logger: jest.fn().mockImplementation(() => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        })),
    };
});

describe("QueueService", () => {
    let queueService: QueueService;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create new instance with mocked logger
        queueService = new QueueService();
        mockLogger = (Logger as jest.MockedClass<typeof Logger>).mock.results[0]
            .value;
    });

    afterEach(async () => {
        await queueService["emailQueue"].clean(0);
    });

    describe("addJob", () => {
        it("should successfully add email to queue", async () => {
            const jobData: EmailJobData = {
                to: ["test@example.com"],
                subject: "Test Subject",
                html: "<p>Test content</p>",
                text: "Test content",
            };

            const jobId = await queueService.addJob("email", jobData);
            expect(jobId).toBeDefined();
            expect(typeof jobId).toBe("string");

            // Verify logger was called
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Job added to queue",
                expect.objectContaining({
                    jobId: expect.any(String),
                    type: "email",
                    to: "test@example.com",
                })
            );
        });
    });

    describe("getJob", () => {
        it("should return job status correctly", async () => {
            const jobData: EmailJobData = {
                to: ["test@example.com"],
                subject: "Test Subject",
                text: "Test content",
            };

            const jobId = await queueService.addJob("email", jobData);
            const job = await queueService.getJob(jobId);

            expect(job).toBeDefined();
            expect(job?.status).toBe("pending");
        });

        it("should return null for non-existent job", async () => {
            const job = await queueService.getJob("non-existent-id");
            expect(job).toBeNull();
        });
    });

    describe("getQueueMetrics", () => {
        it("should return queue metrics", async () => {
            const metrics = await queueService.getQueueMetrics();

            expect(metrics).toEqual({
                waiting: expect.any(Number),
                active: expect.any(Number),
                completed: expect.any(Number),
                failed: expect.any(Number),
                delayed: expect.any(Number),
            });
        });
    });
});
