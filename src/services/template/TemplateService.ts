// src/services/template/TemplateService.ts
import Handlebars from "handlebars";
import { Template } from "../../models/Templates";
import { TemplateError } from "../../errors/AppError";
import { Logger } from "../../utils/Logger";

export class TemplateService {
  private readonly templates: Map<string, Handlebars.TemplateDelegate>;
  private readonly logger: Logger;

  constructor() {
    this.templates = new Map();
    this.logger = new Logger();
  }

  async getTemplate(templateId: string): Promise<string> {
    try {
      const template = await Template.findOne({
        _id: templateId,
        isActive: true,
      });

      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      return template.content;
    } catch (error) {
      this.logger.error("Failed to get template", { error, templateId });
      throw error;
    }
  }

  async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      let template = this.templates.get(templateId);

      if (!template) {
        const templateStr = await this.getTemplate(templateId);
        template = Handlebars.compile(templateStr);
        this.templates.set(templateId, template);
      }

      return template(variables);
    } catch (error) {
      this.logger.error("Failed to process template", {
        error,
        templateId,
        variables,
      });
      throw error;
    }
  }

  async validateVariables(
    templateId: string,
    variables: Record<string, any>
  ): Promise<void> {
    try {
      const template = await Template.findById(templateId);

      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      const missingVariables = template.variables.filter(
        (variable: string) => !variables.hasOwnProperty(variable)
      );

      if (missingVariables.length > 0) {
        throw new TemplateError(
          "Missing required variables",
          "MISSING_VARIABLES",
          { missingVariables }
        );
      }
    } catch (error) {
      this.logger.error("Failed to validate variables", {
        error,
        templateId,
        variables,
      });
      throw error;
    }
  }

  clearCache(templateId?: string): void {
    if (templateId) {
      this.templates.delete(templateId);
    } else {
      this.templates.clear();
    }
  }
}
