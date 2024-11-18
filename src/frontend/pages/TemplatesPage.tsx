import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { templateApi } from "../api/api";
import { EmailTemplate } from "../types/api";
import "../styles/globals.css";

export const TemplatesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New state for edit mode

  // Define initial template structure
  const [newTemplate, setNewTemplate] = useState<
    Omit<EmailTemplate, "_id" | "createdAt" | "updatedAt">
  >({
    name: "",
    subject: "",
    content: { html: "", text: "" },
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  // Fetch templates on load
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await templateApi.getAll();
      const templates = Array.isArray(response.data.data.templates)
        ? response.data.data.templates.map((template) => ({
            ...template,
            content: template.content || { html: "", text: "" },
          }))
        : [];
      setTemplates(templates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Save a new or updated template
  const saveTemplate = async () => {
    try {
      const sanitizedTemplate = {
        ...newTemplate,
        content: {
          html: newTemplate.content.html,
          text: newTemplate.content.text,
        },
      };

      if (isEditing && selectedTemplateId) {
        await templateApi.update(selectedTemplateId, sanitizedTemplate);
      } else {
        await templateApi.create(sanitizedTemplate);
      }

      fetchTemplates(); // Refresh list
      setShowCreateModal(false);
      setIsEditing(false);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  // Delete a template
  const deleteTemplate = async (id: string) => {
    try {
      await templateApi.delete(id);
      fetchTemplates(); // Refresh list
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  // Edit a template
  const editTemplate = (template: EmailTemplate) => {
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      content: template.content,
    });
    setSelectedTemplateId(template._id);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) return <LoadingSpinner className="w-8 h-8" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          {isEditing ? "Edit Template" : "Create Template"}
        </Button>
      </div>
      {showCreateModal && (
        <div className="modal">
          <input
            value={newTemplate.name}
            onChange={(e) =>
              setNewTemplate({ ...newTemplate, name: e.target.value })
            }
            placeholder="Template Name"
          />
          <input
            value={newTemplate.subject}
            onChange={(e) =>
              setNewTemplate({ ...newTemplate, subject: e.target.value })
            }
            placeholder="Template Subject"
          />
          <textarea
            value={newTemplate.content.html}
            onChange={(e) =>
              setNewTemplate({
                ...newTemplate,
                content: { ...newTemplate.content, html: e.target.value },
              })
            }
            placeholder="HTML Content"
          />
          <textarea
            value={newTemplate.content.text ?? ""}
            onChange={(e) =>
              setNewTemplate({
                ...newTemplate,
                content: { ...newTemplate.content, text: e.target.value },
              })
            }
            placeholder="Text Content (optional)"
          />
          <Button onClick={saveTemplate}>
            {isEditing ? "Update" : "Save"}
          </Button>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setIsEditing(false);
              setSelectedTemplateId(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template._id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <p className="text-xs text-gray-500">ID: {template._id}</p>{" "}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{template.subject}</p>
                <p className="text-sm text-gray-500">
                  {template.content?.html || "No HTML content available"}
                </p>
                <Button onClick={() => deleteTemplate(template._id)}>
                  Delete
                </Button>
                <Button onClick={() => editTemplate(template)}>Edit</Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No templates available.</p>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;
