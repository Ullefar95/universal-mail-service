import axios from "axios";
import { EmailTemplate, EmailData, EmailStatus } from "../types/api";

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

// API service types for Auth responses
interface ApiKey {
  id: string;
  token: string;
  name: string;
  scopes: string[];
}

// Template API service
export const templateApi = {
  getAll: () => api.get<EmailTemplate[]>("/templates"),
  getById: (id: string) => api.get<EmailTemplate>(`/templates/${id}`),
  create: (data: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) =>
    api.post<EmailTemplate>("/templates", data),
  update: (id: string, data: Partial<EmailTemplate>) =>
    api.put<EmailTemplate>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// Email API service
export const emailApi = {
  send: (data: EmailData) => api.post<{ id: string }>("/emails/send", data),
  getStatus: (id: string) => api.get<EmailStatus>(`/emails/status/${id}`),
  getHistory: () => api.get<EmailStatus[]>("/emails/history"),
};

// Auth API service for managing tokens and API keys
export const authApi = {
  // Generate a new authentication token for the current user
  generateToken: () => api.post<{ token: string }>("/auth/token"),

  // Retrieve all API keys associated with the authenticated user
  getApiKeys: () => api.get<ApiKey[]>("/auth/api-keys"),

  // Create a new API key with an optional name and permissions
  createApiKey: (name: string, scopes: string[] = ["read"]) =>
    api.post<{ apiKey: string }>("/auth/api-keys", { name, scopes }),

  // Revoke a specific API key by its key identifier
  revokeApiKey: (apiKey: string) => api.delete(`/auth/api-keys/${apiKey}`),

  // Retrieve all tokens associated with the authenticated user
  getTokens: () =>
    api.get<{ id: string; token: string; name: string }[]>("/auth/tokens"),

  // Delete a specific token by its identifier
  deleteToken: (tokenId: string) => api.delete(`/auth/token/${tokenId}`),
};
