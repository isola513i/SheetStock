import { NextResponse } from 'next/server';
import { loadUsersFromSheet, appendUserToSheet } from '@/lib/server/users-sheet';

export async function POST() {
  const users = await loadUsersFromSheet();
  const hasAdmin = users.some((u) => u.role === 'admin');
  if (hasAdmin) {
    return NextResponse.json({ error: 'มี admin อยู่แล้ว' }, { status: 409 });
  }

  await appendUserToSheet({
    id: 'u-admin',
    phone: '0999999999',
    name: 'Admin',
    role: 'admin',
    password: 'admin1234',
    status: 'active',
  });

  return NextResponse.json({
    ok: true,
    message: 'สร้าง admin สำเร็จ',
    credentials: { phone: '0999999999', password: 'admin1234' },
  });
}
