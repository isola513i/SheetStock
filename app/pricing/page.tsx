'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';

type Customer = { id: string; name: string; tierId: string };
type PricingRow = {
  productId: string;
  name: string;
  basePrice: number;
  tierPrice: number;
  finalPrice: number;
  minAllowedPrice: number;
  priceSource: 'base' | 'tier' | 'override';
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fetch failed');
  return response.json();
};

export default function PricingPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [overridePrice, setOverridePrice] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [bulkValue, setBulkValue] = useState('0');
  const [message, setMessage] = useState('');

  const { data: me, isLoading: isMeLoading } = useSWR<{ user: { role: string } | null }>('/api/auth/me', fetcher);
  const userRole = me?.user?.role;
  const canUsePricing = userRole === 'admin' || userRole === 'sale';

  const { data: customerData, mutate: mutateCustomers } = useSWR<{ items: Customer[] }>(
    canUsePricing ? '/api/pricing/customers' : null,
    fetcher
  );
  const customers = customerData?.items ?? [];

  const activeCustomerId = selectedCustomerId || customers[0]?.id || '';

  const pricingUrl = canUsePricing && activeCustomerId ? `/api/pricing/customers/${activeCustomerId}/products` : null;
  const { data: pricingData, mutate: mutatePricing } = useSWR<{ items: PricingRow[] }>(pricingUrl, fetcher);
  const rows = pricingData?.items ?? [];
  const rowIds = rows.map((item) => item.productId);

  const submitOverride = async (productId: string) => {
    const price = Number(overridePrice[productId] ?? '');
    const payload = {
      price,
      reason: reason[productId] || 'Manual override',
    };
    const response = await fetch(`/api/pricing/customers/${activeCustomerId}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error ?? 'อัปเดตราคาไม่สำเร็จ');
      return;
    }
    setMessage(data?.requiresApproval ? 'ส่งคำขออนุมัติราคาแล้ว' : 'บันทึกราคาเรียบร้อย');
    await mutatePricing();
  };

  const submitBulk = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCustomerId) return;
    const response = await fetch('/api/pricing/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: activeCustomerId,
        productIds: rowIds,
        adjustmentType: 'percent',
        adjustmentValue: Number(bulkValue),
        reason: 'Bulk adjustment',
      }),
    });
    if (!response.ok) {
      setMessage('ปรับราคาแบบกลุ่มไม่สำเร็จ');
      return;
    }
    setMessage('ปรับราคาแบบกลุ่มเรียบร้อย');
    await mutatePricing();
  };

  if (isMeLoading) {
    return <main className="p-6 text-sm text-gray-500">กำลังตรวจสอบสิทธิ์...</main>;
  }

  if (me && !me.user) {
    return (
      <main className="p-6 text-sm">
        <p>กรุณาเข้าสู่ระบบก่อนใช้งานหน้า Pricing</p>
        <button className="mt-3 h-10 px-4 rounded-xl bg-[var(--brand-primary)] text-white" onClick={() => (window.location.href = '/login')}>
          ไปหน้าเข้าสู่ระบบ
        </button>
      </main>
    );
  }

  if (me?.user && !canUsePricing) {
    return (
      <main className="p-6 text-sm">
        <p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้า Pricing Dashboard</p>
        <button className="mt-3 h-10 px-4 rounded-xl bg-[var(--brand-primary)] text-white" onClick={() => (window.location.href = '/catalog')}>
          ไปหน้าสินค้า
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F2F2F7] px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-gray-900">Pricing Dashboard</h1>
        <button
          type="button"
          className="h-10 px-4 rounded-full border border-gray-200 bg-white text-xs"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
        >
          Logout
        </button>
      </div>

      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="text-xs text-gray-500">เลือกลูกค้า</label>
        <select
          className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
          value={activeCustomerId}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={submitBulk} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500">ปรับราคาแบบกลุ่ม (%)</label>
          <input
            type="number"
            step="0.1"
            value={bulkValue}
            onChange={(event) => setBulkValue(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
          />
        </div>
        <button className="h-11 rounded-xl bg-[var(--brand-primary)] px-4 text-white text-sm">Apply</button>
      </form>

      {message ? <p className="mb-3 text-xs text-gray-600">{message}</p> : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.productId} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-900">{row.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              base ฿{row.basePrice.toFixed(2)} | tier ฿{row.tierPrice.toFixed(2)} | final ฿{row.finalPrice.toFixed(2)} ({row.priceSource})
            </p>
            <p className="mt-1 text-[11px] text-red-500">ขั้นต่ำ: ฿{row.minAllowedPrice.toFixed(2)}</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="ราคา override"
                value={overridePrice[row.productId] ?? ''}
                onChange={(event) => setOverridePrice((prev) => ({ ...prev, [row.productId]: event.target.value }))}
                className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="เหตุผล"
                value={reason[row.productId] ?? ''}
                onChange={(event) => setReason((prev) => ({ ...prev, [row.productId]: event.target.value }))}
                className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
              />
              <button type="button" onClick={() => submitOverride(row.productId)} className="h-10 rounded-xl bg-gray-900 text-white text-sm">
                บันทึกราคาสินค้านี้
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => mutateCustomers()} className="mt-6 h-10 rounded-xl bg-white px-4 border border-gray-200 text-xs">
        Refresh customers
      </button>
    </main>
  );
}
