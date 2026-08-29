// database/prisma/seed.ts
import { PrismaClient, RoleType, RecordStatus, PermissionScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Examly Database Seeding...');

  // 1. Create Default Platform Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { id: 'role-super-admin' },
    update: {},
    create: {
      id: 'role-super-admin',
      name: 'Super Administrator',
      code: RoleType.SUPER_ADMIN,
      description: 'Platform owner with unrestricted cross-institute access',
      isSystem: true,
    },
  });

  // 2. Create Sample Institute (Apex Medical Academy)
  const institute = await prisma.institute.upsert({
    where: { slug: 'apex-medical' },
    update: {},
    create: {
      id: 'inst-apex-medical',
      name: 'Apex Medical Academy',
      slug: 'apex-medical',
      subscriptionTier: 'PRO',
      maxStudents: 1000,
      status: RecordStatus.ACTIVE,
      settings: {
        create: {
          allowSingleDeviceOnly: true,
          dailyMessageLimit: 20,
          dailyImageLimit: 20,
          dailyPdfLimit: 20,
          maxFileSizeMb: 15,
          defaultTestPassPercent: 40.0,
          antiCheatDefaultLevel: 3,
        },
      },
    },
  });

  // 3. Create Default Institute Roles (Admin, Teacher, Student)
  const adminRole = await prisma.role.upsert({
    where: { id: 'role-admin' },
    update: {},
    create: {
      id: 'role-admin',
      instituteId: institute.id,
      name: 'Institute Administrator',
      code: RoleType.ADMIN,
      description: 'Full institute management access',
      isSystem: true,
    },
  });

  const teacherRole = await prisma.role.upsert({
    where: { id: 'role-teacher' },
    update: {},
    create: {
      id: 'role-teacher',
      instituteId: institute.id,
      name: 'Faculty Teacher',
      code: RoleType.TEACHER,
      description: 'Course content creator and test author',
      isSystem: true,
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { id: 'role-student' },
    update: {},
    create: {
      id: 'role-student',
      instituteId: institute.id,
      name: 'Enrolled Student',
      code: RoleType.STUDENT,
      description: 'Student learner and test taker',
      isSystem: true,
    },
  });

  // 4. Create Standard Teacher Role Permissions
  const teacherPermissions = [
    { resource: 'batches', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'subjects', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'lessons', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'videos', action: 'create', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'videos', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'videos', action: 'update', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'tests', action: 'create', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'tests', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'tests', action: 'update', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'tests', action: 'publish', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'students', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'community', action: 'create', scope: PermissionScope.INSTITUTE },
    { resource: 'community', action: 'read', scope: PermissionScope.INSTITUTE },
    { resource: 'chat', action: 'create', scope: PermissionScope.ASSIGNED_ONLY },
    { resource: 'chat', action: 'read', scope: PermissionScope.ASSIGNED_ONLY },
  ];

  for (const perm of teacherPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_resource_action: {
          roleId: teacherRole.id,
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: {
        roleId: teacherRole.id,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
      },
    });
  }

  // 5. Create / Update Primary Super Admin User (Rajan Prasaila)
  const defaultPasswordHash = await bcrypt.hash('Admin@Examly2026!', 10);

  // Check if super admin user exists by email or id
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'rajanprasaila@gmail.com' },
        { email: 'admin@examly.app' },
        { id: 'user-super-admin' },
      ],
    },
  });

  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        identifier: 'rajanprasaila@gmail.com',
        email: 'rajanprasaila@gmail.com',
        fullName: 'Rajan Prasaila (Super Admin)',
        passwordHash: defaultPasswordHash,
        roleId: superAdminRole.id,
        status: RecordStatus.ACTIVE,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        id: 'user-super-admin',
        roleId: superAdminRole.id,
        identifier: 'rajanprasaila@gmail.com',
        fullName: 'Rajan Prasaila (Super Admin)',
        email: 'rajanprasaila@gmail.com',
        phone: '+9779800000000',
        passwordHash: defaultPasswordHash,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  // 6. Create Demo Institute Admin User
  await prisma.user.upsert({
    where: { identifier: 'ADM-001' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: 'user-apex-admin',
      instituteId: institute.id,
      roleId: adminRole.id,
      identifier: 'ADM-001',
      fullName: 'Apex Admin Director',
      email: 'director@apexmedical.edu.np',
      phone: '+9779811111111',
      passwordHash: defaultPasswordHash,
      status: RecordStatus.ACTIVE,
    },
  });

  // 7. Create Demo Teacher User
  await prisma.user.upsert({
    where: { identifier: 'TCH-014' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: 'user-dr-mehta',
      instituteId: institute.id,
      roleId: teacherRole.id,
      identifier: 'TCH-014',
      fullName: 'Dr. Arun Mehta',
      email: 'arun.mehta@apexmedical.edu.np',
      phone: '+9779822222222',
      passwordHash: defaultPasswordHash,
      status: RecordStatus.ACTIVE,
      teacherProfile: {
        create: {
          facultyCode: 'TCH-014',
          designation: 'Senior Physics Faculty',
          specialization: ['Mechanics', 'Thermodynamics', 'Modern Physics'],
          assignedBatchIds: [],
        },
      },
    },
  });

  // 8. Create Demo Sample Batch (CEE 2026 Batch A)
  const batch = await prisma.batch.upsert({
    where: { id: 'batch-cee-2026-a' },
    update: {},
    create: {
      id: 'batch-cee-2026-a',
      instituteId: institute.id,
      name: 'CEE 2026 Batch A',
      code: 'CEE-A',
      description: 'Comprehensive entrance examination preparation batch for MBBS/BDS aspirants',
      priceNpr: 14999,
      status: RecordStatus.ACTIVE,
      sortOrder: 1,
    },
  });

  // 9. Create Demo Student User
  await prisma.user.upsert({
    where: { identifier: '12A-034' },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: 'user-aarav-sharma',
      instituteId: institute.id,
      roleId: studentRole.id,
      identifier: '12A-034',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+9779876543210',
      passwordHash: defaultPasswordHash,
      status: RecordStatus.ACTIVE,
      studentProfile: {
        create: {
          rollNumber: '12A-034',
          batchId: batch.id,
          parentPhone: '+9779876512345',
          province: 'Bagmati',
          district: 'Kathmandu',
          municipality: 'Kathmandu Metropolitan City',
          wardNumber: '04',
          isTrialActive: false,
        },
      },
    },
  });

  console.log('✅ Examly Database Seeding Completed Successfully!');
  console.log('👑 Super Admin: rajanprasaila@gmail.com / Admin@Examly2026!');
  console.log('🏫 Demo Institute Admin: director@apexmedical.edu.np / Admin@Examly2026!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
