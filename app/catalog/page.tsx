'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import PullToRefresh from 'pulltorefreshjs';
import { useInventoryStream } from '@/lib/hooks/use-inventory-stream';
import { ArrowUpDown, Plus, Search, ShoppingCart, SlidersHorizontal, X } from 'lucide-react';
import { ProductImage, FALLBACK_IMAGE_SRC, toSafeImageSrc } from '@/components/ProductImage';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { SettingsPage } from '@/components/SettingsPage';
import { useToast } from '@/components/ui/toast';
import { CartSheet } from '@/components/catalog/CartSheet';
import type { CartLine } from '@/components/catalog/quote-types';
import type { AccessTier, CatalogItem, UserRole } from '@/lib/types';

function FullscreenImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const lastDistRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    overlayRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="ดูรูปภาพสินค้าแบบเต็มหน้าจอ"
      tabIndex={-1}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200 focus:outline-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button onClick={onClose} aria-label="ปิดรูปภาพเต็มหน้าจอ" className="absolute right-4 z-10 w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <X className="w-5 h-5" />
      </button>
      <div ref={containerRef} className="flex-1 relative w-full overflow-hidden" onClick={handleDoubleTap}>
        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-200" style={{ transform: `scale(${scale})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={toSafeImageSrc(src) || FALLBACK_IMAGE_SRC} alt="Product image" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" onError={(e) => { const el = e.currentTarget; if (!el.src.endsWith(FALLBACK_IMAGE_SRC)) el.src = FALLBACK_IMAGE_SRC; }} />
        </div>
      </div>
      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 flex flex-col items-center gap-3">
        <button onClick={onClose} className="w-full max-w-xs h-11 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
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

function stockTone(stock: number) {
  if (stock <= 0) return 'bg-[color:color-mix(in_oklab,var(--status-danger)_12%,white)] text-[var(--status-danger)]';
  if (stock < 10) return 'bg-[color:color-mix(in_oklab,var(--status-warning)_14%,white)] text-[var(--status-warning)]';
  return 'bg-[color:color-mix(in_oklab,var(--status-success)_14%,white)] text-[var(--status-success)]';
}

const BarcodeScannerSheet = dynamic(() => import('@/components/BarcodeScannerSheet').then(m => ({ default: m.BarcodeScannerSheet })), { ssr: false });
const FilterSheet = dynamic(() => import('@/components/sheets/FilterSheet').then(m => ({ default: m.FilterSheet })), { ssr: false });

