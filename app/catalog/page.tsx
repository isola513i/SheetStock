'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import PullToRefresh from 'pulltorefreshjs';
import { useInventoryStream } from '@/lib/hooks/use-inventory-stream';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { SettingsPage } from '@/components/SettingsPage';
import type { CatalogItem, UserRole } from '@/lib/types';

const BarcodeScannerSheet = dynamic(() => import('@/components/BarcodeScannerSheet').then(m => ({ default: m.BarcodeScannerSheet })), { ssr: false });
const FilterSheet = dynamic(() => import('@/components/sheets/FilterSheet').then(m => ({ default: m.FilterSheet })), { ssr: false });

const FALLBACK_IMG = '/icons/icon-192x192.png';
function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const t = e.currentTarget;
  if (!t.src.endsWith(FALLBACK_IMG)) t.src = FALLBACK_IMG;
}

type CatalogResponse = {
  customerId: string | null;
  items: CatalogItem[];
};

type StockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
type SortOption = 'nameAsc' | 'nameDesc' | 'priceLow' | 'priceHigh' | 'lowStock';

const STOCK_FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'inStock', label: 'มีสินค้า' },
  { id: 'lowStock', label: 'ใกล้หมด' },
  { id: 'outOfStock', label: 'หมดสต็อก' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'nameAsc', label: 'ชื่อ ก-ฮ' },
  { id: 'nameDesc', label: 'ชื่อ ฮ-ก' },
  { id: 'priceLow', label: 'ราคาต่ำสุด' },
  { id: 'priceHigh', label: 'ราคาสูงสุด' },
  { id: 'lowStock', label: 'ใกล้หมดก่อน' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return (await res.json()) as CatalogResponse;
};

