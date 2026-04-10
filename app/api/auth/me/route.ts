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

export async function GET(request: NextRequest) {
  // 1. Try access token
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = verifyAccessToken(accessToken);
    if (user) return NextResponse.json({ user });
  }

  // 2. Access expired — try refresh and issue new access token
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const userId = verifyRefreshToken(refreshToken);
    if (userId) {
      const user = findUserById(userId);
      if (user) {
        const newAccess = createAccessToken(user);
        const response = NextResponse.json({ user });
        response.cookies.set(ACCESS_COOKIE, newAccess, ACCESS_COOKIE_OPTIONS);
        return response;
      }
    }
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
