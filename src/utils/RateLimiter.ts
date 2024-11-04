import { createClient, RedisClientType } from "redis";

export class RateLimiter {
  private readonly redis: RedisClientType;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL,
    });
  }

  async checkLimit(key: string): Promise<boolean> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    if (current > 100) {
      // 100 requests per minute
      throw new Error("Rate limit exceeded");
    }

    return true;
  }
}
