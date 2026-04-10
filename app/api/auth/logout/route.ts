import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, LEGACY_COOKIE } from '@/lib/server/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const clearOpts = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 0 };
  response.cookies.set(ACCESS_COOKIE, '', clearOpts);
  response.cookies.set(REFRESH_COOKIE, '', clearOpts);
  response.cookies.set(LEGACY_COOKIE, '', clearOpts);
  return response;
}
