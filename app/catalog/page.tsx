'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import PullToRefresh from 'pulltorefreshjs';
import { useInventoryStream } from '@/lib/hooks/use-inventory-stream';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductImage, FALLBACK_IMAGE_SRC } from '@/components/ProductImage';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { SettingsPage } from '@/components/SettingsPage';
import type { AccessTier, CatalogItem, UserRole } from '@/lib/types';

function FullscreenImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const lastDistRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId = 0;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (rafId) return;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const distSq = dx * dx + dy * dy;
          if (lastDistRef.current > 0) {
            setScale((prev) => Math.min(4, Math.max(1, prev * Math.sqrt(distSq / lastDistRef.current))));
          }
          lastDistRef.current = distSq;
        });
      }
    };
    const onTouchEnd = () => { lastDistRef.current = 0; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) setScale((prev) => (prev > 1 ? 1 : 2.5));
    lastTapRef.current = now;
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button onClick={onClose} className="absolute right-4 z-10 w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-90 transition-all" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <X className="w-5 h-5" />
      </button>
      <div ref={containerRef} className="flex-1 relative w-full overflow-hidden" onClick={handleDoubleTap}>
        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-200" style={{ transform: `scale(${scale})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src || FALLBACK_IMAGE_SRC} alt="Product image" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" onError={(e) => { const el = e.currentTarget; if (!el.src.endsWith(FALLBACK_IMAGE_SRC)) el.src = FALLBACK_IMAGE_SRC; }} />
        </div>
      </div>
      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 flex flex-col items-center gap-3">
        <button onClick={onClose} className="w-full max-w-xs h-11 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium active:scale-95 transition-transform">
          ปิด
        </button>
        <p className="text-center text-white/40 text-[10px]">{scale > 1 ? 'แตะ 2 ครั้งเพื่อย่อ' : 'แตะ 2 ครั้งเพื่อขยาย • ใช้ 2 นิ้วซูม'}</p>
      </div>
    </div>
  );
}

const BRAND_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200', 'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200', 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200', 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-rose-50 text-rose-700 border-rose-200', 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200', 'bg-orange-50 text-orange-700 border-orange-200',
];
function brandColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

const BarcodeScannerSheet = dynamic(() => import('@/components/BarcodeScannerSheet').then(m => ({ default: m.BarcodeScannerSheet })), { ssr: false });
const FilterSheet = dynamic(() => import('@/components/sheets/FilterSheet').then(m => ({ default: m.FilterSheet })), { ssr: false });

type CatalogResponse = {
  accessTier: AccessTier;
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userName: string | null;
  items: CatalogItem[];
};

type StockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
type SortOption = 'nameAsc' | 'nameDesc' | 'priceLow' | 'priceHigh' | 'lowStock';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'nameAsc', label: 'ชื่อ ก-ฮ' },
  { id: 'nameDesc', label: 'ชื่อ ฮ-ก' },
  { id: 'priceLow', label: 'ราคาต่ำสุด' },
  { id: 'priceHigh', label: 'ราคาสูงสุด' },
  { id: 'lowStock', label: 'ใกล้หมดก่อน' },
];

/** Return the display price for a given tier — VVIP falls back to VIP price */
function getDisplayPrice(item: CatalogItem, tier: AccessTier): number {
  if (tier === 'vvip' && item.vvipPrice != null && item.vvipPrice > 0) return item.vvipPrice;
  if ((tier === 'vip' || tier === 'vvip') && item.vipPrice != null && item.vipPrice > 0) return item.vipPrice;
  return item.price;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return (await res.json()) as CatalogResponse;
};

