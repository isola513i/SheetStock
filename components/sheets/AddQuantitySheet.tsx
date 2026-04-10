'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';

const FALLBACK_IMG = '/icons/icon-192x192.png';
function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const t = e.currentTarget;
  if (!t.src.endsWith(FALLBACK_IMG)) t.src = FALLBACK_IMG;
}

type AddQuantitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSuccess: () => void;
};

import { softHaptic } from '@/lib/haptics';

export function AddQuantitySheet({ open, onOpenChange, item, onSuccess }: AddQuantitySheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!item || quantity <= 0) return;
    softHaptic();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: item.barcode, addQuantity: quantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      setDone(true);
      softHaptic();
      onSuccess();
      setTimeout(() => {
        onOpenChange(false);
        // Reset state after close animation
        setTimeout(() => { setDone(false); setQuantity(1); }, 300);
      }, 1200);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!isSubmitting) { onOpenChange(v); if (!v) { setQuantity(1); setDone(false); setError(''); } } }}>
      <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pt-6 bg-white border-none focus:outline-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}>
        {done ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">เพิ่มสำเร็จ!</p>
            <p className="text-sm text-gray-500 mt-1">เพิ่ม {quantity} ชิ้นให้ {item.name}</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">เพิ่มจำนวนสินค้า</h3>

            {/* Product info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 mb-6">
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl || FALLBACK_IMG} alt={item.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" onError={handleImgError} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">บาร์โค้ด: {item.barcode}</p>
                <p className="text-[11px] text-gray-500">คงเหลือ: <span className="font-medium text-gray-700">{item.quantity} ชิ้น</span></p>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => { softHaptic(); setQuantity((q) => Math.max(1, q - 1)); }}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Minus className="w-5 h-5 text-gray-600" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v) && v > 0) setQuantity(v);
                }}
                className="w-20 h-14 text-center text-2xl font-medium border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                onClick={() => { softHaptic(); setQuantity((q) => q + 1); }}
                className="w-12 h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white active:scale-95 transition-transform shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <p className="text-center text-sm text-gray-400 mb-6">
              จำนวนใหม่จะเป็น <span className="font-medium text-gray-700">{item.quantity + quantity} ชิ้น</span>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { softHaptic(); onOpenChange(false); }}
                disabled={isSubmitting}
                className="flex-1 min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || quantity <= 0}
                className="flex-1 min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเพิ่ม...</>
                ) : (
                  `เพิ่ม ${quantity} ชิ้น`
                )}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
