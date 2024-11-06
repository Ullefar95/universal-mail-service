// src/security/auth.ts
import { Request, Response, NextFunction } from "express";
import OAuth2Server from "@node-oauth/oauth2-server";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { createClient } from "redis";
import Joi from "joi";
import { Logger } from "../utils/Logger";

const logger = new Logger();

// Redis client setup with error handling
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));

// OAuth2 Server Setup
const oauth = new OAuth2Server({
  model: {
    getAccessToken: async (accessToken: string) => {
      const token = await redisClient.get(`oauth:token:${accessToken}`);
      return token ? JSON.parse(token) : null;
    },
    getClient: async (clientId: string, clientSecret: string) => {
      const client = await redisClient.get(`oauth:client:${clientId}`);
      if (!client) return null;

      const clientData = JSON.parse(client);
      return clientSecret === clientData.secret ? clientData : null;
    },
    saveToken: async (token: any, client: any, user: any) => {
      const accessToken = {
        ...token,
        client,
        user,
      };

      await redisClient.set(
        `oauth:token:${token.accessToken}`,
        JSON.stringify(accessToken),
        { EX: 3600 } // 1 hour expiry
      );

      return accessToken;
    },
    getRefreshToken: async (refreshToken: string) => {
      const token = await redisClient.get(`oauth:refresh:${refreshToken}`);
      return token ? JSON.parse(token) : null;
    },
    revokeToken: async (token: any) => {
      const result = await redisClient.del(`oauth:token:${token.accessToken}`);
      return result === 1;
    },
  },
  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 1209600, // 14 days
  allowBearerTokensInQueryString: false,
  allowExtendedTokenAttributes: true,
});

// API Key Management with improved security
export class ApiKeyManager {
  private static readonly KEY_PREFIX = "ak_";
  private static readonly KEY_LENGTH = 32;
  private static readonly KEY_EXPIRY = 365 * 24 * 60 * 60; // 1 year

  static generateApiKey(): string {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const hashedBytes = crypto
      .createHash("sha256")
      .update(randomBytes)
      .digest();
    return this.KEY_PREFIX + hashedBytes.toString("base64url");
  }

  static async storeApiKey(
    apiKey: string,
    userId: string,
    scopes: string[] = []
  ): Promise<void> {
    const keyData = {
      userId,
      scopes,
      createdAt: new Date().toISOString(),
    };

    await redisClient.set(`apikey:${apiKey}`, JSON.stringify(keyData), {
      EX: this.KEY_EXPIRY,
    });

    logger.info("API key stored", { userId, scopes });
  }

  static async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.startsWith(this.KEY_PREFIX)) {
      return false;
    }

    const exists = await redisClient.exists(`apikey:${apiKey}`);
    return exists === 1;
  }

  static async getKeyDetails(apiKey: string): Promise<{
    userId: string;
    scopes: string[];
    createdAt: string;
  } | null> {
    const data = await redisClient.get(`apikey:${apiKey}`);
    return data ? JSON.parse(data) : null;
  }

  static async revokeApiKey(apiKey: string): Promise<boolean> {
    const result = await redisClient.del(`apikey:${apiKey}`);
    return result === 1;
  }
}

// Enhanced Authentication Middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers.authorization;

  try {
    if (apiKey) {
      // API Key Authentication
      const isValid = await ApiKeyManager.validateApiKey(apiKey);
      if (!isValid) {
        throw new Error("Invalid API key");
      }

      const keyDetails = await ApiKeyManager.getKeyDetails(apiKey);
      if (!keyDetails) {
        throw new Error("API key details not found");
      }

      req.user = {
        id: keyDetails.userId,
        scopes: keyDetails.scopes,
      };
    } else if (authHeader?.startsWith("Bearer ")) {
      // OAuth2 Authentication
      const request = new OAuth2Server.Request(req);
      const response = new OAuth2Server.Response(res);

      const token = await oauth.authenticate(request, response);
      req.user = {
        id: token.user.id,
        scopes: token.scope || [],
      };
    } else {
      throw new Error("No valid authentication provided");
    }

    next();
  } catch (error) {
    logger.error("Authentication failed", { error });
    res.status(401).json({
      error: "Authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
      code: "AUTH_FAILED",
    });
  }
};

// Enhanced Rate Limiting with Redis
const RedisStore = {
  incr: async (key: string): Promise<number> => {
    const multi = redisClient.multi();
    multi.incr(key);
    multi.expire(key, 900); // 15 minutes
    const results = await multi.exec();
    return results ? (results[0] as number) : 0;
  },
  decrement: (key: string): Promise<number> => redisClient.decr(key),
  resetKey: (key: string): Promise<number> => redisClient.del(key),
};

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: RedisStore,
  skip: (req) => {
    // Skip rate limiting for whitelisted IPs or internal requests
    const whitelist = (process.env.RATE_LIMIT_WHITELIST ?? "").split(",");
    return whitelist.includes(req.ip ?? "");
  },
});

// Improved Validation Schemas
export const validationSchemas = {
  email: Joi.object({
    to: Joi.array().items(Joi.string().email()).required().max(50),
    cc: Joi.array().items(Joi.string().email()).max(50),
    bcc: Joi.array().items(Joi.string().email()).max(50),
    subject: Joi.string().required().max(998).trim(), // RFC 2822 limit
    body: Joi.object({
      html: Joi.string().max(10485760), // 10MB limit
      text: Joi.string().max(10485760),
    }).or("html", "text"),
    templateId: Joi.string().uuid(),
    variables: Joi.object().max(50),
    attachments: Joi.array()
      .items(
        Joi.object({
          filename: Joi.string().required().max(255),
          content: Joi.string().base64().required().max(26214400), // 25MB limit
          contentType: Joi.string().required().max(255),
        })
      )
      .max(10), // Maximum 10 attachments
    priority: Joi.string().valid("high", "normal", "low"),
    scheduledTime: Joi.date().min("now"),
  }).required(),
};

// Enhanced Request Validation
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        logger.warn("Validation failed", { error: error.details });
        res.status(400).json({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
};

// Improved Error Handler
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Error occurred", { error: err });

  if (err instanceof Error) {
    const error = err as Error & {
      code?: number;
      details?: unknown[];
      statusCode?: number;
    };

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Error",
        code: "VALIDATION_ERROR",
        details: error.details,
      });
    }

    if (
      error.name === "UnauthorizedError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        error: error.name,
        code: "AUTH_ERROR",
        message: error.message,
      });
    }

    const statusCode = error.statusCode ?? error.code ?? 500;
    return res.status(statusCode).json({
      error: error.name,
      code: error.code ?? "INTERNAL_ERROR",
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal Server Error",
    code: "INTERNAL_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : String(err),
  });
};

// Extended Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | null;
        scopes?: string[];
      };
    }
  }
}
