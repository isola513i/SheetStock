import 'server-only';

import { google } from 'googleapis';
import type { AccessTier, AppUser, UserRole } from '@/lib/types';
import { setUsersCache } from './auth';
import { getGoogleSheetsAuth } from './google-auth';

// --- Types ---

export type UserRecord = {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  password: string;
  status: string;
};

// --- Cache ---

let usersCache: { data: UserRecord[]; timestamp: number } | null = null;
const USERS_CACHE_TTL = 5 * 60_000; // 5 minutes

export function invalidateUsersCache() {
  usersCache = null;
}


function safe(value: string | null | undefined): string {
  return value == null || value === '' ? '' : String(value);
}

// --- Read ---

export async function loadUsersFromSheet(): Promise<UserRecord[]> {
  if (usersCache && Date.now() - usersCache.timestamp < USERS_CACHE_TTL) {
    return usersCache.data;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) return [];

  try {
    const auth = getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4' });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:F',
      auth,
    });

    const rows = (response.data.values ?? []) as (string | undefined | null)[][];
    if (rows.length <= 1) { usersCache = { data: [], timestamp: Date.now() }; return []; }

    const users = rows.slice(1).map((row) => ({
      id: safe(row[0]),
      phone: safe(row[1]),
      name: safe(row[2]),
      role: (safe(row[3]) || 'customer') as UserRole,
      password: safe(row[4]),
      status: safe(row[5]) || 'active',
    })).filter((u) => u.id && u.phone);

    usersCache = { data: users, timestamp: Date.now() };
    return users;
  } catch (error) {
    console.error('Failed to load users from Google Sheets', error);
    return usersCache?.data ?? [];
  }
}

// --- Write ---

export async function appendUserToSheet(user: UserRecord): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID not configured');

  const auth = getGoogleSheetsAuth();
  const sheets = google.sheets({ version: 'v4' });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Users!A:F',
    auth,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        user.id,
        user.phone,
        user.name,
        user.role,
        user.password,
        user.status,
      ]],
    },
  });

  invalidateUsersCache();
}

// --- Update specific fields ---

export async function updateUserFieldsInSheet(
  userId: string,
  updates: Partial<Pick<UserRecord, 'status' | 'role'>>,
): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) return false;

  const auth = getGoogleSheetsAuth();
  const sheets = google.sheets({ version: 'v4' });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Users!A:F',
    auth,
  });

  const rows = (response.data.values ?? []) as string[][];
  const rowIndex = rows.findIndex((row, idx) => idx > 0 && safe(row[0]) === userId);
  if (rowIndex === -1) return false;

  // Column mapping: D=role(3), F=status(5)
  const columnMap: Record<string, number> = { role: 3, status: 5 };

  for (const [field, value] of Object.entries(updates)) {
    const colIndex = columnMap[field];
    if (colIndex === undefined || value === undefined) continue;
    const colLetter = String.fromCharCode(65 + colIndex); // A=65
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Users!${colLetter}${rowIndex + 1}`,
      auth,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  }

  invalidateUsersCache();
  return true;
}

// --- Access Tier ---

const VALID_STATUSES = ['active', 'ดูสินค้า', 'ผู้เข้าถึงทั้งหมด'];

export function getUserAccessTier(user: { role: string; status: string }): AccessTier {
  if (user.role === 'admin' || user.role === 'sale') return 'vvip';
  const s = user.status;
  if (s === 'ผู้เข้าถึงทั้งหมด') return 'vvip';
  if (s === 'ดูสินค้า') return 'vip';
  if (s === 'active') return 'vip';
  return 'public';
}

// --- Queries ---

export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const users = await loadUsersFromSheet();
  const normalized = phone.trim().replace(/\D/g, '');
  return users.find((u) => u.phone.replace(/\D/g, '') === normalized) ?? null;
}

export async function phoneExistsInSheet(phone: string): Promise<boolean> {
  return (await findUserByPhone(phone)) !== null;
}

// --- Authentication ---

export async function authenticate(phone: string, password: string): Promise<AppUser | null> {
  const users = await loadUsersFromSheet();

  const normalized = phone.trim().replace(/\D/g, '');

  const matched = users.find((u) => {
    const statusOk = VALID_STATUSES.includes(u.status);
    return u.phone.replace(/\D/g, '') === normalized && statusOk;
  });
  if (!matched) return null;

  if (password !== matched.password) return null;

  // Update cache for findUserById in middleware
  setUsersCache(users.map((u) => ({
    id: u.id, phone: u.phone, name: u.name, role: u.role,
    password: u.password, status: u.status,
  })));

  return {
    id: matched.id,
    phone: matched.phone || undefined,
    name: matched.name,
    role: matched.role,
  };
}
