import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authMiddleware } from "../security/auth"; // Ensure authMiddleware is imported

const router = Router();

// Auth token routes
router.post("/token", AuthController.generateAuthToken); // Generates a new auth token for the authenticated user
router.get("/tokens", authMiddleware, AuthController.getAllTokens); // Lists all tokens associated with the authenticated user
router.delete("/token/:tokenId", authMiddleware, AuthController.deleteToken); // Deletes a specific token by ID

// API key management routes
router.get("/api-keys", authMiddleware, AuthController.getAllApiKeys); // Lists all API keys associated with the user
router.post("/api-keys", authMiddleware, AuthController.createApiKey); // Creates a new API key for the user
router.delete("/api-keys/:apiKey", authMiddleware, AuthController.revokeApiKey); // Revokes a specific API key by key ID

export default router;
