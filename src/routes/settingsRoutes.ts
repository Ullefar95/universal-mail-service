import { Router } from "express";
import { SettingsController } from "../controllers/SettingsController";
import { Logger } from "../utils/Logger";

const router = Router();
const settingsController = new SettingsController();
const logger = new Logger();

// Add request logging middleware
router.use((req, res, next) => {
    logger.info(`Settings Route Request: ${req.method} ${req.path}`, {
        body: req.body,
        query: req.query,
        params: req.params,
    });
    next();
});

// POST /smtp - Update SMTP settings
router.post("/smtp", settingsController.updateSmtpSettings);

// GET /smtp - Get SMTP settings
router.get("/smtp", settingsController.getSmtpSettings);

// GET /smtp/status - Check SMTP connection status
router.get("/smtp/status", settingsController.checkSmtpStatus);

// POST /smtp/test - Send test email
router.post("/smtp/test", settingsController.testSmtpSettings);

// Add response logging middleware
router.use((err: any, req: any, res: any, next: any) => {
    logger.error(`Settings Route Error: ${req.method} ${req.path}`, {
        error: err,
        body: req.body,
        query: req.query,
        params: req.params,
    });
    next(err);
});

export const settingsRoutes = router;
