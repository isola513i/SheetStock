'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';

export type ProductPrefill = Partial<{
  barcode: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  imageUrl: string;
}>;

type AddProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefill?: ProductPrefill | null;
};

type FormData = {
  barcode: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  price: string;
  quantity: string;
  expiryDate: string;
  quantityPerBox: string;
  notes: string;
  imageUrl: string;
};

const INITIAL_FORM: FormData = {
  barcode: '',
  name: '',
  category: '',
  brand: '',
  series: '',
  price: '',
  quantity: '',
  expiryDate: '',
  quantityPerBox: '',
  notes: '',
  imageUrl: '',
};

const REQUIRED_FIELDS: (keyof FormData)[] = ['barcode', 'name', 'category', 'brand', 'series', 'price', 'quantity'];

const FIELD_CONFIG: { key: keyof FormData; label: string; type: string; inputMode?: string; placeholder: string; required: boolean }[] = [
  { key: 'barcode', label: 'บาร์โค้ด', type: 'text', inputMode: 'numeric', placeholder: 'เช่น 8850001234567', required: true },
  { key: 'name', label: 'ชื่อสินค้า', type: 'text', placeholder: 'เช่น เซรั่มบำรุงผิวหน้า 30ml', required: true },
  { key: 'category', label: 'หมวดหมู่', type: 'text', placeholder: 'เช่น สกินแคร์', required: true },
  { key: 'brand', label: 'แบรนด์', type: 'text', placeholder: 'เช่น BrandA', required: true },
  { key: 'series', label: 'ซีรีส์', type: 'text', placeholder: 'เช่น Hydra', required: true },
  { key: 'price', label: 'ราคา', type: 'number', inputMode: 'decimal', placeholder: '0.00', required: true },
  { key: 'quantity', label: 'จำนวน', type: 'number', inputMode: 'numeric', placeholder: '0', required: true },
  { key: 'expiryDate', label: 'วันหมดอายุ', type: 'text', placeholder: 'DD/MM/YYYY', required: false },
  { key: 'quantityPerBox', label: 'จำนวนต่อลัง', type: 'number', inputMode: 'numeric', placeholder: '0', required: false },
  { key: 'notes', label: 'หมายเหตุ', type: 'text', placeholder: 'ข้อมูลเพิ่มเติม', required: false },
  { key: 'imageUrl', label: 'URL รูปภาพ', type: 'url', placeholder: 'https://...', required: false },
];

import { softHaptic } from '@/lib/haptics';

export function AddProductSheet({ open, onOpenChange, onSuccess, prefill }: AddProductSheetProps) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  // Apply prefill data when sheet opens with new prefill
  useEffect(() => {
    if (open && prefill) {
      setForm((prev) => ({
        ...prev,
        barcode: prefill.barcode ?? prev.barcode,
        name: prefill.name ?? prev.name,
        category: prefill.category ?? prev.category,
        brand: prefill.brand ?? prev.brand,
        series: prefill.series ?? prev.series,
        imageUrl: prefill.imageUrl ?? prev.imageUrl,
      }));
    }
    if (!open) {
      // Reset when closed
      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitError('');
    }
  }, [open, prefill]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: false }));
    }
    if (submitError) setSubmitError('');
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, boolean>> = {};
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) {
        newErrors[field] = true;
      }
    }
    // Validate price and quantity are valid numbers
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) {
      newErrors.price = true;
    }
    if (form.quantity && (isNaN(Number(form.quantity)) || Number(form.quantity) < 0)) {
      newErrors.quantity = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    softHaptic();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          category: form.category.trim(),
          brand: form.brand.trim(),
          series: form.series.trim(),
          price: Number(form.price),
          quantity: Number(form.quantity),
          expiryDate: form.expiryDate.trim(),
          quantityPerBox: form.quantityPerBox ? Number(form.quantityPerBox) : 0,
          notes: form.notes.trim(),
          imageUrl: form.imageUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      softHaptic();
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess();
      onOpenChange(false);
    } catch {
      setSubmitError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pt-8 bg-white border-none focus:outline-none h-[90dvh]">
        <h3 className="text-lg font-medium text-gray-900 mb-1">เพิ่มสินค้าใหม่</h3>
        <p className="text-xs text-gray-400 mb-5">กรอกข้อมูลสินค้าเพื่อเพิ่มลง Google Sheet</p>

        <div className="overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+112px)] space-y-4 hide-scrollbar" style={{ maxHeight: 'calc(90dvh - 160px)', WebkitOverflowScrolling: 'touch' }}>
          {FIELD_CONFIG.map((field) => (
            <div key={field.key}>
              <label className="text-xs text-gray-500 mb-1.5 block">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={field.type}
                inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm bg-gray-50 outline-none transition-colors focus:bg-white focus:border-[var(--brand-primary)] ${
                  errors[field.key] ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                }`}
              />
              {errors[field.key] && (
                <p className="text-[11px] text-red-500 mt-1">กรุณากรอก{field.label}</p>
              )}
            </div>
          ))}
        </div>

        {submitError && (
          <div className="fixed left-5 right-5 z-50 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600" style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 80px)' }}>
            {submitError}
          </div>
        )}

        <div className="fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 flex gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)' }}>
          <button
            onClick={() => {
              softHaptic();
              setForm(INITIAL_FORM);
              setErrors({});
              setSubmitError('');
              onOpenChange(false);
            }}
            disabled={isSubmitting}
            className="flex-1 min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังเพิ่ม...
              </>
            ) : (
              'เพิ่มสินค้า'
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
