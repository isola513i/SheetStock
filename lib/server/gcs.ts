import 'server-only';

import { Readable } from 'stream';
import { google } from 'googleapis';
import { getGoogleStorageAuth } from './google-auth';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

export async function uploadImageToGCS(
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }

  const auth = getGoogleStorageAuth();
  const storage = google.storage({ version: 'v1', auth });

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `products/${timestamp}-${random}.webp`;

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  await storage.objects.insert({
    bucket: BUCKET_NAME,
    name: filename,
    media: {
      mimeType: contentType,
      body: stream,
    },
    requestBody: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}
