import { Router } from "express";
import { EmailController } from "../controllers/EmailController";
import { validateEmailRequest } from "../middleware/validation";

const router = Router();
const emailController = new EmailController();

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailRequest:
 *       type: object
 *       properties:
 *         to:
 *           oneOf:
 *             - type: string
 *               description: Single recipient email address.
 *             - type: array
 *               items:
 *                 type: string
 *               description: Array of recipient email addresses.
 *         cc:
 *           oneOf:
 *             - type: string
 *               description: Single CC email address.
 *             - type: array
 *               items:
 *                 type: string
 *               description: Array of CC email addresses.
 *           nullable: true
 *         bcc:
 *           oneOf:
 *             - type: string
 *               description: Single BCC email address.
 *             - type: array
 *               items:
 *                 type: string
 *               description: Array of BCC email addresses.
 *           nullable: true
 *         subject:
 *           type: string
 *           description: Subject of the email.
 *         templateId:
 *           type: string
 *           description: Template ID to use for the email.
 *           nullable: true
 *         variables:
 *           type: object
 *           additionalProperties: true
 *           description: Variables for template placeholders.
 *           nullable: true
 *         body:
 *           type: object
 *           properties:
 *             html:
 *               type: string
 *               description: HTML content of the email.
 *               nullable: true
 *             text:
 *               type: string
 *               description: Plain text content of the email.
 *               nullable: true
 *           nullable: true
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               content:
 *                 type: string
 *                 description: Base64-encoded content of the attachment.
 *               contentType:
 *                 type: string
 *           nullable: true
 *       required:
 *         - to
 *         - subject
 */

/**
 * @swagger
 * /emails/send:
 *   post:
 *     summary: Send a single email
 *     description: Sends an email to the specified recipients with optional template, content, and attachments.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *     responses:
 *       202:
 *         description: Email successfully queued for sending.
 *       400:
 *         description: Validation error or bad request.
 *       500:
 *         description: Internal server error.
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
 *     responses:
 *       202:
 *         description: Emails successfully queued for sending.
 *       400:
 *         description: Validation error or bad request.
 *       500:
 *         description: Internal server error.
 */
router.post("/batch", validateEmailRequest, emailController.sendBatchEmail);

/**
 * @swagger
 * /emails/status/{id}:
 *   get:
 *     summary: Get email status
 *     description: Retrieves the status of a previously sent or queued email.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the email job to retrieve status for.
 *     responses:
 *       200:
 *         description: Email status successfully retrieved.
 *       404:
 *         description: Email job not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/status/:id", emailController.getEmailStatus);

export const emailRoutes = router;
