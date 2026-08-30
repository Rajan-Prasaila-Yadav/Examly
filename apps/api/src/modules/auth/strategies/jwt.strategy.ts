// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { RecordStatus } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  instituteId?: string;
  roleCode: string;
  identifier: string;
  email?: string;
}

interface CachedUserPayload {
  userId: string;
  instituteId: string | null;
  roleCode: string;
  identifier: string;
  email: string | null;
  status: RecordStatus;
  cachedAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private static userCache = new Map<string, CachedUserPayload>();
  private static readonly TTL_MS = 180 * 1000; // 3 minutes for lightning-fast sub-millisecond responses

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
    // 1. Check in-memory fast cache
    const cached = JwtStrategy.userCache.get(payload.sub);
    if (cached && Date.now() - cached.cachedAt < JwtStrategy.TTL_MS) {
      if (cached.status !== RecordStatus.ACTIVE) {
        throw new UnauthorizedException('User is inactive or blocked');
      }
      return {
        userId: cached.userId,
        instituteId: cached.instituteId,
        roleCode: cached.roleCode,
        identifier: cached.identifier,
        email: cached.email,
      };
    }

    // 2. Check blacklist
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken) {
      try {
        const isBlacklisted = await this.cache.isTokenBlacklisted(rawToken);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      } catch {
        // Continue if cache check errors
      }
    }

    // 3. Query DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== RecordStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive or blocked');
    }

    const result = {
      userId: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
      identifier: user.identifier,
      email: user.email,
    };

    // Cache valid payload
    JwtStrategy.userCache.set(payload.sub, {
      ...result,
      status: user.status,
      cachedAt: Date.now(),
    });

    return result;
  }
}
