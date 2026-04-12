import { NextResponse } from 'next/server';
import { createRegistration } from '@/lib/server/registrations';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  }

  const { name, password, storeName, phone } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, { status: 400 });
  if (!phone?.trim()) return NextResponse.json({ error: 'กรุณากรอกเบอร์โทร' }, { status: 400 });
  if (!/^\d{9,10}$/.test(phone.trim().replace(/\D/g, ''))) return NextResponse.json({ error: 'เบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก)' }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
  if (!storeName?.trim()) return NextResponse.json({ error: 'กรุณากรอกชื่อร้าน' }, { status: 400 });

  const result = await createRegistration({ name, password, storeName, phone });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, message: 'สมัครสมาชิกสำเร็จ รอการอนุมัติจาก Admin' });
}
