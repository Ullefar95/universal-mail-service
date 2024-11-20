import { Router } from "express"; // Ensure Router is imported
import { EmailController } from "../controllers/EmailController"; // Correct path
import { validateEmailRequest } from "../middleware/validation"; // Ensure validation exists

const router = Router(); // Initialize the router
const emailController = new EmailController(); // Instantiate controller

/**
 * @swagger
 * /emails/send:
 *   post:
 *     summary: Send a single email
 *     description: Sends an email to a specified recipient.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *           example:
 *             to: ["recipient@example.com"]
 *             subject: "Welcome to our service!"
 *             templateId: "template123"
 *             variables:
 *               firstName: "John"
 *     responses:
 *       200:
 *         description: Email sent successfully.
 *       400:
 *         description: Validation error.
 */
router.post("/send", validateEmailRequest, emailController.sendEmail);

/**
 * @swagger
 * /emails/batch:
 *   post:
 *     summary: Send a batch of emails
 *     description: Sends multiple emails in a single request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/EmailRequest'
 *           example:
 *             - to: ["recipient1@example.com"]
 *               subject: "Batch Email 1"
 *             - to: ["recipient2@example.com"]
 *               subject: "Batch Email 2"
 *     responses:
 *       200:
 *         description: Emails sent successfully.
 *       400:
 *         description: Validation error.
 */
router.post("/batch", validateEmailRequest, emailController.sendBatchEmail);

/**
 * @swagger
 * /emails/status/{id}:
 *   get:
 *     summary: Get email status
 *     description: Retrieves the status of a sent email.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the email to retrieve status for.
 *     responses:
 *       200:
 *         description: Email status retrieved successfully.
 *       404:
 *         description: Email not found.
 */
router.get("/status/:id", emailController.getEmailStatus);

export const emailRoutes = router;
