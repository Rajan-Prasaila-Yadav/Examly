// apps/api/src/modules/auth/dto/refresh-token.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Secure Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID Token from Google One-Tap / OAuth client' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
