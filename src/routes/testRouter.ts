import { Router } from "express";
import { EmailService } from "../services/email/EmailService";

const testRouter = Router();

testRouter.post("/test-email", async (req, res) => {
    const emailService = EmailService.getInstance();

    try {
        const jobId = await emailService.sendEmail({
            to: req.body.to,
            subject: req.body.subject,
            body: req.body.body,
        });
        res.status(200).json({ message: "Email queued successfully", jobId });
    } catch (error) {
        res.status(500).json({ message: "Failed to send email", error });
    }
});

export default testRouter;
