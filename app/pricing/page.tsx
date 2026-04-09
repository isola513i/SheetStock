'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Tag, TrendingUp, ShieldCheck, Percent } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { BottomNav } from '@/components/BottomNav';

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

function formatPrice(value: number) {
  return `฿${value.toFixed(2)}`;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  base: { label: 'ราคาตั้งต้น', color: 'bg-gray-100 text-gray-600' },
  tier: { label: 'ราคาตามระดับ', color: 'bg-blue-100 text-blue-700' },
  override: { label: 'ราคาพิเศษ', color: 'bg-green-100 text-green-700' },
};

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PricingRow | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: me, isLoading: isMeLoading } = useSWR<{ user: { role: string; name: string } | null }>('/api/auth/me', fetcher);
  const userRole = me?.user?.role;
  const canUsePricing = userRole === 'admin' || userRole === 'sale';

  const { data: customerData } = useSWR<{ items: Customer[] }>(
    canUsePricing ? '/api/pricing/customers' : null,
    fetcher
  );
  const customers = customerData?.items ?? [];
  const activeCustomerId = selectedCustomerId || customers[0]?.id || '';
  const activeCustomer = customers.find((c) => c.id === activeCustomerId);

  const pricingUrl = canUsePricing && activeCustomerId ? `/api/pricing/customers/${activeCustomerId}/products` : null;
  const { data: pricingData, isLoading: isPricingLoading, mutate: mutatePricing } = useSWR<{ items: PricingRow[] }>(pricingUrl, fetcher);
  const rows = pricingData?.items ?? [];

  const openEdit = (row: PricingRow) => {
    setEditingRow(row);
    setEditPrice('');
    setEditReason('');
  };

  const submitOverride = async () => {
    if (!editingRow) return;
    const price = Number(editPrice);
    if (!price || price <= 0) {
      toast('กรุณากรอกราคาที่ถูกต้อง', 'error');
      return;
    }
    setEditLoading(true);
    try {
      const response = await fetch(`/api/pricing/customers/${activeCustomerId}/products/${editingRow.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, reason: editReason || 'Manual override' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast(data?.error ?? 'อัปเดตราคาไม่สำเร็จ', 'error');
        return;
      }
      toast(data?.requiresApproval ? 'ส่งคำขออนุมัติราคาแล้ว' : 'บันทึกราคาเรียบร้อย', data?.requiresApproval ? 'warning' : 'success');
      setEditingRow(null);
      await mutatePricing();
    } finally {
      setEditLoading(false);
    }
  };

  const submitBulk = async () => {
    if (!activeCustomerId || !bulkValue) return;
    setBulkLoading(true);
    try {
      const response = await fetch('/api/pricing/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: activeCustomerId,
          productIds: rows.map((r) => r.productId),
          adjustmentType: 'percent',
          adjustmentValue: Number(bulkValue),
          reason: 'Bulk adjustment',
        }),
      });
      if (!response.ok) {
        toast('ปรับราคาแบบกลุ่มไม่สำเร็จ', 'error');
        return;
      }
      toast('ปรับราคาแบบกลุ่มเรียบร้อย', 'success');
      setBulkOpen(false);
      setBulkValue('');
      await mutatePricing();
    } finally {
      setBulkLoading(false);
    }
  };

  // Auth guard states
  if (isMeLoading) {
    return (
      <main className="min-h-dvh bg-[#F2F2F7] px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <div className="space-y-3 pt-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (me && !me.user) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-900 font-medium mb-1">กรุณาเข้าสู่ระบบ</p>
        <p className="text-sm text-gray-500 mb-6">เพื่อใช้งาน Pricing Dashboard</p>
        <button className="h-11 px-6 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium" onClick={() => (window.location.href = '/login')}>
          ไปหน้าเข้าสู่ระบบ
        </button>
      </main>
    );
  }

  if (me?.user && !canUsePricing) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-900 font-medium mb-1">ไม่มีสิทธิ์เข้าถึง</p>
        <p className="text-sm text-gray-500 mb-6">บัญชีนี้ไม่สามารถใช้งาน Pricing Dashboard ได้</p>
        <button className="h-11 px-6 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium" onClick={() => (window.location.href = '/catalog')}>
          ไปหน้าสินค้า
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F2F2F7] flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 20 }}>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-medium flex-1">จัดการราคา</h1>
        </div>

        {/* Customer selector */}
        <button
          onClick={() => setCustomerPickerOpen(true)}
          className="w-full h-12 bg-white/15 backdrop-blur rounded-xl px-4 flex items-center justify-between text-sm"
        >
          <span className="truncate">{activeCustomer?.name ?? 'เลือกลูกค้า'}</span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-70" />
        </button>
      </div>

      {/* Bulk action button */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">{rows.length} รายการ</p>
        <button
          onClick={() => setBulkOpen(true)}
          className="h-9 px-4 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-1.5 shadow-sm"
        >
          <Percent className="w-3.5 h-3.5" />
          ปรับราคากลุ่ม
        </button>
      </div>

      {/* Product pricing cards */}
      <div className="flex-1 overflow-y-auto px-5 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isPricingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 p-4 animate-pulse">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
                  <div className="h-10 flex-1 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {rows.map((row, idx) => {
                const source = SOURCE_LABELS[row.priceSource] ?? SOURCE_LABELS.base;
                return (
                  <motion.div
                    key={row.productId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="rounded-2xl border border-gray-200 bg-white overflow-hidden active:scale-[0.98] transition-transform"
                    onClick={() => openEdit(row)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-medium text-gray-900 leading-tight flex-1">{row.name}</h3>
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${source.color}`}>
                          {source.label}
                        </span>
                      </div>

                      <div className="flex items-end justify-between">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[10px] text-gray-400 mb-0.5">ราคาตั้งต้น</p>
                            <p className="text-xs text-gray-500">{formatPrice(row.basePrice)}</p>
                          </div>
                          {row.tierPrice !== row.basePrice && (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-0.5">ราคาระดับ</p>
                              <p className="text-xs text-blue-600">{formatPrice(row.tierPrice)}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 mb-0.5">ราคาขาย</p>
                          <p className="text-lg font-semibold text-[var(--brand-primary)] leading-none">{formatPrice(row.finalPrice)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="px-4 py-2 flex items-center justify-between bg-gray-50/60">
                      <p className="text-[10px] text-red-400">ขั้นต่ำ {formatPrice(row.minAllowedPrice)}</p>
                      <p className="text-[11px] text-[var(--brand-primary)] font-medium">แก้ไขราคา →</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Customer Picker Sheet */}
      <Sheet open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 pb-8 bg-white border-none" showCloseButton={false}>
          <h3 className="text-base font-medium text-gray-900 mb-4">เลือกลูกค้า</h3>
          <div className="space-y-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustomerPickerOpen(false);
                }}
                className={`w-full h-12 rounded-xl px-4 text-left text-sm transition-colors ${
                  activeCustomerId === c.id
                    ? 'bg-[var(--brand-primary)] text-white font-medium'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Price Edit Sheet */}
      <Sheet open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 bg-white border-none" showCloseButton={false}>
          {editingRow && (
            <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">{editingRow.name}</h3>
                  <p className="text-xs text-gray-500">แก้ไขราคาสำหรับ {activeCustomer?.name}</p>
                </div>
              </div>

              {/* Current price info */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">ตั้งต้น</p>
                  <p className="text-sm font-medium text-gray-700">{formatPrice(editingRow.basePrice)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-blue-400 mb-1">ระดับ</p>
                  <p className="text-sm font-medium text-blue-700">{formatPrice(editingRow.tierPrice)}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-orange-400 mb-1">ปัจจุบัน</p>
                  <p className="text-sm font-medium text-[var(--brand-primary)]">{formatPrice(editingRow.finalPrice)}</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">ราคาใหม่</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder={`ขั้นต่ำ ${formatPrice(editingRow.minAllowedPrice)}`}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-base focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                    autoFocus
                  />
                  {editPrice && Number(editPrice) < editingRow.minAllowedPrice && (
                    <p className="mt-1.5 text-[11px] text-yellow-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      ต่ำกว่าราคาขั้นต่ำ — ต้องขออนุมัติ
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">เหตุผล</label>
                  <input
                    type="text"
                    placeholder="เช่น ลูกค้าประจำ, โปรโมชัน"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingRow(null)}
                  className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={submitOverride}
                  disabled={editLoading || !editPrice}
                  className="flex-1 h-12 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-50"
                >
                  {editLoading ? 'กำลังบันทึก...' : 'บันทึกราคา'}
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Adjust Sheet */}
      <Sheet open={bulkOpen} onOpenChange={setBulkOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 bg-white border-none" showCloseButton={false}>
          <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">ปรับราคาแบบกลุ่ม</h3>
                <p className="text-xs text-gray-500">{rows.length} รายการ • {activeCustomer?.name}</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-gray-500 mb-1.5 block">ปรับเปอร์เซ็นต์ (%)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="เช่น -5 หรือ 10"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 px-4 text-base focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                autoFocus
              />
              <p className="mt-1.5 text-[11px] text-gray-400">ค่าบวก = เพิ่มราคา, ค่าลบ = ลดราคา</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBulkOpen(false)}
                className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={submitBulk}
                disabled={bulkLoading || !bulkValue}
                className="flex-1 h-12 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-50"
              >
                {bulkLoading ? 'กำลังปรับ...' : 'ปรับราคาทั้งหมด'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {userRole && (
        <BottomNav activePage="pricing" userRole={userRole as 'admin' | 'sale' | 'customer'} />
      )}
    </div>
  );
}
