// src/security/auth.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "redis";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Logger } from "../utils/Logger";

const logger = new Logger();

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient
  .connect()
  .catch((err) => console.error("Redis connection error:", err));

// Extend Express.Request to include 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        scopes?: string[];
      };
    }
  }
}

// API Key Management Class
export class ApiKeyManager {
  private static readonly KEY_PREFIX = "ak_";
  private static readonly TOKEN_PREFIX = "token_";
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
    const keyData = { userId, scopes, createdAt: new Date().toISOString() };
    await redisClient.set(`apikey:${apiKey}`, JSON.stringify(keyData), {
      EX: this.KEY_EXPIRY,
    });
  }

  static async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.startsWith(this.KEY_PREFIX)) return false;
    const exists = await redisClient.exists(`apikey:${apiKey}`);
    return exists === 1;
  }

  static async getKeyDetails(
    apiKey: string
  ): Promise<{ userId: string; scopes: string[]; createdAt: string } | null> {
    const data = await redisClient.get(`apikey:${apiKey}`);
    return data ? JSON.parse(data) : null;
  }

  static async revokeApiKey(apiKey: string): Promise<boolean> {
    const result = await redisClient.del(`apikey:${apiKey}`);
    return result === 1;
  }

  // Get all API keys
  static async getAllApiKeys(): Promise<{ apiKey: string; details: any }[]> {
    const keys = await redisClient.keys("apikey:*");
    const apiKeys = await Promise.all(
      keys.map(async (key) => {
        const details = await redisClient.get(key);
        return {
          apiKey: key.replace("apikey:", ""),
          details: JSON.parse(details ?? "{}"), // Use nullish coalescing
        };
      })
    );
    return apiKeys;
  }

  // Get all tokens associated with the user
  static async getAllTokens(): Promise<
    { token: string; userId: string; createdAt: string }[]
  > {
    const keys = await redisClient.keys(`${this.TOKEN_PREFIX}*`);
    const tokens = await Promise.all(
      keys.map(async (key) => {
        const details = await redisClient.get(key);
        return {
          token: key.replace(this.TOKEN_PREFIX, ""),
          ...(details ? JSON.parse(details) : {}),
        };
      })
    );
    return tokens;
  }

  // Delete a specific token by its identifier
  static async deleteToken(tokenId: string): Promise<boolean> {
    const result = await redisClient.del(`${this.TOKEN_PREFIX}${tokenId}`);
    return result === 1;
  }
}

// Rate Limiting Middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests per window
  message: {
    status: "error",
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
  },
});

// Authentication Middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string;
  try {
    if (apiKey) {
      const isValid = await ApiKeyManager.validateApiKey(apiKey);
      if (!isValid) throw new Error("Invalid API key");

      const keyDetails = await ApiKeyManager.getKeyDetails(apiKey);
      if (!keyDetails) throw new Error("API key details not found");

      req.user = { id: keyDetails.userId, scopes: keyDetails.scopes };
    } else {
      throw new Error("No API key provided");
    }
    next();
  } catch (error) {
    logger.error("Authentication Error:", error);
    res.status(401).json({
      error: "Unauthorized access",
      message: error instanceof Error ? error.message : "Unknown error",
      code: "AUTH_FAILED",
    });
  }
};
