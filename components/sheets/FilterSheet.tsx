'use client';

import { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { InventoryFacetData, InventoryFacetOption, InventoryStockFilter } from '@/lib/types';

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockFilter: InventoryStockFilter;
  category: string;
  brand: string;
  series: string;
  applyFilters: (filters: {
    stock: InventoryStockFilter;
    category: string;
    brand: string;
    series: string;
  }) => void;
  clearFilters: () => void;
  facets?: InventoryFacetData | null;
};

const EMPTY_FACETS: InventoryFacetData = {
  categories: [],
  brands: [],
  series: [],
};

const STOCK_OPTIONS: { id: InventoryStockFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'inStock', label: 'มีสินค้า' },
  { id: 'lowStock', label: 'ใกล้หมด' },
  { id: 'outOfStock', label: 'หมดสต็อก' },
];

import { softHaptic } from '@/lib/haptics';

function readFacetOptions(source: unknown, key: 'categories' | 'brands' | 'series'): InventoryFacetOption[] {
  if (!source || typeof source !== 'object') return [];
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InventoryFacetOption => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<InventoryFacetOption>;
    return typeof candidate.value === 'string' && typeof candidate.count === 'number';
  });
}

function FacetSection({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: InventoryFacetOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <section>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { softHaptic(); onSelect(''); }}
          className={`min-h-9 py-2 px-3 rounded-xl text-sm transition-colors ${selected === '' ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          ทั้งหมด
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => { softHaptic(); onSelect(option.value); }}
            className={`min-h-9 py-2 px-3 rounded-xl text-sm transition-colors ${selected === option.value ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {option.value} <span className="opacity-60">({option.count})</span>
          </button>
        ))}
      </div>
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

  const safeFacets = useMemo<InventoryFacetData>(() => {
    return {
      categories: readFacetOptions(facets, 'categories'),
      brands: readFacetOptions(facets, 'brands'),
      series: readFacetOptions(facets, 'series'),
    };
  }, [facets]);

  const [draftStock, setDraftStock] = useState<InventoryStockFilter>(stockFilter);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftBrand, setDraftBrand] = useState(brand);
  const [draftSeries, setDraftSeries] = useState(series);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pt-8 bg-white border-none focus:outline-none">
        <h3 className="text-lg font-medium text-gray-900 mb-6">ตัวกรอง</h3>
        <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+112px)]">
          <section>
            <p className="text-xs text-gray-500 mb-2">สถานะสต็อก</p>
            <div className="grid grid-cols-2 gap-2">
              {STOCK_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    softHaptic();
                    setDraftStock(option.id);
                  }}
                  className={`min-h-11 py-2.5 px-3 rounded-xl text-sm transition-colors ${draftStock === option.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <FacetSection label="หมวดหมู่" options={safeFacets.categories} selected={draftCategory} onSelect={setDraftCategory} />
          <FacetSection label="แบรนด์" options={safeFacets.brands} selected={draftBrand} onSelect={setDraftBrand} />
        </div>

        <div className="fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 flex gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
          <button
            onClick={() => {
              softHaptic();
              clearFilters();
              onOpenChange(false);
            }}
            className="flex-1 min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm"
          >
            ล้างทั้งหมด
          </button>
          <button
            onClick={() => {
              softHaptic();
              applyFilters({
                stock: draftStock,
                category: draftCategory,
                brand: draftBrand,
                series: draftSeries,
              });
              onOpenChange(false);
            }}
            className="flex-1 min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm"
          >
            นำไปใช้
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
