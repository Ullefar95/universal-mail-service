// src/services/queue/QueueService.ts
import Queue, { Job } from "bull";
import { EmailJobData } from "../../types/email";
import { Logger } from "../../utils/Logger";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface QueueJob extends Job {
    status: JobStatus;
    finishedOn?: number;
    failedReason?: string;
}

export class QueueService {
    private readonly emailQueue: Queue.Queue<EmailJobData>;
    private readonly logger: Logger;

    constructor() {
        this.emailQueue = new Queue<EmailJobData>("email-queue", {
            redis: process.env.REDIS_URL,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
                removeOnComplete: false, // Keep completed jobs for status checking
                removeOnFail: false, // Keep failed jobs for debugging
            },
        });

        this.logger = new Logger();
        this.setupQueueHandlers();
    }

    private formatAddresses(addresses?: string | string[]): string {
        return Array.isArray(addresses)
            ? addresses.join(", ")
            : addresses ?? "";
    }

    private setupQueueHandlers(): void {
        this.emailQueue.on("completed", (job: Job<EmailJobData>) => {
            this.logger.info("Job completed", {
                jobId: job.id,
                to: this.formatAddresses(job.data.to),
            });
        });

        this.emailQueue.on(
            "failed",
            (job: Job<EmailJobData> | undefined, error: Error) => {
                this.logger.error("Job failed", {
                    jobId: job?.id,
                    to: this.formatAddresses(job?.data.to),
                    error: error.message,
                });
            }
        );

        this.emailQueue.on("stalled", (job: Job<EmailJobData>) => {
            this.logger.warn("Job stalled", {
                jobId: job.id,
                to: this.formatAddresses(job.data.to),
            });
        });

        process.on("SIGTERM", async () => {
            await this.emailQueue.close();
            this.logger.info("Queue closed gracefully.");
        });
    }

    async addJob(type: string, data: EmailJobData): Promise<string> {
        const job = await this.emailQueue.add(data, {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        });

        this.logger.info("Job added to queue", {
            jobId: job.id,
            type,
            to: this.formatAddresses(data.to),
        });

        return job.id.toString();
    }

    async getJob(jobId: string): Promise<QueueJob | null> {
        const job = await this.emailQueue.getJob(jobId);

        if (!job) {
            return null;
        }

        const state = await job.getState();
        let status: JobStatus;

        switch (state) {
            case "active":
                status = "processing";
                break;
            case "completed":
                status = "completed";
                break;
            case "failed":
                status = "failed";
                break;
            default:
                status = "pending";
        }

        return {
            ...job,
            status,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
        };
    }

    async removeJob(jobId: string): Promise<void> {
        const job = await this.emailQueue.getJob(jobId);
        if (job) {
            await job.remove();
            this.logger.info("Job removed", { jobId });
        }
    }

    async clearQueue(): Promise<void> {
        await this.emailQueue.empty();
        this.logger.info("Queue cleared");
    }

    async getPendingCount(): Promise<number> {
        return this.emailQueue.getWaitingCount();
    }

    async getFailedCount(): Promise<number> {
        return this.emailQueue.getFailedCount();
    }

    async getCompletedCount(): Promise<number> {
        return this.emailQueue.getCompletedCount();
    }

    async getQueueMetrics(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        const [waiting, active, completed, failed, delayed] = await Promise.all(
            [
                this.emailQueue.getWaitingCount(),
                this.emailQueue.getActiveCount(),
                this.emailQueue.getCompletedCount(),
                this.emailQueue.getFailedCount(),
                this.emailQueue.getDelayedCount(),
            ]
        );

        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
}
