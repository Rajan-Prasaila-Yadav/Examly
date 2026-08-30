// apps/api/src/modules/storage/storage.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class GetUploadUrlDto {
  @ApiProperty({ example: 'videos', enum: ['videos', 'notes', 'images', 'avatars', 'general'] })
  @IsString()
  @IsIn(['videos', 'notes', 'images', 'avatars', 'general'])
  folder: 'videos' | 'notes' | 'images' | 'avatars' | 'general';

  @ApiProperty({ example: 'mechanics_lecture.mp4' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class DirectUploadDto {
  @ApiProperty({ example: 'avatars', required: false })
  @IsOptional()
  @IsString()
  folder?: string;
}

@ApiTags('Storage & Media Uploads (Supabase & Cloudflare R2)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Get direct upload URL for client upload' })
  async getPresignedUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.storageService.getPresignedUploadUrl(dto.folder, dto.fileName, dto.contentType);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Direct multipart file upload to Supabase / Cloudflare Storage' })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() dto: DirectUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    return this.storageService.uploadFileBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      dto.folder || 'general',
    );
  }
}
