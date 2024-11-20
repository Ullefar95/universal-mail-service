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
      EmailOptions: {
        type: "object",
        properties: {
          to: {
            type: "array",
            items: { type: "string", format: "email" },
            description: "List of primary recipients",
          },
          cc: {
            type: "array",
            items: { type: "string", format: "email" },
            description: "Optional list of CC recipients",
          },
          bcc: {
            type: "array",
            items: { type: "string", format: "email" },
            description: "Optional list of BCC recipients",
          },
          subject: {
            type: "string",
            description: "Subject line of the email",
          },
          templateId: {
            type: "string",
            description: "ID of the email template to use",
          },
          variables: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Variables to replace placeholders in the template",
          },
          body: {
            type: "object",
            properties: {
              html: { type: "string", description: "HTML content" },
              text: { type: "string", description: "Plain text content" },
            },
            description: "Custom email body",
          },
          attachments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                filename: { type: "string" },
                content: { type: "string", format: "binary" },
                contentType: { type: "string" },
              },
            },
            description: "List of attachments",
          },
        },
        required: ["to", "subject"],
      },
      EmailJobData: {
        allOf: [{ $ref: "#/components/schemas/EmailOptions" }],
      },
      EmailJob: {
        allOf: [
          { $ref: "#/components/schemas/EmailJobData" },
          {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique job ID" },
            },
          },
        ],
      },
      Template: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the template" },
          subject: { type: "string", description: "Subject of the template" },
          content: {
            type: "object",
            properties: {
              html: { type: "string", description: "HTML content" },
              text: { type: "string", description: "Plain text content" },
            },
            description: "Content of the email template",
          },
          description: { type: "string", description: "Template description" },
          isActive: { type: "boolean", description: "Status of the template" },
          version: { type: "number", description: "Template version" },
        },
        required: ["name", "subject", "content"],
      },
    },
  },
};

// Swagger options
const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts"], // Path to the API docs (adjust as necessary)
};

// Initialize Swagger JSDoc
const swaggerSpec = swaggerJSDoc(options);

// Function to setup Swagger
export const setupSwagger = (app: Application) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
