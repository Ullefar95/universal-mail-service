import { TemplateService } from "./TemplateService";
import { Template } from "../../models/Templates";
import { TemplateError } from "../../errors/AppError";
import Handlebars from "handlebars";

jest.mock("../../models/Templates");
jest.mock("../../utils/Logger");

describe("TemplateService", () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe("getTemplate", () => {
    it("should return template content if template is found", async () => {
      const templateId = "123";
      const templateContent = "<div>{{name}}</div>";
      (Template.findOne as jest.Mock).mockResolvedValue({
        content: templateContent,
      });

      const result = await templateService.getTemplate(templateId);

      expect(result).toBe(templateContent);
      expect(Template.findOne).toHaveBeenCalledWith({
        _id: templateId,
        isActive: true,
      });
    });

    it("should throw TemplateError if template is not found", async () => {
      const templateId = "123";
      (Template.findOne as jest.Mock).mockResolvedValue(null);

      await expect(templateService.getTemplate(templateId)).rejects.toThrow(
        TemplateError
      );
      expect(Template.findOne).toHaveBeenCalledWith({
        _id: templateId,
        isActive: true,
      });
    });
  });

  describe("processTemplate", () => {
    it("should compile and process template with variables", async () => {
      const templateId = "123";
      const templateContent = "<div>{{name}}</div>";
      const variables = { name: "John" };
      (Template.findOne as jest.Mock).mockResolvedValue({
        content: templateContent,
      });

      const result = await templateService.processTemplate(
        templateId,
        variables
      );

      expect(result).toBe("<div>John</div>");
      expect(Template.findOne).toHaveBeenCalledWith({
        _id: templateId,
        isActive: true,
      });
    });

    it("should use cached template if available", async () => {
      const templateId = "123";
      const templateContent = "<div>{{name}}</div>";
      const variables = { name: "John" };
      const compiledTemplate = Handlebars.compile(templateContent);
      templateService["templates"].set(templateId, compiledTemplate);

      const result = await templateService.processTemplate(
        templateId,
        variables
      );

      expect(result).toBe("<div>John</div>");
      expect(Template.findOne).not.toHaveBeenCalled();
    });
  });

  describe("validateVariables", () => {
    it("should validate variables successfully", async () => {
      const templateId = "123";
      const variables = { name: "John" };
      (Template.findById as jest.Mock).mockResolvedValue({
        variables: ["name"],
      });

      await expect(
        templateService.validateVariables(templateId, variables)
      ).resolves.not.toThrow();
      expect(Template.findById).toHaveBeenCalledWith(templateId);
    });

    it("should throw TemplateError if required variables are missing", async () => {
      const templateId = "123";
      const variables = { name: "John" };
      (Template.findById as jest.Mock).mockResolvedValue({
        variables: ["name", "age"],
      });

      await expect(
        templateService.validateVariables(templateId, variables)
      ).rejects.toThrow(TemplateError);
      expect(Template.findById).toHaveBeenCalledWith(templateId);
    });
  });

  describe("clearCache", () => {
    it("should clear specific template from cache", () => {
      const templateId = "123";
      templateService["templates"].set(
        templateId,
        Handlebars.compile("<div>{{name}}</div>")
      );

      templateService.clearCache(templateId);

      expect(templateService["templates"].has(templateId)).toBe(false);
    });

    it("should clear all templates from cache", () => {
      templateService["templates"].set(
        "123",
        Handlebars.compile("<div>{{name}}</div>")
      );
      templateService["templates"].set(
        "456",
        Handlebars.compile("<div>{{age}}</div>")
      );

      templateService.clearCache();

      expect(templateService["templates"].size).toBe(0);
    });
  });
});
