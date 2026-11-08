// apps/api/src/fastify/routes/storage.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { requirePermission } from '../plugins/rbac.plugin';

const GetUploadUrlSchema = z.object({
  folder: z.enum(['videos', 'notes', 'images', 'avatars', 'general']).default('general'),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(2 * 1024 * 1024 * 1024).optional(),
});

export const storageRoutes: FastifyPluginAsync = async (fastify) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'examly-media';
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let s3Client: S3Client | null = null;
  if (accountId && accessKeyId && secretAccessKey) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // POST /api/v1/storage/presigned-url (Protected)
  fastify.post(
    '/api/v1/storage/presigned-url',
    {
      preHandler: [fastify.authenticate, requirePermission('storage','upload')],
    },
    async (request, reply) => {
      const parsed = GetUploadUrlSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid upload parameters',
          errors: parsed.error.format(),
        });
      }

      const { folder, fileName, contentType, size } = parsed.data;
      if (folder === 'videos' || folder === 'notes') {
        await requirePermission(folder, 'create')(request,reply);
        if (reply.sent) return;
      }
      const allowed:Record<string,string[]>={videos:['video/mp4','video/webm'],notes:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'],images:['image/jpeg','image/png','image/webp'],avatars:['image/jpeg','image/png','image/webp'],general:['text/vtt','application/pdf','image/jpeg','image/png','image/webp']};
      if(!allowed[folder].includes(contentType))return reply.code(400).send({message:'Unsupported file type'});
      const limit=folder==='videos'?2*1024*1024*1024:folder==='notes'?20*1024*1024:5*1024*1024;
      if(size && size>limit)return reply.code(400).send({message:'File exceeds the upload limit'});
      const fileExtension = fileName.split('.').pop() || 'bin';
      const uniqueFileKey = `${folder}/${uuidv4()}.${fileExtension}`;

      // 1. Cloudflare R2 S3 Upload URL
      if (s3Client) {
        if(!publicUrlBase)return reply.code(503).send({message:'Media public URL is not configured'});
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: uniqueFileKey,
          ContentType: contentType,
          ...(size ? {ContentLength:size} : {}),
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        const publicUrl = publicUrlBase ? `${publicUrlBase}/${uniqueFileKey}` : uploadUrl.split('?')[0];

        return {
          uploadUrl,
          fileKey: uniqueFileKey,
          publicUrl,
        };
      }

      // 2. Supabase Storage REST Upload URL
      if (supabaseUrl && supabaseServiceKey) {
        const bucket = 'examly-media';
        const signed = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${uniqueFileKey}`,{method:'POST',headers:{Authorization:`Bearer ${supabaseServiceKey}`,apikey:supabaseServiceKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
        if(!signed.ok)return reply.code(503).send({message:'Storage could not authorize the upload'});
        const result = await signed.json() as {url?:string};
        if(!result.url)return reply.code(503).send({message:'Storage did not return a signed upload URL'});
        const uploadUrl = `${supabaseUrl}/storage/v1${result.url}`;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFileKey}`;

        return {
          uploadUrl,
          fileKey: uniqueFileKey,
          publicUrl,
        };
      }

      return reply.code(503).send({message:'Media storage is not configured'});
    },
  );
};
