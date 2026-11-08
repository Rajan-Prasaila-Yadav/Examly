// apps/api/src/fastify/plugins/auth.plugin.ts
import fp from 'fastify-plugin';
import {createHash} from 'crypto';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { getPrismaClient } from './prisma.plugin';
import { AuthUser } from '../types';
import { RecordStatus, RoleType } from '@prisma/client';
import { effectivePermissions } from './permission-catalog';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Authorization is read from the database on every request. Kept for callers
// that previously invalidated an auth cache; there is no stale auth cache now.
export function invalidateFastifyUserCache(_userId:string) {}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrismaClient();
  let lastDataRevision:string|undefined;

  const getSecret = (): string => {
    const configuredSecret = process.env.JWT_ACCESS_SECRET;
    if (configuredSecret) return configuredSecret;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET must be configured in production');
    }
    // This fallback is deliberately development-only and matches the issuer in
    // auth.routes so a local login can be authenticated by this plugin.
    return 'examly_local_development_access_secret_change_me';
  };

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if(request.user)return;
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          statusCode: 401,
          message: 'Missing or invalid Authorization header',
          error: 'Unauthorized',
        });
      }

      const token = authHeader.substring(7).trim();

      try {
        const secret = getSecret();
        const payload = jwt.verify(token, secret) as any;

        if (!payload || !payload.sub) {
          return reply.status(401).send({
            statusCode: 401,
            message: 'Malformed token payload',
            error: 'Unauthorized',
          });
        }

        const userId = payload.sub;

        // One parameterized query instead of Prisma's separate relation queries.
        // A local institute policy also covers legacy users referencing a global role.
        const rows=await prisma.$queryRaw<any[]>`
          SELECT u.id,u."instituteId",u.identifier,u.email,u.status,
            (SELECT version::text FROM "AppDataRevision" WHERE id=1) AS "dataRevision",
            r."instituteId" AS "assignedRoleInstituteId",
            jsonb_build_object('status',i.status) AS institute,
            (to_jsonb(p) || jsonb_build_object('permissions',COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('resource',rp.resource,'action',rp.action))
               FROM "RolePermission" rp WHERE rp."roleId"=p.id),'[]'::jsonb))) AS role,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('resource',g.resource,'action',g.action,'effect',g.effect))
              FROM "PermissionGrant" g WHERE g."userId"=u.id),'[]'::jsonb) AS "permissionGrants"
          FROM "User" u JOIN "Role" r ON r.id=u."roleId"
          LEFT JOIN "Institute" i ON i.id=u."instituteId"
          LEFT JOIN "Role" local ON local."instituteId"=u."instituteId" AND local.code=r.code AND r.code<>'SUPER_ADMIN'
          JOIN "Role" p ON p.id=COALESCE(local.id,r.id)
          WHERE u.id=${userId} LIMIT 1`;
        const user=rows[0];
        if (!user || user.status !== RecordStatus.ACTIVE || (user.assignedRoleInstituteId && user.assignedRoleInstituteId!==user.instituteId) || (user.role.code!==RoleType.SUPER_ADMIN && (!user.instituteId || user.institute?.status!==RecordStatus.ACTIVE))) {
          return reply.status(401).send({statusCode:401,message:'User account is inactive or has no valid institute',error:'Unauthorized'});
        }
        if(lastDataRevision!==user.dataRevision){fastify.cache.invalidatePrefix('');lastDataRevision=user.dataRevision;}
        const policyRole=user.role;
        const authUser: AuthUser = {
          userId: user.id,
          instituteId: user.instituteId,
          roleCode: user.role.code as RoleType,
          roleId: policyRole.id,
          permissions: effectivePermissions(policyRole,user.permissionGrants),
          cacheVersion: createHash('sha256').update(JSON.stringify([user.dataRevision,user.instituteId,policyRole.id,effectivePermissions(policyRole,user.permissionGrants)])).digest('hex'),
          identifier: user.identifier,
          email: user.email,
        };

        request.user = authUser;
      } catch (err: any) {
        if(!['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(err?.name)){fastify.log.error({err},'Authorization lookup failed');return reply.code(503).send({message:'Unable to verify access. Please retry.'});}
        return reply.status(401).send({
          statusCode: 401,
          message: 'Invalid or expired access token',
          error: 'Unauthorized',
        });
      }
    },
  );
};

export default fp(authPlugin, { name: 'auth-plugin', dependencies: ['prisma-plugin'] });
