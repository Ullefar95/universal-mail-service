// Interface for email options when sending an email
export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateId?: string;
  variables?: Record<string, any>;
  body?: {
    // Add this optional body property
    html?: string;
    text?: string;
  };
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Interface for email job data used in queueing or job processing
export interface EmailJobData {
  to: string[]; // Required list of primary recipients
  cc?: string[]; // Optional list of CC recipients
  bcc?: string[]; // Optional list of BCC recipients
  subject: string; // Required subject line of the email
  html?: string; // HTML content for the email (optional)
  text?: string; // Plain text content for the email (optional)
  attachments?: Array<{
    filename: string; // Required filename for the attachment
    content: Buffer; // Binary content of the attachment
    contentType: string; // MIME type of the attachment
  }>; // Optional array of attachments
}

// Interface for an email job, including job ID for tracking
export interface EmailJob extends EmailJobData {
  id: string; // Unique identifier for the job
}
