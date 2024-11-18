// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { Logger } from "../utils/Logger";

const logger = new Logger();

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    // Handle known application errors
    logger.error("Application error", {
      type: err.name,
      code: err.code,
      message: err.message,
      details: err.details,
    });

    res.status(err.statusCode).json({
      status: "error",
      code: err.code,
      message: err.message,
      details: err.details,
    });
  } else if (err instanceof Error) {
    // Handle unexpected errors with stack trace for debugging
    logger.error("Unexpected error", {
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: err.stack, // Stack trace for easier debugging
    });
  } else {
    // Fallback for non-error objects or unknown error types
    logger.error("Unknown error type encountered", { error: String(err) });

    res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: String(err),
    });
  }
};
