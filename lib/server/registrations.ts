import 'server-only';

import { randomUUID } from 'node:crypto';
import type { CustomerRegistration } from '@/lib/types';
import { loadUsersFromSheet, appendUserToSheet, updateUserFieldsInSheet, phoneExistsInSheet, hashPassword } from '@/lib/server/users-sheet';

export async function createRegistration(data: {
  name: string;
  password: string;
  storeName: string;
  phone: string;
}): Promise<{ ok: true; registration: CustomerRegistration } | { ok: false; error: string }> {
  const phone = data.phone.trim();

  if (await phoneExistsInSheet(phone)) {
    return { ok: false, error: 'เบอร์โทรนี้ถูกใช้งานแล้ว' };
  }

  const id = `u-${randomUUID().slice(0, 8)}`;
  const hashedPassword = await hashPassword(data.password);

  await appendUserToSheet({
    id,
    email: '',
    name: data.name.trim(),
    role: 'customer',
    customerId: '',
    password: hashedPassword,
    phone,
    status: 'pending',
  });

  const registration: CustomerRegistration = {
    id,
    name: data.name.trim(),
    email: '',
    password: '***',
    storeName: data.storeName.trim(),
    phone,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return { ok: true, registration };
}

export async function getPendingRegistrations(): Promise<CustomerRegistration[]> {
  const users = await loadUsersFromSheet();
  return users
    .filter((u) => u.status === 'pending')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '***',
      storeName: u.name,
      phone: u.phone,
      status: u.status as 'pending',
      createdAt: new Date().toISOString(),
    }));
}

export async function getAllRegistrations(): Promise<CustomerRegistration[]> {
  const users = await loadUsersFromSheet();
  return users
    .filter((u) => u.role === 'customer')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '***',
      storeName: u.name,
      phone: u.phone,
      status: u.status as CustomerRegistration['status'],
      createdAt: new Date().toISOString(),
    }));
}

export async function findRegistrationByPhone(phone: string): Promise<CustomerRegistration | undefined> {
  const users = await loadUsersFromSheet();
  const normalized = phone.trim().replace(/\D/g, '');
  const user = users.find((u) => u.phone.replace(/\D/g, '') === normalized && !['active', 'ดูสินค้า', 'ผู้เข้าถึงทั้งหมด'].includes(u.status));
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: '***',
    storeName: user.name,
    phone: user.phone,
    status: user.status as CustomerRegistration['status'],
    createdAt: '',
  };
}

export async function approveRegistration(
  id: string,
  tierId: string,
  _adminUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await loadUsersFromSheet();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: 'ไม่พบคำขอสมัครนี้' };
  if (user.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกดำเนินการแล้ว' };

  if (tierId !== 'vip' && tierId !== 'vvip') {
    return { ok: false, error: 'ระดับลูกค้าไม่ถูกต้อง' };
  }

  const customerId = `c-${randomUUID().slice(0, 6)}`;
  const status = tierId === 'vvip' ? 'ผู้เข้าถึงทั้งหมด' : 'ดูสินค้า';
  await updateUserFieldsInSheet(id, { status, customerId });

  return { ok: true };
}

export async function rejectRegistration(
  id: string,
  _reason: string,
  _adminUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await loadUsersFromSheet();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: 'ไม่พบคำขอสมัครนี้' };
  if (user.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกดำเนินการแล้ว' };

  await updateUserFieldsInSheet(id, { status: 'rejected' });
  return { ok: true };
}
