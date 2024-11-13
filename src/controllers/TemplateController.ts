import { Request, Response, NextFunction } from "express";
import { Template, ITemplate } from "../models/Templates";
import { TemplateError } from "../errors/AppError";
import { Logger } from "../utils/Logger";

export class TemplateController {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  // Retrieve active templates
  getTemplates = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const templates = await Template.find({ isActive: true })
        .select("-content") // Exclude content in list view
        .sort({ updatedAt: -1 });

      res.status(200).json({
        status: "success",
        data: { templates },
      });
    } catch (error) {
      next(error);
    }
  };

  // Retrieve a specific template by ID
  getTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const template = await Template.findById(id);

      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      res.status(200).json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  };

  // Create a new template
  createTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const templateData: Partial<ITemplate> = req.body;

      // Check for duplicate template by name
      const existingTemplate = await Template.findOne({
        name: templateData.name,
      });
      if (existingTemplate) {
        throw new TemplateError(
          "Template with this name already exists",
          "DUPLICATE"
        );
      }

      const template = await Template.create(templateData);

      this.logger.info("Template created", { templateId: template._id });

      res.status(201).json({
        status: "success",
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update an existing template
  updateTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: Partial<ITemplate> = req.body;

      // Check if template exists
      const template = await Template.findById(id);
      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      // Increment version if content is being updated
      if (updateData.content && updateData.content !== template.content) {
        updateData.version = template.version + 1;
      }

      const updatedTemplate = await Template.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      this.logger.info("Template updated", { templateId: id });

      res.status(200).json({
        status: "success",
        data: { template: updatedTemplate },
      });
    } catch (error) {
      next(error);
    }
  };

  // Soft delete a template by setting isActive to false
  deleteTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await Template.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      this.logger.info("Template deleted", { templateId: id });

      res.status(200).json({
        status: "success",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
