// apps/api/src/modules/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || 'examly-media';
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') || '';

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('✅ Cloudflare R2 Storage Adapter initialized');
    } else {
      this.logger.warn('⚠️ Cloudflare R2 credentials not set. Falling back to local storage stub.');
    }
  }

  async getPresignedUploadUrl(
    folder: 'videos' | 'notes' | 'images' | 'avatars',
    fileName: string,
    contentType: string,
  ): Promise<PresignedUrlResponse> {
    const fileExtension = fileName.split('.').pop() || 'bin';
    const uniqueFileKey = `${folder}/${uuidv4()}.${fileExtension}`;

    if (!this.s3Client) {
      // Mock upload URL for dev if credentials not yet supplied
      return {
        uploadUrl: `http://localhost:4000/api/v1/storage/mock-upload/${uniqueFileKey}`,
        fileKey: uniqueFileKey,
        publicUrl: `https://pub-mock.r2.dev/${uniqueFileKey}`,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueFileKey,
      ContentType: contentType,
    });

    // 15-minute expiration for direct client upload
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    const publicUrl = this.publicUrl ? `${this.publicUrl}/${uniqueFileKey}` : uploadUrl.split('?')[0];

    return {
      uploadUrl,
      fileKey: uniqueFileKey,
      publicUrl,
    };
  }
}
