// src/frontend/pages/TemplatesPage.tsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { templateApi } from "../api/api";
import "../styles/globals.css";

export const TemplatesPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await templateApi.getAll();
        console.log("API response:", response); // Tjek strukturen af response
        setTemplates(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        setTemplates([]); // Sætter til en tom array ved fejl
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return <LoadingSpinner className="w-8 h-8" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <Button variant="primary">Create Template</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(templates) && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{template.subject}</p>
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
