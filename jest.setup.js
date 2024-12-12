// Increase timeout for all tests
jest.setTimeout(30000);

// Mock Redis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock Bull
jest.mock("bull", () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    getJob: jest.fn().mockImplementation((id) => {
      return Promise.resolve(
        id === "non-existent-id"
          ? null
          : {
              id: "mock-job-id",
              getState: jest.fn().mockResolvedValue("waiting"),
              finishedOn: null,
              failedReason: null,
            }
      );
    }),
    clean: jest.fn().mockResolvedValue(undefined),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
  }));
});

// Mock Mongoose
jest.mock("mongoose", () => ({
  connect: jest.fn().mockResolvedValue({}),
  model: jest.fn().mockReturnValue({
    findOne: jest.fn().mockResolvedValue({
      host: "test.smtp.com",
      port: 587,
      secure: false,
      auth: {
        user: "test@test.com",
        pass: "password123",
      },
    }),
  }),
}));

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: "test-message-id",
      response: "OK",
    }),
  }),
}));
