import { Router } from "express";
import { TemplateController } from "../controllers/TemplateController";
import { validateTemplateRequest } from "../middleware/validation";

const router = Router();
const templateController = new TemplateController();

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Retrieve all active templates
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: A list of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "673b9d486778614c1f964432"
 *                           name:
 *                             type: string
 *                             example: "Welcome Email"
 *                           subject:
 *                             type: string
 *                             example: "Welcome to Our Service!"
 *                           content:
 *                             type: object
 *                             properties:
 *                               html:
 *                                 type: string
 *                                 example: "<h1>Hello</h1>"
 *                               text:
 *                                 type: string
 *                                 example: "Hello"
 */
router.get(
  "/",
  (req, res, next) => {
    console.log("GET /api/v1/templates hit"); // Debugging log
    next();
  },
  templateController.getTemplates
);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Retrieve a specific template by ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The template ID
 *     responses:
 *       200:
 *         description: A single template
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     template:
 *                       type: object
 */
router.get("/:id", templateController.getTemplate);

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create a new template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Welcome Email"
 *               subject:
 *                 type: string
 *                 example: "Welcome to Our Service!"
 *               content:
 *                 type: object
 *                 properties:
 *                   html:
 *                     type: string
 *                     example: "<h1>Hello</h1>"
 *                   text:
 *                     type: string
 *                     example: "Hello"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Template created successfully
 */
router.post(
  "/",
  validateTemplateRequest,
  (req, res, next) => {
    console.log("POST /api/v1/templates hit"); // Debugging log
    next();
  },
  templateController.createTemplate
);

/**
 * @swagger
 * /templates/{id}:
 *   put:
 *     summary: Update an existing template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Template Name"
 *               subject:
 *                 type: string
 *                 example: "Updated Subject"
 *               content:
 *                 type: object
 *                 properties:
 *                   html:
 *                     type: string
 *                     example: "<h1>Updated Content</h1>"
 *                   text:
 *                     type: string
 *                     example: "Updated Content"
 *     responses:
 *       200:
 *         description: Template updated successfully
 */
router.put("/:id", validateTemplateRequest, templateController.updateTemplate);

/**
 * @swagger
 * /templates/{id}:
 *   delete:
 *     summary: Delete a template by ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 */
router.delete("/:id", templateController.deleteTemplate);

export const templateRoutes = router;
