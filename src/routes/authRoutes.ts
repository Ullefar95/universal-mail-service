import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();

router.post("/token", AuthController.generateAuthToken);
router.get("/api-keys", AuthController.getAllApiKeys);
router.post("/api-keys", AuthController.createApiKey);
router.delete("/api-keys/:apiKey", AuthController.revokeApiKey);

export default router;
