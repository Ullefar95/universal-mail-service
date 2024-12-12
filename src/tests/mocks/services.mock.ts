import { Logger } from "../../utils/Logger";
import { QueueService } from "../../services/queue/QueueService";
import { RateLimiter } from "../../utils/RateLimiter";

// Mock Logger
jest.mock("../../utils/Logger", () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    })),
}));

// Mock TemplateService
export const mockTemplateService = {
    getTemplate: jest.fn().mockResolvedValue({
        content: {
            html: "<p>Hello {{name}}</p>",
            text: "Hello {{name}}",
        },
        variables: ["name"],
    }),
    validateTemplate: jest.fn().mockResolvedValue(true),
};

jest.mock("../../services/template/TemplateService", () => ({
    TemplateService: jest.fn().mockImplementation(() => mockTemplateService),
}));

// Mock QueueService
export const mockQueueService = {
    addJob: jest.fn().mockResolvedValue("test-job-id"),
    getJob: jest.fn().mockImplementation((id) =>
        Promise.resolve(
            id === "non-existent-id"
                ? null
                : {
                      id: "test-job-id",
                      status: "pending",
                  }
        )
    ),
    getQueueMetrics: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
    }),
};

jest.mock("../../services/queue/QueueService", () => ({
    QueueService: jest.fn().mockImplementation(() => mockQueueService),
}));

// Mock simple rate limiter
export const mockRateLimiter = {
    checkLimit: jest.fn().mockResolvedValue(true),
    incrementCounter: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../../utils/RateLimiter", () => ({
    RateLimiter: jest.fn().mockImplementation(() => mockRateLimiter),
}));

// Mock nodemailer
jest.mock("nodemailer", () => ({
    createTransport: jest.fn().mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({
            messageId: "test-message-id",
            response: "OK",
        }),
    }),
}));

// Create mock email service instance
const mockEmailServiceInstance = {
    initialized: true,
    ensureInitialized: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue("test-job-id"),
    getEmailStatus: jest.fn().mockImplementation((id) =>
        Promise.resolve(
            id === "non-existent-id"
                ? null
                : {
                      jobId: "test-job-id",
                      status: "pending",
                  }
        )
    ),
    validateTemplate: jest.fn().mockResolvedValue(true),
};

// Mock EmailService
jest.mock("../../services/email/EmailService", () => ({
    EmailService: {
        getInstance: jest.fn(() => mockEmailServiceInstance),
    },
}));

export const mockEmailService = mockEmailServiceInstance;
