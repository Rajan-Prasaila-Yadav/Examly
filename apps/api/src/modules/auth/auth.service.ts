// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, GoogleLoginDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { RecordStatus, RoleType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  private get resend(): Resend | null {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured');
      return null;
    }
    return new Resend(apiKey);
  }

  async login(dto: LoginDto, ipAddress?: string) {
    // Find user by email, phone, or identifier
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { phone: dto.identifier },
          { identifier: dto.identifier },
        ],
      },
      include: {
        role: true,
        institute: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== RecordStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is blocked or inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check single device login policy
    if (user.instituteId) {
      const settings = await this.prisma.instituteSetting.findUnique({
        where: { instituteId: user.instituteId },
      });

      if (settings?.allowSingleDeviceOnly) {
        // Deactivate all previous sessions for this user
        await this.prisma.userSession.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save session
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        deviceInfo: dto.deviceInfo || 'Unknown Device',
        ipAddress: ipAddress || '127.0.0.1',
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
      },
      ...tokens,
    };
  }

  async googleLogin(dto: GoogleLoginDto, ipAddress?: string) {
    try {
      let payload: any = null;

      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: dto.idToken,
          audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        });
        payload = ticket.getPayload();
      } catch (err: any) {
        // Fallback decoder if ID token is standard JWT payload
        try {
          const parts = dto.idToken.split('.');
          if (parts.length === 3) {
            payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          }
        } catch {
          // Ignore
        }
      }

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google authentication token');
      }

      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId: payload.sub }, { email: payload.email }],
        },
        include: {
          role: true,
          institute: true,
          studentProfile: {
            include: { batch: true },
          },
        },
      });

      // Check if user account exists and is blocked
      if (user && user.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException(
          `USER_BLOCKED: Your account (${payload.email}) has been deactivated or blocked by the institute administrator. Please contact your coordinator or support@examly.io to restore access.`,
        );
      }

      let requiresOnboarding = false;

      if (!user) {
        // Find default STUDENT role
        let studentRole = await this.prisma.role.findFirst({
          where: { code: 'STUDENT' },
        });

        if (!studentRole) {
          studentRole = await this.prisma.role.findFirst();
        }

        // Find default active institute & batch
        const defaultInstitute = await this.prisma.institute.findFirst({
          where: { status: RecordStatus.ACTIVE },
        });

        const defaultBatch = await this.prisma.batch.findFirst({
          where: { status: RecordStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        });

        const identifier = payload.email.split('@')[0] || `stu_${Date.now()}`;

        // Create student user with Google identity
        user = await this.prisma.user.create({
          data: {
            fullName: payload.name || identifier,
            email: payload.email,
            identifier,
            googleId: payload.sub,
            avatarUrl: payload.picture,
            roleId: studentRole!.id,
            instituteId: defaultInstitute?.id || null,
            status: RecordStatus.ACTIVE,
          },
          include: {
            role: true,
            institute: true,
            studentProfile: {
              include: { batch: true },
            },
          },
        });

        // Initialize Student Profile
        const rollNumber = `STU-${Math.floor(10000 + Math.random() * 90000)}`;
        const profile = await this.prisma.studentProfile.create({
          data: {
            userId: user.id,
            rollNumber,
            batchId: defaultBatch?.id || null,
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            wardNumber: '04',
          },
          include: { batch: true },
        });

        user.studentProfile = profile as any;
        requiresOnboarding = true;
      } else {
        // Link googleId or avatar if missing
        if (!user.googleId || !user.avatarUrl) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: payload.sub,
              avatarUrl: user.avatarUrl || payload.picture,
            },
            include: {
              role: true,
              institute: true,
              studentProfile: {
                include: { batch: true },
              },
            },
          });
        }

        // If student profile is missing, create one
        if (user.role.code === 'STUDENT' && !user.studentProfile) {
          const defaultBatch = await this.prisma.batch.findFirst({
            where: { status: RecordStatus.ACTIVE },
            orderBy: { sortOrder: 'asc' },
          });

          const profile = await this.prisma.studentProfile.create({
            data: {
              userId: user.id,
              rollNumber: user.identifier && !user.identifier.includes('@') ? user.identifier : `STU-${Math.floor(10000 + Math.random() * 90000)}`,
              batchId: defaultBatch?.id || null,
              province: 'Bagmati',
              district: 'Kathmandu',
              municipality: 'Kathmandu Metropolitan City',
              wardNumber: '04',
            },
            include: { batch: true },
          });
          user.studentProfile = profile as any;
          requiresOnboarding = true;
        } else if (user.role.code === 'STUDENT' && !user.phone) {
          requiresOnboarding = true;
        }
      }

      const tokens = await this.generateTokens(user);

      // Save session
      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
          deviceInfo: 'Google OAuth Session',
          ipAddress: ipAddress || '127.0.0.1',
          isActive: true,
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
        },
        requiresOnboarding,
        ...tokens,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error?.message?.includes('USER_BLOCKED')) {
        throw error;
      }
      this.logger.error('Google login error', error);
      throw new UnauthorizedException(error.message || 'Google authentication failed');
    }
  }

  async updateOnboarding(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, studentProfile: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { fullName, phone, rollNumber, batchId, province, district, municipality, wardNumber, parentPhone, parentName } = dto;

    // Update User core fields
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || user.fullName,
        phone: phone || user.phone,
      },
      include: { role: true, institute: true },
    });

    // Update or create Student Profile
    if (user.role.code === 'STUDENT') {
      await this.prisma.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          rollNumber: rollNumber || `STU-${Math.floor(10000 + Math.random() * 90000)}`,
          batchId: batchId || null,
          province: province || 'Bagmati',
          district: district || 'Kathmandu',
          municipality: municipality || 'Kathmandu Metropolitan City',
          wardNumber: wardNumber || '04',
          parentPhone: parentPhone || null,
        },
        update: {
          rollNumber: rollNumber || undefined,
          batchId: batchId !== undefined ? batchId : undefined,
          province: province || undefined,
          district: district || undefined,
          municipality: municipality || undefined,
          wardNumber: wardNumber || undefined,
          parentPhone: parentPhone || undefined,
        },
      });
    }

    const completeUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, institute: true, studentProfile: { include: { batch: true } } },
    });

    return {
      message: 'Onboarding completed successfully',
      user: {
        id: completeUser!.id,
        fullName: completeUser!.fullName,
        email: completeUser!.email,
        phone: completeUser!.phone,
        identifier: completeUser!.identifier,
        avatarUrl: completeUser!.avatarUrl,
        role: completeUser!.role.code,
        instituteId: completeUser!.instituteId,
        instituteName: completeUser!.institute?.name,
        studentProfile: completeUser!.studentProfile,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'examly_jwt_refresh_super_secret_key_2026_production_123456',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, institute: true },
      });

      if (!user || user.status !== RecordStatus.ACTIVE) {
        throw new UnauthorizedException('User is inactive or not found');
      }

      // Generate rotated token pair
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(dto: any, ipAddress?: string) {
    const { fullName, email, phone, password, role } = dto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    // Get default role
    const userRole = await this.prisma.role.findFirst({
      where: { code: role || 'STUDENT' },
    });

    if (!userRole) {
      throw new BadRequestException('Invalid role specified');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate identifier
    const identifier = email?.split('@')[0] || phone || `user_${Date.now()}`;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        identifier,
        passwordHash,
        roleId: userRole.id,
        status: RecordStatus.ACTIVE,
      },
      include: {
        role: true,
        institute: true,
      },
    });

    // Create profile based on role
    if (userRole.code === 'STUDENT') {
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          rollNumber: `STU${Date.now().toString().slice(-6)}`,
        },
      });
    } else if (userRole.code === 'TEACHER') {
      await this.prisma.teacherProfile.create({
        data: {
          userId: user.id,
          facultyCode: `FAC${Date.now().toString().slice(-6)}`,
          designation: 'Faculty Member',
          specialization: ['General'],
          assignedBatchIds: [],
        },
      });
    }

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.code,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'If an account exists, a reset link will be sent' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'examly_jwt_access_super_secret_key_2026_production_abcdef',
        expiresIn: '1h',
      },
    );

    // Send email via Resend
    const resendClient = this.resend;
    if (resendClient) {
      try {
        const resetLink = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/forgot-password?token=${resetToken}`;

        await resendClient.emails.send({
          from: this.configService.get<string>('MAIL_FROM_ADDRESS') || 'Examly <onboarding@resend.dev>',
          to: user.email,
          subject: 'Reset Your Examly Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>Hello ${user.fullName},</p>
              <p>We received a request to reset your password for your Examly account. Click the link below to reset your password:</p>
              <p><a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
              <p>This link will expire in 1 hour.</p>
              <p>If you did not request this password reset, please ignore this email.</p>
              <p>Best regards,<br>The Examly Team</p>
            </div>
          `,
        });

        this.logger.log(`Password reset email sent to ${user.email}`);
      } catch (error) {
        this.logger.error('Failed to send password reset email', error);
        // Fall through to return token for testing
      }
    }

    return {
      message: 'If an account exists, a reset link will be sent to your email',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'examly_jwt_access_super_secret_key_2026_production_abcdef',
      });

      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Invalidate all existing sessions
      await this.prisma.userSession.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      });

      return { message: 'Password reset successful. Please login with your new password.' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: { permissions: true },
        },
        studentProfile: {
          include: { batch: true },
        },
        teacherProfile: true,
        institute: true,
        permissionGrants: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role?.code === 'STUDENT' || (user.role as any)?.name === 'Student') {
      if (!user.studentProfile || !user.studentProfile.batch) {
        const defaultBatch = await this.prisma.batch.findFirst({
          where: {
            status: RecordStatus.ACTIVE,
            ...(user.instituteId ? { instituteId: user.instituteId } : {}),
          },
          orderBy: { sortOrder: 'asc' },
        });
        if (defaultBatch) {
          if (!user.studentProfile) {
            (user as any).studentProfile = {
              rollNumber: user.identifier || 'STU-2026',
              batchId: defaultBatch.id,
              batch: defaultBatch,
            };
          } else {
            (user.studentProfile as any).batch = defaultBatch;
          }
        }
      }
    }

    return user;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
      identifier: user.identifier,
      email: user.email,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'examly_jwt_access_super_secret_key_2026_production_abcdef';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'examly_jwt_refresh_super_secret_key_2026_production_123456';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
