'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Search, X } from 'lucide-react';
import type { InventoryFacetData, InventoryFacetOption, InventoryStockFilter } from '@/lib/types';
import { softHaptic } from '@/lib/haptics';

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockFilter: InventoryStockFilter;
  category: string[];
  brand: string[];
  series: string[];
  applyFilters: (filters: { stock: InventoryStockFilter; category: string[]; brand: string[]; series: string[] }) => void;
  clearFilters: () => void;
  facets?: InventoryFacetData | null;
  allItems?: { stock?: number; quantity?: number; category?: string; brand?: string; series?: string }[];
  showSeries?: boolean;
  desktopLayout?: 'sheet' | 'sidebar';
};

const EMPTY_FACETS: InventoryFacetData = { categories: [], brands: [], series: [] };
const EMPTY_VALUES: string[] = [];
const TOP_COUNT = 6;
const SHEET_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };
const SHEET_EXIT_MS = 240;

const STOCK_OPTIONS: { id: InventoryStockFilter; label: string; note: string }[] = [
  { id: 'all', label: 'ทั้งหมด', note: 'ดูสินค้าทุกรายการ' },
  { id: 'inStock', label: 'มีสินค้า', note: 'พร้อมขายตอนนี้' },
  { id: 'lowStock', label: 'ใกล้หมด', note: 'เหลือน้อยกว่า 10 ชิ้น' },
  { id: 'outOfStock', label: 'หมดสต็อก', note: 'ยังไม่มีของพร้อมส่ง' },
];

function readFacetOptions(source: unknown, key: 'categories' | 'brands' | 'series'): InventoryFacetOption[] {
  if (!source || typeof source !== 'object') return [];
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InventoryFacetOption => {
    if (!item || typeof item !== 'object') return false;
    const c = item as Partial<InventoryFacetOption>;
    return typeof c.value === 'string' && typeof c.count === 'number';
  });
}