export default function CatalogPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isValidatingRef = useRef(false);

  const { data: meData } = useSWR<{ user: { role: UserRole; name: string } | null }>('/api/auth/me', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return { user: null };
    return res.json();
  });

  const { data, isLoading, isValidating, mutate } = useSWR('/api/catalog', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
    keepPreviousData: true,
  });

  useInventoryStream(() => mutate());

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('nameAsc');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings'>('catalog');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Hydrate preferences
  useEffect(() => {
    setHapticsEnabled(window.localStorage.getItem('sheetstock-haptics') !== 'off');
    const d = window.localStorage.getItem('sheetstock-dark-mode');
    if (d === 'on') setDarkMode(true);
  }, []);
  useEffect(() => { window.localStorage.setItem('sheetstock-haptics', hapticsEnabled ? 'on' : 'off'); }, [hapticsEnabled]);
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark'); else root.classList.remove('dark');
    window.localStorage.setItem('sheetstock-dark-mode', darkMode ? 'on' : 'off');
  }, [darkMode]);

  // Compute facets from catalog data
  const facets = useMemo(() => {
    const allItems = data?.items ?? [];
    const countBy = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) if (v) map.set(v, (map.get(v) ?? 0) + 1);
      return Array.from(map.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
    };
    return {
      categories: countBy(allItems.map((i) => i.category ?? '')),
      brands: countBy(allItems.map((i) => i.brand ?? '')),
      series: countBy(allItems.map((i) => i.series ?? '')),
    };
  }, [data]);

  // Filter + sort client-side
  const items = useMemo(() => {
    let list = data?.items ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
      );
    }
    if (stockFilter === 'inStock') list = list.filter((i) => i.stock > 0);
    if (stockFilter === 'lowStock') list = list.filter((i) => i.stock > 0 && i.stock < 10);
    if (stockFilter === 'outOfStock') list = list.filter((i) => i.stock <= 0);
    if (categoryFilter) list = list.filter((i) => i.category === categoryFilter);
    if (brandFilter) list = list.filter((i) => i.brand === brandFilter);
    if (seriesFilter) list = list.filter((i) => i.series === seriesFilter);

    list = [...list].sort((a, b) => {
      if (sort === 'nameAsc') return a.name.localeCompare(b.name, 'th');
      if (sort === 'nameDesc') return b.name.localeCompare(a.name, 'th');
      if (sort === 'priceLow') return a.finalPrice - b.finalPrice;
      if (sort === 'priceHigh') return b.finalPrice - a.finalPrice;
      if (sort === 'lowStock') return a.stock - b.stock;
      return 0;
    });
    return list;
  }, [data, searchQuery, stockFilter, categoryFilter, brandFilter, seriesFilter, sort]);

  useEffect(() => { isValidatingRef.current = isValidating; }, [isValidating]);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target || activeTab === 'settings') return;
    PullToRefresh.init({
      mainElement: '#catalog-scroll', triggerElement: '#catalog-scroll',
      distThreshold: 72, distMax: 96, distReload: 64,
      instructionsPullToRefresh: 'ดึงลงเพื่อรีเฟรช',
      instructionsReleaseToRefresh: 'ปล่อยเพื่อรีเฟรช',
      instructionsRefreshing: 'กำลังรีเฟรช...',
      shouldPullToRefresh: () => { const el = scrollRef.current; return !!el && !isValidatingRef.current && el.scrollTop <= 0; },
      onRefresh: () => mutate(),
    });
    return () => { PullToRefresh.destroyAll(); };
  }, [mutate, activeTab]);

  const handleScanDetected = useCallback((barcode: string) => {
    setIsScannerOpen(false);
    setSearchQuery(barcode);
  }, []);

  const isSettingsTab = activeTab === 'settings';
  const activeFilterCount = (stockFilter !== 'all' ? 1 : 0) + (categoryFilter ? 1 : 0) + (brandFilter ? 1 : 0) + (seriesFilter ? 1 : 0);

  return (
    <div className="fixed inset-0 w-full flex flex-col bg-[#F2F2F7] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">{isSettingsTab ? 'ตั้งค่า' : 'แคตตาล็อกสินค้า'}</h1>
        </div>

        {!isSettingsTab && (
          <>
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
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {STOCK_FILTERS.map(({ id, label }) => (
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
          </>
        )}
      </div>

      {/* Content */}
      {isSettingsTab ? (
        <div className="flex-1 overflow-y-auto pb-24">
          <SettingsPage
            viewMode="list" hapticsEnabled={hapticsEnabled} darkMode={darkMode}
            onChangeViewMode={() => {}}
            onToggleHaptics={() => setHapticsEnabled((p) => !p)}
            onToggleDarkMode={() => setDarkMode((p) => !p)}
            onRefreshData={() => mutate()}
            onResetPreferences={() => { setHapticsEnabled(true); setDarkMode(false); window.localStorage.removeItem('sheetstock-haptics'); window.localStorage.removeItem('sheetstock-dark-mode'); }}
            onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }}
            userRole={meData?.user?.role} userName={meData?.user?.name}
            recentScans={[]} onClearRecentScans={() => {}} onScanItemClick={() => {}}
          />
        </div>
      ) : (
        <>
          {/* Count + Sort */}
          <div className="px-5 pt-3 pb-1 flex items-center justify-between">
            <p className="text-sm text-gray-500">พบ {items.length} รายการ</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="px-3 min-h-8 bg-white border border-gray-200 rounded-full flex items-center gap-1.5 text-xs text-gray-600 shadow-sm relative"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <button
                onClick={() => setIsSortOpen(true)}
                className="px-3 min-h-8 bg-white border border-gray-200 rounded-full flex items-center gap-1.5 text-xs text-gray-600 shadow-sm"
              >
                <ArrowUpDown className="w-3.5 h-3.5" /> เรียงลำดับ
              </button>
            </div>
          </div>

          {/* Grid */}
          <div id="catalog-scroll" ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-24 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl bg-white border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-8 text-center mt-2">
                <p className="text-gray-800 font-medium mb-1">ไม่พบสินค้า</p>
                <p className="text-sm text-gray-500 mb-4">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                <button onClick={() => { setSearchQuery(''); setStockFilter('all'); setCategoryFilter(''); setBrandFilter(''); setSeriesFilter(''); }} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium">
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {items.map((item, idx) => {
                    const isOut = item.stock <= 0;
                    const isLow = item.stock > 0 && item.stock < 10;
                    return (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                        className={`bg-white rounded-2xl p-3 flex flex-col cursor-pointer border active:scale-[0.98] transition-transform ${
                          isOut ? 'border-red-200 bg-red-50/30' : isLow ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="relative h-28 w-full mb-3 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl || FALLBACK_IMG} alt={item.name} className={`max-h-full max-w-full object-contain ${isOut ? 'grayscale opacity-70' : ''}`} referrerPolicy="no-referrer" onError={handleImgError} />
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-red-500 text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                            </div>
                          )}
                        </div>
                        <h3 className={`font-medium text-sm text-gray-900 truncate ${isOut ? 'opacity-70' : ''}`}>{item.name}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{[item.brand, item.series].filter(Boolean).join(' • ') || '\u00A0'}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-base font-semibold text-[var(--brand-primary)]">
                            {item.finalPrice > 0 ? `฿${item.finalPrice.toFixed(2)}` : '-'}
                          </p>
                          {isLow && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-sm">ใกล้หมด</span>}
                          {!isOut && !isLow && <span className="text-[11px] text-gray-400">{item.stock} ชิ้น</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </div>
        </>
      )}

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] bg-white border-none" showCloseButton={false}>
          {selectedItem && (
            <div className="px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <div className="flex justify-center mb-4">
                <div className="h-40 w-40 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedItem.imageUrl || FALLBACK_IMG} alt={selectedItem.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" onError={handleImgError} />
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 text-center mb-1">{selectedItem.name}</h3>
              <div className="flex justify-center gap-2 mb-4 flex-wrap">
                {selectedItem.category && <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[11px]">{selectedItem.category}</Badge>}
                {selectedItem.brand && <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[11px]">{selectedItem.brand}</Badge>}
                {selectedItem.series && <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[11px]">{selectedItem.series}</Badge>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">บาร์โค้ด</span>
                  <span className="text-sm text-gray-900 font-mono">{selectedItem.barcode}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-3">
                  <span className="text-sm text-gray-500">ราคา</span>
                  <span className="text-sm font-semibold text-[var(--brand-primary)]">฿{selectedItem.finalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-3">
                  <span className="text-sm text-gray-500">สต็อก</span>
                  <span className={`text-sm font-medium ${selectedItem.stock <= 0 ? 'text-red-500' : selectedItem.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedItem.stock <= 0 ? 'สินค้าหมด' : `${selectedItem.stock} ชิ้น`}
                  </span>
                </div>
                {selectedItem.expiryDate && (
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-3">
                    <span className="text-sm text-gray-500">วันหมดอายุ</span>
                    <span className="text-sm text-gray-900">{selectedItem.expiryDate}</span>
                  </div>
                )}
              </div>

              <button onClick={() => setSelectedItem(null)} className="w-full h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">
                ปิด
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sort Sheet */}
      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pt-8 bg-white border-none focus:outline-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-6">เรียงลำดับ</h3>
          <div className="flex flex-col gap-3">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSort(opt.id); setIsSortOpen(false); }}
                className={`w-full min-h-11 py-3 px-4 rounded-xl text-left font-medium text-sm transition-colors ${
                  sort === opt.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter Sheet */}
      <FilterSheet
        key={`${isFilterOpen}-${stockFilter}-${categoryFilter}-${brandFilter}-${seriesFilter}`}
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        stockFilter={stockFilter}
        category={categoryFilter}
        brand={brandFilter}
        series={seriesFilter}
        facets={facets}
        applyFilters={(f) => {
          setStockFilter(f.stock as StockFilter);
          setCategoryFilter(f.category);
          setBrandFilter(f.brand);
          setSeriesFilter(f.series);
        }}
        clearFilters={() => {
          setStockFilter('all');
          setCategoryFilter('');
          setBrandFilter('');
          setSeriesFilter('');
        }}
      />

      {/* BottomNav */}
      {meData?.user?.role && (
        <BottomNav
          activePage={isSettingsTab ? 'settings' : 'catalog'}
          userRole={meData.user.role}
          onScanClick={() => { setActiveTab('catalog'); setIsScannerOpen(true); }}
          onSettingsClick={() => setActiveTab('settings')}
          onInventoryClick={() => setActiveTab('catalog')}
        />
      )}

      <BarcodeScannerSheet open={isScannerOpen} onOpenChange={setIsScannerOpen} onDetected={handleScanDetected} />

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
