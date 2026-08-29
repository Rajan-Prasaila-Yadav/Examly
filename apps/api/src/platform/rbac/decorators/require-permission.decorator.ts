// apps/api/src/platform/rbac/decorators/require-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  resource: string;
  action: string;
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, { resource, action });
