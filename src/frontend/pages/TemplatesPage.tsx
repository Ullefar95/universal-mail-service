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

  // Update newTemplate to match the schema with "content" instead of "body"
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    subject: string;
    content: { html: string; text?: string };
  }>({
    name: "",
    subject: "",
    content: { html: "", text: "" },
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await templateApi.getAll();
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      await templateApi.create(newTemplate);
      fetchTemplates();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await templateApi.delete(id);
      fetchTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
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
          Create Template
        </Button>
      </div>
      {showCreateModal && (
        <div>
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
            value={newTemplate.content.html} // Updates the `content.html` field
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
          <Button onClick={createTemplate}>Save</Button>
          <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{template.subject}</p>
                <Button onClick={() => deleteTemplate(template.id)}>
                  Delete
                </Button>
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
