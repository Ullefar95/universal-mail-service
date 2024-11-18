export interface EmailTemplate {
  _id: string; // MongoDB document ID
  name: string;
  subject: string;
  content: {
    html: string;
    text?: string;
  };
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

// Type for creating new templates without _id, createdAt, or updatedAt
export type NewEmailTemplate = Omit<
  EmailTemplate,
  "_id" | "createdAt" | "updatedAt"
>;

export interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  body?: {
    html?: string;
    text?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface EmailStatus {
  id: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  sentAt?: string;
  error?: string;
}
export interface ApiKey {
  id: string;
  token: string;
  name: string;
  scopes: string[];
}
