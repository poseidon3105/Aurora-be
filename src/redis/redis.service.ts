import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    this.client = new Redis(url);
  }

  onModuleDestroy() {
    this.client?.quit();
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async consumeOtpSendAllowance(
    rateLimitKey: string,
    cooldownKey: string,
    maxRequests: number,
    windowSeconds: number,
    cooldownSeconds: number,
  ): Promise<'allowed' | 'cooldown' | 'rate_limited'> {
    const result = Number(
      await this.client.eval(
        `
          local lastSent = redis.call('GET', KEYS[2])
          if lastSent and tonumber(ARGV[1]) - tonumber(lastSent) < tonumber(ARGV[2]) then
            return 0
          end

          local count = redis.call('INCR', KEYS[1])
          if count == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[3])
          end

          if count > tonumber(ARGV[4]) then
            redis.call('DECR', KEYS[1])
            return -1
          end

          redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
          return 1
        `,
        2,
        rateLimitKey,
        cooldownKey,
        Date.now().toString(),
        cooldownSeconds.toString(),
        windowSeconds.toString(),
        maxRequests.toString(),
      ),
    );

    if (result === 0) return 'cooldown';
    if (result === -1) return 'rate_limited';
    return 'allowed';
  }

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    return Number(
      await this.client.eval(
        `
          local count = redis.call('INCR', KEYS[1])
          if count == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
          end
          return count
        `,
        1,
        key,
        ttlSeconds.toString(),
      ),
    );
  }

  getClient(): Redis {
    return this.client;
  }
}
