'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import PullToRefresh from 'pulltorefreshjs';
import { useInventoryStream } from '@/lib/hooks/use-inventory-stream';
import { ArrowUpDown, Check, ChevronDown, LogOut, Plus, Search, ShoppingCart, SlidersHorizontal, X } from 'lucide-react';
import { AnnouncementCarousel } from '@/components/catalog/AnnouncementCarousel';
import { ProductImage, FALLBACK_IMAGE_SRC, toSafeImageSrc } from '@/components/ProductImage';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { SettingsPage } from '@/components/SettingsPage';
import { useToast } from '@/components/ui/toast';
import { CartSheet } from '@/components/catalog/CartSheet';
import type { CartLine } from '@/components/catalog/quote-types';
import { getCheckoutUnitLabel } from '@/lib/catalog-units';
import type { AccessTier, AnnouncementItem, CatalogItem, UserRole } from '@/lib/types';

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

const BRAND_COLOR_CLASSES = [
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-lime-50 text-lime-800 border-lime-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-pink-50 text-pink-700 border-pink-200',
] as const;

function brandColor(brand: string) {
  const normalized = brand.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return BRAND_COLOR_CLASSES[Math.abs(hash) % BRAND_COLOR_CLASSES.length];
}

function stockTone(stock: number) {
  if (stock <= 0) return 'border border-[color:color-mix(in_oklab,var(--status-danger)_24%,var(--bg-card))] bg-[color:color-mix(in_oklab,var(--status-danger)_8%,var(--bg-card))] text-[var(--status-danger)]';
  if (stock < 10) return 'border border-[color:color-mix(in_oklab,var(--status-warning)_28%,var(--bg-card))] bg-[color:color-mix(in_oklab,var(--status-warning)_9%,var(--bg-card))] text-[var(--status-warning)]';
  return 'border border-[color:color-mix(in_oklab,var(--status-success)_24%,var(--bg-card))] bg-[color:color-mix(in_oklab,var(--status-success)_8%,var(--bg-card))] text-[var(--status-success)]';
}

const BarcodeScannerSheet = dynamic(() => import('@/components/BarcodeScannerSheet').then(m => ({ default: m.BarcodeScannerSheet })), { ssr: false });
const FilterSheet = dynamic(() => import('@/components/sheets/FilterSheet').then(m => ({ default: m.FilterSheet })), { ssr: false });

type CatalogResponse = {
  accessTier: AccessTier;
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userName: string | null;
  customerId: string | null;
  customerPhone: string | null;
  items: CatalogItem[];
};

type StockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
type SortOption = 'sheetOrder' | 'priceHigh' | 'priceLow' | 'lowStock';
type CatalogViewMode = 'grid' | 'list';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'sheetOrder', label: 'เรียงตามชีท' },
  { id: 'priceHigh', label: 'ราคา: สูง-ต่ำ' },
  { id: 'priceLow', label: 'ราคา: ต่ำ-สูง' },
  { id: 'lowStock', label: 'ใกล้หมด' },
];

function canViewVvipPrice(tier: AccessTier) {
  return tier === 'vvip';
}

function hasVvipPrice(item: CatalogItem, tier: AccessTier) {
  return canViewVvipPrice(tier) && item.vvipPrice != null && item.vvipPrice > 0;
}

function formatBaht(value: number, options: { decimals?: boolean } = {}) {
  if (value <= 0) return '-';
  return `฿${options.decimals ? value.toFixed(2) : Math.round(value).toLocaleString('th-TH')}`;
}

