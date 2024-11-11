// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { ApiKeyManager } from "../security/auth";
import jwt from "jsonwebtoken";
import { Logger } from "../utils/Logger";

const logger = new Logger();

export class AuthController {
  // Generates a JWT token
  static generateAuthToken(req: Request, res: Response) {
    try {
      const token = jwt.sign(
        { userId: "exampleUserId" },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" }
      );
      res.json({ token });
    } catch (error) {
      logger.error("Failed to generate auth token", { error });
      res.status(500).json({ error: "Failed to generate auth token" });
    }
  }

  // Retrieves all API keys
  static async getAllApiKeys(req: Request, res: Response) {
    try {
      const apiKeys = await ApiKeyManager.getAllApiKeys();
      res.json(apiKeys);
    } catch (error) {
      logger.error("Failed to fetch API keys", { error });
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  }

  // Creates a new API key with specified scopes
  static async createApiKey(req: Request, res: Response) {
    try {
      const { scopes = ["read"] } = req.body;
      const apiKey = ApiKeyManager.generateApiKey();
      await ApiKeyManager.storeApiKey(apiKey, "exampleUserId", scopes);
      res.json({ apiKey });
    } catch (error) {
      logger.error("Failed to create API key", { error });
      res.status(500).json({ error: "Failed to create API key" });
    }
  }

  // Revokes a specified API key
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

  // Retrieves all tokens for the current user
  static async getAllTokens(req: Request, res: Response) {
    try {
      const tokens = await ApiKeyManager.getAllTokens();
      res.json(tokens);
    } catch (error) {
      logger.error("Failed to fetch tokens", { error });
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  }

  // Deletes a specific token by its identifier
  static async deleteToken(req: Request, res: Response) {
    const { tokenId } = req.params;
    try {
      const success = await ApiKeyManager.deleteToken(tokenId);
      if (success) {
        res.json({ message: "Token deleted successfully" });
      } else {
        res.status(404).json({ error: "Token not found" });
      }
    } catch (error) {
      logger.error("Failed to delete token", { error });
      res.status(500).json({ error: "Failed to delete token" });
    }
  }
}
