'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import PullToRefresh from 'pulltorefreshjs';
import { ChevronDown, Search, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BottomNav } from '@/components/BottomNav';
import { ProductImage } from '@/components/ProductImage';
import type { UserRole } from '@/lib/types';

type CatalogItem = {
  productId: string;
  name: string;
  imageUrl: string;
  stock: number;
  finalPrice: number;
  priceSource: 'base' | 'tier' | 'override';
};

type CustomerOption = { id: string; name: string };

type CatalogResponse = {
  customerId: string | null;
  customers?: CustomerOption[];
  items: CatalogItem[];
};

const SOURCE_LABELS: Record<string, string> = {
  base: 'ราคาปกติ',
  tier: 'ส่วนลดระดับ',
  override: 'ราคาพิเศษ',
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch catalog');
  return (await response.json()) as CatalogResponse;
};

export default function CatalogPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isValidatingRef = useRef(false);

  const { data: meData } = useSWR<{ user: { role: UserRole; name: string } | null }>('/api/auth/me', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return { user: null };
    return res.json();
  });

  const isCustomer = meData?.user?.role === 'customer';
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const catalogUrl = useMemo(() => {
    if (!meData?.user) return null;
    if (isCustomer) return '/api/catalog';
    if (selectedCustomerId) return `/api/catalog?customerId=${selectedCustomerId}`;
    return '/api/catalog';
  }, [meData, isCustomer, selectedCustomerId]);

  const { data, isLoading, isValidating, mutate } = useSWR(catalogUrl, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
    keepPreviousData: true,
  });

  const customers = data?.customers ?? [];
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'low'>('all');

  const allItems = data?.items ?? [];

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q) || item.productId.toLowerCase().includes(q));
    }
    if (stockFilter === 'inStock') items = items.filter((i) => i.stock > 0);
    if (stockFilter === 'low') items = items.filter((i) => i.stock > 0 && i.stock < 10);
    return items;
  }, [allItems, searchQuery, stockFilter]);

  useEffect(() => {
    isValidatingRef.current = isValidating;
  }, [isValidating]);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;

    PullToRefresh.init({
      mainElement: '#catalog-scroll',
      triggerElement: '#catalog-scroll',
      distThreshold: 72,
      distMax: 96,
      distReload: 64,
      instructionsPullToRefresh: 'ดึงลงเพื่อรีเฟรช',
      instructionsReleaseToRefresh: 'ปล่อยเพื่อรีเฟรช',
      instructionsRefreshing: 'กำลังรีเฟรช...',
      shouldPullToRefresh: () => {
        const el = scrollRef.current;
        if (!el) return false;
        if (isValidatingRef.current) return false;
        return el.scrollTop <= 0;
      },
      onRefresh: () => mutate(),
    });

    return () => { PullToRefresh.destroyAll(); };
  }, [mutate]);

  return (
    <div className="min-h-dvh bg-[#F2F2F7] flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">{isCustomer ? 'สินค้าของคุณ' : 'แคตตาล็อกสินค้า'}</h1>
        </div>

        {/* Customer picker for admin/sale */}
        {!isCustomer && customers.length > 0 && (
          <button
            onClick={() => setCustomerPickerOpen(true)}
            className="w-full h-12 bg-white/15 backdrop-blur rounded-xl px-4 flex items-center justify-between text-sm mb-3"
          >
            <span className="truncate">{activeCustomer?.name ?? 'ทุกลูกค้า (ราคาปกติ)'}</span>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-70" />
          </button>
        )}

        {/* Search */}
        <div className="relative mb-3">
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

        {/* Quick filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {([['all', 'ทั้งหมด'], ['inStock', 'มีสินค้า'], ['low', 'ใกล้หมด']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setStockFilter(id)}
              className={`shrink-0 min-h-9 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                stockFilter === id ? 'bg-white text-[var(--brand-primary)] shadow-sm' : 'bg-black/15 text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">พบ {filteredItems.length} รายการ</p>
        {isValidating && !isLoading && (
          <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full w-1/3 bg-[var(--brand-primary)] animate-[pulse_900ms_ease-in-out_infinite]" />
          </div>
        )}
      </div>

      {/* List */}
      <div id="catalog-scroll" ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-8 text-center mt-2">
            <p className="text-gray-800 font-medium mb-1">ไม่พบสินค้า</p>
            <p className="text-sm text-gray-500 mb-4">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            <button
              onClick={() => { setSearchQuery(''); setStockFilter('all'); }}
              className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium"
            >
              ล้างตัวกรอง
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {filteredItems.map((item, idx) => {
                const isLow = item.stock > 0 && item.stock < 10;
                const isOut = item.stock <= 0;
                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className={`rounded-2xl bg-white p-3 flex items-center gap-3 cursor-pointer border active:scale-[0.98] transition-transform ${
                      isOut ? 'border-red-200 bg-red-50/30' : isLow ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <ProductImage
                        src={item.imageUrl}
                        alt={item.name}
                        className={`max-h-full max-w-full object-contain ${isOut ? 'grayscale opacity-70' : ''}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium text-gray-900 ${isOut ? 'opacity-70' : ''}`}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xs ${isOut ? 'text-red-500' : isLow ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {isOut ? 'สินค้าหมด' : `คงเหลือ ${item.stock}`}
                        </p>
                        {isLow && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-sm">ใกล้หมด</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-semibold text-[var(--brand-primary)]">
                        {item.finalPrice > 0 ? `฿${item.finalPrice.toFixed(2)}` : '-'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{SOURCE_LABELS[item.priceSource] ?? item.priceSource}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] bg-white border-none" showCloseButton={false}>
          {selectedItem && (
            <div className="px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <div className="flex justify-center mb-4">
                <div className="relative h-40 w-40 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  <ProductImage
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 text-center mb-1">{selectedItem.name}</h3>
              <p className="text-xs text-gray-400 text-center mb-5">รหัส: {selectedItem.productId}</p>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">ราคา</p>
                  <p className="text-sm font-semibold text-[var(--brand-primary)]">
                    {selectedItem.finalPrice > 0 ? `฿${selectedItem.finalPrice.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">คงเหลือ</p>
                  <p className={`text-sm font-semibold ${selectedItem.stock <= 0 ? 'text-red-500' : selectedItem.stock < 10 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {selectedItem.stock <= 0 ? 'หมด' : selectedItem.stock}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">ประเภทราคา</p>
                  <p className="text-xs font-medium text-gray-700">{SOURCE_LABELS[selectedItem.priceSource] ?? selectedItem.priceSource}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="w-full h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                ปิด
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Customer Picker Sheet (admin/sale only) */}
      <Sheet open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 pb-8 bg-white border-none" showCloseButton={false}>
          <h3 className="text-base font-medium text-gray-900 mb-4">เลือกลูกค้า</h3>
          <div className="space-y-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              onClick={() => {
                setSelectedCustomerId('');
                setCustomerPickerOpen(false);
              }}
              className={`w-full h-12 rounded-xl px-4 text-left text-sm transition-colors ${
                !selectedCustomerId
                  ? 'bg-[var(--brand-primary)] text-white font-medium'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              ทุกลูกค้า (ราคาปกติ)
            </button>
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustomerPickerOpen(false);
                }}
                className={`w-full h-12 rounded-xl px-4 text-left text-sm transition-colors ${
                  selectedCustomerId === c.id
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

      {meData?.user?.role && (
        <BottomNav activePage="catalog" userRole={meData.user.role} />
      )}

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ptr--content { color: #f99109 !important; font-size: 12px; }
        .ptr--icon { color: #f99109 !important; }
        .ptr--ptr { box-shadow: none !important; }
      `}</style>
    </div>
  );
}
