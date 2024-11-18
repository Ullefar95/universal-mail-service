import { Router } from "express";
import { TemplateController } from "../controllers/TemplateController";
import { validateTemplateRequest } from "../middleware/validation";

const router = Router();
const templateController = new TemplateController();

router.get(
  "/",
  (req, res, next) => {
    console.log("GET /api/v1/templates hit"); // Debugging log
    next();
  },
  templateController.getTemplates
);

router.get("/:id", templateController.getTemplate);
router.post(
  "/",
  validateTemplateRequest,
  (req, res, next) => {
    console.log("POST /api/v1/templates hit"); // Debugging log
    next();
  },
  templateController.createTemplate
);
router.put("/:id", validateTemplateRequest, templateController.updateTemplate);
router.delete("/:id", templateController.deleteTemplate);

export const templateRoutes = router;
