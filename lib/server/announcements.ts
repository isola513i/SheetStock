import 'server-only';

import { google } from 'googleapis';
import { getGoogleSheetsAuth } from '@/lib/server/google-auth';
import type { AnnouncementItem } from '@/lib/types';

const ANNOUNCEMENT_LIMIT = 3;
const ANNOUNCEMENT_CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60_000 : 30_000;

let announcementCache: { data: AnnouncementItem[]; timestamp: number } | null = null;
let announcementMemoryStore: AnnouncementItem[] = [];

function getAnnouncementsRange() {
  return process.env.GOOGLE_ANNOUNCEMENTS_RANGE ?? 'ประกาศ!A:B';
}

function getAnnouncementsSheetName() {
  return getAnnouncementsRange().split('!')[0] || 'ประกาศ';
}

function normalizeAnnouncementText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEnabledFlag(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '' || normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === 'เปิด' || normalized === 'active';
}

function toAnnouncementItem(text: string, order: number): AnnouncementItem {
  return {
    id: `announcement-${order + 1}`,
    text,
    order,
  };
}

async function ensureAnnouncementSheet(spreadsheetId: string) {
  const auth = getGoogleSheetsAuth();
  const sheets = google.sheets({ version: 'v4' });
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    auth,
    fields: 'sheets.properties.title',
  });

  const targetTitle = getAnnouncementsSheetName();
  const hasSheet = (metadata.data.sheets ?? []).some((sheet) => sheet.properties?.title === targetTitle);
  if (hasSheet) return { auth, sheets };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    auth,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: targetTitle,
              gridProperties: { rowCount: ANNOUNCEMENT_LIMIT + 1, columnCount: 2 },
            },
          },
        },
      ],
    },
  });

  return { auth, sheets };
}

export function invalidateAnnouncementCache() {
  announcementCache = null;
}

export async function loadAnnouncements(): Promise<AnnouncementItem[]> {
  if (announcementCache && Date.now() - announcementCache.timestamp < ANNOUNCEMENT_CACHE_TTL) {
    return announcementCache.data;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!spreadsheetId || !clientEmail || !privateKey) {
    return announcementMemoryStore;
  }

  try {
    const auth = getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4' });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: getAnnouncementsRange(),
      auth,
    });
    const rows = (response.data.values ?? []) as (string | undefined | null)[][];
    const items = rows
      .slice(1, ANNOUNCEMENT_LIMIT + 1)
      .map((row, order) => {
        const text = normalizeAnnouncementText(row[0]);
        const enabled = isEnabledFlag(row[1]);
        return text && enabled ? toAnnouncementItem(text, order) : null;
      })
      .filter((item): item is AnnouncementItem => Boolean(item));

    announcementCache = { data: items, timestamp: Date.now() };
    announcementMemoryStore = items;
    return items;
  } catch (error) {
    console.error('Failed to load announcements from Google Sheets', error);
    return announcementCache?.data ?? announcementMemoryStore;
  }
}

export async function saveAnnouncements(messages: string[]): Promise<AnnouncementItem[]> {
  const nextItems = messages
    .slice(0, ANNOUNCEMENT_LIMIT)
    .map((message) => normalizeAnnouncementText(message))
    .filter(Boolean)
    .map((text, order) => toAnnouncementItem(text, order));

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!spreadsheetId || !clientEmail || !privateKey) {
    announcementMemoryStore = nextItems;
    announcementCache = { data: nextItems, timestamp: Date.now() };
    return nextItems;
  }

  const { auth, sheets } = await ensureAnnouncementSheet(spreadsheetId);
  const rows = Array.from({ length: ANNOUNCEMENT_LIMIT }, (_, index) => {
    const item = nextItems[index];
    return [item?.text ?? '', item ? 'TRUE' : 'FALSE'];
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${getAnnouncementsSheetName()}!A1:B${ANNOUNCEMENT_LIMIT + 1}`,
    auth,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['ข้อความประกาศ', 'เปิดใช้งาน'],
        ...rows,
      ],
    },
  });

  announcementMemoryStore = nextItems;
  announcementCache = { data: nextItems, timestamp: Date.now() };
  return nextItems;
}
