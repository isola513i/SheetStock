'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, ChevronDown, ChevronRight, Percent, Search, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { BottomNav } from '@/components/BottomNav';
import { ProductImage } from '@/components/ProductImage';

type Customer = { id: string; name: string; tierId: string };
type PricingRow = {
  productId: string;
  name: string;
  imageUrl?: string;
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
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function discountPercent(base: number, final: number) {
  if (!base || base === final) return null;
  const pct = ((base - final) / base) * 100;
  return pct > 0 ? Math.round(pct) : null;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  base: { label: 'ราคาปกติ', color: 'text-gray-500', bg: 'bg-gray-100' },
  tier: { label: 'ส่วนลดระดับ', color: 'text-blue-600', bg: 'bg-blue-50' },
  override: { label: 'ราคาพิเศษ', color: 'text-green-600', bg: 'bg-green-50' },
};

export default function PricingPage() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nameAsc' | 'nameDesc' | 'priceHigh' | 'priceLow' | 'discountHigh'>('nameAsc');
  const [filterSource, setFilterSource] = useState<'all' | 'base' | 'tier' | 'override'>('all');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

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
  const allRows = pricingData?.items ?? [];

  const rows = useMemo(() => {
    let result = allRows;
    // Filter by source
    if (filterSource !== 'all') {
      result = result.filter((r) => r.priceSource === filterSource);
    }
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q));
    }
    // Sort
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc': return a.name.localeCompare(b.name, 'th');
        case 'nameDesc': return b.name.localeCompare(a.name, 'th');
        case 'priceHigh': return b.finalPrice - a.finalPrice;
        case 'priceLow': return a.finalPrice - b.finalPrice;
        case 'discountHigh': {
          const da = a.basePrice > 0 ? (a.basePrice - a.finalPrice) / a.basePrice : 0;
          const db = b.basePrice > 0 ? (b.basePrice - b.finalPrice) / b.basePrice : 0;
          return db - da;
        }
        default: return 0;
      }
    });
  }, [allRows, searchQuery, filterSource, sortBy]);

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
          productIds: allRows.map((r) => r.productId),
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

  // Auth guards
  if (isMeLoading) {
    return (
      <main className="min-h-dvh bg-[#F2F2F7] px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        <div className="space-y-3 pt-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse" />
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
        <button className="mt-4 h-11 px-6 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium" onClick={() => (window.location.href = '/login')}>
          เข้าสู่ระบบ
        </button>
      </main>
    );
  }

  if (me?.user && !canUsePricing) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-900 font-medium mb-1">ไม่มีสิทธิ์เข้าถึง</p>
        <button className="mt-4 h-11 px-6 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium" onClick={() => (window.location.href = '/catalog')}>
          ไปหน้าสินค้า
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F2F2F7] flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 20 }}>
        <h1 className="text-xl font-medium mb-4">จัดการราคา</h1>

        {/* Customer selector */}
        <button
          onClick={() => setCustomerPickerOpen(true)}
          className="w-full h-12 bg-white/15 backdrop-blur rounded-xl px-4 flex items-center justify-between text-sm mb-3"
        >
          <span className="truncate">{activeCustomer?.name ?? 'เลือกลูกค้า'}</span>
          <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-70" />
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-gray-900 rounded-xl pl-10 pr-9 h-11 border-none text-sm shadow-sm outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-5 pt-3 pb-2 space-y-2.5">
        {/* Row 1: count + actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">{rows.length} รายการ</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortSheetOpen(true)}
              className="h-8 px-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5 shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortBy === 'nameAsc' ? 'ชื่อ ก-ฮ' : sortBy === 'nameDesc' ? 'ชื่อ ฮ-ก' : sortBy === 'priceHigh' ? 'ราคาสูง' : sortBy === 'priceLow' ? 'ราคาต่ำ' : 'ส่วนลดมาก'}
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="h-8 px-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5 shadow-sm"
            >
              <Percent className="w-3.5 h-3.5" />
              กลุ่ม
            </button>
          </div>
        </div>
        {/* Row 2: source filter chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          {(['all', 'base', 'tier', 'override'] as const).map((src) => {
            const labels = { all: 'ทั้งหมด', base: 'ราคาปกติ', tier: 'ส่วนลดระดับ', override: 'ราคาพิเศษ' };
            const active = filterSource === src;
            return (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {labels[src]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-5 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isPricingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-8 text-center mt-2">
            <p className="text-gray-800 font-medium mb-1">ไม่พบสินค้า</p>
            <p className="text-sm text-gray-500">ลองเปลี่ยนคำค้นหา</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const source = SOURCE_CONFIG[row.priceSource] ?? SOURCE_CONFIG.base;
                const discount = discountPercent(row.basePrice, row.finalPrice);
                return (
                  <motion.div
                    key={row.productId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                    className="rounded-2xl border border-gray-200 bg-white overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => openEdit(row)}
                  >
                    <div className="p-3 flex gap-3">
                      {/* Product image */}
                      <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <ProductImage src={row.imageUrl ?? ''} alt={row.name} sizes="64px" className="object-contain" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 leading-tight truncate">{row.name}</h3>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${source.bg} ${source.color}`}>
                            {source.label}
                          </span>
                          {discount && (
                            <span className="text-[10px] font-medium text-green-600">-{discount}%</span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1.5 mt-1">
                          {row.basePrice !== row.finalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">{formatPrice(row.basePrice)}</span>
                          )}
                          <span className="text-[13px] font-semibold text-[var(--brand-primary)]">{formatPrice(row.finalPrice)}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center shrink-0">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Sort Sheet */}
      <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 pb-8 bg-white border-none" showCloseButton={false}>
          <h3 className="text-base font-medium text-gray-900 mb-4">เรียงลำดับ</h3>
          <div className="space-y-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {([
              { key: 'nameAsc', label: 'ชื่อสินค้า ก → ฮ' },
              { key: 'nameDesc', label: 'ชื่อสินค้า ฮ → ก' },
              { key: 'priceHigh', label: 'ราคาสูง → ต่ำ' },
              { key: 'priceLow', label: 'ราคาต่ำ → สูง' },
              { key: 'discountHigh', label: 'ส่วนลดมาก → น้อย' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setSortBy(opt.key); setSortSheetOpen(false); }}
                className={`w-full h-12 rounded-xl px-4 text-left text-sm transition-colors ${
                  sortBy === opt.key
                    ? 'bg-[var(--brand-primary)] text-white font-medium'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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
              {/* Product header with image */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  <ProductImage src={editingRow.imageUrl ?? ''} alt={editingRow.name} sizes="56px" className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 leading-tight">{editingRow.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">แก้ไขราคาสำหรับ {activeCustomer?.name}</p>
                </div>
              </div>

              {/* Price comparison */}
              <div className="rounded-xl border border-gray-100 overflow-hidden mb-5">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="p-3 text-center">
                    <p className="text-[10px] text-gray-400 mb-1">ราคาตั้งต้น</p>
                    <p className="text-sm font-medium text-gray-600">{formatPrice(editingRow.basePrice)}</p>
                  </div>
                  <div className="p-3 text-center bg-blue-50/50">
                    <p className="text-[10px] text-blue-400 mb-1">หลังส่วนลด</p>
                    <p className="text-sm font-medium text-blue-600">{formatPrice(editingRow.tierPrice)}</p>
                  </div>
                  <div className="p-3 text-center bg-orange-50/50">
                    <p className="text-[10px] text-orange-400 mb-1">ขายจริง</p>
                    <p className="text-sm font-semibold text-[var(--brand-primary)]">{formatPrice(editingRow.finalPrice)}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">ตั้งราคาใหม่</label>
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
                  {editPrice && Number(editPrice) > 0 && Number(editPrice) < editingRow.minAllowedPrice && (
                    <p className="mt-1.5 text-[11px] text-yellow-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      ต่ำกว่าราคาขั้นต่ำ ({formatPrice(editingRow.minAllowedPrice)}) — ต้องขออนุมัติ Admin
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">เหตุผล</label>
                  <input
                    type="text"
                    placeholder="เช่น ลูกค้าประจำ, โปรโมชันพิเศษ"
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
                <p className="text-xs text-gray-500">{allRows.length} รายการ · {activeCustomer?.name}</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-gray-500 mb-1.5 block">ปรับเปอร์เซ็นต์ (%)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="เช่น -5 (ลด) หรือ 10 (เพิ่ม)"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 px-4 text-base focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] outline-none"
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)}
              />
              <p className="mt-1.5 text-[11px] text-gray-400">ตัวเลขบวก = เพิ่มราคา · ตัวเลขลบ = ลดราคา</p>
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
