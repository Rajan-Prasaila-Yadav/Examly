// apps/api/src/platform/rbac/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RoleType, RecordStatus } from '@prisma/client';

@Injectable()
export class PermissionGuard implements CanActivate {
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

    // 1. Super Admin bypasses all checks
    if (user.roleCode === RoleType.SUPER_ADMIN) {
      return true;
    }

    // 2. Fetch user's status and custom overrides
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

    // 3. Check for explicit per-user grant override
    const explicitGrant = dbUser.permissionGrants[0];
    if (explicitGrant !== undefined) {
      if (!explicitGrant.isAllowed) {
        throw new ForbiddenException(`Permission denied for ${required.resource}.${required.action}`);
      }
      return true;
    }

    // 4. Check base role permissions
    const hasRolePermission = dbUser.role.permissions.some(
      (p) => p.resource === required.resource && p.action === required.action,
    );

    if (!hasRolePermission) {
      throw new ForbiddenException(`Permission denied for ${required.resource}.${required.action}`);
    }

    return true;
  }
}
