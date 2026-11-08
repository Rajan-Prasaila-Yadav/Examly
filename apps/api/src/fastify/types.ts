// apps/api/src/fastify/types.ts
import { FastifyRequest } from 'fastify';
import { RoleType, RecordStatus } from '@prisma/client';
import { z } from 'zod';

export interface AuthUser {
  userId: string;
  instituteId: string | null;
  roleCode: RoleType;
  roleId: string;
  permissions: string[];
  cacheVersion: string;
  identifier: string;
  email: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    startTime?: number;
    // Phase 3 timing instrumentation
    authStartTime?: number;
    authDurationMs?: number;
    rbacStartTime?: number;
    rbacDurationMs?: number;
    rbacCacheHit?: boolean;
    userCacheHit?: boolean;
  }
}

export type RequiredPermissionTuple = [resource: string, action: string];

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
});