function CheckboxMark({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        active
          ? 'border-[var(--catalog-header)] bg-[var(--catalog-header)] text-[var(--bg-card)]'
          : 'border-[color:color-mix(in_oklab,var(--catalog-header)_28%,var(--border-color))] bg-[var(--bg-card)] text-transparent'
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

function RadioMark({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? 'border-[var(--catalog-header)] text-[var(--catalog-header)]'
          : 'border-[color:color-mix(in_oklab,var(--catalog-header)_30%,var(--border-color))] text-transparent'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-current' : 'bg-transparent'}`} />
    </span>
  );
}

function FilterRow({
  label,
  note,
  count,
  active,
  onClick,
  mode = 'checkbox',
}: {
  label: string;
  note?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  mode?: 'checkbox' | 'radio';
}) {
  return (
    <button
      type="button"
      onClick={() => {
        softHaptic();
        onClick();
      }}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out ${
        active
          ? 'border-[color:color-mix(in_oklab,var(--catalog-header-action)_24%,var(--catalog-header))] bg-[color:color-mix(in_oklab,var(--catalog-header-action)_12%,var(--bg-card))]'
          : 'border-transparent bg-transparent hover:bg-[color:color-mix(in_oklab,var(--catalog-header)_3%,var(--bg-card))]'
      }`}
    >
      {mode === 'radio' ? <RadioMark active={active} /> : <CheckboxMark active={active} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-tight text-[var(--text-primary)]">{label}</span>
        {note ? <span className="mt-1 block text-[12px] leading-tight text-[var(--text-muted)]">{note}</span> : null}
      </span>
      {typeof count === 'number' ? (
        <span className="shrink-0 rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header)_8%,var(--bg-card))] px-2.5 py-1 text-[11px] font-semibold text-[var(--catalog-header)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function FacetSection({
  title,
  options,
  selectedValues,
  onToggle,
}: {
  title: string;
  options: InventoryFacetOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const hasMore = options.length > TOP_COUNT;
  const totalCount = options.reduce((sum, option) => sum + option.count, 0);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.trim().toLowerCase();
    return options.filter((option) => option.value.toLowerCase().includes(lower));
  }, [options, query]);

  const visibleOptions = expanded ? filteredOptions : options.slice(0, TOP_COUNT);
  const selectedCount = selectedValues.length;
  const hiddenSelectedOptions = !expanded
    ? selectedValues
      .filter((value) => !visibleOptions.some((option) => option.value === value))
      .map((value) => options.find((option) => option.value === value))
      .filter((option): option is InventoryFacetOption => Boolean(option))
    : [];

  useEffect(() => {
    if (!expanded) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [expanded]);

  return (
    <section className="border-t border-[var(--border-subtle)] pt-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h4 className="text-[1.05rem] font-semibold text-[var(--catalog-header)]">{title}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{options.length} ตัวเลือก</p>
        </div>
        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              softHaptic();
              selectedValues.forEach((value) => onToggle(value));
            }}
            className="rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header-action)_12%,var(--bg-card))] px-3 py-1 text-xs font-semibold text-[var(--catalog-header)]"
          >
            ล้าง
          </button>
        ) : null}
      </div>

      {hasMore && expanded ? (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`ค้นหา${title}`}
            className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-10 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[color:color-mix(in_oklab,var(--catalog-header-action)_42%,var(--catalog-header))] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_16%,transparent)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={`ล้างการค้นหา${title}`}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <FilterRow
          label="ทั้งหมด"
          note={selectedCount > 0 ? `เลือกอยู่ ${selectedCount} รายการ` : 'ไม่จำกัดตัวกรองในหมวดนี้'}
          count={totalCount}
          active={selectedCount === 0}
          onClick={() => {
            selectedValues.forEach((value) => onToggle(value));
          }}
        />
        {visibleOptions.map((option) => (
          <FilterRow
            key={option.value}
            label={option.value}
            count={option.count}
            active={selectedValues.includes(option.value)}
            onClick={() => onToggle(option.value)}
          />
        ))}
        {!expanded
          ? hiddenSelectedOptions.map((option) => (
            <FilterRow
              key={option.value}
              label={option.value}
              count={option.count}
              active
              onClick={() => onToggle(option.value)}
            />
          ))
          : null}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => {
            softHaptic();
            setExpanded((current) => !current);
            setQuery('');
          }}
          className="mt-3 text-sm font-semibold text-[var(--catalog-header)]"
        >
          {expanded ? '- ลดลง' : `+ เพิ่มเติม (${options.length - TOP_COUNT})`}
        </button>
      ) : null}

      {expanded && query && filteredOptions.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">ไม่พบรายการที่ตรงกับ &quot;{query}&quot;</p>
      ) : null}
    </section>
  );
}

export function FilterSheet(props: FilterSheetProps) {
  const open = props?.open ?? false;
  const onOpenChange = props?.onOpenChange;
  const stockFilter = props?.stockFilter ?? 'all';
  const category = props?.category ?? EMPTY_VALUES;
  const brand = props?.brand ?? EMPTY_VALUES;
  const series = props?.series ?? EMPTY_VALUES;
  const applyFilters = props?.applyFilters;
  const facets = props?.facets ?? EMPTY_FACETS;
  const allItems = props?.allItems;
  const showSeries = props?.showSeries ?? true;
  const desktopLayout = props?.desktopLayout ?? 'sheet';

  const [renderSheet, setRenderSheet] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [draftStock, setDraftStock] = useState<InventoryStockFilter>(stockFilter);
  const [draftCategory, setDraftCategory] = useState<string[]>(category);
  const [draftBrand, setDraftBrand] = useState<string[]>(brand);
  const [draftSeries, setDraftSeries] = useState<string[]>(series);
  const isSidebar = desktopLayout === 'sidebar' && isDesktop;

  const safeFacets = useMemo<InventoryFacetData>(() => ({
    categories: readFacetOptions(facets, 'categories'),
    brands: readFacetOptions(facets, 'brands'),
    series: readFacetOptions(facets, 'series'),
  }), [facets]);

  useEffect(() => {
    if (open) {
      const timeoutId = window.setTimeout(() => {
        setDraftStock(stockFilter);
        setDraftCategory(category);
        setDraftBrand(brand);
        setDraftSeries(showSeries ? series : []);
        setRenderSheet(true);
        setIsClosing(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (!renderSheet) {
      return;
    }

    const closeFrameId = window.setTimeout(() => {
      setIsClosing(true);
    }, 0);
    const timeoutId = window.setTimeout(() => {
      setRenderSheet(false);
      setIsClosing(false);
    }, SHEET_EXIT_MS);
    return () => {
      window.clearTimeout(closeFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [open, renderSheet, stockFilter, category, brand, series, showSeries]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!renderSheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [renderSheet]);

  useEffect(() => {
    if (!renderSheet) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange?.(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [renderSheet, onOpenChange]);

  const activeSeries = showSeries ? draftSeries : EMPTY_VALUES;
  const activeCount = Number(draftStock !== 'all') + draftCategory.length + draftBrand.length + activeSeries.length;

  const previewCount = useMemo(() => {
    if (!allItems) return null;
    return allItems.filter((item) => {
      const qty = item.stock ?? item.quantity ?? 0;
      if (draftStock === 'inStock' && qty <= 0) return false;
      if (draftStock === 'lowStock' && (qty <= 0 || qty >= 10)) return false;
      if (draftStock === 'outOfStock' && qty > 0) return false;
      if (draftCategory.length > 0 && !draftCategory.includes(item.category ?? '')) return false;
      if (draftBrand.length > 0 && !draftBrand.includes(item.brand ?? '')) return false;
      if (activeSeries.length > 0 && !activeSeries.includes(item.series ?? '')) return false;
      return true;
    }).length;
  }, [allItems, draftStock, draftCategory, draftBrand, activeSeries]);

  const toggleMultiValue = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  if (!renderSheet) return null;

  return (
    <div className="catalog-theme fixed inset-0 z-[70]">
      <motion.button
        type="button"
        aria-label="ปิดตัวกรอง"
        onClick={() => onOpenChange?.(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={SHEET_TRANSITION}
        className="absolute inset-0 bg-[color:color-mix(in_oklab,var(--catalog-header)_20%,transparent)] supports-backdrop-filter:backdrop-blur-[3px]"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        key={isSidebar ? 'sidebar' : 'sheet'}
        initial={isSidebar ? { x: '100%', opacity: 1 } : { y: '100%', opacity: 1 }}
        animate={isClosing ? (isSidebar ? { x: '100%', opacity: 0.98 } : { y: -48, opacity: 0.98 }) : (isSidebar ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 })}
        transition={SHEET_TRANSITION}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] border-t border-[color:color-mix(in_oklab,var(--catalog-header)_14%,var(--border-color))] bg-[color:color-mix(in_oklab,var(--bg-card)_97%,var(--catalog-header-action)_3%)] shadow-[0_-16px_48px_-30px_rgba(17,24,39,0.4)] ${
          isSidebar ? 'lg:inset-y-0 lg:left-auto lg:right-0 lg:bottom-auto lg:h-full lg:max-h-none lg:w-[min(430px,calc(100vw-3rem))] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-[-28px_0_70px_-48px_rgba(41,51,92,0.75)]' : ''
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 pb-4 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header)_14%,var(--bg-card))] lg:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="filter-sheet-title" className="text-[1.9rem] font-semibold leading-none text-[var(--catalog-header)]">ตัวกรอง</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {activeCount > 0 ? `เลือกไว้ ${activeCount} ตัวกรอง` : 'ปรับรายการให้ตรงสินค้าที่ต้องการ'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header)_4%,var(--bg-card))] text-[var(--catalog-header)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--catalog-header)_8%,var(--bg-card))]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5" style={{ WebkitOverflowScrolling: 'touch', willChange: 'transform' }}>
          <section>
            <div className="mb-3">
              <h4 className="text-[1.05rem] font-semibold text-[var(--catalog-header)]">สถานะสินค้า</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">เลือกมุมมองสต็อกที่ต้องการเห็นก่อน</p>
            </div>
            <div className="space-y-1.5">
              {STOCK_OPTIONS.map((option) => (
                <FilterRow
                  key={option.id}
                  label={option.label}
                  note={option.note}
                  active={draftStock === option.id}
                  mode="radio"
                  onClick={() => setDraftStock(option.id)}
                />
              ))}
            </div>
          </section>

          <FacetSection
            title="หมวดหมู่"
            options={safeFacets.categories}
            selectedValues={draftCategory}
            onToggle={(value) => toggleMultiValue(setDraftCategory, value)}
          />

          <FacetSection
            title="แบรนด์"
            options={safeFacets.brands}
            selectedValues={draftBrand}
            onToggle={(value) => toggleMultiValue(setDraftBrand, value)}
          />

          {showSeries ? (
            <FacetSection
              title="ซีรีส์"
              options={safeFacets.series}
              selectedValues={draftSeries}
              onToggle={(value) => toggleMultiValue(setDraftSeries, value)}
            />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[color:color-mix(in_oklab,var(--bg-card)_98%,var(--catalog-header-action)_2%)] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">รายการที่จะแสดง</span>
            <span className="font-semibold text-[var(--catalog-header)]">
              {previewCount !== null ? `${previewCount} รายการ` : 'พร้อมใช้งาน'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                softHaptic();
                setDraftStock('all');
                setDraftCategory([]);
                setDraftBrand([]);
                if (showSeries) setDraftSeries([]);
              }}
              className="flex min-h-[54px] items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--catalog-header)_18%,var(--border-color))] bg-[var(--bg-card)] px-4 text-base font-semibold text-[var(--catalog-header)]"
            >
              {activeCount > 0 ? `ล้าง (${activeCount})` : 'ล้าง'}
            </button>
            <button
              type="button"
              onClick={() => {
                softHaptic();
                applyFilters?.({ stock: draftStock, category: draftCategory, brand: draftBrand, series: showSeries ? draftSeries : [] });
                onOpenChange?.(false);
              }}
              className="flex min-h-[54px] items-center justify-center rounded-full bg-[var(--catalog-header)] px-4 text-base font-semibold text-[var(--bg-card)] shadow-[0_16px_30px_-22px_rgba(41,51,92,0.7)]"
            >
              ใช้
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