type CatalogResponse = {
  accessTier: AccessTier;
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userName: string | null;
  customerPhone: string | null;
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

const CART_STORAGE_KEY = 'sheetstock-cart-v1';

function clampQuantity(quantity: number, stock: number) {
  return Math.max(1, Math.min(Math.floor(quantity), Math.max(1, stock)));
}

function toCartLine(item: CatalogItem, accessTier: AccessTier, quantity: number): CartLine {
  return {
    productId: item.productId,
    barcode: item.barcode,
    name: item.name,
    brand: item.brand,
    category: item.category,
    series: item.series,
    imageUrl: item.imageUrl,
    unitPrice: getDisplayPrice(item, accessTier),
    quantity: clampQuantity(quantity, item.stock),
    stock: item.stock,
    quantityPerBox: item.quantityPerBox,
  };
}

export default function CatalogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isValidatingRef = useRef(false);
  const CATALOG_BATCH = 20;
  const [visibleCount, setVisibleCount] = useState(CATALOG_BATCH);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const resetCatalogPagination = useCallback(() => {
    setVisibleCount(CATALOG_BATCH);
  }, [CATALOG_BATCH]);

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings'>('catalog');
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('sheetstock-haptics') !== 'off';
  });
  useEffect(() => { window.localStorage.setItem('sheetstock-haptics', hapticsEnabled ? 'on' : 'off'); }, [hapticsEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartLine[];
      if (Array.isArray(parsed)) {
        timer = setTimeout(() => setCartLines(parsed), 0);
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartLines));
  }, [cartLines]);

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

  const catalogById = useMemo(() => {
    return new Map((data?.items ?? []).map((item) => [item.productId, item]));
  }, [data]);

  useEffect(() => {
    if (!data) return;
    let changed = false;
    let clamped = false;
    const next = cartLines.flatMap((line) => {
      const item = catalogById.get(line.productId);
      if (!item || item.stock <= 0) {
        changed = true;
        return [];
      }
      const updated = toCartLine(item, accessTier, line.quantity);
      if (updated.quantity !== line.quantity) clamped = true;
      if (
        updated.unitPrice !== line.unitPrice ||
        updated.stock !== line.stock ||
        updated.quantity !== line.quantity ||
        updated.name !== line.name ||
        updated.imageUrl !== line.imageUrl
      ) {
        changed = true;
      }
      return [updated];
    });
    if (changed) {
      const timer = setTimeout(() => {
        setCartLines(next);
        if (clamped) toast('จำนวนสินค้าในตะกร้าถูกปรับตามสต็อกล่าสุด', 'warning');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [data, catalogById, accessTier, cartLines, toast]);

  const cartItemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  // Infinite scroll
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
    PullToRefresh.setPointerEventsMode?.(true);
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
    resetCatalogPagination();
    setSearchQuery(barcode);
  }, [resetCatalogPagination]);

  const addToCart = useCallback((item: CatalogItem, quantity = 1) => {
    if (item.stock <= 0) {
      toast('สินค้านี้หมดสต็อก', 'warning');
      return;
    }
    setCartLines((current) => {
      const existing = current.find((line) => line.productId === item.productId);
      if (existing) {
        return current.map((line) => (
          line.productId === item.productId
            ? toCartLine(item, accessTier, line.quantity + quantity)
            : line
        ));
      }
      return [...current, toCartLine(item, accessTier, quantity)];
    });
    toast('เพิ่มสินค้าเข้าตะกร้าแล้ว', 'success');
  }, [accessTier, toast]);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCartLines((current) => current.flatMap((line) => {
      if (line.productId !== productId) return [line];
      if (quantity <= 0) return [];
      return [{ ...line, quantity: clampQuantity(quantity, line.stock) }];
    }));
  }, []);

  const removeCartLine = useCallback((productId: string) => {
    setCartLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartLines([]);
  }, []);

  const isSettingsTab = activeTab === 'settings';
  const activeFilterCount = (categoryFilter ? 1 : 0) + (brandFilter ? 1 : 0);

  return (
    <div className="fixed inset-0 w-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className={`shrink-0 z-30 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm transition-all duration-300 ${scrollDir === 'down' && !isSettingsTab ? 'pb-4' : 'pb-5'}`} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">{isSettingsTab ? 'ตั้งค่า' : 'แคตตาล็อกสินค้า'}</h1>
        </div>

        {!isSettingsTab && (
          <div className={`overflow-hidden transition-all duration-300 ${scrollDir === 'down' ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                aria-label="ค้นหาสินค้า"
                value={searchQuery}
                onChange={(e) => {
                  resetCatalogPagination();
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl pl-10 pr-9 h-11 border border-transparent text-sm shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out focus:border-[color:color-mix(in_oklab,var(--brand-primary)_38%,white)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-primary)_18%,transparent)]"
              />
              {searchQuery && (
                <button onClick={() => { resetCatalogPagination(); setSearchQuery(''); }} aria-label="ล้างคำค้นหา" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-inset">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>

            {/* Category chips */}
            {facets.categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => {
                    resetCatalogPagination();
                    setCategoryFilter('');
                  }}
                  className={`shrink-0 min-h-11 px-3.5 py-1.5 rounded-full text-xs font-medium transition-[background-color,color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-primary)] ${
                    !categoryFilter ? 'bg-white text-[var(--brand-primary)]' : 'bg-white/20 text-white'
                  }`}
                >
                  ทั้งหมด
                </button>
                {facets.categories.slice(0, 10).map((cat) => (
                  <button
                    type="button"
                    key={cat.value}
                    onClick={() => {
                      resetCatalogPagination();
                      setCategoryFilter(categoryFilter === cat.value ? '' : cat.value);
                    }}
                    className={`shrink-0 min-h-11 px-3.5 py-1.5 rounded-full text-xs font-medium transition-[background-color,color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-primary)] ${
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
            <p className="text-sm text-[var(--text-secondary)]">พบ {items.length} รายการ</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="px-3 min-h-11 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center gap-1.5 text-xs text-[var(--text-secondary)] shadow-sm relative transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--brand-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsSortOpen(true)}
                className="px-3 min-h-11 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center gap-1.5 text-xs text-[var(--text-secondary)] shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
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
                  <div key={i} className="h-52 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] px-5 py-8 text-center mt-2">
                <p className="text-[var(--text-primary)] font-medium mb-1">ไม่พบสินค้า</p>
                <p className="text-sm text-[var(--text-secondary)] mb-4">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                <button onClick={() => { resetCatalogPagination(); setSearchQuery(''); setStockFilter('all'); setCategoryFilter(''); setBrandFilter(''); }} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium">
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <><AnimatePresence>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {visibleItems.map((item, index) => {
                    const isOut = item.stock <= 0;
                    const isLow = item.stock > 0 && item.stock < 10;
                    const displayPrice = getDisplayPrice(item, accessTier);
                    const isFeatured = index === 0 && visibleItems.length > 2;
                    const metaLine = [item.brand, item.category, item.series].filter(Boolean).join(' • ');
                    return (
                      <button
                        type="button"
                        key={item.productId}
                        aria-label={`ดูรายละเอียดสินค้า ${item.name}`}
                        className={`bg-[var(--bg-card)] rounded-[1.6rem] overflow-hidden flex cursor-pointer border text-left transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_26%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                          isFeatured ? 'col-span-2 min-h-[13rem] items-stretch shadow-[0_18px_36px_-26px_rgba(17,24,39,0.28)]' : 'flex-col shadow-[0_12px_24px_-20px_rgba(17,24,39,0.22)]'
                        } ${
                          isOut ? 'border-red-200' : isLow ? 'border-yellow-200' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className={`relative bg-[var(--bg-secondary)] ${isFeatured ? 'w-[46%] shrink-0' : 'aspect-square w-full'}`}>
                          <ProductImage src={item.imageUrl} alt={item.name} sizes="(max-width: 768px) 45vw, 200px" className={`object-cover ${isOut ? 'grayscale opacity-70' : ''}`} />
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                              <span className="bg-red-500 text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                            </div>
                          )}
                        </div>
                        <div className={`flex flex-1 flex-col ${isFeatured ? 'justify-between px-4 py-4' : `px-3 py-2.5 ${isOut ? 'opacity-60' : ''}`}`}>
                          <div>
                            <div className={`flex ${isFeatured ? 'items-start justify-between gap-3 mb-3' : 'items-center justify-between gap-2 mb-1.5'}`}>
                              {item.brand ? (
                                <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${brandColor(item.brand)}`}>
                                  <span className="truncate">{item.brand}</span>
                                </span>
                              ) : <span />}
                              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${stockTone(item.stock)}`}>
                                {item.stock <= 0 ? 'หมดสต็อก' : item.stock < 10 ? `ใกล้หมด ${item.stock}` : `พร้อมส่ง ${item.stock}`}
                              </span>
                            </div>
                            <h3 className={`${isFeatured ? 'text-[1.05rem]' : 'text-[13px]'} font-semibold text-[var(--text-primary)] leading-tight line-clamp-2`}>
                              {item.name || item.barcode}
                            </h3>
                            {metaLine && (
                              <p className={`${isFeatured ? 'mt-1.5 text-[12px]' : 'mt-1 text-[11px]'} text-[var(--text-muted)] ${isFeatured ? 'line-clamp-2' : 'truncate'}`}>
                                {metaLine}
                              </p>
                            )}
                          </div>
                          <div className={`${isFeatured ? 'mt-4 flex items-end justify-between gap-3 border-t border-[var(--border-subtle)] pt-3' : 'mt-1.5 flex items-end justify-between'}`}>
                            <div>
                              <p className={`${isFeatured ? 'text-[11px]' : 'text-[10px]'} text-[var(--text-muted)]`}>ราคาขาย</p>
                              <p className={`${isFeatured ? 'text-[1.35rem]' : 'text-base'} font-bold text-[var(--brand-primary)] leading-none`}>
                                {displayPrice > 0 ? `฿${Math.round(displayPrice)}` : '-'}
                              </p>
                            </div>
                            {!isFeatured && item.stock > 0 && (
                              <p className="text-[12px] text-[var(--text-muted)] leading-none">เหลือ {item.stock} ชิ้น</p>
                            )}
                            {isFeatured && (
                              <p className="max-w-[8rem] text-right text-[11px] leading-snug text-[var(--text-secondary)]">
                                แตะเพื่อดูบาร์โค้ด ราคา และรายละเอียดสินค้า
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AnimatePresence>

              {visibleCount < items.length && (
                <div ref={loadMoreRef} className="py-4 grid grid-cols-2 gap-3">
                  {[0, 1].map((i) => <div key={i} className="h-48 rounded-2xl bg-[var(--bg-card)] animate-pulse border border-[var(--border-subtle)]" />)}
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] bg-[var(--bg-card)] border-none" showCloseButton={false}>
          {selectedItem && (() => {
            const displayPrice = getDisplayPrice(selectedItem, accessTier);
            return (
              <div className="px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    aria-label={`ดูรูปภาพสินค้า ${selectedItem.name} แบบเต็มหน้าจอ`}
                    className="relative h-48 w-48 rounded-2xl overflow-hidden bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                    onClick={() => {
                      const imgSrc = selectedItem.imageUrl || FALLBACK_IMAGE_SRC;
                      setSelectedItem(null);
                      setTimeout(() => setFullscreenImage(imgSrc), 150);
                    }}
                  >
                    <ProductImage src={selectedItem.imageUrl} alt={selectedItem.name} sizes="192px" className="object-cover" />
                  </button>
                </div>

                <h3 className="text-lg font-medium text-[var(--text-primary)] text-center mb-1">{selectedItem.name}</h3>
                <div className="flex justify-center gap-2 mb-4 flex-wrap">
                  {selectedItem.category && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px]">{selectedItem.category}</Badge>}
                  {selectedItem.brand && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px]">{selectedItem.brand}</Badge>}
                  {selectedItem.series && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px]">{selectedItem.series}</Badge>}
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3 border border-[var(--border-subtle)] mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">บาร์โค้ด</span>
                    <span className="text-sm text-[var(--text-primary)] font-mono">{selectedItem.barcode}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[var(--border-color)] pt-3">
                    <span className="text-sm text-[var(--text-secondary)]">ราคา</span>
                    <div className="text-right">
                      {displayPrice !== selectedItem.price && selectedItem.price > 0 && (
                        <span className="text-xs text-[var(--text-muted)] line-through mr-1.5">฿{selectedItem.price.toFixed(2)}</span>
                      )}
                      <span className="text-sm font-semibold text-[var(--brand-primary)]">
                        {displayPrice > 0 ? `฿${displayPrice.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[var(--border-color)] pt-3">
                    <span className="text-sm text-[var(--text-secondary)]">สต็อก</span>
                    <span className={`text-sm font-medium ${selectedItem.stock <= 0 ? 'text-[var(--status-danger)]' : selectedItem.stock < 10 ? 'text-[var(--status-warning)]' : 'text-[var(--status-success)]'}`}>
                      {selectedItem.stock <= 0 ? 'สินค้าหมด' : `${selectedItem.stock} ชิ้น`}
                    </span>
                  </div>
                  {selectedItem.expiryDate && (
                    <div className="flex justify-between border-t border-dashed border-[var(--border-color)] pt-3">
                      <span className="text-sm text-[var(--text-secondary)]">วันหมดอายุ</span>
                      <span className="text-sm text-[var(--text-primary)]">{selectedItem.expiryDate}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                  <button onClick={() => setSelectedItem(null)} className="h-12 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium">
                    ปิด
                  </button>
                  <button
                    onClick={() => {
                      addToCart(selectedItem);
                      setSelectedItem(null);
                    }}
                    disabled={selectedItem.stock <= 0}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มลงตะกร้า
                  </button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Sort Sheet */}
      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pt-8 bg-[var(--bg-card)] border-none focus:outline-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-6">เรียงลำดับ</h3>
          <div className="flex flex-col gap-3">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  resetCatalogPagination();
                  setSort(opt.id);
                  setIsSortOpen(false);
                }}
                className={`w-full min-h-11 py-3 px-4 rounded-xl text-left font-medium text-sm transition-[background-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 ${
                  sort === opt.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
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
          resetCatalogPagination();
          setStockFilter(f.stock as StockFilter);
          setCategoryFilter(f.category);
          setBrandFilter(f.brand);
        }}
        clearFilters={() => {
          resetCatalogPagination();
          setStockFilter('all');
          setCategoryFilter('');
          setBrandFilter('');
        }}
      />

      {!isSettingsTab && cartLines.length > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed left-3.5 right-3.5 z-50 flex h-[52px] items-center justify-between rounded-[18px] bg-[var(--brand-primary)] px-3.5 text-white shadow-lg shadow-orange-900/18 active:scale-[0.99] transition-transform"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
          aria-label="เปิดตะกร้าสินค้า"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18">
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--brand-primary)]">{cartItemCount}</span>
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold leading-tight">ดูตะกร้า</span>
              <span className="block truncate text-[11px] leading-tight text-white/78">{cartItemCount} ชิ้นสำหรับใบสั่งซื้อ</span>
            </span>
          </span>
          <span className="shrink-0 pl-3 text-sm font-bold">฿{cartTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </button>
      )}

      {isCartOpen && (
        <CartSheet
          open={isCartOpen}
          onOpenChange={setIsCartOpen}
          lines={cartLines}
          customer={{ name: userName ?? 'ลูกค้า', phone: data?.customerPhone ?? null }}
          onUpdateQuantity={updateCartQuantity}
          onRemoveLine={removeCartLine}
          onClearCart={clearCart}
        />
      )}

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
        .ptr--ptr { box-shadow: none !important; }
      `}</style>
    </div>
  );
}
