import { NextResponse } from 'next/server';
import {
  createAccessToken,
  createRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/server/auth';
import { authenticate } from '@/lib/server/users-sheet';
import { findRegistrationByPhone } from '@/lib/server/registrations';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.phone === 'string' ? body.phone : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!identifier) return NextResponse.json({ error: 'กรุณากรอกรหัสลูกค้าหรือเบอร์โทร' }, { status: 400 });

  const result = await authenticate(identifier, password);
  if (!result.ok) {
    if (result.reason === 'ambiguous_phone') {
      return NextResponse.json({ error: 'เบอร์โทรนี้ผูกหลายบัญชี กรุณาเข้าสู่ระบบด้วยรหัสลูกค้า' }, { status: 409 });
    }
    // Check if pending/rejected registration
    const reg = await findRegistrationByPhone(identifier);
    if (reg) {
      if (reg.status === 'pending') return NextResponse.json({ error: 'บัญชีของคุณกำลังรอการอนุมัติจาก Admin' }, { status: 403 });
      if (reg.status === 'rejected') return NextResponse.json({ error: 'การสมัครถูกปฏิเสธ กรุณาติดต่อ Admin' }, { status: 403 });
    }
    return NextResponse.json({ error: 'รหัสลูกค้า/เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const accessToken = await createAccessToken(result.user);
  const refreshToken = await createRefreshToken(result.user.id);

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  response.cookies.set(LEGACY_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
