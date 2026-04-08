import { NextResponse } from 'next/server';
import { authenticate, createSession, getSessionCookieName } from '@/lib/server/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const session = createSession(user);
  const response = NextResponse.json({ user });
  response.cookies.set(getSessionCookieName(), session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
