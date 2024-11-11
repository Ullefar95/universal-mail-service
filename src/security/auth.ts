// src/security/auth.ts
import { Request, Response, NextFunction } from "express";
import OAuth2Server from "@node-oauth/oauth2-server";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { createClient } from "redis";
import { Logger } from "../utils/Logger";

const logger = new Logger();

// Redis client setup with error handling
// Redis client setup with retry on failure
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis connection attempt ${retries}`);
      return Math.min(retries * 100, 3000); // Retrying after exponential backoff, max 3 seconds
    },
  },
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));
redisClient.on("connect", () => logger.info("Connected to Redis server"));

// Function to connect Redis
const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("Connected to Redis");
  }
};

// Ensure Redis connection
const ensureRedisConnected = async () => {
  if (!redisClient.isOpen) {
    await connectRedis();
  }
};

// Call connectRedis at startup to connect initially
connectRedis();

// OAuth2 Server Setup
const oauth = new OAuth2Server({
  model: {
    getAccessToken: async (accessToken: string) => {
      await ensureRedisConnected();
      const token = await redisClient.get(`oauth:token:${accessToken}`);
      return token ? JSON.parse(token) : null;
    },
    getClient: async (clientId: string, clientSecret: string) => {
      await ensureRedisConnected();
      const client = await redisClient.get(`oauth:client:${clientId}`);
      if (!client) return null;

      const clientData = JSON.parse(client);
      return clientSecret === clientData.secret ? clientData : null;
    },
    saveToken: async (token: any, client: any, user: any) => {
      await ensureRedisConnected();
      const accessToken = { ...token, client, user };

      await redisClient.set(
        `oauth:token:${token.accessToken}`,
        JSON.stringify(accessToken),
        { EX: 3600 } // 1 hour expiry
      );

      return accessToken;
    },
    getRefreshToken: async (refreshToken: string) => {
      await ensureRedisConnected();
      const token = await redisClient.get(`oauth:refresh:${refreshToken}`);
      return token ? JSON.parse(token) : null;
    },
    revokeToken: async (token: any) => {
      await ensureRedisConnected();
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
    await ensureRedisConnected();
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

    await ensureRedisConnected();
    const exists = await redisClient.exists(`apikey:${apiKey}`);
    return exists === 1;
  }

  static async getKeyDetails(apiKey: string): Promise<{
    userId: string;
    scopes: string[];
    createdAt: string;
  } | null> {
    await ensureRedisConnected();
    const data = await redisClient.get(`apikey:${apiKey}`);
    return data ? JSON.parse(data) : null;
  }

  static async revokeApiKey(apiKey: string): Promise<boolean> {
    await ensureRedisConnected();
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
      const isValid = await ApiKeyManager.validateApiKey(apiKey);
      if (!isValid) throw new Error("Invalid API key");

      const keyDetails = await ApiKeyManager.getKeyDetails(apiKey);
      if (!keyDetails) throw new Error("API key details not found");

      req.user = { id: keyDetails.userId, scopes: keyDetails.scopes };
    } else if (authHeader?.startsWith("Bearer ")) {
      const request = new OAuth2Server.Request(req);
      const response = new OAuth2Server.Response(res);

      const token = await oauth.authenticate(request, response);
      req.user = { id: token.user.id, scopes: token.scope || [] };
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
    await ensureRedisConnected();
    const multi = redisClient.multi();
    multi.incr(key);
    multi.expire(key, 900); // 15 minutes
    const results = await multi.exec();
    return results ? (results[0] as number) : 0;
  },
  decrement: async (key: string): Promise<number> => {
    await ensureRedisConnected();
    return redisClient.decr(key);
  },
  resetKey: async (key: string): Promise<number> => {
    await ensureRedisConnected();
    return redisClient.del(key);
  },
};

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: "error",
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: RedisStore,
  skip: (req) => {
    const whitelist = (process.env.RATE_LIMIT_WHITELIST ?? "").split(",");
    return whitelist.includes(req.ip ?? "");
  },
});

// Extend Express Request type for TypeScript to include 'user'
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
