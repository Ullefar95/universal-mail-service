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
        contact: {
            name: "API Support",
            email: "Ullemanden@hotmail.com",
        },
    },
    servers: [
        {
            url:
                process.env.REACT_APP_API_URL ?? "http://localhost:3000/api/v1",
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
                description: "API key to authorize requests",
            },
        },
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
    security: [
        {
            ApiKeyAuth: [],
        },
    ],
    tags: [
        {
            name: "Templates",
            description: "Template management",
        },
    ],
};

// Swagger options
const options: swaggerJSDoc.Options = {
    swaggerDefinition,
    apis: [
        "./src/routes/*.ts",
        "./src/routes/*.js", // Include compiled JS files as well
    ],
};

// Initialize Swagger JSDoc
const swaggerSpec = swaggerJSDoc(options);

// Function to setup Swagger
export const setupSwagger = (app: Application) => {
    // Swagger UI options for better UI experience
    const swaggerUiOptions = {
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: "none",
            filter: true,
        },
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Universal Mail Service API Documentation",
    };

    // Serve swagger documentation
    app.use("/api-docs", swaggerUi.serve);
    app.get("/api-docs", swaggerUi.setup(swaggerSpec, swaggerUiOptions));

    // Serve swagger spec as JSON if needed
    app.get("/swagger.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });

    // Log swagger URLs
    console.log(
        "Swagger Documentation URL:",
        `${process.env.REACT_APP_API_URL?.replace("/api/v1", "")}/api-docs`
    );
};
