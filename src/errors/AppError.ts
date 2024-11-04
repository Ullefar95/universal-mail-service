// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EmailError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, 500, `EMAIL_${code}`, details);
    this.name = "EmailError";
  }
}

export class TemplateError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, 500, `TEMPLATE_${code}`, details);
    this.name = "TemplateError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
  }
}
