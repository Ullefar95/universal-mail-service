// src/services/template/TemplateService.ts
import Handlebars from "handlebars";
import { Template } from "../../models/Templates"; // Ensure correct import path
import { TemplateError } from "../../errors/AppError";
import { Logger } from "../../utils/Logger";

export class TemplateService {
  private readonly templates: Map<string, Handlebars.TemplateDelegate>;
  private readonly logger: Logger;

  constructor() {
    this.templates = new Map();
    this.logger = new Logger();
  }

  /**
   * Retrieves the HTML content of a template by its ID.
   * @param templateId - ID of the template to retrieve.
   * @returns The HTML content of the template.
   * @throws TemplateError if template not found.
   */
  async getTemplate(templateId: string): Promise<string> {
    try {
      const template = await Template.findOne({
        _id: templateId,
        isActive: true,
      });

      if (!template) {
        throw new TemplateError("Template not found", "NOT_FOUND");
      }

      // Return only the HTML part of the content
      return template.content.html;
    } catch (error) {
      this.logger.error("Failed to get template", { error, templateId });
      throw error;
    }
  }

  /**
   * Processes the HTML template content with provided variables.
   * @param templateId - ID of the template to process.
   * @param variables - Variables to interpolate in the template.
   * @returns The processed HTML content with variables interpolated.
   * @throws TemplateError if processing fails.
   */
  async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      let template = this.templates.get(templateId);

      if (!template) {
        const templateStr = await this.getTemplate(templateId); // Uses only HTML content
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

  /**
   * Validates that all required variables for a template are provided.
   * @param templateId - ID of the template to validate.
   * @param variables - Variables to check against the template's required variables.
   * @throws TemplateError if required variables are missing.
   */
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
        (variable: string) => !Object.hasOwn(variables, variable)
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

  /**
   * Clears the template cache, optionally by templateId.
   * @param templateId - (Optional) ID of the specific template to clear from cache.
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.templates.delete(templateId);
    } else {
      this.templates.clear();
    }
  }
}
