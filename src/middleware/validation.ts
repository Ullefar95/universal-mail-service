// src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "../errors/AppError";

const emailSchema = Joi.object({
  to: Joi.array().items(Joi.string().email()).min(1).required(),
  cc: Joi.array().items(Joi.string().email()),
  bcc: Joi.array().items(Joi.string().email()),
  subject: Joi.string().required(),
  templateId: Joi.string(),
  variables: Joi.object(),
  attachments: Joi.array().items(
    Joi.object({
      filename: Joi.string().required(),
      content: Joi.binary().required(),
      contentType: Joi.string().required(),
    })
  ),
});

const templateSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  subject: Joi.string().required(),
  content: Joi.string().required(),
  isActive: Joi.boolean(),
});

export const validateEmailRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = emailSchema.validate(req.body);

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
