// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { RecordStatus } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  instituteId?: string;
  roleCode: string;
  identifier: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'examly_jwt_access_super_secret_key_2026_production_abcdef',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken) {
      const isBlacklisted = await this.cache.isTokenBlacklisted(rawToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== RecordStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive or blocked');
    }

    return {
      userId: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
      identifier: user.identifier,
      email: user.email,
    };
  }
}
