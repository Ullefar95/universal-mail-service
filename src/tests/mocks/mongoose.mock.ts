class MockSchema {
    pre() {
        return this;
    }
    index() {
        return this;
    }
    static get Types() {
        return {
            ObjectId: String,
            String: String,
            Number: Number,
            Boolean: Boolean,
            Date: Date,
            Mixed: Object,
        };
    }
}

export const mockModel = {
    findOne: jest.fn().mockResolvedValue({
        _id: "test-id",
        name: "Test Template",
        content: {
            html: "<p>Test content</p>",
            text: "Test content",
        },
        variables: ["name", "email"],
        createdAt: new Date(),
        updatedAt: new Date(),
    }),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
};

jest.mock("mongoose", () => ({
    Schema: MockSchema,
    model: jest.fn().mockReturnValue(mockModel),
    connect: jest.fn().mockResolvedValue({}),
    Types: {
        ObjectId: String,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Date: Date,
        Mixed: Object,
    },
}));

// Mock Template model specifically
jest.mock("../../models/Templates", () => ({
    Template: mockModel,
}));

// Mock SMTP Settings model
jest.mock("../../models/SmtpSettings", () => ({
    SmtpSettings: {
        findOne: jest.fn().mockResolvedValue({
            host: "smtp.test.com",
            port: 587,
            secure: false,
            auth: {
                user: "test@test.com",
                pass: "testpass",
            },
        }),
    },
}));

// Mock Template Service
jest.mock("../../services/template/TemplateService", () => ({
    TemplateService: {
        getInstance: jest.fn().mockReturnValue({
            getTemplate: jest.fn().mockResolvedValue({
                content: {
                    html: "<p>Hello {{name}}</p>",
                    text: "Hello {{name}}",
                },
                variables: ["name"],
            }),
            validateTemplate: jest.fn().mockResolvedValue(true),
        }),
    },
}));
