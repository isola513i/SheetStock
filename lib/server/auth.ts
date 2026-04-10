import type { AppUser, AuthSession } from '@/lib/types';

// --- Cookie names ---
export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';
export const LEGACY_COOKIE = 'sheetstock_session';

// --- Token lifetimes ---
export const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// --- Secret for HMAC signing ---
const TOKEN_SECRET = process.env.TOKEN_SECRET || '';
if (!TOKEN_SECRET && typeof process !== 'undefined') {
  console.warn('[auth] TOKEN_SECRET is not set — tokens will be insecure. Set TOKEN_SECRET in .env');
}

// --- Mock users ---
type MockUserRecord = AppUser & { password: string };

const mockUsers: MockUserRecord[] = [
  { id: 'u-admin', email: 'admin@sheetstock.app', name: 'System Admin', role: 'admin', password: 'admin1234' },
  { id: 'u-sale-a', email: 'sale@sheetstock.app', name: 'Sale Team A', role: 'sale', password: 'sale1234' },
  { id: 'u-customer-a', email: 'customer-a@sheetstock.app', name: 'ร้านเจริญพาณิชย์', role: 'customer', customerId: 'c-001', password: 'cust1234' },
  { id: 'u-customer-b', email: 'customer-b@sheetstock.app', name: 'ร้านรุ่งเรืองเทรด', role: 'customer', customerId: 'c-002', password: 'cust1234' },
];

// --- Web Crypto HMAC-SHA256 (Edge + Node.js compatible) ---

let cachedKey: CryptoKey | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const encoder = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return cachedKey;
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return arrayBufferToBase64Url(signature);
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const sigBytes = base64UrlToArrayBuffer(signature);
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
}

// --- Base64url helpers (Edge-compatible, no Buffer) ---

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
}

// --- Signed token create/verify ---

async function createSignedToken(data: object): Promise<string> {
  const payload = toBase64Url(JSON.stringify(data));
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function verifySignedToken<T>(token: string): Promise<T | null> {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx === -1) return null;
    const payload = token.slice(0, dotIdx);
    const signature = token.slice(dotIdx + 1);
    const valid = await verify(payload, signature);
    if (!valid) return null;
    const raw = fromBase64Url(payload);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// --- Token payload types ---

type AccessPayload = { user: AppUser; exp: number };
type RefreshPayload = { sub: string; exp: number };

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

export async function createAccessToken(user: AppUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_MAX_AGE;
  return createSignedToken({ user, exp } satisfies AccessPayload);
}

export async function createRefreshToken(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + REFRESH_MAX_AGE;
  return createSignedToken({ sub: userId, exp } satisfies RefreshPayload);
}

export async function verifyAccessToken(token: string): Promise<AppUser | null> {
  const data = await verifySignedToken<AccessPayload>(token);
  if (!data || !data.user || !data.exp) return null;
  if (Math.floor(Date.now() / 1000) > data.exp) return null;
  return data.user;
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  const data = await verifySignedToken<RefreshPayload>(token);
  if (!data || !data.sub || !data.exp) return null;
  if (Math.floor(Date.now() / 1000) > data.exp) return null;
  return data.sub;
}

// --- Legacy compat ---

export function getSessionCookieName() { return ACCESS_COOKIE; }

export async function createSession(user: AppUser): Promise<AuthSession> {
  const createdAt = Date.now();
  const token = await createAccessToken(user);
  return { token, user, createdAt };
}

export async function getSessionFromToken(token: string | undefined): Promise<AuthSession | null> {
  if (!token) return null;
  const user = await verifyAccessToken(token);
  if (!user) return null;
  return { token, user, createdAt: Date.now() };
}

export function destroySession(_token: string | undefined) {}

// --- Helpers ---

export function emailExists(email: string): boolean {
  return mockUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function addMockUser(user: AppUser & { password: string }) {
  mockUsers.push(user);
}

// --- Cookie options ---

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
