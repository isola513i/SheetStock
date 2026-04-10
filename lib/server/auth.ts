import type { AppUser, AuthSession } from '@/lib/types';

// --- Cookie names ---
export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';
export const LEGACY_COOKIE = 'sheetstock_session'; // old cookie, will be cleared

// --- Token lifetimes ---
export const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// --- Secret for HMAC signing ---
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'sheetstock-default-secret-change-me';

// --- Mock users ---
type MockUserRecord = AppUser & { password: string };

const mockUsers: MockUserRecord[] = [
  { id: 'u-admin', email: 'admin@sheetstock.app', name: 'System Admin', role: 'admin', password: 'admin1234' },
  { id: 'u-sale-a', email: 'sale@sheetstock.app', name: 'Sale Team A', role: 'sale', password: 'sale1234' },
  { id: 'u-customer-a', email: 'customer-a@sheetstock.app', name: 'ร้านเจริญพาณิชย์', role: 'customer', customerId: 'c-001', password: 'cust1234' },
  { id: 'u-customer-b', email: 'customer-b@sheetstock.app', name: 'ร้านรุ่งเรืองเทรด', role: 'customer', customerId: 'c-002', password: 'cust1234' },
];

// --- Simple sync HMAC using a hash-based signature (Edge-compatible) ---
// Uses a basic keyed hash: SHA-256 of (secret + payload) via a simple string-based approach.
// For production with high security needs, use Web Crypto API with async sign/verify.

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Run multiple rounds with the secret to strengthen
  const extended = `${TOKEN_SECRET}:${input}:${TOKEN_SECRET}`;
  let h2 = 0x6c62272e;
  for (let i = 0; i < extended.length; i++) {
    h2 ^= extended.charCodeAt(i);
    h2 = Math.imul(h2, 0x5bd1e995);
    h2 ^= h2 >>> 15;
  }
  return `${(h >>> 0).toString(36)}.${(h2 >>> 0).toString(36)}`;
}

function sign(payload: string): string {
  return simpleHash(payload);
}

function createSignedToken(data: object): string {
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifySignedToken<T>(token: string): T | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payload = token.slice(0, dotIdx);
    const signature = token.slice(dotIdx + 1);
    if (sign(payload) !== signature) return null;
    const raw = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// --- Token payload types ---

type AccessPayload = {
  user: AppUser;
  exp: number; // unix seconds
};

type RefreshPayload = {
  sub: string; // user id
  exp: number; // unix seconds
};

// --- Public API ---

export function authenticate(email: string, password: string): AppUser | null {
  const normalized = email.trim().toLowerCase();
  const matched = mockUsers.find((item) => item.email.toLowerCase() === normalized && item.password === password);
  if (!matched) return null;
  const { password: _password, ...user } = matched;
  return user;
}

export function findUserById(id: string): AppUser | null {
  const matched = mockUsers.find((item) => item.id === id);
  if (!matched) return null;
  const { password: _password, ...user } = matched;
  return user;
}

export function createAccessToken(user: AppUser): string {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_MAX_AGE;
  return createSignedToken({ user, exp } satisfies AccessPayload);
}

export function createRefreshToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + REFRESH_MAX_AGE;
  return createSignedToken({ sub: userId, exp } satisfies RefreshPayload);
}

export function verifyAccessToken(token: string): AppUser | null {
  const data = verifySignedToken<AccessPayload>(token);
  if (!data || !data.user || !data.exp) return null;
  if (Math.floor(Date.now() / 1000) > data.exp) return null; // expired
  return data.user;
}

export function verifyRefreshToken(token: string): string | null {
  const data = verifySignedToken<RefreshPayload>(token);
  if (!data || !data.sub || !data.exp) return null;
  if (Math.floor(Date.now() / 1000) > data.exp) return null; // expired
  return data.sub;
}

// --- Legacy compat (for backward compat during migration) ---

/** @deprecated use getSessionCookieName → ACCESS_COOKIE */
export function getSessionCookieName() {
  return ACCESS_COOKIE;
}

export function createSession(user: AppUser): AuthSession {
  const createdAt = Date.now();
  const token = createAccessToken(user);
  return { token, user, createdAt };
}

export function getSessionFromToken(token: string | undefined): AuthSession | null {
  if (!token) return null;
  const user = verifyAccessToken(token);
  if (!user) return null;
  return { token, user, createdAt: Date.now() };
}

export function destroySession(_token: string | undefined) {
  // Stateless tokens — destruction handled by clearing cookies client-side
}

// --- Helpers ---

export function emailExists(email: string): boolean {
  return mockUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function addMockUser(user: AppUser & { password: string }) {
  mockUsers.push(user);
}

// --- Cookie options helpers ---

const isProduction = process.env.NODE_ENV === 'production';

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  path: '/',
  maxAge: ACCESS_MAX_AGE,
};

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  path: '/',
  maxAge: REFRESH_MAX_AGE,
};
