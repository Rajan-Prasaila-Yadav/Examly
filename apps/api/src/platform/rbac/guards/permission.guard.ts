// apps/api/src/platform/rbac/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { RoleType, RecordStatus } from '@prisma/client';

@Injectable()
export class PermissionGuard implements CanActivate {
  // In-memory permission cache for lightning-fast sub-millisecond responses
  private static permissionCache = new Map<string, { isAllowed: boolean; cachedAt: number }>();
  private static readonly TTL_MS = 60 * 1000; // 60 seconds

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true; // No specific permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    const roleCode = user.roleCode || '';

    // 1. Super Admin, Institute Admin, and Branch Admin bypass all permission checks
    if (
      roleCode === RoleType.SUPER_ADMIN ||
      roleCode === RoleType.ADMIN ||
      roleCode === 'SUPER_ADMIN' ||
      roleCode === 'ADMIN' ||
      roleCode === 'BRANCH_ADMIN' ||
      roleCode === 'DIRECTOR'
    ) {
      return true;
    }

    // 2. Taking / previewing / reviewing tests is accessible to all authenticated roles (Admin, Teacher, Student)
    if (required.resource === 'tests' && (required.action === 'take' || required.action === 'read')) {
      return true;
    }

    // 3. Check in-memory permission cache
    const cacheKey = `${user.userId}:${required.resource}:${required.action}`;
    const cached = PermissionGuard.permissionCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < PermissionGuard.TTL_MS) {
      if (!cached.isAllowed) {
        throw new ForbiddenException(`Permission denied for ${required.resource}.${required.action}`);
      }
      return true;
    }

    // 4. Fetch user's status and custom overrides from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        permissionGrants: {
          where: {
            resource: required.resource,
            action: required.action,
          },
        },
      },
    });

    if (!dbUser || dbUser.status !== RecordStatus.ACTIVE) {
      throw new ForbiddenException('Your account is blocked or inactive');
    }

    // 5. Check for explicit per-user grant override
    const explicitGrant = dbUser.permissionGrants[0];
    if (explicitGrant !== undefined) {
      PermissionGuard.permissionCache.set(cacheKey, { isAllowed: explicitGrant.isAllowed, cachedAt: Date.now() });
      if (!explicitGrant.isAllowed) {
        throw new ForbiddenException(`Permission denied for ${required.resource}.${required.action}`);
      }
      return true;
    }

    // 6. Check base role permissions
    const hasRolePermission = dbUser.role?.permissions?.some(
      (p) => p.resource === required.resource && p.action === required.action,
    );

    PermissionGuard.permissionCache.set(cacheKey, { isAllowed: !!hasRolePermission, cachedAt: Date.now() });

    if (!hasRolePermission) {
      throw new ForbiddenException(`Permission denied for ${required.resource}.${required.action}`);
    }

    return true;
  }
}
