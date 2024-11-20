import { Request, Response } from "express";
import { Logger } from "../utils/Logger";
import { SmtpSettings } from "../models/SmtpSettings";
import { EmailService } from "../services/email/EmailService";

const logger = new Logger();

// Instance of EmailService to allow reloading SMTP settings
const emailService = new EmailService();

export class SettingsController {
    /**
     * Update SMTP settings and reload the EmailService's transporter.
     */
    async updateSmtpSettings(req: Request, res: Response) {
        try {
            const { host, port, secure, user, pass, from } = req.body;

            // Validate input
            if (!host || !port || !user || !pass || !from) {
                return res
                    .status(400)
                    .json({ message: "Missing required fields" });
            }

            // Save settings to MongoDB
            const updatedSettings = await SmtpSettings.findOneAndUpdate(
                {},
                { host, port, secure, user, pass, from },
                { upsert: true, new: true }
            );

            logger.info("SMTP settings updated", updatedSettings);

            // Reload SMTP settings in EmailService
            await emailService.reloadSmtpSettings();

            return res
                .status(200)
                .json({
                    message: "SMTP settings updated and reloaded successfully",
                });
        } catch (error) {
            logger.error("Failed to update SMTP settings", error);
            return res
                .status(500)
                .json({ message: "Failed to update SMTP settings" });
        }
    }

    /**
     * Get current SMTP settings.
     */
    async getSmtpSettings(req: Request, res: Response) {
        try {
            const settings = await SmtpSettings.findOne();

            if (!settings) {
                return res
                    .status(404)
                    .json({ message: "SMTP settings not found" });
            }

            return res.status(200).json(settings);
        } catch (error) {
            logger.error("Failed to fetch SMTP settings", error);
            return res
                .status(500)
                .json({ message: "Failed to fetch SMTP settings" });
        }
    }
}
