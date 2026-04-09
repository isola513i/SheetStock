import { NextResponse } from 'next/server';
import { authenticate, createSession, getSessionCookieName } from '@/lib/server/auth';
import { findRegistrationByEmail } from '@/lib/server/registrations';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = authenticate(email, password);
  if (!user) {
    // Check if this is a pending or rejected registration
    const reg = findRegistrationByEmail(email);
    if (reg) {
      if (reg.status === 'pending') {
        return NextResponse.json({ error: 'บัญชีของคุณกำลังรอการอนุมัติจาก Admin' }, { status: 403 });
      }
      if (reg.status === 'rejected') {
        return NextResponse.json({ error: 'การสมัครถูกปฏิเสธ กรุณาติดต่อ Admin' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
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
