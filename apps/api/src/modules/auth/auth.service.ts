// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/modules/prisma/prisma.service';
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
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId: payload.sub }, { email: payload.email }],
        },
        include: { role: true, institute: true },
      });

      if (!user) {
        throw new UnauthorizedException('No account associated with this Google email. Please register first.');
      }

      if (user.status !== RecordStatus.ACTIVE) {
        throw new UnauthorizedException('Your account is blocked or inactive');
      }

      if (!user.googleId) {
        // Link googleId
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, avatarUrl: user.avatarUrl || payload.picture },
          include: { role: true, institute: true },
        });
      }

      const tokens = await this.generateTokens(user);

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
    } catch (error) {
      this.logger.error('Google login error', error);
      throw new UnauthorizedException('Google authentication failed');
    }
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
