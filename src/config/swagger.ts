import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

// Swagger definition
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Universal Mail Service API",
        version: "1.0.0",
        description: "API documentation for the Universal Mail Service.",
    },
    servers: [
        {
            url: "http://localhost:3000/api/v1", // Adjust to your API base URL
        },
    ],
    components: {
        schemas: {
            EmailRequest: {
                type: "object",
                required: ["to", "subject"],
                properties: {
                    to: {
                        type: "array",
                        items: {
                            type: "string",
                            format: "email",
                        },
                        description: "Recipient email addresses.",
                    },
                    cc: {
                        type: "array",
                        items: {
                            type: "string",
                            format: "email",
                        },
                        description: "CC email addresses.",
                    },
                    bcc: {
                        type: "array",
                        items: {
                            type: "string",
                            format: "email",
                        },
                        description: "BCC email addresses.",
                    },
                    subject: {
                        type: "string",
                        description: "Email subject.",
                    },
                    templateId: {
                        type: "string",
                        description: "ID of the email template to use.",
                    },
                    variables: {
                        type: "object",
                        additionalProperties: true,
                        description: "Variables to replace in the template.",
                    },
                    body: {
                        type: "object",
                        properties: {
                            html: {
                                type: "string",
                                description: "HTML content of the email body.",
                            },
                            text: {
                                type: "string",
                                description:
                                    "Plain text content of the email body.",
                            },
                        },
                        description: "Email content (HTML and/or plain text).",
                    },
                    attachments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                filename: {
                                    type: "string",
                                    description: "Attachment filename.",
                                },
                                content: {
                                    type: "string",
                                    format: "binary",
                                    description:
                                        "Attachment content in binary format.",
                                },
                                contentType: {
                                    type: "string",
                                    description: "MIME type of the attachment.",
                                },
                            },
                        },
                        description: "Optional email attachments.",
                    },
                },
            },
        },
    },
};

// Swagger options
const options = {
    swaggerDefinition,
    apis: ["./src/routes/*.ts"],
};

// Initialize Swagger JSDoc
const swaggerSpec = swaggerJSDoc(options);

// Function to setup Swagger
export const setupSwagger = (app: Application) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
