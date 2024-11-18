import axios from "axios";
import { EmailTemplate, EmailData, EmailStatus, ApiKey } from "../types/api";

// Define the base URL for the API
const API_BASE_URL =
  process.env.REACT_APP_API_URL ?? "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(new Error(error.message || error))
);

// Template API service
export const templateApi = {
  getAll: async () => {
    try {
      return await api.get<{
        status: string;
        data: { templates: EmailTemplate[] };
      }>("/templates");
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      throw error;
    }
  },
  getById: async (id: string) => {
    try {
      return await api.get<EmailTemplate>(`/templates/${id}`);
    } catch (error) {
      console.error(`Failed to fetch template with id: ${id}`, error);
      throw error;
    }
  },
  create: async (
    data: Omit<EmailTemplate, "_id" | "createdAt" | "updatedAt">
  ) => {
    try {
      return await api.post("/templates", data);
    } catch (error) {
      console.error("Failed to create template:", error);
      throw error;
    }
  },
  update: async (id: string, data: Partial<EmailTemplate>) => {
    console.log("Sending Update Data:", data);
    try {
      return await api.put<EmailTemplate>(`/templates/${id}`, data);
    } catch (error) {
      console.error(`Failed to update template with id: ${id}`, error);
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await api.delete(`/templates/${id}`);
    } catch (error) {
      console.error(`Failed to delete template with id: ${id}`, error);
      throw error;
    }
  },
};

// Email API service
export const emailApi = {
  send: async (data: EmailData) => {
    try {
      return await api.post<{ id: string }>("/emails/send", data);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  },
  getStatus: async (id: string) => {
    try {
      return await api.get<EmailStatus>(`/emails/status/${id}`);
    } catch (error) {
      console.error(`Failed to get status for email id: ${id}`, error);
      throw error;
    }
  },
  getHistory: async () => {
    try {
      return await api.get<EmailStatus[]>("/emails/history");
    } catch (error) {
      console.error("Failed to fetch email history:", error);
      throw error;
    }
  },
};

// Auth API service for managing tokens and API keys
export const authApi = {
  generateToken: async () => {
    try {
      return await api.post<{ token: string }>("/auth/token");
    } catch (error) {
      console.error("Failed to generate token:", error);
      throw error;
    }
  },
  getApiKeys: async () => {
    try {
      return await api.get<ApiKey[]>("/auth/api-keys");
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      throw error;
    }
  },
  createApiKey: async (name: string, scopes: string[] = ["read"]) => {
    try {
      return await api.post<{ apiKey: string }>("/auth/api-keys", {
        name,
        scopes,
      });
    } catch (error) {
      console.error("Failed to create API key:", error);
      throw error;
    }
  },
  revokeApiKey: async (apiKey: string) => {
    try {
      return await api.delete(`/auth/api-keys/${apiKey}`);
    } catch (error) {
      console.error(`Failed to revoke API key: ${apiKey}`, error);
      throw error;
    }
  },
  getTokens: async () => {
    try {
      return await api.get<{ id: string; token: string; name: string }[]>(
        "/auth/tokens"
      );
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      throw error;
    }
  },
  deleteToken: async (tokenId: string) => {
    try {
      return await api.delete(`/auth/token/${tokenId}`);
    } catch (error) {
      console.error(`Failed to delete token with id: ${tokenId}`, error);
      throw error;
    }
  },
};
