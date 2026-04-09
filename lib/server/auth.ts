import 'server-only';

import type { AppUser, AuthSession } from '@/lib/types';

const SESSION_COOKIE = 'sheetstock_session';

type MockUserRecord = AppUser & { password: string };

const mockUsers: MockUserRecord[] = [
  { id: 'u-admin', email: 'admin@sheetstock.app', name: 'System Admin', role: 'admin', password: 'admin1234' },
  { id: 'u-sale-a', email: 'sale@sheetstock.app', name: 'Sale Team A', role: 'sale', password: 'sale1234' },
  { id: 'u-customer-a', email: 'customer-a@sheetstock.app', name: 'ร้านเจริญพาณิชย์', role: 'customer', customerId: 'c-001', password: 'cust1234' },
  { id: 'u-customer-b', email: 'customer-b@sheetstock.app', name: 'ร้านรุ่งเรืองเทรด', role: 'customer', customerId: 'c-002', password: 'cust1234' },
];

type SessionPayload = {
  user: AppUser;
  createdAt: number;
};

function encodeSession(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeSession(token: string): SessionPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<SessionPayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.user || typeof parsed.createdAt !== 'number') return null;
    return { user: parsed.user, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function authenticate(email: string, password: string): AppUser | null {
  const normalized = email.trim().toLowerCase();
  const matched = mockUsers.find((item) => item.email.toLowerCase() === normalized && item.password === password);
  if (!matched) return null;
  const { password: _password, ...user } = matched;
  return user;
}

export function createSession(user: AppUser): AuthSession {
  const createdAt = Date.now();
  const token = encodeSession({ user, createdAt });
  const session: AuthSession = {
    token,
    user,
    createdAt,
  };
  return session;
}

export function getSessionFromToken(token: string | undefined): AuthSession | null {
  if (!token) return null;
  const payload = decodeSession(token);
  if (!payload) return null;
  return {
    token,
    user: payload.user,
    createdAt: payload.createdAt,
  };
}

export function destroySession(token: string | undefined) {
  void token;
}

export function emailExists(email: string): boolean {
  return mockUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function addMockUser(user: AppUser & { password: string }) {
  mockUsers.push(user);
}
