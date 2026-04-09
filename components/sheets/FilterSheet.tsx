'use client';

import { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { FilterReason, InventoryDateRange, InventoryFacetData, InventoryFacetOption, InventoryStockFilter } from '@/lib/types';

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockFilter: InventoryStockFilter;
  dateRange: InventoryDateRange;
  dataType: string;
  applyFilters: (filters: {
    reason: FilterReason;
    stock: InventoryStockFilter;
    dateRange: InventoryDateRange;
    type: string;
  }) => void;
  clearFilters: () => void;
  facets?: InventoryFacetData | null;
};

const EMPTY_FACETS: InventoryFacetData = {
  reasons: [],
  dataTypes: [],
  fromLocations: [],
  toLocations: [],
};

const STOCK_OPTIONS: { id: InventoryStockFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'inStock', label: 'มีสินค้า' },
  { id: 'lowStock', label: 'ใกล้หมด' },
  { id: 'outOfStock', label: 'หมดสต็อก' },
];

const DATE_OPTIONS: { id: InventoryDateRange; label: string }[] = [
  { id: 'all', label: 'ทุกช่วงเวลา' },
  { id: 'today', label: 'วันนี้' },
  { id: '7d', label: '7 วันล่าสุด' },
  { id: '30d', label: '30 วันล่าสุด' },
];

function toThaiDataType(value: string) {
  if (value === 'Inbound') return 'รับเข้า';
  if (value === 'Outbound') return 'จ่ายออก';
  if (value === 'Internal') return 'ภายใน';
  return value || 'อื่นๆ';
}

function softHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

function readFacetOptions(source: unknown, key: 'reasons' | 'dataTypes' | 'fromLocations' | 'toLocations'): InventoryFacetOption[] {
  if (!source || typeof source !== 'object') return [];
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InventoryFacetOption => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<InventoryFacetOption>;
    return typeof candidate.value === 'string' && typeof candidate.count === 'number';
  });
}

export function FilterSheet(props: FilterSheetProps) {
  const open = props?.open ?? false;
  const onOpenChange = props?.onOpenChange ?? (() => undefined);
  const stockFilter = props?.stockFilter ?? 'all';
  const dateRange = props?.dateRange ?? 'all';
  const dataType = props?.dataType ?? '';
  const applyFilters = props?.applyFilters ?? (() => undefined);
  const clearFilters = props?.clearFilters ?? (() => undefined);
  const facets = props?.facets ?? EMPTY_FACETS;

  const safeFacets = useMemo<InventoryFacetData>(() => {
    return {
      reasons: readFacetOptions(facets, 'reasons'),
      dataTypes: readFacetOptions(facets, 'dataTypes'),
      fromLocations: readFacetOptions(facets, 'fromLocations'),
      toLocations: readFacetOptions(facets, 'toLocations'),
    };
  }, [facets]);

  const [draftStock, setDraftStock] = useState<InventoryStockFilter>(stockFilter);
  const [draftDateRange, setDraftDateRange] = useState<InventoryDateRange>(dateRange);
  const [draftType, setDraftType] = useState(dataType);
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

          <section>
            <p className="text-xs text-gray-500 mb-2">ช่วงเวลา</p>
            <div className="grid grid-cols-2 gap-2">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    softHaptic();
                    setDraftDateRange(option.id);
                  }}
                  className={`min-h-11 py-2.5 px-3 rounded-xl text-sm transition-colors ${draftDateRange === option.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs text-gray-500 mb-2">ประเภทข้อมูล</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  softHaptic();
                  setDraftType('');
                }}
                className={`min-h-11 py-2.5 px-3 rounded-xl text-left text-sm transition-colors ${draftType === '' ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                ทั้งหมด
              </button>
              {safeFacets.dataTypes.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    softHaptic();
                    setDraftType(option.value);
                  }}
                  className={`min-h-11 py-2.5 px-3 rounded-xl text-left text-sm transition-colors ${draftType === option.value ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {toThaiDataType(option.value)}
                </button>
              ))}
            </div>
          </section>
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
                reason: null,
                stock: draftStock,
                dateRange: draftDateRange,
                type: draftType,
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
