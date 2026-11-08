// apps/api/src/fastify/plugins/cache.plugin.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

export class FastifyCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightPromises = new Map<string, Promise<any>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Get or set with in-flight singleflight request coalescing
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60,
    tags: string[] = [],
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data;
    }

    // Singleflight deduplication: If a query for this key is already running, join it!
    const inFlight = this.inFlightPromises.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        if (data !== undefined && data !== null) {
          if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
          }

          this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
            tags,
          });
        }
        return data;
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlSeconds = 60, tags: string[] = []) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidateTag(tag: string) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  invalidatePrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const fastifyCache = new FastifyCacheService();

declare module 'fastify' {
  interface FastifyInstance {
    cache: FastifyCacheService;
  }
}

const cachePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('cache', fastifyCache);
};

export default fp(cachePlugin, { name: 'cache-plugin' });
