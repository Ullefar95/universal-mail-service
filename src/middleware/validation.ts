// src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "../errors/AppError";

// Define schema for individual email options
const emailSchema = Joi.object({
  to: Joi.array().items(Joi.string().email()).min(1).required(), // Required recipient list
  cc: Joi.array().items(Joi.string().email()).optional(), // Optional CC list
  bcc: Joi.array().items(Joi.string().email()).optional(), // Optional BCC list
  subject: Joi.string().required(), // Required email subject
  templateId: Joi.string().optional(), // Optional template ID
  variables: Joi.object().optional(), // Optional variables for template placeholders
  attachments: Joi.array()
    .items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.binary().required(),
        contentType: Joi.string().required(),
      })
    )
    .optional(),
}).required();

// Schema for validating batch email requests
const batchEmailSchema = Joi.array().items(emailSchema).min(1).max(100); // Limit batch size to 100 emails

// Define schema for template creation/update
const templateSchema = Joi.object({
  name: Joi.string().required(), // Required name for the template
  description: Joi.string().optional(), // Optional description
  subject: Joi.string().required(), // Required subject for the template
  content: Joi.object({
    html: Joi.string().required(), // HTML content for the email body
    text: Joi.string().optional(), // Optional plain text content
  }).required(),
  isActive: Joi.boolean().optional(), // Optional flag for template status
});

// Middleware to validate single or batch email requests
export const validateEmailRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = Array.isArray(req.body)
    ? batchEmailSchema.validate(req.body) // Batch validation
    : emailSchema.validate(req.body); // Single email validation

  if (error) {
    throw new AppError(
      "Invalid request data",
      400,
      "VALIDATION_ERROR",
      error.details
    );
  }

  next();
};

// Middleware to validate template requests
export const validateTemplateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = templateSchema.validate(req.body);

  if (error) {
    throw new AppError(
      "Invalid request data",
      400,
      "VALIDATION_ERROR",
      error.details
    );
  }

  next();
};
