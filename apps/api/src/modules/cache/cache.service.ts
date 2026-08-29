// apps/api/src/modules/cache/cache.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl && redisUrl.startsWith('redis')) {
      try {
        this.client = new Redis(redisUrl, {
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        this.client.on('connect', () => {
          this.logger.log('✅ Connected to Upstash Serverless Redis Cache');
        });

        this.client.on('error', (err) => {
          this.logger.warn(`⚠️ Redis Cache notice: ${err.message}`);
        });
      } catch (err: any) {
        this.logger.warn(`⚠️ Failed to initialize Redis: ${err.message}`);
      }
    } else {
      this.logger.log('ℹ️ Redis URL not set. Using in-memory cache fallback.');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, str, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, str);
      }
    } catch (e: any) {
      this.logger.warn(`Redis set error: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (e: any) {
      this.logger.warn(`Redis del error: ${e.message}`);
    }
  }

  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    await this.set(`bl:${token}`, 'revoked', expiresInSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const res = await this.get<string>(`bl:${token}`);
    return res === 'revoked';
  }
}
