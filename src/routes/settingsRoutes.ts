import { Router } from "express";
import { SettingsController } from "../controllers/SettingsController";

const router = Router();
const settingsController = new SettingsController();

/**
 * POST /settings/smtp
 * Updates SMTP configuration settings.
 */
router.post("/smtp", settingsController.updateSmtpSettings);

/**
 * GET /settings/smtp
 * Retrieves current SMTP configuration settings.
 */
router.get("/smtp", settingsController.getSmtpSettings);

export const settingsRoutes = router;
