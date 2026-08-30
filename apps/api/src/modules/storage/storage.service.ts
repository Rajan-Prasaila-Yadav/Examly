// apps/api/src/modules/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;
  private supabaseUrl: string;
  private supabaseServiceKey: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || 'examly-media';
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') || '';

    this.supabaseUrl = (this.configService.get<string>('SUPABASE_URL') || '').replace(/\/$/, '');
    this.supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';

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
    } else if (this.supabaseUrl && this.supabaseServiceKey) {
      this.logger.log('✅ Supabase Storage REST Adapter initialized');
    } else {
      this.logger.warn('⚠️ Cloud storage credentials not set. Falling back to local storage stub.');
    }
  }

  async getPresignedUploadUrl(
    folder: 'videos' | 'notes' | 'images' | 'avatars' | 'general' = 'general',
    fileName: string,
    contentType: string,
  ): Promise<PresignedUrlResponse> {
    const fileExtension = fileName.split('.').pop() || 'bin';
    const uniqueFileKey = `${folder}/${uuidv4()}.${fileExtension}`;

    // 1. If R2 S3 is configured
    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: uniqueFileKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
      const publicUrl = this.publicUrl ? `${this.publicUrl}/${uniqueFileKey}` : uploadUrl.split('?')[0];

      return {
        uploadUrl,
        fileKey: uniqueFileKey,
        publicUrl,
      };
    }

    // 2. If Supabase Storage is configured
    if (this.supabaseUrl && this.supabaseServiceKey) {
      const bucket = 'examly-media';
      const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${bucket}/${uniqueFileKey}`;
      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFileKey}`;

      return {
        uploadUrl,
        fileKey: uniqueFileKey,
        publicUrl,
      };
    }

    // 3. Dev Fallback Mock
    return {
      uploadUrl: `http://localhost:4000/api/v1/storage/mock-upload/${uniqueFileKey}`,
      fileKey: uniqueFileKey,
      publicUrl: `https://pub-mock.r2.dev/${uniqueFileKey}`,
    };
  }

  async uploadFileBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = 'avatars',
  ): Promise<{ url: string; fileKey: string }> {
    const fileExtension = fileName.split('.').pop() || 'png';
    const uniqueFileKey = `${folder}/${uuidv4()}.${fileExtension}`;

    // 1. Upload via Supabase Storage REST
    if (this.supabaseUrl && this.supabaseServiceKey) {
      try {
        const bucket = 'examly-media';
        const url = `${this.supabaseUrl}/storage/v1/object/${bucket}/${uniqueFileKey}`;

        await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.supabaseServiceKey}`,
            apikey: this.supabaseServiceKey,
            'Content-Type': contentType || 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: new Uint8Array(buffer),
        });

        const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFileKey}`;
        return { url: publicUrl, fileKey: uniqueFileKey };
      } catch (err: any) {
        this.logger.warn(`Supabase Storage upload notice: ${err.message}`);
      }
    }

    // 2. Upload via R2 S3
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueFileKey,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        const publicUrl = this.publicUrl ? `${this.publicUrl}/${uniqueFileKey}` : `https://${this.bucketName}.r2.dev/${uniqueFileKey}`;
        return { url: publicUrl, fileKey: uniqueFileKey };
      } catch (err: any) {
        this.logger.error('R2 upload error', err);
      }
    }

    // 3. Fallback data URI for testing
    const base64 = buffer.toString('base64');
    return {
      url: `data:${contentType};base64,${base64}`,
      fileKey: uniqueFileKey,
    };
  }
}
