// apps/api/src/modules/system/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { PermissionGuard } from '../../platform/rbac/guards/permission.guard';
import { RequirePermission } from '../../platform/rbac/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';

@ApiTags('System - Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filtering' })
  @RequirePermission('audit', 'read')
  @ApiQuery({ name: 'instituteId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getLogs(
    @Query('instituteId') instituteId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.getLogs({
      instituteId,
      action,
      resourceType,
      userId,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit log summary statistics' })
  @RequirePermission('audit', 'read')
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.auditService.getSummary(user.instituteId);
  }
}
