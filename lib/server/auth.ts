import type { AppUser, AuthSession } from '@/lib/types';

// --- Cookie names ---
export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';
export const LEGACY_COOKIE = 'sheetstock_session';

// --- Token lifetimes ---
export const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// --- Secret for HMAC signing ---
function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET || '';
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('[auth] TOKEN_SECRET must be set in production');
  }
  return secret;
}

// --- Users cache (populated by users-sheet.ts, read by middleware via findUserById) ---

type CachedUser = AppUser & { password: string; status: string; phone?: string };

let usersCacheMap: Map<string, CachedUser> | null = null;

export function setUsersCache(users: CachedUser[]) {
  usersCacheMap = new Map(users.map((u) => [u.id, u]));
}

// --- Web Crypto HMAC-SHA256 (Edge + Node.js compatible) ---

let cachedKey: CryptoKey | null = null;
let cachedSecret: string | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  const secret = getTokenSecret();
  if (cachedKey && cachedSecret === secret) return cachedKey;
  const encoder = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  cachedSecret = secret;
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
  return crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, encoder.encode(payload));
}

// --- Base64url helpers (Edge-compatible, no Buffer) ---

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

// authenticate() is in users-sheet.ts to avoid bundling googleapis in Edge middleware

const VALID_STATUSES = ['active', 'ดูสินค้า', 'ผู้เข้าถึงทั้งหมด'];

export function findUserById(id: string): AppUser | null {
  if (!usersCacheMap) return null;
  const matched = usersCacheMap.get(id);
  if (!matched || !VALID_STATUSES.includes(matched.status)) return null;
  return {
    id: matched.id,
    email: matched.email || undefined,
    phone: matched.phone || undefined,
    name: matched.name,
    role: matched.role,
    ...(matched.customerId ? { customerId: matched.customerId } : {}),
  };
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
