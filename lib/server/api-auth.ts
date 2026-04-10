import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
  findUserById,
} from '@/lib/server/auth';
import type { AppUser, UserRole } from '@/lib/types';

export function getRequestUser(request: NextRequest): AppUser | null {
  // 1. Try access token
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = verifyAccessToken(accessToken);
    if (user) return user;
  }

  // 2. Fallback: try refresh token (access expired but refresh still valid)
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const userId = verifyRefreshToken(refreshToken);
    if (userId) {
      const user = findUserById(userId);
      if (user) return user;
    }
  }

  return null;
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
