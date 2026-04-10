import { NextRequest, NextResponse } from 'next/server';
import {
  REFRESH_COOKIE,
  ACCESS_COOKIE,
  verifyRefreshToken,
  findUserById,
  createAccessToken,
  ACCESS_COOKIE_OPTIONS,
} from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const userId = verifyRefreshToken(refreshToken);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const newAccessToken = createAccessToken(user);
  const response = NextResponse.json({ user });
  response.cookies.set(ACCESS_COOKIE, newAccessToken, ACCESS_COOKIE_OPTIONS);
  return response;
}
