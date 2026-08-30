// apps/api/src/modules/cache/cache.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private localCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl && redisUrl.startsWith('redis')) {
      try {
        this.client = new Redis(redisUrl, {
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          maxRetriesPerRequest: 1,
          connectTimeout: 2500,
          commandTimeout: 1500,
          enableReadyCheck: false,
          retryStrategy: (times) => (times > 2 ? null : Math.min(times * 100, 1000)),
        });

        this.client.on('connect', () => {
          this.logger.log('✅ Connected to Upstash Serverless Redis Cache');
        });

        this.client.on('error', (err) => {
          this.logger.warn(`⚠️ Redis Cache notice (using fast local memory fallback): ${err.message}`);
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
    // 1. Check local fast memory cache first (< 0.1ms)
    const local = this.localCache.get(key);
    if (local) {
      if (Date.now() < local.expiresAt) {
        return local.value as T;
      }
      this.localCache.delete(key);
    }

    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        this.localCache.set(key, { value: parsed, expiresAt: Date.now() + 10000 });
        return parsed as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : 3600 * 1000);
    this.localCache.set(key, { value, expiresAt });

    if (!this.client) return;
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, str, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, str);
      }
    } catch (e: any) {
      // Non-blocking fallback
    }
  }

  async del(key: string): Promise<void> {
    this.localCache.delete(key);
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (e: any) {
      // Non-blocking fallback
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
