'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import PullToRefresh from 'pulltorefreshjs';
import { InventoryApiResponse, InventoryDateRange, InventoryItem, InventorySortPreset, InventoryStockFilter, InventoryTabKey, InventoryViewMode, FilterReason, UserRole } from '@/lib/types';
import { Search, List, LayoutGrid, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/BottomNav';
import { ProductList } from '@/components/ProductList';
import { SettingsPage } from '@/components/SettingsPage';
import { ProductDetailSheet } from '@/components/sheets/ProductDetailSheet';
import { FilterSheet } from '@/components/sheets/FilterSheet';
import { SortSheet } from '@/components/sheets/SortSheet';
import { BarcodeScannerSheet } from '@/components/BarcodeScannerSheet';

const PAGE_SIZE = 20;
const DEFAULT_SORT: InventorySortPreset = 'latest';
const fetcher = async (url: string): Promise<InventoryApiResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch inventory');
  }
  return response.json();
};

function softHaptic() {
  if (typeof window !== 'undefined' && window.localStorage.getItem('sheetstock-haptics') === 'off') {
    return;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

function InventoryDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<InventoryViewMode>(() => {
    if (typeof window === 'undefined') return 'list';
    const saved = window.localStorage.getItem('sheetstock-view-mode');
    return saved === 'grid' || saved === 'list' ? saved : 'list';
  });
  const [activeTab, setActiveTab] = useState<InventoryTabKey>('inventory');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('sheetstock-haptics') !== 'off';
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Scroll state for collapsible header
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollYRef = useRef(0);
  const lastDirectionRef = useRef<'up' | 'down'>('up');
  const directionAnchorRef = useRef(0);
  const isValidatingRef = useRef(false);
  const isPullRefreshingRef = useRef(false);

  const sort = (searchParams.get('sort') as InventorySortPreset) || DEFAULT_SORT;
  const filterReason: FilterReason = searchParams.get('reason');
  const stockFilter = (searchParams.get('stock') as InventoryStockFilter) || 'all';
  const dateRange = (searchParams.get('dateRange') as InventoryDateRange) || 'all';
  const dataTypeFilter = searchParams.get('type') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const updateQuery = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'null') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const delta = currentScrollY - lastScrollYRef.current;

    // Keep header expanded near top to avoid bounce flicker on iOS.
    if (currentScrollY <= 8) {
      if (lastDirectionRef.current !== 'up') {
        lastDirectionRef.current = 'up';
        directionAnchorRef.current = currentScrollY;
        setScrollDir('up');
      }
      lastScrollYRef.current = currentScrollY;
      return;
    }

    // Ignore tiny scroll deltas that cause noisy direction changes.
    if (Math.abs(delta) < 12) {
      lastScrollYRef.current = currentScrollY;
      return;
    }

    const nextDirection: 'up' | 'down' = delta > 0 ? 'down' : 'up';
    if (nextDirection !== lastDirectionRef.current) {
      // Hysteresis: require additional travel before switching direction.
      const travelSinceAnchor = Math.abs(currentScrollY - directionAnchorRef.current);
      if (travelSinceAnchor < 24) {
        lastScrollYRef.current = currentScrollY;
        return;
      }

      lastDirectionRef.current = nextDirection;
      directionAnchorRef.current = currentScrollY;
      setScrollDir(nextDirection);
    }

    lastScrollYRef.current = currentScrollY;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery === (searchParams.get('q') ?? '')) return;
    updateQuery({ q: debouncedSearchQuery, page: 1 });
  }, [debouncedSearchQuery, searchParams, updateQuery]);

  useEffect(() => {
    if (searchParams.get('sort')) return;
    if (typeof window === 'undefined') return;
    const savedSort = window.localStorage.getItem('sheetstock-sort') as InventorySortPreset | null;
    if (!savedSort) return;
    updateQuery({ sort: savedSort });
  }, [searchParams, updateQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sheetstock-sort', sort);
  }, [sort]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('q', debouncedSearchQuery);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (stockFilter !== 'all') params.set('stock', stockFilter);
    if (dateRange !== 'all') params.set('dateRange', dateRange);
    if (dataTypeFilter) params.set('type', dataTypeFilter);
    if (filterReason) params.set('reason', filterReason);
    return `/api/inventory?${params.toString()}`;
  }, [debouncedSearchQuery, sort, page, filterReason, stockFilter, dateRange, dataTypeFilter]);

  const { data, isLoading, isValidating, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 15000,
    keepPreviousData: true,
    dedupingInterval: 30000,
  });

  const processedInventory = data?.items ?? [];
  const { data: meData } = useSWR<{ user: { role: UserRole; name: string } | null }>('/api/auth/me', async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) return { user: null };
    return response.json();
  });
  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterReason) count += 1;
    if (stockFilter !== 'all') count += 1;
    if (dateRange !== 'all') count += 1;
    if (dataTypeFilter) count += 1;
    return count;
  }, [filterReason, stockFilter, dateRange, dataTypeFilter]);
  const showFloatingPagination = scrollDir !== 'down';
  const isSettingsTab = activeTab === 'settings';

  useEffect(() => {
    isValidatingRef.current = isValidating;
  }, [isValidating]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sheetstock-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sheetstock-haptics', hapticsEnabled ? 'on' : 'off');
  }, [hapticsEnabled]);

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsOpen(true);
  };

  const clearFilters = () => {
    updateQuery({
      q: '',
      reason: null,
      stock: null,
      dateRange: null,
      type: null,
      sort: DEFAULT_SORT,
      page: 1,
    });
  };

  const updateSort = (nextSort: InventorySortPreset) => {
    softHaptic();
    updateQuery({ sort: nextSort, page: 1 });
  };

  const updateFilterReason = (reason: FilterReason) => {
    updateQuery({ reason, page: 1 });
  };

  const updateQuickStockFilter = (stock: InventoryStockFilter) => {
    updateQuery({ stock: stock === 'all' ? null : stock, page: 1 });
  };

  const updateQuickDateRange = (range: InventoryDateRange) => {
    updateQuery({ dateRange: range === 'all' ? null : range, page: 1 });
  };

  const applyQuickPreset = (preset: 'all' | 'lowStock' | 'outOfStock' | '7d') => {
    softHaptic();
    if (preset === 'all') {
      updateQuery({ stock: null, dateRange: null, reason: null, page: 1 });
      return;
    }
    if (preset === 'lowStock') {
      updateQuery({ stock: 'lowStock', dateRange: null, reason: null, page: 1 });
      return;
    }
    if (preset === 'outOfStock') {
      updateQuery({ stock: 'outOfStock', dateRange: null, reason: null, page: 1 });
      return;
    }
    updateQuery({ stock: null, dateRange: '7d', reason: null, page: 1 });
  };

  const applySheetFilters = (filters: { reason: FilterReason; stock: InventoryStockFilter; dateRange: InventoryDateRange; type: string }) => {
    softHaptic();
    updateQuery({
      reason: filters.reason,
      stock: filters.stock === 'all' ? null : filters.stock,
      dateRange: filters.dateRange === 'all' ? null : filters.dateRange,
      type: filters.type || null,
      page: 1,
    });
  };

  const handleScanDetected = (barcode: string) => {
    setSearchQuery(barcode);
    updateQuery({ q: barcode, page: 1 });
  };

  useEffect(() => {
    const target = scrollContainerRef.current;
    if (!target || isSettingsTab) return;

    PullToRefresh.init({
      mainElement: '#inventory-scroll-container',
      triggerElement: '#inventory-scroll-container',
      distThreshold: 72,
      distMax: 96,
      distReload: 64,
      instructionsPullToRefresh: 'ดึงลงเพื่อรีเฟรช',
      instructionsReleaseToRefresh: 'ปล่อยเพื่อรีเฟรช',
      instructionsRefreshing: 'กำลังรีเฟรช...',
      shouldPullToRefresh: () => {
        const el = scrollContainerRef.current;
        if (!el) return false;
        if (isValidatingRef.current || isPullRefreshingRef.current) return false;
        return el.scrollTop <= 0;
      },
      onRefresh: async () => {
        if (isValidatingRef.current || isPullRefreshingRef.current) return;
        isPullRefreshingRef.current = true;
        try {
          await mutate();
          softHaptic();
        } finally {
          isPullRefreshingRef.current = false;
        }
      },
    });

    return () => {
      PullToRefresh.destroyAll();
    };
  }, [mutate, isSettingsTab]);

  const handleRefreshData = () => {
    softHaptic();
    router.refresh();
  };

  const handleResetPreferences = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('sheetstock-sort');
      window.localStorage.removeItem('sheetstock-view-mode');
      window.localStorage.removeItem('sheetstock-haptics');
    }
    setViewMode('list');
    setHapticsEnabled(true);
    setSearchQuery('');
    updateQuery({
      q: '',
      reason: null,
      stock: null,
      dateRange: null,
      type: null,
      sort: DEFAULT_SORT,
      page: 1,
    });
  };

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7562/ingest/23774785-1479-4541-8a3e-191135ee76a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a00100'},body:JSON.stringify({sessionId:'a00100',runId:'pre-fix-2',hypothesisId:'H3',location:'app/page.tsx:214',message:'InventoryDashboard state snapshot',data:{hasData:!!data,hasAvailableFacets:!!data?.availableFacets,reasonsCount:(data?.availableFacets?.reasons ?? []).length,dataTypesCount:(data?.availableFacets?.dataTypes ?? []).length,isFilterOpen},timestamp:Date.now()})}).catch(()=>{});
  }, [data, isFilterOpen]);
  // #endregion

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2F2F7] text-gray-900 overflow-hidden overscroll-none">
      {/* Orange Header */}
      <div className={`shrink-0 z-30 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 pt-8 text-white shadow-sm transition-all duration-300 ${scrollDir === 'down' ? 'pb-4' : 'pb-5'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-medium tracking-tight">{isSettingsTab ? 'ตั้งค่า' : 'รายการสินค้า'}</h1>
          {!isSettingsTab && (
            <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-white text-[var(--brand-primary)]' : 'bg-white/20 text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 h-8 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors border ${
                viewMode === 'grid' 
                  ? 'bg-white text-[var(--brand-primary)] border-white' 
                  : 'bg-white/20 text-white border-white/40'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> ตาราง
            </button>
            </div>
          )}
        </div>
        
        {!isSettingsTab && (
          <div className={`overflow-hidden transition-all duration-300 ${scrollDir === 'down' ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              id="main-search-input"
              type="text"
              placeholder="ค้นหาสินค้า"
              className="w-full bg-white text-gray-900 rounded-xl pl-10 h-11 border-none focus-visible:ring-0 text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                searchInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }}
            />
          </div>
          
          {/* Horizontal Scroll Chips for Categories */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => applyQuickPreset('all')}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-xs font-medium transition-colors ${stockFilter === 'all' && dateRange === 'all' && !filterReason ? 'bg-white text-[var(--brand-primary)] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => applyQuickPreset('lowStock')}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-xs font-medium transition-colors ${stockFilter === 'lowStock' ? 'bg-white text-[var(--brand-primary)] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
            >
              ใกล้หมด
            </button>
            <button
              onClick={() => applyQuickPreset('outOfStock')}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-xs font-medium transition-colors ${stockFilter === 'outOfStock' ? 'bg-white text-[var(--brand-primary)] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
            >
              หมดสต็อก
            </button>
            <button
              onClick={() => applyQuickPreset('7d')}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-xs font-medium transition-colors ${dateRange === '7d' ? 'bg-white text-[var(--brand-primary)] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
            >
              7 วัน
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Scrollable Area */}
      <div 
        id="inventory-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-none pb-24"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isSettingsTab ? (
          <SettingsPage
            viewMode={viewMode}
            hapticsEnabled={hapticsEnabled}
            onChangeViewMode={setViewMode}
            onToggleHaptics={() => setHapticsEnabled((prev) => !prev)}
            onRefreshData={handleRefreshData}
            onResetPreferences={handleResetPreferences}
            onOpenLogin={() => router.push('/login')}
            onOpenPricing={() => router.push('/pricing')}
            onOpenCatalog={() => router.push('/catalog')}
            userRole={meData?.user?.role}
            userName={meData?.user?.name}
          />
        ) : (
          <>
            {/* Sort & Count */}
            <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-500 font-medium">พบ {totalItems} รายการ</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                softHaptic();
                setIsFilterOpen(true);
              }}
              className="px-3 min-h-11 bg-white border border-gray-200 rounded-full flex items-center gap-1.5 text-xs font-medium text-gray-600 shadow-sm active:scale-95 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> ตัวกรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            <button 
              onClick={() => {
                softHaptic();
                setIsSortOpen(true);
              }}
              className="px-3 min-h-11 bg-white border border-gray-200 rounded-full flex items-center gap-1.5 text-xs font-medium text-gray-600 shadow-sm active:scale-95 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> เรียงลำดับ
            </button>
          </div>
            </div>
            {isValidating && !isLoading && (
          <div className="px-5 -mt-1 mb-2">
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/3 bg-[var(--brand-primary)] animate-[pulse_900ms_ease-in-out_infinite]" />
            </div>
          </div>
            )}
            {isLoading ? (
          <main className="px-5 pb-6 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-20 rounded-2xl bg-white animate-pulse border border-gray-100" />
            ))}
          </main>
            ) : processedInventory.length === 0 ? (
          <main className="px-5 pb-6">
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-8 text-center">
              <p className="text-gray-800 font-medium mb-1">ไม่พบสินค้า</p>
              <p className="text-sm text-gray-500 mb-4">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองทั้งหมด</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </main>
            ) : (
          <ProductList processedInventory={processedInventory} viewMode={viewMode} onItemClick={handleItemClick} />
            )}

            {totalPages > 1 && (
          <>
            <div className="h-24" />
            <motion.div
              className="fixed left-0 right-0 z-40 px-5 pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
              initial={false}
              animate={showFloatingPagination ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
            >
              <div className="mx-auto max-w-sm rounded-full border border-gray-200/80 bg-white/90 backdrop-blur-md px-2 py-2 shadow-lg shadow-black/5 pointer-events-auto">
              <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
                <button
                  aria-label="Previous page"
                  onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1}
                  className="h-11 w-11 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <p className="text-[11px] text-gray-400">หน้าปัจจุบัน</p>
                  <p className="text-sm text-gray-800">
                    {page} / {totalPages}
                  </p>
                </div>

                <button
                  aria-label="Next page"
                  onClick={() => updateQuery({ page: Math.min(totalPages, page + 1) })}
                  disabled={page >= totalPages}
                  className="h-11 w-11 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            </motion.div>
          </>
            )}
          </>
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onScanClick={() => setIsScannerOpen(true)} />

      {!isSettingsTab && (
        <ProductDetailSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        selectedItem={selectedItem}
        fullscreenImage={fullscreenImage}
        setFullscreenImage={setFullscreenImage}
        />
      )}

      {!isSettingsTab && (
        <FilterSheet
        key={`${isFilterOpen}-${stockFilter}-${dateRange}-${dataTypeFilter || 'all'}`}
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        stockFilter={stockFilter}
        dateRange={dateRange}
        dataType={dataTypeFilter}
        applyFilters={applySheetFilters}
        clearFilters={clearFilters}
        facets={data?.availableFacets ?? { reasons: [], dataTypes: [], fromLocations: [], toLocations: [] }}
        />
      )}

      {!isSettingsTab && (
        <SortSheet
        open={isSortOpen}
        onOpenChange={setIsSortOpen}
        sort={sort}
        setSort={updateSort}
        />
      )}
      {!isSettingsTab && <BarcodeScannerSheet open={isScannerOpen} onOpenChange={setIsScannerOpen} onDetected={handleScanDetected} />}

      <style jsx global>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        ::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
          background: transparent;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
        .ptr--ptr {
          box-shadow: none !important;
        }
        .ptr--box {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
        }
        .ptr--content {
          color: #f99109 !important;
          font-size: 12px;
          letter-spacing: 0.01em;
        }
        .ptr--icon {
          color: #f99109 !important;
        }
      `}</style>
    </div>
  );
}

export default function InventoryDashboard() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-[#F2F2F7]" />}>
      <InventoryDashboardContent />
    </Suspense>
  );
}
