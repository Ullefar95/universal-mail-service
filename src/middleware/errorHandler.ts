// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { Logger } from "../utils/Logger";

const logger = new Logger();

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
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
  } else {
    logger.error("Unexpected error", { error: err });

    res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    });
  }
};
