// apps/api/src/fastify/routes/auth.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { RecordStatus, RoleType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { recoveryConfiguration, sendPasswordRecovery } from './password-recovery';

const LoginSchema = z
  .object({
    identifier: z.string().min(2).optional(),
    email: z.string().min(2).optional(),
    password: z.string().min(4),
  })
  .refine((d) => d.identifier || d.email, {
    message: 'Either identifier or email is required',
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
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
}).refine((data) => data.idToken || data.accessToken, {
  message: 'Either idToken or accessToken must be provided',
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email(),
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


  function generateTokens(user: { id: string; instituteId?: string | null; role: { code: string } }) {
    const payload = {
      sub: user.id,
      userId: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
    };

    const accessToken = jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id }, getRefreshSecret(), { expiresIn: '7d', jwtid: crypto.randomUUID() });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  // Keep authentication responses intentional. Prisma user records include
  // credential fields and must never be returned directly to a browser.
  const publicUser = (user: any) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    identifier: user.identifier,
    avatarUrl: user.avatarUrl,
    role: user.role?.code,
    instituteId: user.instituteId,
    instituteName: user.institute?.name,
    studentProfile: user.studentProfile,
    teacherProfile: user.teacherProfile,
  });

  // ── 1. LOGIN ──
  const saveSession = async (userId: string, refreshToken: string, request: any) => {
    await fastify.prisma.userSession.create({ data: {
      userId, refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      ipAddress: request.ip, deviceInfo: request.headers['user-agent'] || 'Unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } });
  };

  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, message: 'Invalid credentials payload' });
    }

    const rawId = (parsed.data.identifier || parsed.data.email || '').trim();
    const cleanIdentifier = rawId.toLowerCase();
    const password = parsed.data.password;

    const user = await fastify.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { phone: cleanIdentifier },
          { identifier: rawId },
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

    await saveSession(user.id, tokens.refreshToken, request);

    return {
      user: publicUser(user),
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
    if (dto.batchId) return reply.code(403).send({ message: 'Batch enrollment must be assigned by your institute administrator.' });
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
    await saveSession(user.id, tokens.refreshToken, request);

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
    if (parsed.data.idToken) {
      try {
        const allowedAudiences = [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
        ].filter(Boolean) as string[];

        if (allowedAudiences.length === 0) {
          return reply.status(503).send({ statusCode: 503, message: 'Google sign-in is not configured on the server' });
        }
        const ticket = await googleClient.verifyIdToken({
          idToken: parsed.data.idToken,
          audience: allowedAudiences,
        });
        payload = ticket.getPayload();
      } catch (err: any) {
        return reply.status(401).send({ statusCode: 401, message: 'Google token verification failed' });
      }
    }

    if (!payload && parsed.data.accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${parsed.data.accessToken}` },
        });
        if (res.ok) {
          payload = await res.json();
        }
      } catch (err: any) {
        payload = null;
      }
    }

    if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
      return reply.status(401).send({ statusCode: 401, message: 'Google authentication failed or signature invalid' });
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

    if (user && (!user.googleId || !user.avatarUrl)) {
      try {
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || payload.sub,
            avatarUrl: user.avatarUrl || payload.picture || null,
          },
        });
      } catch {}
    }

    // Google proves identity but must not create an enrolled Student account.
    // Student accounts, their batch membership, and their account status are
    // managed by authorized staff in Examly.
    if (!user) {
      return reply.status(403).send({
        statusCode: 403,
        message: 'No active Examly account is linked to this Google email. Contact your institute administrator.',
      });
    }

    const tokens = generateTokens(user);
    await saveSession(user.id, tokens.refreshToken, request);

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
        include: { role: true, institute: true },
      });

      if (!user || user.status !== RecordStatus.ACTIVE || (user.role.code !== RoleType.SUPER_ADMIN && user.institute?.status !== RecordStatus.ACTIVE)) {
        return reply.status(401).send({ statusCode: 401, message: 'User is inactive or deleted' });
      }

      const sessions = await fastify.prisma.userSession.findMany({
        where: { userId: user.id, isActive: true, expiresAt: { gt: new Date() } },
      });
      const hash = crypto.createHash('sha256').update(parsed.data.refreshToken).digest('hex');
      let session;
      for (const candidate of sessions) {
        const matches = candidate.refreshTokenHash.startsWith('$2')
          ? await bcrypt.compare(parsed.data.refreshToken, candidate.refreshTokenHash)
          : candidate.refreshTokenHash === hash;
        if (matches) { session = candidate; break; }
      }
      if (!session) return reply.code(401).send({ message: 'Session expired or revoked. Please sign in again.' });
      const tokens = generateTokens(user);
      const rotated = await fastify.prisma.userSession.updateMany({
        where: { id: session.id, isActive: true, refreshTokenHash: session.refreshTokenHash, expiresAt: { gt: new Date() } },
        data: { refreshTokenHash: crypto.createHash('sha256').update(tokens.refreshToken).digest('hex'), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });
      if (rotated.count !== 1) return reply.code(401).send({ message: 'Session has already been renewed. Please sign in again.' });
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
  fastify.post('/api/v1/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const config = recoveryConfiguration();
    if (!config) {
      fastify.log.error({ event: 'PASSWORD_RECOVERY_CONFIGURATION_MISSING' }, 'Check FRONTEND_URL and the selected email provider credentials/sender');
      return reply.code(503).send({ message: 'Password recovery is temporarily unavailable. Please try again later.' });
    }
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Enter a valid email address.' });
    const user = await fastify.prisma.user.findFirst({
      where: { email: parsed.data.email.trim().toLowerCase(), status: RecordStatus.ACTIVE },
    });
    if (user) {
      try {
        await sendPasswordRecovery(fastify, user, config, request.ip);
      } catch {
        fastify.log.error({ event: 'PASSWORD_RESET_DELIVERY_FAILED' }, 'Password reset delivery failed; inspect provider configuration and delivery logs');
        // Keep account-specific delivery failures private to prevent enumeration.
      }
    }
    return { message: 'If this email belongs to an active account, you will receive a password reset link. Check your inbox and spam folder.' };
  });

  // ── 7. RESET PASSWORD ──
  fastify.post('/api/v1/auth/reset-password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
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
    try {
      await fastify.prisma.$transaction(async (tx) => {
        // Lock the user row first so resets using different links serialize.
        const updated = await tx.user.updateMany({ where: { id: tokenRecord.userId, status: RecordStatus.ACTIVE }, data: { passwordHash } });
        const claimed = await tx.passwordResetToken.updateMany({
          where: { id: tokenRecord.id, isConsumed: false, expiresAt: { gt: new Date() } },
          data: { isConsumed: true, consumedAt: new Date() },
        });
        if (updated.count !== 1 || claimed.count !== 1) throw Object.assign(new Error('Reset link has expired or already been used. Please request a new link.'), { statusCode: 400 });
        await tx.passwordResetToken.updateMany({ where: { userId: tokenRecord.userId, isConsumed: false }, data: { isConsumed: true, consumedAt: new Date() } });
        await tx.userSession.updateMany({ where: { userId: tokenRecord.userId, isActive: true }, data: { isActive: false } });
      });
    } catch (error: any) {
      if (error.statusCode === 400) return reply.code(400).send({ message: error.message });
      throw error;
    }

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
      if (dto.batchId !== undefined) {
        const existing = await fastify.prisma.studentProfile.findUnique({ where: { userId: user.userId }, select: { batchId: true } });
        if ((dto.batchId || null) !== (existing?.batchId || null)) {
          return reply.code(403).send({ message: 'Batch enrollment must be assigned by your institute administrator.' });
        }
      }

      const phone = dto.phone?.trim();
      if (phone) {
        const phoneOwner = await fastify.prisma.user.findFirst({
          where: { phone, id: { not: user.userId } },
          select: { id: true },
        });
        if (phoneOwner) {
          return reply.code(409).send({ message: 'This phone number is already used by another account. Please use a different number.' });
        }
      }

      try {
        await fastify.prisma.user.update({
          where: { id: user.userId },
          data: {
            fullName: dto.fullName?.trim() || undefined,
            phone: phone || undefined,
          },
        });
      } catch (error: any) {
        // A concurrent request can claim the number after the availability check.
        if (error?.code === 'P2002') {
          return reply.code(409).send({ message: 'This phone number is already used by another account. Please use a different number.' });
        }
        throw error;
      }

      if (user.roleCode === RoleType.STUDENT) {
        await fastify.prisma.studentProfile.upsert({
          where: { userId: user.userId },
          create: {
            userId: user.userId,
            rollNumber: dto.rollNumber?.trim() || `STU-${Math.floor(10000 + Math.random() * 90000)}`,
            batchId: null,
            province: dto.province || 'Bagmati',
            district: dto.district || 'Kathmandu',
            municipality: dto.municipality || 'Kathmandu Metropolitan City',
            wardNumber: dto.wardNumber || '04',
            parentPhone: dto.parentPhone || null,
          },
          update: {
            rollNumber: dto.rollNumber?.trim() || undefined,
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
        user: publicUser(updated),
      };
    },
  );
};
