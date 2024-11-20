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
    to: string | string[]; // Support both single string and array
    cc?: string | string[]; // Support both single string and array
    bcc?: string | string[]; // Support both single string and array
    subject: string;
    html?: string;
    text?: string;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
    from?: string;
}

// Interface for an email job, including job ID for tracking
export interface EmailJob extends EmailJobData {
    id: string; // Unique identifier for the job
}
