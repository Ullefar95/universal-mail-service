import axios from "axios";
import { EmailTemplate, EmailData, EmailStatus } from "../types/api";

// Angiv den korrekte base-URL til API'et
const API_BASE_URL =
  process.env.REACT_APP_API_URL ?? "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Tilføj request interceptor til autentificering
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

// Tilføj response interceptor til error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(new Error(error.message || error));
  }
);

// API-service til templates
export const templateApi = {
  getAll: () => api.get<EmailTemplate[]>("/templates"),
  getById: (id: string) => api.get<EmailTemplate>(`/templates/${id}`),
  create: (data: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) =>
    api.post<EmailTemplate>("/templates", data),
  update: (id: string, data: Partial<EmailTemplate>) =>
    api.put<EmailTemplate>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// API-service til emails
export const emailApi = {
  send: (data: EmailData) => api.post<{ id: string }>("/emails/send", data),
  getStatus: (id: string) => api.get<EmailStatus>(`/emails/status/${id}`),
  getHistory: () => api.get<EmailStatus[]>("/emails/history"),
};

// API-service til autentificering og API keys
export const authApi = {
  generateToken: () => api.post<{ token: string }>("/auth/token"),
  getApiKeys: () => api.get<string[]>("/auth/api-keys"),
  createApiKey: () => api.post<{ apiKey: string }>("/auth/api-keys"),
  revokeApiKey: (apiKey: string) => api.delete(`/auth/api-keys/${apiKey}`),
};
