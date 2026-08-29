// apps/api/src/modules/storage/storage.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StorageService } from './storage.service';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class GetUploadUrlDto {
  @ApiProperty({ example: 'videos', enum: ['videos', 'notes', 'images', 'avatars'] })
  @IsString()
  @IsIn(['videos', 'notes', 'images', 'avatars'])
  folder: 'videos' | 'notes' | 'images' | 'avatars';

  @ApiProperty({ example: 'mechanics_lecture.mp4' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

@ApiTags('Storage & Media Uploads (Cloudflare R2)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Get direct presigned upload URL for Cloudflare R2' })
  async getPresignedUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.storageService.getPresignedUploadUrl(dto.folder, dto.fileName, dto.contentType);
  }
}
