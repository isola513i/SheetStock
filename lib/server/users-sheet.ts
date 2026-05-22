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

export type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; reason: 'not_found' | 'invalid_password' | 'ambiguous_phone' };

// --- Cache ---

let usersCache: { data: UserRecord[]; timestamp: number } | null = null;
const USERS_CACHE_TTL = 5 * 60_000; // 5 minutes

export function invalidateUsersCache() {
  usersCache = null;
}


function safe(value: string | null | undefined): string {
  return value == null || value === '' ? '' : String(value);
}

function getUsersRange() {
  return process.env.GOOGLE_USERS_RANGE ?? 'รหัสลูกค้า!A:E';
}

function getUsersSheetName() {
  return getUsersRange().split('!')[0] || 'รหัสลูกค้า';
}

function roleFromStatus(status: string): UserRole {
  if (status === 'ผู้ดูแล' || status.toLowerCase() === 'admin') return 'admin';
  if (status === 'sale' || status === 'ฝ่ายขาย') return 'sale';
  return 'customer';
}

function statusAllowsLogin(status: string) {
  return VALID_STATUSES.includes(status);
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\D/g, '');
}

function normalizeId(id: string) {
  return id.trim().toLowerCase();
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
      range: getUsersRange(),
      auth,
    });

    const rows = (response.data.values ?? []) as (string | undefined | null)[][];
    if (rows.length <= 1) { usersCache = { data: [], timestamp: Date.now() }; return []; }

    const users = rows.slice(1).map((row) => {
      // Company auth sheet schema:
      // A=ลำดับ, B=ID, C=PASSWORD, D=Phone Number, E=Status
      const id = safe(row[1]);
      const status = safe(row[4]) || 'ดูสินค้า';
      return {
        id,
        phone: safe(row[3]),
        name: id,
        role: roleFromStatus(status),
        password: safe(row[2]),
        status,
      };
    }).filter((u) => u.id && u.password);

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
    range: `${getUsersSheetName()}!A:E`,
    auth,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        '',
        user.id,
        user.password,
        user.phone,
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
    range: getUsersRange(),
    auth,
  });

  const rows = (response.data.values ?? []) as string[][];
  const rowIndex = rows.findIndex((row, idx) => idx > 0 && safe(row[1]) === userId);
  if (rowIndex === -1) return false;

  // Company auth sheet has no role column. Role is derived from Status.
  const columnMap: Record<string, number> = { status: 4 };

  for (const [field, value] of Object.entries(updates)) {
    const colIndex = columnMap[field];
    if (colIndex === undefined || value === undefined) continue;
    const colLetter = String.fromCharCode(65 + colIndex); // A=65
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${getUsersSheetName()}!${colLetter}${rowIndex + 1}`,
      auth,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  }

  invalidateUsersCache();
  return true;
}

// --- Access Tier ---

const VALID_STATUSES = ['active', 'ดูสินค้า', 'ผู้เข้าถึงทั้งหมด', 'ผู้ดูแล'];

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
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return users.find((u) => normalizePhone(u.phone) === normalized) ?? null;
}

export async function phoneExistsInSheet(phone: string): Promise<boolean> {
  return (await findUserByPhone(phone)) !== null;
}

// --- Authentication ---

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const users = await loadUsersFromSheet();

  const normalizedPhone = normalizePhone(identifier);
  const normalizedId = normalizeId(identifier);
  const activeUsers = users.filter((user) => statusAllowsLogin(user.status));

  const idMatches = activeUsers.filter((user) => normalizedId.length > 0 && normalizeId(user.id) === normalizedId);
  if (idMatches.length > 0) {
    const matched = idMatches.find((user) => user.password === password);
    if (!matched) return { ok: false, reason: 'invalid_password' };

    setUsersCache(users.map((u) => ({
      id: u.id, phone: u.phone, name: u.name, role: u.role,
      password: u.password, status: u.status,
    })));

    return {
      ok: true,
      user: {
        id: matched.id,
        phone: matched.phone || undefined,
        name: matched.name,
        role: matched.role,
      },
    };
  }

  const phoneMatches = activeUsers.filter((user) => normalizedPhone.length > 0 && normalizePhone(user.phone) === normalizedPhone);
  if (phoneMatches.length === 0) return { ok: false, reason: 'not_found' };
  if (phoneMatches.length > 1) return { ok: false, reason: 'ambiguous_phone' };

  const matched = phoneMatches[0];
  if (password !== matched.password) return { ok: false, reason: 'invalid_password' };

  // Update cache for findUserById in middleware
  setUsersCache(users.map((u) => ({
    id: u.id, phone: u.phone, name: u.name, role: u.role,
    password: u.password, status: u.status,
  })));

  return {
    ok: true,
    user: {
      id: matched.id,
      phone: matched.phone || undefined,
      name: matched.name,
      role: matched.role,
    },
  };
}
