// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { ApiKeyManager } from "../security/auth";
import jwt from "jsonwebtoken";
import { Logger } from "../utils/Logger";

const logger = new Logger();

export class AuthController {
  static generateAuthToken(req: Request, res: Response) {
    console.log("generateAuthToken called"); // Log til fejlfinding
    try {
      const token = jwt.sign(
        { userId: "exampleUserId" },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" }
      );
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth token" });
    }
  }

  static async getAllApiKeys(req: Request, res: Response) {
    try {
      const apiKeys = await ApiKeyManager.getAllApiKeys();
      res.json(apiKeys);
    } catch (error) {
      logger.error("Failed to fetch API keys", { error });
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  }

  static async createApiKey(req: Request, res: Response) {
    try {
      const apiKey = ApiKeyManager.generateApiKey();
      await ApiKeyManager.storeApiKey(apiKey, "exampleUserId", [
        "read",
        "write",
      ]);
      res.json({ apiKey });
    } catch (error) {
      logger.error("Failed to create API key", { error });
      res.status(500).json({ error: "Failed to create API key" });
    }
  }

  static async revokeApiKey(req: Request, res: Response) {
    const { apiKey } = req.params;
    try {
      const success = await ApiKeyManager.revokeApiKey(apiKey);
      if (success) {
        res.json({ message: "API key revoked successfully" });
      } else {
        res.status(404).json({ error: "API key not found" });
      }
    } catch (error) {
      logger.error("Failed to revoke API key", { error });
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  }
}
