'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { InventoryFacetData, InventoryFacetOption, InventoryStockFilter } from '@/lib/types';
import { softHaptic } from '@/lib/haptics';

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockFilter: InventoryStockFilter;
  category: string;
  brand: string;
  series: string;
  applyFilters: (filters: { stock: InventoryStockFilter; category: string; brand: string; series: string }) => void;
  clearFilters: () => void;
  facets?: InventoryFacetData | null;
  /** All items for computing preview result count */
  allItems?: { stock?: number; quantity?: number; category?: string; brand?: string }[];
};

const EMPTY_FACETS: InventoryFacetData = { categories: [], brands: [], series: [] };

const STOCK_OPTIONS: { id: InventoryStockFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'inStock', label: 'มีสินค้า' },
  { id: 'lowStock', label: 'ใกล้หมด' },
  { id: 'outOfStock', label: 'หมดสต็อก' },
];

const TOP_COUNT = 5;

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

// 44px min touch target
function FacetChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { softHaptic(); onClick(); }}
      className={`shrink-0 min-h-[44px] py-2 px-3.5 rounded-xl text-sm transition-colors ${active ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-gray-100 text-gray-700'}`}
    >
      {label}{count !== undefined ? <span className="opacity-60 ml-0.5">({count})</span> : null}
    </button>
  );
}

function ExpandableFacetSection({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: InventoryFacetOption[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const hasMore = options.length > TOP_COUNT;

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, search]);

  const displayOptions = expanded ? filtered : options.slice(0, TOP_COUNT);

  const selectedVisible = displayOptions.some((o) => o.value === selected);
  const extraSelected = !expanded && selected && !selectedVisible
    ? options.find((o) => o.value === selected)
    : null;

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleCollapse = useCallback(() => {
    setExpanded(false);
    setSearch('');
  }, []);

  return (
    <section className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-900">{label} <span className="text-gray-400 font-normal">({options.length})</span></p>
        {expanded && (
          <button type="button" onClick={handleCollapse} className="text-xs text-[var(--brand-primary)] font-medium min-h-[44px] px-2 flex items-center">
            ย่อ
          </button>
        )}
      </div>

      {expanded && hasMore && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder={`ค้นหา${label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-xl bg-gray-100 text-sm outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FacetChip label="ทั้งหมด" active={selected === ''} onClick={() => onSelect('')} />
        {displayOptions.map((o) => (
          <FacetChip key={o.value} label={o.value} count={o.count} active={selected === o.value} onClick={() => onSelect(o.value)} />
        ))}
        {extraSelected && (
          <FacetChip label={extraSelected.value} count={extraSelected.count} active onClick={() => onSelect(extraSelected.value)} />
        )}
      </div>

      {!expanded && hasMore && (
        <button
          type="button"
          onClick={handleExpand}
          className="mt-2.5 text-xs text-[var(--brand-primary)] font-medium min-h-[44px] flex items-center"
        >
          ดูทั้งหมด ({options.length})
        </button>
      )}

      {expanded && search && filtered.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">ไม่พบ &quot;{search}&quot;</p>
      )}
    </section>
  );
}

export function FilterSheet(props: FilterSheetProps) {
  const open = props?.open ?? false;
  const onOpenChange = props?.onOpenChange ?? (() => undefined);
  const stockFilter = props?.stockFilter ?? 'all';
  const category = props?.category ?? '';
  const brand = props?.brand ?? '';
  const series = props?.series ?? '';
  const applyFilters = props?.applyFilters ?? (() => undefined);
  const clearFilters = props?.clearFilters ?? (() => undefined);
  const facets = props?.facets ?? EMPTY_FACETS;
  const allItems = props?.allItems;

  const safeFacets = useMemo<InventoryFacetData>(() => ({
    categories: readFacetOptions(facets, 'categories'),
    brands: readFacetOptions(facets, 'brands'),
    series: readFacetOptions(facets, 'series'),
  }), [facets]);

  const [draftStock, setDraftStock] = useState<InventoryStockFilter>(stockFilter);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftBrand, setDraftBrand] = useState(brand);
  const [draftSeries, setDraftSeries] = useState(series);

  // Compute preview result count based on draft filters
  const previewCount = useMemo(() => {
    if (!allItems) return null;
    return allItems.filter((item) => {
      const qty = item.stock ?? item.quantity ?? 0;
      if (draftStock === 'inStock' && qty <= 0) return false;
      if (draftStock === 'lowStock' && (qty <= 0 || qty >= 10)) return false;
      if (draftStock === 'outOfStock' && qty > 0) return false;
      if (draftCategory && item.category !== draftCategory) return false;
      if (draftBrand && item.brand !== draftBrand) return false;
      return true;
    }).length;
  }, [allItems, draftStock, draftCategory, draftBrand]);

  useEffect(() => {
    if (open) {
      setDraftStock(stockFilter);
      setDraftCategory(category);
      setDraftBrand(brand);
      setDraftSeries(series);
    }
  }, [open, stockFilter, category, brand, series]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const hasActiveFilters = draftStock !== 'all' || draftCategory || draftBrand;

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Sticky Header */}
      <div className="shrink-0 px-4 pt-3 pb-3 flex items-center justify-between border-b border-gray-100">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-900">ตัวกรอง</h3>
        <button
          type="button"
          onClick={() => {
            softHaptic();
            setDraftStock('all');
            setDraftCategory('');
            setDraftBrand('');
            setDraftSeries('');
          }}
          className={`text-sm font-medium min-h-10 px-2 ${hasActiveFilters ? 'text-[var(--brand-primary)]' : 'text-gray-300'}`}
          disabled={!hasActiveFilters}
        >
          ล้างค่า
        </button>
      </div>

      {/* Scrollable Body */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Stock */}
        <section className="py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-3">สถานะสินค้า</p>
          <div className="flex flex-wrap gap-2">
            {STOCK_OPTIONS.map((opt) => (
              <FacetChip key={opt.id} label={opt.label} active={draftStock === opt.id} onClick={() => setDraftStock(opt.id)} />
            ))}
          </div>
        </section>

        {/* Category */}
        <ExpandableFacetSection
          label="หมวดหมู่"
          options={safeFacets.categories}
          selected={draftCategory}
          onSelect={setDraftCategory}
        />

        {/* Brand */}
        <ExpandableFacetSection
          label="แบรนด์"
          options={safeFacets.brands}
          selected={draftBrand}
          onSelect={setDraftBrand}
        />

        <div className="h-8" />
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 border-t border-gray-100 px-5 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
        <button
          type="button"
          onClick={() => {
            softHaptic();
            applyFilters({ stock: draftStock, category: draftCategory, brand: draftBrand, series: draftSeries });
            onOpenChange(false);
          }}
          className="w-full min-h-[52px] rounded-2xl bg-[var(--brand-primary)] text-white text-base font-semibold shadow-lg shadow-orange-500/20"
        >
          {previewCount !== null ? `แสดงผล ${previewCount} รายการ` : 'นำไปใช้'}
        </button>
      </div>
    </div>
  );
}
