'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { InventorySortPreset } from '@/lib/types';

type SortSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sort: InventorySortPreset;
  setSort: (sort: InventorySortPreset) => void;
};

const SORT_OPTIONS: { id: InventorySortPreset; label: string }[] = [
  { id: 'nameAsc', label: 'ชื่อสินค้า A-Z' },
  { id: 'nameDesc', label: 'ชื่อสินค้า Z-A' },
  { id: 'lowStock', label: 'ใกล้หมดก่อน' },
  { id: 'highStock', label: 'คงเหลือมากสุด' },
  { id: 'priceHigh', label: 'ราคาสูงสุด' },
  { id: 'priceLow', label: 'ราคาต่ำสุด' },
  { id: 'expiryAsc', label: 'หมดอายุเร็วสุด' },
  { id: 'expiryDesc', label: 'หมดอายุช้าสุด' },
];

function softHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

export function SortSheet({ open, onOpenChange, sort, setSort }: SortSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2.5rem] px-5 pt-8 bg-white border-none focus:outline-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}
      >
        <h3 className="text-lg font-medium text-gray-900 mb-6">เรียงลำดับ</h3>
        <div className="flex flex-col gap-3">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                softHaptic();
                setSort(option.id);
                onOpenChange(false);
              }}
              className={`w-full min-h-11 py-3 px-4 rounded-xl text-left font-medium text-sm transition-colors ${
                sort === option.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
