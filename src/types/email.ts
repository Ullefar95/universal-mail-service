/**
 * Interface for options when sending an email.
 */
export interface EmailOptions {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
    subject: string;
    body?: {
        html?: string;
        text?: string;
    };
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType: string;
    }>;
    templateId?: string;
    variables?: Record<string, any>;
}

export interface EmailJobData {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType: string;
    }>;
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
