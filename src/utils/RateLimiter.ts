import Redis from "ioredis";

export class RateLimiter {
    private readonly client: Redis;
    private connected: boolean = false;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST ?? "localhost",
            port: parseInt(process.env.REDIS_PORT ?? "6379"),
            retryStrategy: (times) => {
                if (times > 3) {
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
        });

        this.client.on("connect", () => {
            this.connected = true;
        });

        this.client.on("end", () => {
            this.connected = false;
        });

        this.client.on("error", (error) => {
            this.connected = false;
        });
    }

    public async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        try {
            const status = await this.client.ping();
            if (status === "PONG") {
                this.connected = true;
                return;
            }
        } catch {
            // Connection failed or not established
        }

        try {
            await this.client.connect();
            this.connected = true;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            if (!message.includes("already connecting/connected")) {
                throw new Error(`Failed to connect to Redis: ${message}`);
            }
            this.connected = true;
        }
    }

    public async checkLimit(key: string): Promise<boolean> {
        await this.connect();

        try {
            const count = await this.client.incr(`rate_limit:${key}`);
            if (count === 1) {
                await this.client.expire(`rate_limit:${key}`, 60);
            }
            const limit = Number(process.env.RATE_LIMIT) || 100;
            return count <= limit;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            throw new Error(`Rate limit check failed: ${message}`);
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connected) {
            await this.client.quit();
            this.connected = false;
        }
    }
}
