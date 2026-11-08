// apps/api/src/fastify/routes/auth.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { RecordStatus, RoleType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

const LoginSchema = z.object({
  identifier: z.string().min(2),
  password: z.string().min(4),
});

const RegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(7).max(20).optional(),
  rollNumber: z.string().optional(),
  batchId: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  municipality: z.string().optional(),
  wardNumber: z.string().optional(),
  parentPhone: z.string().optional(),
});

const GoogleLoginSchema = z.object({
  idToken: z.string().min(10),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

const OnboardingSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  rollNumber: z.string().optional(),
  batchId: z.string().nullable().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  municipality: z.string().optional(),
  wardNumber: z.string().optional(),
  parentPhone: z.string().nullable().optional(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const getAccessSecret = () => {
    if (process.env.JWT_ACCESS_SECRET) return process.env.JWT_ACCESS_SECRET;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET must be configured in production');
    }
    return 'examly_local_development_access_secret_change_me';
  };
  const getRefreshSecret = () => {
    if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET must be configured in production');
    }
    return 'examly_local_development_refresh_secret_change_me';
  };

  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  function generateTokens(user: { id: string; instituteId?: string | null; role: { code: string } }) {
    const payload = {
      sub: user.id,
      userId: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
    };

    const accessToken = jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id }, getRefreshSecret(), { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  // ── 1. LOGIN ──
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid credentials payload' });
    }

    const { identifier, password } = parsed.data;
    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await fastify.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { phone: cleanIdentifier },
          { identifier: identifier.trim() },
        ],
      },
      include: {
        role: true,
        institute: true,
        studentProfile: { include: { batch: true } },
        teacherProfile: true,
      },
    });

    if (!user) {
      return reply.status(401).send({ statusCode: 401, message: 'Invalid identifier or password' });
    }

    if (user.status !== RecordStatus.ACTIVE) {
      return reply.status(401).send({ statusCode: 401, message: 'Account is blocked or deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return reply.status(401).send({ statusCode: 401, message: 'Invalid identifier or password' });
    }

    const tokens = generateTokens(user);

    // Create session
    const ip = request.ip || '127.0.0.1';
    const userAgent = request.headers['user-agent'] || 'Unknown';

    await fastify.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 8),
        ipAddress: ip,
        deviceInfo: userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        identifier: user.identifier,
        avatarUrl: user.avatarUrl,
        role: user.role.code,
        instituteId: user.instituteId,
        instituteName: user.institute?.name,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
      },
      ...tokens,
    };
  });

  // ── 2. REGISTER ──
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid registration payload', errors: parsed.error.format() });
    }

    const dto = parsed.data;
    const cleanEmail = dto.email.trim().toLowerCase();

    const existing = await fastify.prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existing) {
      return reply.status(409).send({ statusCode: 409, message: 'An account with this email already exists' });
    }

    let studentRole = await fastify.prisma.role.findFirst({ where: { code: RoleType.STUDENT } });
    if (!studentRole) {
      studentRole = await fastify.prisma.role.create({
        data: { name: 'Student', code: RoleType.STUDENT, description: 'Default Student Role' },
      });
    }

    const defaultInstitute = await fastify.prisma.institute.findFirst({ where: { status: RecordStatus.ACTIVE } });
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const rollNumber = dto.rollNumber?.trim() || `STU-${Math.floor(10000 + Math.random() * 90000)}`;

    const user = await fastify.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email: cleanEmail,
        phone: dto.phone?.trim() || null,
        identifier: rollNumber,
        passwordHash,
        roleId: studentRole.id,
        instituteId: defaultInstitute?.id || null,
        status: RecordStatus.ACTIVE,
        studentProfile: {
          create: {
            rollNumber,
            batchId: dto.batchId || null,
            province: dto.province || 'Bagmati',
            district: dto.district || 'Kathmandu',
            municipality: dto.municipality || 'Kathmandu Metropolitan City',
            wardNumber: dto.wardNumber || '04',
            parentPhone: dto.parentPhone || null,
          },
        },
      },
      include: {
        role: true,
        institute: true,
        studentProfile: { include: { batch: true } },
      },
    });

    const tokens = generateTokens(user);

    return reply.status(201).send({
      message: 'Registration successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        identifier: user.identifier,
        role: user.role.code,
        studentProfile: user.studentProfile,
      },
      ...tokens,
    });
  });

  // ── 3. GOOGLE OAUTH ──
  fastify.post('/api/v1/auth/google', async (request, reply) => {
    const parsed = GoogleLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid Google token payload' });
    }

    let payload: any = null;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: parsed.data.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      return reply.status(401).send({ statusCode: 401, message: 'Google signature verification failed' });
    }

    if (!payload || !payload.email) {
      return reply.status(401).send({ statusCode: 401, message: 'Google payload missing email' });
    }

    let user = await fastify.prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
      },
      include: {
        role: true,
        institute: true,
        studentProfile: { include: { batch: true } },
        teacherProfile: true,
      },
    });

    if (user && user.status !== RecordStatus.ACTIVE) {
      return reply.status(401).send({ statusCode: 401, message: 'Account is blocked or deactivated' });
    }

    if (!user) {
      let studentRole = await fastify.prisma.role.findFirst({ where: { code: RoleType.STUDENT } });
      if (!studentRole) {
        studentRole = await fastify.prisma.role.create({
          data: { name: 'Student', code: RoleType.STUDENT, description: 'Default Student Role' },
        });
      }

      const defaultInstitute = await fastify.prisma.institute.findFirst({ where: { status: RecordStatus.ACTIVE } });
      const rollNumber = `STU-G-${Math.floor(10000 + Math.random() * 90000)}`;

      user = await fastify.prisma.user.create({
        data: {
          fullName: payload.name || 'Google User',
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
          identifier: rollNumber,
          passwordHash: await bcrypt.hash(payload.sub + getAccessSecret(), 10),
          roleId: studentRole.id,
          instituteId: defaultInstitute?.id || null,
          status: RecordStatus.ACTIVE,
          studentProfile: {
            create: {
              rollNumber,
              province: 'Bagmati',
              district: 'Kathmandu',
              municipality: 'Kathmandu Metropolitan City',
              wardNumber: '04',
            },
          },
        },
        include: {
          role: true,
          institute: true,
          studentProfile: { include: { batch: true } },
          teacherProfile: true,
        },
      });
    }

    const tokens = generateTokens(user);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        identifier: user.identifier,
        avatarUrl: user.avatarUrl,
        role: user.role.code,
        instituteId: user.instituteId,
        instituteName: user.institute?.name,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
      },
      ...tokens,
    };
  });

  // ── 4. REFRESH TOKEN ──
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const parsed = RefreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid refresh token payload' });
    }

    try {
      const payload = jwt.verify(parsed.data.refreshToken, getRefreshSecret()) as any;
      if (!payload || !payload.sub) {
        return reply.status(401).send({ statusCode: 401, message: 'Malformed refresh token' });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user || user.status !== RecordStatus.ACTIVE) {
        return reply.status(401).send({ statusCode: 401, message: 'User is inactive or deleted' });
      }

      const tokens = generateTokens(user);
      return tokens;
    } catch (err) {
      return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired refresh token' });
    }
  });

  // ── 5. LOGOUT ──
  fastify.post(
    '/api/v1/auth/logout',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const user = request.user!;
      await fastify.prisma.userSession.updateMany({
        where: { userId: user.userId, isActive: true },
        data: { isActive: false },
      });

      return { message: 'Logged out successfully. All active sessions revoked.' };
    },
  );

  // ── 6. FORGOT PASSWORD ──
  fastify.post('/api/v1/auth/forgot-password', async (request) => {
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return { message: 'If an account exists, a password reset email will be sent.' };
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const user = await fastify.prisma.user.findFirst({
      where: { email: cleanEmail, status: RecordStatus.ACTIVE },
    });

    if (user) {
      // 1. Generate high-entropy 32-byte cryptographic random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // 2. Invalidate previous unused reset tokens for this user
      await fastify.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, isConsumed: false },
        data: { isConsumed: true, consumedAt: new Date() },
      });

      // 3. Persist hashed token with 1-hour expiration
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await fastify.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: request.ip || '127.0.0.1',
        },
      });

      // 4. Enqueue email job to BullMQ notification queue
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/forgot-password?token=${rawToken}`;
      const correlationId = `pwreset_${user.id}_${Date.now()}`;

      if (fastify.queues?.notificationsQueue) {
        await fastify.queues.notificationsQueue.add('send-email', {
          to: user.email,
          subject: 'Reset Your Examly Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0284c7;">Examly Password Reset</h2>
              <p>Hello <strong>${user.fullName}</strong>,</p>
              <p>We received a request to reset your Examly password. Click the button below to set a new password:</p>
              <p style="margin: 24px 0;">
                <a href="${resetLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
              </p>
              <p style="color: #64748b; font-size: 12px;">This link is single-use and expires in 60 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
          text: `Hello ${user.fullName}, reset your Examly password here: ${resetLink} (Expires in 60 minutes)`,
          correlationId,
          type: 'PASSWORD_RESET',
        });
      }

      fastify.log.info(
        { event: 'PASSWORD_RESET_TOKEN_CREATED', userId: user.id, correlationId },
        'Password reset token generated and notification job enqueued',
      );
    }

    return { message: 'If an account exists, a password reset email will be sent.' };
  });

  // ── 7. RESET PASSWORD ──
  fastify.post('/api/v1/auth/reset-password', async (request, reply) => {
    const parsed = ResetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid reset password payload' });
    }

    const { token, newPassword } = parsed.data;

    if (newPassword.length < 8) {
      return reply.status(400).send({
        statusCode: 400,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // 1. Hash incoming token to match stored SHA-256 hash
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // 2. Query persistent store
    const tokenRecord = await fastify.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // 3. Verify token existence, single-use consumed status, and expiration
    if (!tokenRecord || tokenRecord.isConsumed || tokenRecord.expiresAt < new Date()) {
      fastify.log.warn({ event: 'PASSWORD_RESET_TOKEN_REJECTED' }, 'Invalid, expired, or consumed reset token provided');
      return reply.status(400).send({
        statusCode: 400,
        message: 'Invalid or expired password reset token. Please request a new link.',
      });
    }

    if (!tokenRecord.user || tokenRecord.user.status !== RecordStatus.ACTIVE) {
      return reply.status(400).send({
        statusCode: 400,
        message: 'User account is inactive or not found.',
      });
    }

    // 4. Secure password hashing using bcrypt with 12 rounds
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // 5. Transactional execution: update password + consume token + revoke active sessions
    await fastify.prisma.$transaction([
      fastify.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      fastify.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { isConsumed: true, consumedAt: new Date() },
      }),
      fastify.prisma.userSession.updateMany({
        where: { userId: tokenRecord.userId, isActive: true },
        data: { isActive: false },
      }),
    ]);

    fastify.log.info(
      { event: 'PASSWORD_RESET_SUCCESS', userId: tokenRecord.userId },
      'Password reset completed successfully and all active sessions revoked',
    );

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  });

  // ── 8. GET CURRENT USER (/me) ──
  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const profile = await fastify.prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          role: true,
          institute: true,
          studentProfile: { include: { batch: true } },
          teacherProfile: true,
        },
      });

      if (!profile) {
        return reply.status(404).send({ statusCode: 404, message: 'User not found' });
      }

      return {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        identifier: profile.identifier,
        avatarUrl: profile.avatarUrl,
        role: profile.role.code,
        instituteId: profile.instituteId,
        instituteName: profile.institute?.name,
        permissions: user.permissions,
        cacheVersion:user.cacheVersion,
        roleId: user.roleId,
        studentProfile: profile.studentProfile,
        teacherProfile: profile.teacherProfile,
      };
    },
  );

  // ── 9. ONBOARDING ──
  fastify.patch(
    '/api/v1/auth/onboarding',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const parsed = OnboardingSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ statusCode: 400, message: 'Invalid onboarding payload' });
      }

      const dto = parsed.data;

      await fastify.prisma.user.update({
        where: { id: user.userId },
        data: {
          fullName: dto.fullName?.trim() || undefined,
          phone: dto.phone?.trim() || undefined,
        },
      });

      if (user.roleCode === RoleType.STUDENT) {
        await fastify.prisma.studentProfile.upsert({
          where: { userId: user.userId },
          create: {
            userId: user.userId,
            rollNumber: dto.rollNumber?.trim() || `STU-${Math.floor(10000 + Math.random() * 90000)}`,
            batchId: dto.batchId || null,
            province: dto.province || 'Bagmati',
            district: dto.district || 'Kathmandu',
            municipality: dto.municipality || 'Kathmandu Metropolitan City',
            wardNumber: dto.wardNumber || '04',
            parentPhone: dto.parentPhone || null,
          },
          update: {
            rollNumber: dto.rollNumber?.trim() || undefined,
            batchId: dto.batchId !== undefined ? dto.batchId : undefined,
            province: dto.province || undefined,
            district: dto.district || undefined,
            municipality: dto.municipality || undefined,
            wardNumber: dto.wardNumber || undefined,
            parentPhone: dto.parentPhone !== undefined ? dto.parentPhone : undefined,
          },
        });
      }

      const updated = await fastify.prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          role: true,
          institute: true,
          studentProfile: { include: { batch: true } },
          teacherProfile: true,
        },
      });

      return {
        message: 'Onboarding completed successfully',
        user: updated,
      };
    },
  );
};
