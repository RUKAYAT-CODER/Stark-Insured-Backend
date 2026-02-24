import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

export async function uploadToS3(
  body: Buffer | Readable,
  key: string,
  mimetype: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: mimetype,
    ACL: 'private',
  });

  await s3Client.send(command);
  return key;
}

export function getS3ObjectUrl(key: string): string {
  const bucket = process.env.AWS_S3_BUCKET;
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return presign(s3Client, command, { expiresIn });
}
