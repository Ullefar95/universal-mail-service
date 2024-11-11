import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import { Button } from "../components/common/Button";

interface ApiKey {
  key: string;
  createdAt: string;
  scopes: string[];
}

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = async () => {
    try {
      const response = await api.get("/apikeys");
      setApiKeys(response.data);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">API Keys</h1>
      <Button onClick={fetchApiKeys} variant="primary">
        Refresh API Keys
      </Button>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          {apiKeys.length > 0 ? (
            apiKeys.map((key) => (
              <div key={key.key} className="p-2 bg-gray-100 rounded text-sm">
                <p>
                  <strong>Key:</strong> {key.key}
                </p>
                <p>
                  <strong>Created At:</strong>{" "}
                  {new Date(key.createdAt).toLocaleString()}
                </p>
                <p>
                  <strong>Scopes:</strong> {key.scopes.join(", ")}
                </p>
              </div>
            ))
          ) : (
            <p>No API keys available.</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold">API Documentation</h2>
        <p className="text-sm text-gray-600">
          Use the API keys listed above to authenticate requests to the API.
          Include the API key in the `x-api-key` header in your requests.
          Detailed API documentation can be found{" "}
          <a href="/api-docs" className="text-blue-500 hover:underline">
            here
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeysPage;
