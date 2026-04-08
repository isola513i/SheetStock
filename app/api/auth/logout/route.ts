import { NextResponse } from 'next/server';
import { destroySession, getSessionCookieName } from '@/lib/server/auth';

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${getSessionCookieName()}=`))
    ?.split('=')[1];

  destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
