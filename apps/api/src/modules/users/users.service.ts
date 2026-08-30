// apps/api/src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  CreateTeacherDto,
  UpdateTeacherDto,
  UpdateUserStatusDto,
  UpdateTeacherPermissionsDto,
} from './dto/create-student.dto';
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

    const students = await this.prisma.user.findMany({
      where,
      include: {
        studentProfile: {
          include: {
            batch: { select: { id: true, name: true, code: true, status: true } },
          },
        },
        _count: { select: { testAttempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return students.map((stu) => {
      let sp = stu.studentProfile;
      if (sp?.batch && (sp.batch.status === RecordStatus.DELETED || (sp.batch as any).status === 'DELETED')) {
        sp = {
          ...sp,
          batchId: null,
          batch: null,
        } as any;
      }
      return {
        ...stu,
        studentProfile: sp,
      };
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

    const rollNumber = dto.rollNumber?.trim() || `RN-${Math.floor(10000 + Math.random() * 90000)}`;
    const identifier = rollNumber;
    const password = dto.password || `Examly@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        instituteId,
        roleId: studentRole.id,
        identifier,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        passwordHash,
        status: RecordStatus.ACTIVE,
        studentProfile: {
          create: {
            rollNumber,
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

  async updateStudent(id: string, dto: UpdateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName : user.fullName,
        phone: dto.phone !== undefined ? dto.phone : user.phone,
        email: dto.email !== undefined ? dto.email : user.email,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : user.avatarUrl,
        identifier: dto.rollNumber?.trim() || user.identifier,
        studentProfile: {
          upsert: {
            create: {
              rollNumber: dto.rollNumber?.trim() || `RN-${Math.floor(10000 + Math.random() * 90000)}`,
              batchId: dto.batchId,
              parentPhone: dto.parentPhone,
              province: dto.province,
              district: dto.district,
              municipality: dto.municipality,
              wardNumber: dto.wardNumber,
            },
            update: {
              rollNumber: dto.rollNumber !== undefined ? dto.rollNumber : user.studentProfile?.rollNumber,
              batchId: dto.batchId !== undefined ? dto.batchId : user.studentProfile?.batchId,
              parentPhone: dto.parentPhone !== undefined ? dto.parentPhone : user.studentProfile?.parentPhone,
              province: dto.province !== undefined ? dto.province : user.studentProfile?.province,
              district: dto.district !== undefined ? dto.district : user.studentProfile?.district,
              municipality: dto.municipality !== undefined ? dto.municipality : user.studentProfile?.municipality,
              wardNumber: dto.wardNumber !== undefined ? dto.wardNumber : user.studentProfile?.wardNumber,
            },
          },
        },
      },
      include: {
        studentProfile: { include: { batch: true } },
      },
    });

    return updated;
  }

  async assignStudentBatch(userIdOrProfileId: string, batchId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrProfileId },
          { studentProfile: { id: userIdOrProfileId } },
          { identifier: userIdOrProfileId },
        ],
      },
      include: { studentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('Target batch not found');
    }

    const updatedProfile = await this.prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        rollNumber: user.identifier && !user.identifier.includes('@') ? user.identifier : `RN-${Math.floor(10000 + Math.random() * 90000)}`,
        batchId: batch.id,
      },
      update: {
        batchId: batch.id,
      },
      include: {
        batch: true,
      },
    });

    return {
      message: `Student successfully assigned to batch "${batch.name}"`,
      studentProfile: updatedProfile,
      batch,
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

    const facultyCode = dto.facultyCode?.trim() || `TCH-${Math.floor(100 + Math.random() * 900)}`;
    const identifier = facultyCode;
    const password = dto.password || `Teacher@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        instituteId,
        roleId: teacherRole.id,
        identifier,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        passwordHash,
        status: RecordStatus.ACTIVE,
        teacherProfile: {
          create: {
            facultyCode,
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

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { teacherProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Teacher not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName : user.fullName,
        phone: dto.phone !== undefined ? dto.phone : user.phone,
        email: dto.email !== undefined ? dto.email : user.email,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : user.avatarUrl,
        identifier: dto.facultyCode?.trim() || user.identifier,
        teacherProfile: {
          upsert: {
            create: {
              facultyCode: dto.facultyCode?.trim() || `TCH-${Math.floor(100 + Math.random() * 900)}`,
              designation: dto.designation || 'Faculty Member',
              specialization: dto.specialization || [],
            },
            update: {
              facultyCode: dto.facultyCode !== undefined ? dto.facultyCode : user.teacherProfile?.facultyCode,
              designation: dto.designation !== undefined ? dto.designation : user.teacherProfile?.designation,
              specialization: dto.specialization !== undefined ? dto.specialization : user.teacherProfile?.specialization,
            },
          },
        },
      },
      include: {
        teacherProfile: true,
      },
    });

    return updated;
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

  // ──────────────────────────────────────────────
  // 360° Profile Analytics
  // ──────────────────────────────────────────────

  async getStudent360(userIdOrProfileId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrProfileId },
          { studentProfile: { id: userIdOrProfileId } },
          { identifier: userIdOrProfileId },
          { email: userIdOrProfileId },
        ],
      },
      include: {
        role: true,
        studentProfile: {
          include: {
            batch: {
              include: {
                subjects: {
                  where: { status: { not: RecordStatus.DELETED } },
                  include: {
                    _count: { select: { lessons: true, tests: true } },
                  },
                },
              },
            },
          },
        },
        testAttempts: {
          include: {
            test: { select: { id: true, title: true, totalMarks: true, passMarks: true, durationMinutes: true } },
            result: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Student user not found');
    }

    const attempts = user.testAttempts || [];
    const completedAttempts = attempts.filter((a) => a.submittedAt || a.result);
    const totalAttempts = completedAttempts.length;
    const percentages = completedAttempts.map((a) => a.result?.percentage ?? (a.test.totalMarks > 0 ? ((a.result?.totalScore || 0) / a.test.totalMarks) * 100 : 0));

    const bestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;
    const avgPercentage =
      percentages.length > 0
        ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100
        : 0;
    const passedCount = completedAttempts.filter((a) => a.result?.isPassed || (a.result?.percentage || 0) >= 50).length;
    const failedCount = totalAttempts - passedCount;

    let studentProfile = user.studentProfile;
    if (studentProfile?.batch && (studentProfile.batch.status === RecordStatus.DELETED || (studentProfile.batch as any).status === 'DELETED')) {
      studentProfile = {
        ...studentProfile,
        batchId: null,
        batch: null,
      } as any;
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        identifier: user.identifier,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      studentProfile,
      metrics: {
        totalAttempts,
        bestPercentage,
        avgPercentage,
        passedCount,
        failedCount,
        passRate: totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0,
      },
      recentAttempts: completedAttempts.map((a) => ({
        id: a.id,
        testId: a.testId,
        testTitle: a.test.title,
        attemptNumber: a.attemptNumber,
        submittedAt: a.submittedAt,
        durationSeconds: a.durationSeconds,
        cheatStrikes: a.cheatStrikes,
        score: a.result?.totalScore ?? 0,
        totalMarks: a.test.totalMarks,
        percentage: a.result?.percentage ?? (a.test.totalMarks > 0 ? ((a.result?.totalScore || 0) / a.test.totalMarks) * 100 : 0),
        isPassed: a.result?.isPassed ?? (a.result?.percentage || 0) >= 50,
        correct: a.result?.totalCorrect ?? 0,
        wrong: a.result?.totalWrong ?? 0,
      })),
    };
  }

  async getTeacher360(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        teacherProfile: true,
        permissionGrants: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Teacher user not found');
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        identifier: user.identifier,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      teacherProfile: user.teacherProfile,
      permissionGrants: user.permissionGrants,
    };
  }
}
