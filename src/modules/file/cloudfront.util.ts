// Utility for CloudFront CDN URL generation

export function getCloudFrontUrl(key: string): string {
  const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  return `https://${cdnDomain}/${key}`;
}
