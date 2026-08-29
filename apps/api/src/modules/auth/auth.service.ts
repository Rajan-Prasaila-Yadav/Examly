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
