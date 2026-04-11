'use client';

import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { compressImageFile } from '@/lib/compress-image';

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
];

import { softHaptic } from '@/lib/haptics';

export function AddProductSheet({ open, onOpenChange, onSuccess, prefill }: AddProductSheetProps) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitError('');
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
  }, [open, prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
    if (submitError) setSubmitError('');
  };

  const handleFileSelected = (file: File) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    // Clear URL if user picks a file
    setForm((prev) => ({ ...prev, imageUrl: '' }));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setIsUploading(true);
    try {
      const compressed = await compressImageFile(imageFile);
      const formData = new globalThis.FormData();
      formData.append('file', compressed, 'product.webp');
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url as string;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const [barcodeError, setBarcodeError] = useState('');

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, boolean>> = {};
    setBarcodeError('');
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) newErrors[field] = true;
    }
    // Barcode: must be 8, 12, or 13 digits
    const bc = form.barcode.trim();
    if (bc && !/^\d{8}$|^\d{12}$|^\d{13}$/.test(bc)) {
      newErrors.barcode = true;
      setBarcodeError('บาร์โค้ดต้องเป็นตัวเลข 8, 12 หรือ 13 หลัก');
    }
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) newErrors.price = true;
    if (form.quantity && (isNaN(Number(form.quantity)) || Number(form.quantity) < 0)) newErrors.quantity = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    softHaptic();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Upload image first if file is selected
      let finalImageUrl = form.imageUrl.trim();
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

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
          quantityPerBox: form.quantityPerBox.trim(),
          notes: form.notes.trim(),
          imageUrl: finalImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || 'เกิดข้อผิดพลาด'); return; }

      softHaptic();
      setForm(INITIAL_FORM);
      setErrors({});
      clearImage();
      onSuccess();
      onOpenChange(false);
    } catch {
      setSubmitError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayImage = imagePreview || form.imageUrl || '';

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
                maxLength={field.key === 'barcode' ? 13 : undefined}
                value={form[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm bg-gray-50 outline-none transition-colors focus:bg-white focus:border-[var(--brand-primary)] ${
                  errors[field.key] ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                }`}
              />
              {errors[field.key] && (
                <p className="text-[11px] text-red-500 mt-1">{field.key === 'barcode' && barcodeError ? barcodeError : `กรุณากรอก${field.label}`}</p>
              )}
            </div>
          ))}

          {/* Image Upload Section */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">รูปภาพสินค้า</label>

            {displayImage ? (
              <div className="relative w-full h-40 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => { clearImage(); updateField('imageUrl', ''); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {isUploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:bg-gray-100"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[11px]">ถ่ายรูป</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:bg-gray-100"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[11px]">เลือกรูป</span>
                </button>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }}
            />

            {/* Manual URL input */}
            {!imageFile && (
              <input
                type="url"
                placeholder="หรือวาง URL รูปภาพ https://..."
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none transition-colors focus:bg-white focus:border-[var(--brand-primary)] mt-2"
              />
            )}
          </div>
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
              clearImage();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
            className="flex-1 min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="flex-1 min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? 'กำลังอัปโหลดรูป...' : 'กำลังเพิ่ม...'}
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
