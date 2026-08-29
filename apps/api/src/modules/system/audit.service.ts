// apps/api/src/modules/system/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(filters: {
    instituteId?: string;
    action?: string;
    resourceType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { instituteId, action, resourceType, userId, limit = 50, offset = 0 } = filters;

    const where: any = {};
    if (instituteId) where.instituteId = instituteId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              identifier: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async getSummary(instituteId?: string) {
    const where = instituteId ? { instituteId } : {};

    const [
      totalLogs,
      actionCounts,
      resourceCounts,
      recentActivity,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['resourceType'],
        where,
        _count: { resourceType: true },
        orderBy: { _count: { resourceType: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      topActions: actionCounts.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      topResources: resourceCounts.map((r) => ({
        resourceType: r.resourceType,
        count: r._count.resourceType,
      })),
      recentActivity,
    };
  }
}
