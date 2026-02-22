import { S3 } from 'aws-sdk';

export const s3 = new S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function uploadToS3(buffer: Buffer, key: string, mimetype: string): Promise<string> {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'private',
  };
  // If buffer is a stream, use S3 upload with stream
  if (buffer instanceof require('stream').Readable) {
    await s3.upload({ ...params, Body: buffer }).promise();
  } else {
    await s3.upload(params).promise();
  }
  return key;
}

export function getS3ObjectUrl(key: string): string {
  const bucket = process.env.AWS_S3_BUCKET;
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export function getSignedUrl(key: string, expires = 3600): string {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expires,
  });
}
