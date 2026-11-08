// apps/api/src/fastify/plugins/prisma.plugin.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
          : ['error', 'warn'],
    });

    prismaInstance.$use(async (params, next) => {
      const start = performance.now();
      const result = await next(params);
      const duration = performance.now() - start;

      if (duration > 200) {
        console.warn(`⚠️ [SLOW DB QUERY] ${params.model}.${params.action} took ${duration.toFixed(2)}ms`);
      }
      return result;
    });
  }
  return prismaInstance;
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrismaClient();
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
  });
};

export default fp(prismaPlugin, { name: 'prisma-plugin' });