export default function CatalogPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isValidatingRef = useRef(false);

  // Collapsible header — same pattern as admin inventory
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const lastScrollYRef = useRef(0);
  const lastDirectionRef = useRef<'up' | 'down'>('up');
  const directionAnchorRef = useRef(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const delta = currentScrollY - lastScrollYRef.current;
    if (currentScrollY <= 8) {
      if (lastDirectionRef.current !== 'up') {
        lastDirectionRef.current = 'up';
        directionAnchorRef.current = currentScrollY;
        setScrollDir('up');
      }
      lastScrollYRef.current = currentScrollY;
      return;
    }
    if (Math.abs(delta) < 12) { lastScrollYRef.current = currentScrollY; return; }
    const nextDir: 'up' | 'down' = delta > 0 ? 'down' : 'up';
    if (nextDir !== lastDirectionRef.current) {
      if (Math.abs(currentScrollY - directionAnchorRef.current) < 24) { lastScrollYRef.current = currentScrollY; return; }
      lastDirectionRef.current = nextDir;
      directionAnchorRef.current = currentScrollY;
      setScrollDir(nextDir);
    }
    lastScrollYRef.current = currentScrollY;
  }, []);

  const { data, isLoading, isValidating, mutate } = useSWR('/api/catalog', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
    keepPreviousData: true,
  });

  // Only connect to stream when logged in (stream API requires auth)
  useInventoryStream(() => mutate(), { enabled: data?.isLoggedIn ?? false });

  const accessTier = data?.accessTier ?? 'public';
  const isLoggedIn = data?.isLoggedIn ?? false;
  const userRole = data?.userRole ?? null;
  const userName = data?.userName ?? undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('inStock');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('nameAsc');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings'>('catalog');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    setHapticsEnabled(window.localStorage.getItem('sheetstock-haptics') !== 'off');
  }, []);
  useEffect(() => { window.localStorage.setItem('sheetstock-haptics', hapticsEnabled ? 'on' : 'off'); }, [hapticsEnabled]);

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
    else if (stockFilter === 'lowStock') list = list.filter((i) => i.stock > 0 && i.stock < 10);
    else if (stockFilter === 'outOfStock') list = list.filter((i) => i.stock <= 0);
    if (categoryFilter) list = list.filter((i) => i.category === categoryFilter);
    if (brandFilter) list = list.filter((i) => i.brand === brandFilter);

    list = [...list].sort((a, b) => {
      if (sort === 'nameAsc') return a.name.localeCompare(b.name, 'th');
      if (sort === 'nameDesc') return b.name.localeCompare(a.name, 'th');
      if (sort === 'priceLow') return getDisplayPrice(a, accessTier) - getDisplayPrice(b, accessTier);
      if (sort === 'priceHigh') return getDisplayPrice(b, accessTier) - getDisplayPrice(a, accessTier);
      if (sort === 'lowStock') return a.stock - b.stock;
      return 0;
    });
    return list;
  }, [data, searchQuery, stockFilter, categoryFilter, brandFilter, sort, accessTier]);

  // Infinite scroll
  const CATALOG_BATCH = 20;
  const [visibleCount, setVisibleCount] = useState(CATALOG_BATCH);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setVisibleCount(CATALOG_BATCH); }, [items]);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount((c) => Math.min(c + CATALOG_BATCH, items.length)); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length]);
  const visibleItems = items.slice(0, visibleCount);

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
  const activeFilterCount = (categoryFilter ? 1 : 0) + (brandFilter ? 1 : 0);

  return (
    <div className="fixed inset-0 w-full flex flex-col bg-[#F2F2F7] overflow-hidden">
      {/* Header */}
      <div className={`shrink-0 z-30 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm transition-all duration-300 ${scrollDir === 'down' && !isSettingsTab ? 'pb-4' : 'pb-5'}`} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">{isSettingsTab ? 'ตั้งค่า' : 'แคตตาล็อกสินค้า'}</h1>
        </div>

        {!isSettingsTab && (
          <div className={`overflow-hidden transition-all duration-300 ${scrollDir === 'down' ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
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

            {/* Category chips */}
            {facets.categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    !categoryFilter ? 'bg-white text-[var(--brand-primary)]' : 'bg-white/20 text-white'
                  }`}
                >
                  ทั้งหมด
                </button>
                {facets.categories.slice(0, 10).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(categoryFilter === cat.value ? '' : cat.value)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      categoryFilter === cat.value ? 'bg-white text-[var(--brand-primary)]' : 'bg-white/20 text-white'
                    }`}
                  >
                    {cat.value}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isSettingsTab ? (
        <div className="flex-1 overflow-y-auto pb-24">
          <SettingsPage
            viewMode="list" hapticsEnabled={hapticsEnabled}
            onChangeViewMode={() => {}}
            onToggleHaptics={() => setHapticsEnabled((p) => !p)}
            onRefreshData={async () => {
              await fetch('/api/catalog?refresh=true');
              await mutate();
            }}
            onResetPreferences={() => { setHapticsEnabled(true); window.localStorage.removeItem('sheetstock-haptics'); }}
            onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }}
            userRole={userRole ?? 'customer'} userName={userName}
            customerTier={accessTier === 'vvip' ? 'VVIP' : accessTier === 'vip' ? 'VIP' : undefined}
            recentScans={[]} onClearRecentScans={() => {}} onScanItemClick={() => {}}
          />
        </div>
      ) : (
        <>
          {/* Count + Sort */}
          <div className="px-5 pt-3 pb-3 flex items-center justify-between">
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
          <div id="catalog-scroll" ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-24 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                <button onClick={() => { setSearchQuery(''); setStockFilter('all'); setCategoryFilter(''); setBrandFilter(''); }} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium">
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <><AnimatePresence>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {visibleItems.map((item) => {
                    const isOut = item.stock <= 0;
                    const isLow = item.stock > 0 && item.stock < 10;
                    const displayPrice = getDisplayPrice(item, accessTier);
                    return (
                      <div
                        key={item.productId}
                        className={`bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer border active:scale-[0.98] transition-transform ${
                          isOut ? 'border-red-200' : isLow ? 'border-yellow-200' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="relative aspect-square w-full bg-gray-100">
                          <ProductImage src={item.imageUrl} alt={item.name} sizes="(max-width: 768px) 45vw, 200px" className={`object-cover ${isOut ? 'grayscale opacity-70' : ''}`} />
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                              <span className="bg-red-500 text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-2.5 ${isOut ? 'opacity-60' : ''}`}>
                          {item.brand && (
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-medium border rounded-full mb-1.5 ${brandColor(item.brand)}`}>{item.brand}</span>
                          )}
                          <h3 className="font-semibold text-[13px] text-gray-900 leading-tight line-clamp-2">{[item.brand, item.category, item.series].filter(Boolean).join(' ') || item.name || item.barcode}</h3>
                          {item.category && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.category}</p>}
                          <div className="flex items-center justify-between mt-1.5">
                            <div>
                              {displayPrice !== item.price && item.price > 0 && (
                                <p className="text-[11px] text-gray-400 line-through">฿{Math.round(item.price)}</p>
                              )}
                              <p className="text-base font-bold text-[var(--brand-primary)]">
                                {displayPrice > 0 ? `฿${Math.round(displayPrice)}` : '-'}
                              </p>
                            </div>
                            {item.quantityPerBox && (
                              <span className="text-[10px] text-gray-400">{item.quantityPerBox}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AnimatePresence>

              {visibleCount < items.length && (
                <div ref={loadMoreRef} className="py-4 grid grid-cols-2 gap-3">
                  {[0, 1].map((i) => <div key={i} className="h-48 rounded-2xl bg-white animate-pulse border border-gray-100" />)}
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] bg-white border-none" showCloseButton={false}>
          {selectedItem && (() => {
            const displayPrice = getDisplayPrice(selectedItem, accessTier);
            return (
              <div className="px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                <div className="flex justify-center mb-4">
                  <div
                    className="relative h-48 w-48 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => {
                      const imgSrc = selectedItem.imageUrl || FALLBACK_IMAGE_SRC;
                      setSelectedItem(null);
                      setTimeout(() => setFullscreenImage(imgSrc), 150);
                    }}
                  >
                    <ProductImage src={selectedItem.imageUrl} alt={selectedItem.name} sizes="192px" className="object-cover" />
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
                    <div className="text-right">
                      {displayPrice !== selectedItem.price && selectedItem.price > 0 && (
                        <span className="text-xs text-gray-400 line-through mr-1.5">฿{selectedItem.price.toFixed(2)}</span>
                      )}
                      <span className="text-sm font-semibold text-[var(--brand-primary)]">
                        {displayPrice > 0 ? `฿${displayPrice.toFixed(2)}` : '-'}
                      </span>
                    </div>
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
            );
          })()}
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
        key={`${isFilterOpen}-${stockFilter}-${categoryFilter}-${brandFilter}`}
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        stockFilter={stockFilter}
        category={categoryFilter}
        brand={brandFilter}
        series=""
        facets={facets}
        allItems={data?.items}
        applyFilters={(f) => {
          setStockFilter(f.stock as StockFilter);
          setCategoryFilter(f.category);
          setBrandFilter(f.brand);
        }}
        clearFilters={() => {
          setStockFilter('all');
          setCategoryFilter('');
          setBrandFilter('');
        }}
      />

      {/* BottomNav - show for logged-in users, or simplified for guests */}
      {isLoggedIn && userRole ? (
        <BottomNav
          activePage={isSettingsTab ? 'settings' : 'catalog'}
          userRole={userRole}
          onScanClick={() => {}}
          onSettingsClick={() => setActiveTab('settings')}
          onInventoryClick={() => setActiveTab('catalog')}
        />
      ) : (
        <BottomNav
          activePage={isSettingsTab ? 'settings' : 'catalog'}
          userRole="customer"
          isGuest={true}
          onScanClick={() => {}}
          onSettingsClick={() => setActiveTab('settings')}
          onInventoryClick={() => setActiveTab('catalog')}
        />
      )}

      <BarcodeScannerSheet open={isScannerOpen} onOpenChange={setIsScannerOpen} onDetected={handleScanDetected} />

      {fullscreenImage && <FullscreenImageViewer src={fullscreenImage} onClose={() => setFullscreenImage(null)} />}

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
