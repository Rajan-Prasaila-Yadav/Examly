// apps/api/src/modules/auth/dto/login.dto.ts
import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@examly.app', description: 'Email, Phone number, or Student/Admin ID' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'Admin@Examly2026!', description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false, example: 'Windows Chrome / Android 14' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
