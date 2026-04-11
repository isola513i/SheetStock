import 'server-only';

import { randomUUID } from 'node:crypto';
import type { CustomerRegistration } from '@/lib/types';
import { loadUsersFromSheet, appendUserToSheet, updateUserFieldsInSheet, emailExistsInSheet, hashPassword } from '@/lib/server/users-sheet';
import { addCustomerAccount } from '@/lib/server/pricing';

export async function createRegistration(data: {
  name: string;
  email: string;
  password: string;
  storeName: string;
  phone: string;
}): Promise<{ ok: true; registration: CustomerRegistration } | { ok: false; error: string }> {
  const email = data.email.trim().toLowerCase();

  if (await emailExistsInSheet(email)) {
    return { ok: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' };
  }

  const id = `u-${randomUUID().slice(0, 8)}`;
  const hashedPassword = await hashPassword(data.password);

  await appendUserToSheet({
    id,
    email,
    name: data.name.trim(),
    role: 'customer',
    customerId: '',
    password: hashedPassword,
    phone: data.phone.trim(),
    status: 'pending',
  });

  const registration: CustomerRegistration = {
    id,
    name: data.name.trim(),
    email,
    password: '***',
    storeName: data.storeName.trim(),
    phone: data.phone.trim(),
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
      createdAt: '',
    }));
}

export async function getAllRegistrations(): Promise<CustomerRegistration[]> {
  const users = await loadUsersFromSheet();
  return users
    .filter((u) => u.status !== 'active')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '***',
      storeName: u.name,
      phone: u.phone,
      status: u.status as CustomerRegistration['status'],
      createdAt: '',
    }));
}

export async function findRegistrationByEmail(email: string): Promise<CustomerRegistration | undefined> {
  const users = await loadUsersFromSheet();
  const normalized = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === normalized && u.status !== 'active');
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
  adminUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await loadUsersFromSheet();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: 'ไม่พบคำขอสมัครนี้' };
  if (user.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกดำเนินการแล้ว' };

  const customerId = `c-${randomUUID().slice(0, 6)}`;

  // Update user status + customerId in Sheet
  await updateUserFieldsInSheet(id, { status: 'active', customerId });

  // Create the customer account with selected tier
  addCustomerAccount({
    id: customerId,
    name: user.name,
    tierId,
    saleOwnerId: adminUserId,
    status: 'active',
  });

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