function CatalogPrice({ item, tier, align = 'left' }: { item: CatalogItem; tier: AccessTier; align?: 'left' | 'right' }) {
  const showVvip = hasVvipPrice(item, tier);
  const alignClass = align === 'right' ? 'items-end text-right' : 'items-start text-left';

  if (!showVvip) {
    return (
      <div className={`flex flex-col ${alignClass}`}>
        <span className="text-[18px] font-bold leading-none text-[var(--catalog-emphasis)]">
          {formatBaht(item.price)}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${alignClass}`}>
      <span className="text-[11px] font-medium leading-none text-[var(--text-muted)]">
        ปกติ {formatBaht(item.price)}
      </span>
      <span className="text-[18px] font-bold leading-none text-[var(--catalog-emphasis)]">
        VVIP {formatBaht(item.vvipPrice ?? 0)}
      </span>
    </div>
  );
}

/** Return the price used for sorting and cart line unit price. */
function getDisplayPrice(item: CatalogItem, tier: AccessTier): number {
  if (tier === 'vvip' && item.vvipPrice != null && item.vvipPrice > 0) return item.vvipPrice;
  return item.price;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return (await res.json()) as CatalogResponse;
};

const announcementFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch announcements');
  return (await res.json()) as { items: AnnouncementItem[] };
};

const CART_STORAGE_PREFIX = 'sheetstock-cart-v1';

function getCartStorageKey(ownerKey: string) {
  return `${CART_STORAGE_PREFIX}:${encodeURIComponent(ownerKey)}`;
}

function normalizeCartQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
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
    quantity: normalizeCartQuantity(quantity),
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

  const { data, error: catalogError, isLoading, isValidating, mutate } = useSWR('/api/catalog', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
    keepPreviousData: true,
  });
  const { data: announcementData } = useSWR('/api/announcements', announcementFetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
    keepPreviousData: true,
  });
  const [isSlowCatalogLoad, setIsSlowCatalogLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlowCatalogLoad(isLoading), isLoading ? 3500 : 0);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Only connect to stream when logged in (stream API requires auth)
  useInventoryStream(() => mutate(), { enabled: data?.isLoggedIn ?? false });

  const accessTier = data?.accessTier ?? 'public';
  const isLoggedIn = data?.isLoggedIn ?? false;
  const userRole = data?.userRole ?? null;
  const userName = data?.userName ?? undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('inStock');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [seriesFilter, setSeriesFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('sheetOrder');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDesktopSortOpen, setIsDesktopSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [poCustomerName, setPoCustomerName] = useState('');
  const loadedCartKeyRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings'>('catalog');
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    return window.localStorage.getItem('sheetstock-catalog-view') === 'list' ? 'list' : 'grid';
  });
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('sheetstock-haptics') !== 'off';
  });
  useEffect(() => { window.localStorage.setItem('sheetstock-haptics', hapticsEnabled ? 'on' : 'off'); }, [hapticsEnabled]);
  useEffect(() => { window.localStorage.setItem('sheetstock-catalog-view', catalogViewMode); }, [catalogViewMode]);

  const cartStorageKey = useMemo(() => {
    if (!data) return null;
    if (!data.isLoggedIn) return getCartStorageKey('guest');
    return getCartStorageKey(`user:${data.customerId ?? data.customerPhone ?? 'unknown'}`);
  }, [data]);

  useEffect(() => {
    if (typeof window === 'undefined' || !cartStorageKey) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = window.localStorage.getItem(cartStorageKey);
      const parsed = raw ? JSON.parse(raw) as CartLine[] : [];
      const nextCartLines = Array.isArray(parsed) ? parsed : [];
      timer = setTimeout(() => {
        loadedCartKeyRef.current = cartStorageKey;
        setCartLines(nextCartLines);
      }, 0);
    } catch {
      window.localStorage.removeItem(cartStorageKey);
      timer = setTimeout(() => {
        loadedCartKeyRef.current = cartStorageKey;
        setCartLines([]);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cartStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !cartStorageKey) return;
    if (loadedCartKeyRef.current !== cartStorageKey) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartLines));
  }, [cartLines, cartStorageKey]);

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

  const activeSortOption = SORT_OPTIONS.find((option) => option.id === sort) ?? SORT_OPTIONS[0];

  const applySort = useCallback((nextSort: SortOption) => {
    resetCatalogPagination();
    setSort(nextSort);
    setIsSortOpen(false);
    setIsDesktopSortOpen(false);
  }, [resetCatalogPagination]);

  useEffect(() => {
    if (!isDesktopSortOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsDesktopSortOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopSortOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesktopSortOpen]);

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
    if (categoryFilter.length > 0) list = list.filter((i) => categoryFilter.includes(i.category));
    if (brandFilter.length > 0) list = list.filter((i) => brandFilter.includes(i.brand));
    if (seriesFilter.length > 0) list = list.filter((i) => seriesFilter.includes(i.series));

    if (sort !== 'sheetOrder') {
      list = [...list].sort((a, b) => {
        if (sort === 'priceLow') return getDisplayPrice(a, accessTier) - getDisplayPrice(b, accessTier);
        if (sort === 'priceHigh') return getDisplayPrice(b, accessTier) - getDisplayPrice(a, accessTier);
        if (sort === 'lowStock') return a.stock - b.stock;
        return 0;
      });
    }
    return list;
  }, [data, searchQuery, stockFilter, categoryFilter, brandFilter, seriesFilter, sort, accessTier]);

  const catalogById = useMemo(() => {
    return new Map((data?.items ?? []).map((item) => [item.productId, item]));
  }, [data]);

  useEffect(() => {
    if (!data) return;
    let changed = false;
    const next = cartLines.flatMap((line) => {
      const item = catalogById.get(line.productId);
      if (!item) {
        changed = true;
        return [];
      }
      const updated = toCartLine(item, accessTier, line.quantity);
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
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [data, catalogById, accessTier, cartLines]);

  const cartItemCount = cartLines.length;
  const cartTotal = cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const effectivePoCustomerName = poCustomerName || userName || '';

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
    if (item.stock <= 0) return;
    const requestedQuantity = Math.min(item.stock, normalizeCartQuantity(quantity));
    setCartLines((current) => {
      const existing = current.find((line) => line.productId === item.productId);
      if (existing) {
        return current.map((line) => (
          line.productId === item.productId
            ? toCartLine(item, accessTier, Math.min(item.stock, line.quantity + requestedQuantity))
            : line
        ));
      }
      return [...current, toCartLine(item, accessTier, requestedQuantity)];
    });
    toast('เพิ่มสินค้าเข้าตะกร้าแล้ว', 'success', {
      action: {
        label: 'ดูตะกร้า',
        onClick: () => setIsCartOpen(true),
      },
    });
  }, [accessTier, toast]);

  const openProductDetail = useCallback((item: CatalogItem) => {
    setSelectedQuantity('1');
    setSelectedItem(item);
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCartLines((current) => current.flatMap((line) => {
      if (line.productId !== productId) return [line];
      if (quantity <= 0) return [];
      return [{ ...line, quantity: Math.min(Math.max(1, line.stock), normalizeCartQuantity(quantity)) }];
    }));
  }, []);

  const removeCartLine = useCallback((productId: string) => {
    setCartLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartLines([]);
  }, []);

  const isSettingsTab = activeTab === 'settings';
  const activeFilterCount = Number(stockFilter !== 'all') + categoryFilter.length + brandFilter.length;
  const catalogStatusLabel = accessTier === 'vvip' ? 'VVIP' : 'GUEST';
  const desktopRoleLabel = userRole === 'admin' ? 'ADMIN' : userRole === 'sale' ? 'SALE' : 'CUSTOMER';
  const desktopRoleClass = userRole === 'admin'
    ? 'border-red-200 bg-red-50 text-red-700'
    : userRole === 'sale'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  const catalogShellClass = 'mx-auto w-full max-w-[1180px]';
  const catalogGridClass = catalogViewMode === 'grid'
    ? 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4'
    : 'grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3';
  const catalogSkeletonClass = catalogViewMode === 'grid'
    ? 'h-[300px] rounded-[18px] lg:h-[320px]'
    : 'h-[116px] rounded-xl';

  return (
    <div className="catalog-theme catalog-page fixed inset-0 w-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className={`catalog-header shrink-0 z-30 border-b border-[color:color-mix(in_oklab,var(--catalog-header)_80%,var(--border-color))] bg-[var(--catalog-header)] px-4 transition-all duration-200 sm:px-6 lg:px-8 ${scrollDir === 'down' && !isSettingsTab ? 'pb-3' : 'pb-4 lg:pb-5'}`} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
        <div className={`${catalogShellClass} mb-3 flex items-end justify-between gap-4`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--catalog-header-action)]">{isSettingsTab ? 'Account' : 'Korean Catalog'}</p>
            <h1 className="mt-0.5 text-[1.35rem] font-semibold leading-tight text-[var(--catalog-header-text)]">{isSettingsTab ? 'ตั้งค่า' : 'สินค้า'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isSettingsTab && (
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                accessTier === 'vvip'
                  ? 'border-[color:color-mix(in_oklab,var(--catalog-header-action)_72%,transparent)] bg-[var(--catalog-header-action)] text-[var(--catalog-header-action-text)]'
                  : 'border-[color:color-mix(in_oklab,var(--catalog-header-text)_34%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_94%,transparent)] text-[var(--catalog-header)]'
              } lg:hidden`}>
                {catalogStatusLabel}
              </span>
            )}
            <div className="hidden items-center gap-2 lg:flex">
              {!isSettingsTab && cartLines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="catalog-cart-header inline-flex h-10 items-center gap-2 rounded-full border border-[color:color-mix(in_oklab,var(--catalog-header-text)_18%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_12%,transparent)] px-3 text-sm font-semibold text-[var(--catalog-header-text)] transition-[background-color,color,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[color:color-mix(in_oklab,var(--catalog-header-text)_28%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--bg-card)_20%,transparent)]"
                  aria-label="เปิดตะกร้าสินค้า"
                >
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--catalog-header-action)] px-1 text-[10px] font-bold leading-none text-[var(--catalog-header-action-text)]">
                      {cartItemCount}
                    </span>
                  </span>
                  <span>{formatBaht(cartTotal)}</span>
                </button>
              )}
              {isLoggedIn ? (
                <>
                  <span className={`inline-flex h-9 items-center rounded-full border px-3 text-[11px] font-semibold tracking-[0.02em] ${desktopRoleClass}`}>
                    {desktopRoleLabel}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/auth/logout', { method: 'POST' });
                      setActiveTab('catalog');
                      await mutate(undefined, { revalidate: false });
                      await mutate();
                      router.push('/login');
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--catalog-header-text)_16%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_10%,transparent)] text-[var(--catalog-header-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:color-mix(in_oklab,var(--catalog-header-text)_26%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)] hover:text-[var(--catalog-header-text)]"
                    aria-label="ออกจากระบบ"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:color-mix(in_oklab,var(--catalog-header-text)_16%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_10%,transparent)] px-4 text-sm font-semibold text-[var(--catalog-header-text)] transition-[background-color,color,border-color] duration-150 hover:border-[color:color-mix(in_oklab,var(--catalog-header-text)_26%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)]"
                >
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>
        </div>

        {!isSettingsTab && (
          <div className={`catalog-search-zone ${catalogShellClass} overflow-hidden transition-all duration-200 ${scrollDir === 'down' ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
            <div className="relative mb-3 lg:max-w-[34rem]">
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
                className="h-11 w-full rounded-xl border border-[color:color-mix(in_oklab,var(--catalog-header-text)_28%,var(--border-color))] bg-[var(--bg-secondary)] pl-10 pr-9 text-sm text-[var(--text-primary)] outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out placeholder:text-[var(--text-muted)] focus:border-[var(--catalog-header-action)] focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_22%,transparent)]"
              />
              {searchQuery && (
                <button onClick={() => { resetCatalogPagination(); setSearchQuery(''); }} aria-label="ล้างคำค้นหา" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-inset">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>

            {/* Category chips */}
            {facets.categories.length > 0 && (
              <div className="catalog-chip-row flex gap-2 overflow-x-auto hide-scrollbar pb-1 lg:flex-wrap lg:overflow-visible">
                <button
                  type="button"
                  onClick={() => {
                    resetCatalogPagination();
                    setCategoryFilter([]);
                  }}
                  className={`shrink-0 min-h-10 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--catalog-header-action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--catalog-header)] ${
                    categoryFilter.length === 0 ? 'border-[var(--catalog-header-action)] bg-[var(--catalog-header-action)] text-[var(--catalog-header-action-text)]' : 'border-[color:color-mix(in_oklab,var(--catalog-header-text)_30%,var(--border-color))] bg-[var(--bg-secondary)] text-[var(--catalog-header)]'
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
                      setCategoryFilter((current) => (
                        current.includes(cat.value) ? current.filter((value) => value !== cat.value) : [...current, cat.value]
                      ));
                    }}
                    className={`shrink-0 min-h-10 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--catalog-header-action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--catalog-header)] ${
                      categoryFilter.includes(cat.value) ? 'border-[var(--catalog-header-action)] bg-[var(--catalog-header-action)] text-[var(--catalog-header-action-text)]' : 'border-[color:color-mix(in_oklab,var(--catalog-header-text)_30%,var(--border-color))] bg-[var(--bg-secondary)] text-[var(--catalog-header)]'
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
        <div className="flex-1 overflow-y-auto px-4 pb-24 sm:px-6 lg:px-8">
          <div className={catalogShellClass}>
            <SettingsPage
              viewMode={catalogViewMode} hapticsEnabled={hapticsEnabled}
              onChangeViewMode={setCatalogViewMode}
              onToggleHaptics={() => setHapticsEnabled((p) => !p)}
              onRefreshData={async () => {
                await fetch('/api/catalog?refresh=true');
                await mutate();
              }}
              onResetPreferences={() => { setHapticsEnabled(true); window.localStorage.removeItem('sheetstock-haptics'); }}
              onLogout={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                setCartLines([]);
                setActiveTab('catalog');
                await mutate(undefined, { revalidate: false });
                await mutate();
              }}
              userRole={userRole ?? 'customer'} userName={userName}
              customerTier={accessTier === 'vvip' ? 'VVIP' : accessTier === 'vip' ? 'VIP' : undefined}
              recentScans={[]} onClearRecentScans={() => {}} onScanItemClick={() => {}}
            />
          </div>
        </div>
      ) : (
        <>
          <AnnouncementCarousel items={announcementData?.items ?? []} hidden={scrollDir === 'down'} />

          {/* Count + Sort */}
          <div className={`catalog-toolbar ${catalogShellClass} px-4 pt-3 pb-2 flex items-center justify-between sm:px-6 lg:px-0`}>
            <p className="text-[13px] font-medium text-[var(--text-secondary)]">พบ {items.length.toLocaleString('th-TH')} รายการ</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="relative flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-[background-color,border-color] duration-150 ease-out active:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--brand-primary)] text-[var(--bg-card)] text-[9px] font-bold rounded-md flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isDesktopSortOpen}
                  onClick={() => {
                    if (window.matchMedia('(min-width: 1024px)').matches) {
                      setIsDesktopSortOpen((open) => !open);
                      return;
                    }
                    setIsSortOpen(true);
                  }}
                  className={`flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,color] duration-150 ease-out active:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                    isDesktopSortOpen
                      ? 'border-[var(--text-primary)] bg-[var(--bg-card)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="lg:hidden">เรียงลำดับ</span>
                  <span className="hidden lg:inline">
                    <span className="text-[var(--text-primary)]">เรียงตาม:</span>{' '}
                    <span className="text-[var(--text-muted)]">{activeSortOption.label}</span>
                  </span>
                  <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform duration-150 ease-out lg:block ${isDesktopSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDesktopSortOpen && (
                  <div
                    role="menu"
                    aria-label="เรียงลำดับสินค้า"
                    className="absolute right-0 z-30 mt-2 hidden min-w-[13rem] overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-card)] py-2 text-sm shadow-[0_24px_60px_-34px_rgba(41,51,92,0.75)] lg:block"
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const selected = sort === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          onClick={() => applySort(opt.id)}
                          className={`flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_32%,transparent)] ${
                            selected
                              ? 'bg-[var(--bg-card)] font-semibold text-[var(--text-primary)]'
                              : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <Check className={`h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div id="catalog-scroll" ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-24 hide-scrollbar sm:px-6 lg:px-8 lg:pb-10" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={catalogShellClass}>
              {isLoading ? (
                <>
                  {isSlowCatalogLoad && (
                    <div className="mb-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">กำลังเชื่อมต่อข้อมูลสินค้า</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">Google Sheets อาจตอบช้ากว่าปกติ ข้อมูลจะแสดงทันทีเมื่อโหลดสำเร็จ</p>
                    </div>
                  )}
                  <div className={`${catalogGridClass} mt-2`}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`${catalogSkeletonClass} bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse`} />
                    ))}
                  </div>
                </>
              ) : catalogError ? (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-8 text-center mt-2">
                  <p className="text-[var(--text-primary)] font-semibold mb-1">โหลดสินค้าไม่สำเร็จ</p>
                  <p className="mx-auto mb-4 max-w-[26rem] text-sm leading-relaxed text-[var(--text-secondary)]">ตรวจสอบการเชื่อมต่อ Google Sheets แล้วลองใหม่อีกครั้ง</p>
                  <button onClick={() => mutate()} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--bg-card)] text-sm font-semibold">
                    โหลดใหม่
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] px-5 py-8 text-center mt-2">
                  <p className="text-[var(--text-primary)] font-medium mb-1">ไม่พบสินค้า</p>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                  <button onClick={() => { resetCatalogPagination(); setSearchQuery(''); setStockFilter('all'); setCategoryFilter([]); setBrandFilter([]); setSeriesFilter([]); }} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--bg-card)] text-sm font-semibold">
                    ล้างตัวกรอง
                  </button>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    <div className={`catalog-grid ${catalogGridClass} mt-2`}>
                  {visibleItems.map((item) => {
                    const isOut = item.stock <= 0;
                    const isLow = item.stock > 0 && item.stock < 10;
                    const metaLine = [item.brand, item.category, item.series].filter(Boolean).join(' • ');
                    const unitLabel = getCheckoutUnitLabel(item);

                    if (catalogViewMode === 'grid') {
                      return (
                        <article
                          key={item.productId}
                              className={`catalog-card overflow-hidden rounded-[18px] border bg-[var(--bg-card)] shadow-[0_14px_28px_-24px_color-mix(in_oklab,var(--brand-primary)_38%,transparent)] transition-[border-color,transform,box-shadow] duration-150 ease-out ${
                            isOut ? 'border-[color:color-mix(in_oklab,var(--status-danger)_24%,var(--bg-card))]' : isLow ? 'border-[color:color-mix(in_oklab,var(--status-warning)_24%,var(--bg-card))]' : 'border-[var(--border-subtle)]'
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={`ดูรายละเอียดสินค้า ${item.name}`}
                            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_26%,transparent)] focus-visible:ring-inset"
                            onClick={() => openProductDetail(item)}
                          >
                            <div className="relative aspect-[1.03] w-full overflow-hidden bg-[var(--bg-secondary)]">
                              <ProductImage src={item.imageUrl} alt={item.name} sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw" className="object-cover" />
                              {isOut && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[color:color-mix(in_oklab,var(--text-primary)_18%,transparent)]">
                                  <span className="rounded-full bg-[var(--bg-card)] px-3 py-1 text-[10px] font-semibold text-[var(--status-danger)] shadow-sm">หมด</span>
                                </div>
                              )}
                            </div>
                            <div className="px-3 pt-3">
                              {item.brand ? (
                                <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none ${brandColor(item.brand)}`}>
                                  <span className="truncate">{item.brand}</span>
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-medium leading-none text-[var(--text-muted)]">No brand</span>
                              )}
                              <h3 className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                                {item.name || item.barcode}
                              </h3>
                              <p className="mt-0.5 truncate font-mono text-[11px] leading-none text-[color:color-mix(in_oklab,var(--text-muted)_62%,var(--bg-card))]">
                                {item.barcode}
                              </p>
                              <div className="mt-1.5 flex items-end justify-between gap-2">
                                <CatalogPrice item={item} tier={accessTier} />
                                <div className="text-right">
                                  <p className="text-base font-bold leading-none text-[var(--text-primary)]">{item.stock.toLocaleString('th-TH')}</p>
                                  <p className="mt-0.5 text-[9px] font-medium leading-none text-[var(--text-muted)]">{unitLabel}</p>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="px-3 pb-3 pt-2">
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              disabled={isOut}
                              className="catalog-add-button flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-transparent bg-[#29335C] text-[12px] font-semibold text-white shadow-[0_10px_18px_-14px_rgba(41,51,92,0.7)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#36446F] hover:shadow-[0_14px_24px_-12px_rgba(41,51,92,0.75)] active:translate-y-0 active:shadow-[0_8px_14px_-12px_rgba(41,51,92,0.65)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#29335C] disabled:hover:shadow-[0_10px_18px_-14px_rgba(41,51,92,0.7)]"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              เพิ่มลงตะกร้า
                            </button>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={item.productId}
                        aria-label={`ดูรายละเอียดสินค้า ${item.name}`}
                        className={`catalog-list-row flex min-h-[116px] cursor-pointer overflow-hidden rounded-xl border bg-[var(--bg-card)] text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--brand-primary)_26%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                          isOut ? 'border-[color:color-mix(in_oklab,var(--status-danger)_24%,var(--bg-card))]' : isLow ? 'border-[color:color-mix(in_oklab,var(--status-warning)_28%,var(--bg-card))]' : 'border-[var(--border-color)]'
                        }`}
                        onClick={() => openProductDetail(item)}
                      >
                        <div className="relative m-2 h-[100px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-[var(--bg-secondary)]">
                          <ProductImage src={item.imageUrl} alt={item.name} sizes="92px" className="object-cover" />
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[color:color-mix(in_oklab,var(--text-primary)_18%,transparent)]">
                              <span className="rounded-md bg-[var(--bg-card)] px-2 py-1 text-[10px] font-semibold text-[var(--status-danger)]">หมด</span>
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-3 pr-3">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              {item.brand ? (
                                <span className={`inline-flex max-w-[9rem] items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${brandColor(item.brand)}`}>
                                  <span className="truncate">{item.brand}</span>
                                </span>
                              ) : <span />}
                              <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${stockTone(item.stock)}`}>
                                {item.stock <= 0 ? 'หมดสต็อก' : item.stock < 10 ? `ใกล้หมด ${item.stock} ${unitLabel}` : `พร้อมส่ง ${item.stock} ${unitLabel}`}
                              </span>
                            </div>
                            <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                              {item.name || item.barcode}
                            </h3>
                            {metaLine && (
                              <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                                {metaLine}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 flex items-end justify-between gap-3 border-t border-[var(--border-subtle)] pt-2">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">ราคา</p>
                              <CatalogPrice item={item} tier={accessTier} />
                            </div>
                            <p className="text-right text-[11px] font-medium leading-tight text-[var(--text-secondary)]">
                              {item.stock.toLocaleString('th-TH')} {unitLabel}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                    </div>
                  </AnimatePresence>

                  {visibleCount < items.length && (
                    <div ref={loadMoreRef} className={`py-4 ${catalogGridClass}`}>
                      {[0, 1, 2, 3].map((i) => <div key={i} className={`${catalogSkeletonClass} bg-[var(--bg-card)] animate-pulse border border-[var(--border-subtle)]`} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="catalog-theme catalog-detail-dialog max-h-[92dvh] rounded-t-2xl border border-[var(--border-color)] bg-[var(--bg-card)] lg:rounded-[1.75rem] lg:border lg:shadow-[0_28px_80px_-46px_rgba(41,51,92,0.7)]" showCloseButton={false}>
          {selectedItem && (() => {
            const displayPrice = getDisplayPrice(selectedItem, accessTier);
            const unitLabel = getCheckoutUnitLabel(selectedItem);
            const quantityValue = Math.max(1, Number.parseInt(selectedQuantity, 10) || 1);
            const maxQuantity = Math.max(1, selectedItem.stock);
            const detailQuantity = selectedItem.stock > 0 ? Math.min(quantityValue, maxQuantity) : 1;
            return (
              <div className="flex max-h-[92dvh] flex-col">
                <div className="overflow-y-auto px-5 pt-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-6 lg:px-6 lg:pt-6" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                  <div className="lg:sticky lg:top-6 lg:self-start">
                    <div className="mb-4 flex justify-center lg:mb-3">
                      <button
                        type="button"
                        aria-label={`ดูรูปภาพสินค้า ${selectedItem.name} แบบเต็มหน้าจอ`}
                        className="relative h-44 w-44 cursor-pointer overflow-hidden rounded-xl bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 lg:h-[220px] lg:w-[220px] lg:rounded-2xl"
                        onClick={() => {
                          const imgSrc = selectedItem.imageUrl || FALLBACK_IMAGE_SRC;
                          setSelectedItem(null);
                          setTimeout(() => setFullscreenImage(imgSrc), 150);
                        }}
                      >
                        <ProductImage src={selectedItem.imageUrl} alt={selectedItem.name} sizes="(max-width: 1023px) 192px, 220px" className="object-cover" />
                      </button>
                    </div>

                    <h3 className="mb-1 text-center text-lg font-semibold leading-snug text-[var(--text-primary)] lg:text-left">{selectedItem.name}</h3>
                    <div className="mb-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                      {selectedItem.category && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px] rounded-md">{selectedItem.category}</Badge>}
                      {selectedItem.brand && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px] rounded-md">{selectedItem.brand}</Badge>}
                      {selectedItem.series && <Badge className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] text-[11px] rounded-md">{selectedItem.series}</Badge>}
                    </div>
                  </div>
                  <div>

                <div className="mb-4 space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">บาร์โค้ด</span>
                    <span className="min-w-0 break-all text-right font-mono text-sm text-[var(--text-primary)]">{selectedItem.barcode}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                    <span className="text-sm text-[var(--text-secondary)]">ราคา</span>
                    <div className="min-w-0 text-right">
                      {hasVvipPrice(selectedItem, accessTier) ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-[var(--text-muted)]">ปกติ {formatBaht(selectedItem.price, { decimals: true })}</span>
                          <span className="text-sm font-semibold text-[var(--catalog-emphasis)]">VVIP {formatBaht(displayPrice, { decimals: true })}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-[var(--catalog-emphasis)]">
                          {formatBaht(displayPrice, { decimals: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                    <span className="text-sm text-[var(--text-secondary)]">สต็อก</span>
                    <span className={`min-w-0 text-right text-sm font-medium ${selectedItem.stock <= 0 ? 'text-[var(--status-danger)]' : selectedItem.stock < 10 ? 'text-[var(--status-warning)]' : 'text-[var(--status-success)]'}`}>
                      {selectedItem.stock <= 0 ? 'สินค้าหมด' : `${selectedItem.stock} ${unitLabel}`}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                    <span className="text-sm text-[var(--text-secondary)]">จำนวนลัง</span>
                    <span className="min-w-0 break-words text-right text-sm text-[var(--text-primary)]">
                      {selectedItem.quantityPerBox || '-'}
                    </span>
                  </div>
                  {selectedItem.expiryDate && (
                    <div className="flex items-start justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                      <span className="text-sm text-[var(--text-secondary)]">วันหมดอายุ</span>
                      <span className="min-w-0 break-words text-right text-sm text-[var(--text-primary)]">{selectedItem.expiryDate}</span>
                    </div>
                  )}
                </div>

                <div className="mb-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <label htmlFor="detail-quantity" className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">
                    จำนวนที่ต้องการ ({unitLabel})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(String(Math.max(1, detailQuantity - 1)))}
                      disabled={selectedItem.stock <= 0 || detailQuantity <= 1}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-lg font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="ลดจำนวน"
                    >
                      -
                    </button>
                    <input
                      id="detail-quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={selectedItem.stock > 0 ? selectedItem.stock : 1}
                      value={selectedQuantity}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d]/g, '');
                        if (!value) {
                          setSelectedQuantity('');
                          return;
                        }
                        setSelectedQuantity(String(Math.min(Number.parseInt(value, 10), maxQuantity)));
                      }}
                      onBlur={() => setSelectedQuantity(String(detailQuantity))}
                      disabled={selectedItem.stock <= 0}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-center text-base font-semibold text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--catalog-header-action)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity(String(Math.min(maxQuantity, detailQuantity + 1)))}
                      disabled={selectedItem.stock <= 0 || detailQuantity >= maxQuantity}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-lg font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="เพิ่มจำนวน"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {selectedItem.stock > 0 ? `สั่งได้สูงสุด ${selectedItem.stock.toLocaleString('th-TH')} ${unitLabel}` : 'สินค้าหมด'}
                  </p>
                </div>

                <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 pb-1 lg:sticky lg:bottom-0 lg:bg-[var(--bg-card)] lg:pb-0 lg:pt-1">
                  <button onClick={() => setSelectedItem(null)} className="h-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-secondary)]">
                    ปิด
                  </button>
                  <button
                    onClick={() => {
                      addToCart(selectedItem, detailQuantity);
                      setSelectedItem(null);
                    }}
                    disabled={selectedItem.stock <= 0}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-transparent bg-[#29335C] text-sm font-semibold text-white shadow-[0_10px_18px_-14px_rgba(41,51,92,0.7)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#36446F] hover:shadow-[0_14px_24px_-12px_rgba(41,51,92,0.75)] active:translate-y-0 active:shadow-[0_8px_14px_-12px_rgba(41,51,92,0.65)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-[#29335C] disabled:hover:shadow-[0_10px_18px_-14px_rgba(41,51,92,0.7)]"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มลงตะกร้า
                  </button>
                </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Sort Sheet */}
      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent side="bottom" className="catalog-theme rounded-t-[2.5rem] px-5 pt-8 bg-[var(--bg-card)] border-none focus:outline-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-6">เรียงลำดับ</h3>
          <div className="flex flex-col gap-3">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => applySort(opt.id)}
                className={`w-full min-h-11 py-3 px-4 rounded-xl border text-left font-medium text-sm transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 ${
                  sort === opt.id ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-card)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
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
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        stockFilter={stockFilter}
        category={categoryFilter}
        brand={brandFilter}
        series={seriesFilter}
        facets={facets}
        allItems={data?.items}
        showSeries={false}
        desktopLayout="sidebar"
        applyFilters={(f) => {
          resetCatalogPagination();
          setStockFilter(f.stock as StockFilter);
          setCategoryFilter(f.category);
          setBrandFilter(f.brand);
          setSeriesFilter([]);
        }}
        clearFilters={() => {
          resetCatalogPagination();
          setStockFilter('all');
          setCategoryFilter([]);
          setBrandFilter([]);
          setSeriesFilter([]);
        }}
      />

      {!isSettingsTab && cartLines.length > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="catalog-cart-fab fixed bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--brand-primary)_22%,transparent)] bg-[#29335C] text-white shadow-[0_14px_30px_-18px_rgba(41,51,92,0.72)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#36446F] hover:shadow-[0_18px_34px_-16px_rgba(41,51,92,0.78)] active:translate-y-0 active:shadow-[0_12px_24px_-18px_rgba(41,51,92,0.7)] lg:hidden"
          aria-label="เปิดตะกร้าสินค้า"
        >
          <span className="relative flex h-10 w-10 items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold leading-none text-[var(--bg-card)]">
              {cartItemCount}
            </span>
          </span>
        </button>
      )}

      {isCartOpen && (
        <CartSheet
          open={isCartOpen}
          onOpenChange={setIsCartOpen}
          lines={cartLines}
          customer={{ name: effectivePoCustomerName.trim() || 'ลูกค้า', phone: data?.customerPhone ?? null }}
          customerName={effectivePoCustomerName}
          onCustomerNameChange={setPoCustomerName}
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
          className="lg:hidden"
        />
      ) : (
        <BottomNav
          activePage={isSettingsTab ? 'settings' : 'catalog'}
          userRole="customer"
          isGuest={true}
          onScanClick={() => {}}
          onSettingsClick={() => setActiveTab('settings')}
          onInventoryClick={() => setActiveTab('catalog')}
          className="lg:hidden"
        />
      )}

      <BarcodeScannerSheet open={isScannerOpen} onOpenChange={setIsScannerOpen} onDetected={handleScanDetected} />

      {fullscreenImage && <FullscreenImageViewer src={fullscreenImage} onClose={() => setFullscreenImage(null)} />}

    </div>
  );
}
