import 'server-only';

import { google } from 'googleapis';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

async function getStorageAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')
    ?.replace(/"$/, '')
    ?.replace(/\\n/g, '\n')
    ?.replace(/\\"/g, '"')
    ?.trim();

  if (!clientEmail || !privateKey) {
    throw new Error('Google service account credentials not configured');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
  });
}

export async function uploadImageToGCS(
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }

  const auth = await getStorageAuth();
  const storage = google.storage({ version: 'v1', auth });

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `products/${timestamp}-${random}.webp`;

  await storage.objects.insert({
    bucket: BUCKET_NAME,
    name: filename,
    media: {
      mimeType: contentType,
      body: bufferToStream(buffer),
    },
    requestBody: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

function bufferToStream(buffer: Buffer) {
  const { Readable } = require('stream') as typeof import('stream');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
