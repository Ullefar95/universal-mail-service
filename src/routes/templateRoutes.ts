// src/routes/templateRoutes.ts
import { Router } from "express";
import { TemplateController } from "../controllers/TemplateController";
import { validateTemplateRequest } from "../middleware/validation";

const router = Router();
const templateController = new TemplateController();

router.get("/", templateController.getTemplates);

router.get("/:id", templateController.getTemplate);

router.post("/", validateTemplateRequest, templateController.createTemplate);

router.put("/:id", validateTemplateRequest, templateController.updateTemplate);

router.delete("/:id", templateController.deleteTemplate);

export const templateRoutes = router;
