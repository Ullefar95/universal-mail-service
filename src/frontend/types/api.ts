export interface EmailTemplate {
  id: string;
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
