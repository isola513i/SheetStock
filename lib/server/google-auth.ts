import 'server-only';

import { google } from 'googleapis';

export function getGoogleSheetsAuth() {
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export function getGoogleStorageAuth() {
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
