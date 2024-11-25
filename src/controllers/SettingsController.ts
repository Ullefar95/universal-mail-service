import { Request, Response } from "express";
import { Logger } from "../utils/Logger";
import { SmtpSettings } from "../models/SmtpSettings";
import { EmailService } from "../services/email/EmailService";

interface SmtpSettingsInput {
    host: string;
    port: number | string;
    secure: boolean | string;
    user: string;
    pass: string;
    from: string;
}

interface ValidationError {
    field: string;
    message: string;
}

const logger = new Logger();
const emailService = EmailService.getInstance();

export class SettingsController {
    constructor() {
        this.updateSmtpSettings = this.updateSmtpSettings.bind(this);
        this.getSmtpSettings = this.getSmtpSettings.bind(this);
        this.checkSmtpStatus = this.checkSmtpStatus.bind(this);
        this.testSmtpSettings = this.testSmtpSettings.bind(this);
    }

    /**
     * Validate the provided SMTP settings.
     * @param settings - Partial SMTP settings object
     * @returns ValidationError[] - Array of validation errors
     */
    private static validateSettings(
        settings: Partial<SmtpSettingsInput>
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const requiredFields = [
            "host",
            "port",
            "user",
            "pass",
            "from",
        ] as const;

        requiredFields.forEach((field) => {
            if (!settings[field]) {
                errors.push({
                    field,
                    message: `Missing ${field}`,
                });
            }
        });

        return errors;
    }

    /**
     * Normalize the SMTP settings for consistent storage.
     * @param settings - Input SMTP settings
     * @returns Normalized SMTP settings
     */
    private static normalizeSettings(
        settings: SmtpSettingsInput
    ): SmtpSettingsInput {
        return {
            ...settings,
            port:
                typeof settings.port === "string"
                    ? parseInt(settings.port, 10)
                    : settings.port,
            secure:
                typeof settings.secure === "string"
                    ? settings.secure === "true"
                    : !!settings.secure,
        };
    }

    /**
     * Save the normalized settings to the database.
     * @param settings - Normalized SMTP settings
     * @returns Updated SMTP settings document
     */
    private async saveSettingsToDatabase(settings: SmtpSettingsInput) {
        const updatedSettings = await SmtpSettings.findOneAndUpdate(
            {},
            settings,
            {
                upsert: true,
                new: true,
            }
        );

        if (!updatedSettings) {
            throw new Error("Failed to save settings to database");
        }

        logger.info("SMTP settings saved to database", {
            id: updatedSettings._id,
            host: updatedSettings.host,
            port: updatedSettings.port,
            secure: updatedSettings.secure,
            user: updatedSettings.user,
            from: updatedSettings.from,
        });

        return updatedSettings;
    }

    /**
     * Update SMTP settings and reload the EmailService's transporter.
     */
    async updateSmtpSettings(req: Request, res: Response) {
        try {
            const settingsInput = req.body as SmtpSettingsInput;

            logger.info("Received SMTP settings update request", {
                ...settingsInput,
                pass: "****", // Don't log passwords
            });

            // Validate input
            const validationErrors =
                SettingsController.validateSettings(settingsInput);
            if (validationErrors.length > 0) {
                logger.warn("Validation failed for SMTP settings", {
                    validationErrors,
                });
                return res.status(400).json({
                    status: "error",
                    message: "Validation failed for SMTP settings",
                    details: validationErrors,
                });
            }

            // Normalize settings
            const normalizedSettings =
                SettingsController.normalizeSettings(settingsInput);

            // Save to database
            const updatedSettings = await this.saveSettingsToDatabase(
                normalizedSettings
            );

            // Reload SMTP service
            await emailService.reloadSmtpSettings();

            return res.status(200).json({
                status: "success",
                message: "SMTP settings updated and reloaded successfully",
                settings: {
                    host: updatedSettings.host,
                    port: updatedSettings.port,
                    secure: updatedSettings.secure,
                    user: updatedSettings.user,
                    from: updatedSettings.from,
                },
            });
        } catch (error) {
            logger.error("Failed to update SMTP settings", error);
            return res.status(500).json({
                status: "error",
                message: "Unexpected error occurred",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    /**
     * Get current SMTP settings.
     */
    async getSmtpSettings(req: Request, res: Response) {
        try {
            const settings = await SmtpSettings.findOne();

            if (!settings) {
                logger.warn("No SMTP settings found in database");
                return res.status(404).json({
                    status: "error",
                    message: "SMTP settings not found",
                });
            }

            // Remove sensitive information before sending response
            const sanitizedSettings = {
                ...settings.toObject(),
                pass: undefined,
            };

            return res.status(200).json({
                status: "success",
                data: sanitizedSettings,
            });
        } catch (error) {
            logger.error("Failed to fetch SMTP settings", error);
            return res.status(500).json({
                status: "error",
                message: "Failed to fetch SMTP settings",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    /**
     * Check SMTP connection status.
     */
    async checkSmtpStatus(req: Request, res: Response) {
        try {
            await emailService.init();
            res.json({
                status: "success",
                message: "SMTP connection verified successfully",
            });
        } catch (error) {
            logger.error("SMTP connection check failed", error);
            res.status(500).json({
                status: "error",
                message: "SMTP connection failed",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    /**
     * Test SMTP settings by sending a test email.
     */
    async testSmtpSettings(req: Request, res: Response) {
        try {
            const testEmail = {
                to: [req.body.testEmail ?? req.body.user],
                subject: "SMTP Test Email",
                body: {
                    html: "<h1>SMTP Test</h1><p>If you receive this email, your SMTP settings are working correctly!</p>",
                    text: "SMTP Test\n\nIf you receive this email, your SMTP settings are working correctly!",
                },
            };

            const jobId = await emailService.sendEmail(testEmail);

            res.json({
                status: "success",
                message: "Test email sent successfully",
                data: {
                    jobId,
                    sentTo: testEmail.to[0],
                },
            });
        } catch (error) {
            logger.error("Failed to send test email", error);
            res.status(500).json({
                status: "error",
                message: "Failed to send test email",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
