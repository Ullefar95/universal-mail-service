import React, { useEffect, useState } from "react";
import { Button } from "../components/common/Button";
import { authApi } from "../api/api";

interface ApiKey {
  token: string;
  name: string;
  _id: string;
}

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await authApi.getApiKeys();
        const data = response.data as unknown;

        // Check if data is an array of ApiKey objects
        if (Array.isArray(data) && data.every(isApiKey)) {
          setApiKeys(data);
        } else {
          console.error("Invalid API key data format:", data);
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      }
    };
    fetchApiKeys();
  }, []);

  const isApiKey = (item: any): item is ApiKey =>
    typeof item === "object" &&
    "token" in item &&
    "name" in item &&
    "_id" in item;

  const generateAuthToken = async () => {
    try {
      const response = await authApi.generateToken();
      setAuthToken(response.data.token);
      localStorage.setItem("token", response.data.token);
      alert("Token generated successfully");
    } catch (error) {
      console.error("Failed to generate auth token:", error);
    }
  };

  const deleteApiKey = async (apiKeyId: string) => {
    try {
      await authApi.revokeApiKey(apiKeyId);
      setApiKeys(apiKeys.filter((key) => key._id !== apiKeyId));
      alert("API key deleted successfully");
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <Button onClick={generateAuthToken}>Generate Auth Token</Button>
      {authToken && <p>Generated Token: {authToken}</p>}
      <h2>API Keys</h2>
      <ul>
        {apiKeys.map((key) => (
          <li key={key._id}>
            <span>{key.name}</span>
            <Button onClick={() => deleteApiKey(key._id)}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SettingsPage;
