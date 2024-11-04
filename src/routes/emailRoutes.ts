// src/routes/emailRoutes.ts
import { Router } from "express";
import { EmailController } from "../controllers/EmailController";
import { validateEmailRequest } from "../middleware/validation";

const router = Router();
const emailController = new EmailController();

router.post("/send", validateEmailRequest, emailController.sendEmail);

router.post("/batch", validateEmailRequest, emailController.sendBatchEmail);

router.get("/status/:id", emailController.getEmailStatus);

export const emailRoutes = router;
