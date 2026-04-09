import 'server-only';

import { randomUUID } from 'node:crypto';
import type { CustomerRegistration } from '@/lib/types';
import { emailExists, addMockUser } from '@/lib/server/auth';
import { addCustomerAccount } from '@/lib/server/pricing';

const registrations: CustomerRegistration[] = [];

export function createRegistration(data: {
  name: string;
  email: string;
  password: string;
  storeName: string;
  phone: string;
}): { ok: true; registration: CustomerRegistration } | { ok: false; error: string } {
  const email = data.email.trim().toLowerCase();

  if (emailExists(email)) {
    return { ok: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' };
  }
  if (registrations.some((r) => r.email === email && r.status !== 'rejected')) {
    return { ok: false, error: 'อีเมลนี้กำลังรอการอนุมัติอยู่' };
  }

  const registration: CustomerRegistration = {
    id: `reg-${randomUUID().slice(0, 8)}`,
    name: data.name.trim(),
    email,
    password: data.password,
    storeName: data.storeName.trim(),
    phone: data.phone.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  registrations.push(registration);
  return { ok: true, registration };
}

export function getPendingRegistrations(): CustomerRegistration[] {
  return registrations.filter((r) => r.status === 'pending');
}

export function getAllRegistrations(): CustomerRegistration[] {
  return [...registrations];
}

export function findRegistrationByEmail(email: string): CustomerRegistration | undefined {
  const normalized = email.trim().toLowerCase();
  return registrations.find((r) => r.email === normalized);
}

export function approveRegistration(
  id: string,
  tierId: string,
  adminUserId: string
): { ok: true } | { ok: false; error: string } {
  const reg = registrations.find((r) => r.id === id);
  if (!reg) return { ok: false, error: 'ไม่พบคำขอสมัครนี้' };
  if (reg.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกดำเนินการแล้ว' };

  const customerId = `c-${randomUUID().slice(0, 6)}`;
  const userId = `u-${randomUUID().slice(0, 8)}`;

  // Create the user account
  addMockUser({
    id: userId,
    email: reg.email,
    name: reg.name,
    role: 'customer',
    customerId,
    password: reg.password,
  });

  // Create the customer account with selected tier
  addCustomerAccount({
    id: customerId,
    name: reg.storeName,
    tierId,
    saleOwnerId: adminUserId,
    status: 'active',
  });

  // Update registration status
  reg.status = 'approved';
  reg.tierId = tierId;
  reg.reviewedAt = new Date().toISOString();
  reg.reviewedBy = adminUserId;

  return { ok: true };
}

export function rejectRegistration(
  id: string,
  reason: string,
  adminUserId: string
): { ok: true } | { ok: false; error: string } {
  const reg = registrations.find((r) => r.id === id);
  if (!reg) return { ok: false, error: 'ไม่พบคำขอสมัครนี้' };
  if (reg.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกดำเนินการแล้ว' };

  reg.status = 'rejected';
  reg.rejectionReason = reason || undefined;
  reg.reviewedAt = new Date().toISOString();
  reg.reviewedBy = adminUserId;

  return { ok: true };
}
