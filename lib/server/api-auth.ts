import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
  findUserById,
  createAccessToken,
  ACCESS_COOKIE_OPTIONS,
} from '@/lib/server/auth';
import type { AppUser, UserRole } from '@/lib/types';

export async function getRequestUser(request: NextRequest): Promise<{ user: AppUser | null; newAccessToken?: string }> {
  // 1. Try access token
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (user) return { user };
  }

  // 2. Fallback: refresh token → also issue new access token
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const userId = await verifyRefreshToken(refreshToken);
    if (userId) {
      const user = findUserById(userId);
      if (user) {
        const newAccessToken = await createAccessToken(user);
        return { user, newAccessToken };
      }
    }
  }

  return { user: null };
}

type RequireUserOk = { ok: true; user: AppUser; newAccessToken?: string };
type RequireUserFail = { ok: false; response: NextResponse };

export async function requireUser(request: NextRequest, allowedRoles?: UserRole[]): Promise<RequireUserOk | RequireUserFail> {
  const { user, newAccessToken } = await getRequestUser(request);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, user, newAccessToken };
}

/** Apply refreshed access token cookie to a response if needed */
export function applyTokenRefresh(response: NextResponse, guard: RequireUserOk): NextResponse {
  if (guard.newAccessToken) {
    response.cookies.set(ACCESS_COOKIE, guard.newAccessToken, ACCESS_COOKIE_OPTIONS);
  }
  return response;
}
