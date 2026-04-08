import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieName, getSessionFromToken } from '@/lib/server/auth';
import type { AppUser, UserRole } from '@/lib/types';

export function getRequestUser(request: NextRequest): AppUser | null {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = getSessionFromToken(token);
  return session?.user ?? null;
}

export function requireUser(request: NextRequest, allowedRoles?: UserRole[]) {
  const user = getRequestUser(request);
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true as const, user };
}
