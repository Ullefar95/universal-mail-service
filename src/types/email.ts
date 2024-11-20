/**
 * Interface for options when sending an email.
 */
export interface EmailOptions {
    to: string | string[]; // Accept a single email or an array
    cc?: string | string[]; // Optional: single email or array
    bcc?: string | string[]; // Optional: single email or array
    subject: string; // Email subject
    templateId?: string; // Template ID for dynamic content
    variables?: Record<string, any>; // Variables for template rendering
    body?: {
        html?: string; // Optional: HTML content
        text?: string; // Optional: Plain text content
    };
    attachments?: Array<{
        filename: string; // Name of the file attachment
        content: Buffer | string; // File content as Buffer or string
        contentType: string; // MIME type of the attachment
    }>;
}

/**
 * Interface for email job data used in queueing or job processing.
 */
export interface EmailJobData {
    to: string | string[]; // Single recipient or multiple recipients
    cc?: string | string[]; // Optional: Single or multiple CCs
    bcc?: string | string[]; // Optional: Single or multiple BCCs
    subject: string; // Email subject
    html?: string; // Optional: HTML content
    text?: string; // Optional: Plain text content
    attachments?: Array<{
        filename: string; // Name of the file attachment
        content: Buffer | string; // File content as Buffer or string
        contentType: string; // MIME type of the attachment
    }>;
    from?: string; // Optional: Sender's email address
}

/**
 * Interface for an email job, including job ID for tracking.
 */
export interface EmailJob extends EmailJobData {
    id: string; // Unique identifier for the email job
}

/**
 * Interface for email status response.
 */
export interface EmailStatus {
    jobId: string; // Unique identifier of the job
    status: "pending" | "processing" | "completed" | "failed"; // Job status
    completedAt?: Date; // Completion timestamp (if applicable)
    error?: string; // Error message (if applicable)
}
