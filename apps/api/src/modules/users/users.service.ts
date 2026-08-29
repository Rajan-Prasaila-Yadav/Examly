// apps/api/src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateStudentDto, CreateTeacherDto, UpdateUserStatusDto, UpdateTeacherPermissionsDto } from './dto/create-student.dto';
import * as bcrypt from 'bcrypt';
import { RecordStatus, RoleType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents(instituteId?: string, batchId?: string, search?: string) {
    const where: any = {
      role: { code: RoleType.STUDENT },
      status: { not: RecordStatus.DELETED },
    };

    if (instituteId) {
      where.instituteId = instituteId;
    }

    if (batchId) {
      where.studentProfile = { batchId };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      include: {
        studentProfile: {
          include: { batch: { select: { name: true, code: true } } },
        },
        _count: { select: { testAttempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeachers(instituteId?: string) {
    const where: any = {
      role: { code: RoleType.TEACHER },
      status: { not: RecordStatus.DELETED },
    };

    if (instituteId) {
      where.instituteId = instituteId;
    }

    return this.prisma.user.findMany({
      where,
      include: {
        teacherProfile: true,
        permissionGrants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStudent(instituteId: string | undefined, dto: CreateStudentDto) {
    const studentRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ instituteId: instituteId || undefined, code: RoleType.STUDENT }, { isSystem: true, code: RoleType.STUDENT }],
      },
    });

    if (!studentRole) {
      throw new BadRequestException('Student role not found');
    }

    const password = dto.password || `Examly@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        instituteId,
        roleId: studentRole.id,
        identifier: dto.rollNumber,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        status: RecordStatus.ACTIVE,
        studentProfile: {
          create: {
            rollNumber: dto.rollNumber,
            batchId: dto.batchId,
            parentPhone: dto.parentPhone,
            province: dto.province,
            district: dto.district,
            municipality: dto.municipality,
            wardNumber: dto.wardNumber,
          },
        },
      },
      include: {
        studentProfile: { include: { batch: true } },
      },
    });

    return {
      ...user,
      rawPassword: password,
    };
  }

  async createTeacher(instituteId: string | undefined, dto: CreateTeacherDto) {
    const teacherRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ instituteId: instituteId || undefined, code: RoleType.TEACHER }, { isSystem: true, code: RoleType.TEACHER }],
      },
    });

    if (!teacherRole) {
      throw new BadRequestException('Teacher role not found');
    }

    const password = dto.password || `Teacher@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        instituteId,
        roleId: teacherRole.id,
        identifier: dto.facultyCode,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        status: RecordStatus.ACTIVE,
        teacherProfile: {
          create: {
            facultyCode: dto.facultyCode,
            designation: dto.designation,
            specialization: dto.specialization || [],
            assignedBatchIds: dto.assignedBatchIds || [],
          },
        },
      },
      include: {
        teacherProfile: true,
      },
    });

    return {
      ...user,
      rawPassword: password,
    };
  }

  async updateUserStatus(userId: string, instituteId: string | undefined, dto: UpdateUserStatusDto) {
    const where: any = { id: userId };
    if (instituteId) {
      where.instituteId = instituteId;
    }

    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.status === 'BLOCKED' || dto.status === 'DELETED') {
      await this.prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status as RecordStatus },
    });
  }

  async updateTeacherPermissions(userId: string, instituteId: string | undefined, dto: UpdateTeacherPermissionsDto) {
    const where: any = { id: userId };
    if (instituteId) {
      where.instituteId = instituteId;
    }

    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    for (const grant of dto.permissions) {
      await this.prisma.permissionGrant.upsert({
        where: {
          userId_resource_action: {
            userId,
            resource: grant.resource,
            action: grant.action,
          },
        },
        update: { isAllowed: grant.isAllowed },
        create: {
          userId,
          resource: grant.resource,
          action: grant.action,
          isAllowed: grant.isAllowed,
        },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissionGrants: true },
    });
  }

  async getRoles(instituteId?: string) {
    return this.prisma.role.findMany({
      where: instituteId ? { OR: [{ instituteId }, { isSystem: true }] } : {},
      include: {
        permissions: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRoleMatrix(roleId: string, permissions: { resource: string; action: string }[]) {
    // Delete existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Bulk create updated matrix permissions
    if (permissions && permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          resource: p.resource,
          action: p.action,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });
  }
}
