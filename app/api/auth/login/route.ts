import { NextResponse } from 'next/server';
import {
  authenticate,
  createAccessToken,
  createRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/server/auth';
import { findRegistrationByEmail } from '@/lib/server/registrations';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = authenticate(email, password);
  if (!user) {
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

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  const response = NextResponse.json({ user });
  response.cookies.set(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  // Clear legacy cookie
  response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
