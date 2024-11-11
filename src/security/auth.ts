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

// Udvidelse af Express.Request for at inkludere 'user' feltet
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

// API Key Management-klassen
export class ApiKeyManager {
  private static readonly KEY_PREFIX = "ak_";
  private static readonly KEY_LENGTH = 32;
  private static readonly KEY_EXPIRY = 365 * 24 * 60 * 60; // 1 år

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

  // Hent alle API nøgler
  static async getAllApiKeys(): Promise<{ apiKey: string; details: any }[]> {
    const keys = await redisClient.keys("apikey:*");
    const apiKeys = await Promise.all(
      keys.map(async (key) => {
        const details = await redisClient.get(key);
        return {
          apiKey: key.replace("apikey:", ""),
          details: JSON.parse(details ?? "{}"), // Brug nullish coalescing
        };
      })
    );
    return apiKeys;
  }
}

// Rate Limiting Middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 100, // Begræns til 100 anmodninger pr. vindue
  message: {
    status: "error",
    code: "RATE_LIMIT_EXCEEDED",
    message: "For mange forespørgsler. Prøv igen senere.",
  },
});

// Autentificeringsmiddleware
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
