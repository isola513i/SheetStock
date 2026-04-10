'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Clipboard, Package, X } from 'lucide-react';
import { t, getLocale, type Locale } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/lib/types';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const FALLBACK_IMAGE_SRC = '/icons/icon-192x192.png';

type ProductDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: InventoryItem | null;
  fullscreenImage: string | null;
  setFullscreenImage: (value: string | null) => void;
};

function FullscreenImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const lastDistRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (rafId) return;
        const x0 = e.touches[0].clientX, y0 = e.touches[0].clientY;
        const x1 = e.touches[1].clientX, y1 = e.touches[1].clientY;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dx = x0 - x1;
          const dy = y0 - y1;
          const distSq = dx * dx + dy * dy;
          if (lastDistRef.current > 0) {
            const delta = distSq / lastDistRef.current;
            const scaleFactor = Math.sqrt(delta);
            setScale((prev) => Math.min(4, Math.max(1, prev * scaleFactor)));
          }
          lastDistRef.current = distSq;
        });
      }
    };
    const onTouchEnd = () => {
      lastDistRef.current = 0;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale((prev) => (prev > 1 ? 1 : 2.5));
    }
    lastTapRef.current = now;
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-end p-4 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative w-full overflow-hidden"
        onClick={handleDoubleTap}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        >
          <Image
            src={src}
            fill
            sizes="100vw"
            className="object-contain"
            alt="Product image"
            referrerPolicy="no-referrer"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3">
        <p className="text-center text-white/40 text-[10px]">
          {scale > 1 ? 'แตะ 2 ครั้งเพื่อย่อ' : 'แตะ 2 ครั้งเพื่อขยาย • ใช้ 2 นิ้วซูม'}
        </p>
      </div>
    </div>
  );
}

function DataRow({ label, value, isLast = false }: { label: string; value: string | number; isLast?: boolean }) {
  return (
    <div className={`flex justify-between items-start py-3 ${!isLast ? 'border-b border-dashed border-gray-200' : ''} gap-4`}>
      <span className="text-gray-500 font-medium text-sm shrink-0">{label}</span>
      <span className="text-gray-900 text-sm text-right break-words overflow-hidden">{value}</span>
    </div>
  );
}

function toDisplayText(value: string | number | null | undefined, fallback = 'ไม่ระบุ') {
  if (value == null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return String(value);
}

function formatCurrency(value: number, zeroAsDash = false) {
  if (zeroAsDash && value === 0) return '-';
  return `฿${value.toFixed(2)}`;
}

function getStockStatus(qty: number) {
  if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
  if (qty < 50) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' };
}

function toSafeImageSrc(value: unknown) {
  const raw = typeof value === 'string' ? value : '';
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.?\/*/, '')}`;
}

const DISMISS_THRESHOLD = 120;

export function ProductDetailSheet({
  open,
  onOpenChange,
  selectedItem,
  fullscreenImage,
  setFullscreenImage,
}: ProductDetailSheetProps) {
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>('th');
  useEffect(() => { setLocaleState(getLocale()); }, []);
  const stock = getStockStatus(selectedItem?.quantity ?? 0);

  const copyBarcode = useCallback((barcode: string) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20);
    setTimeout(() => setCopiedBarcode(null), 2000);
  }, []);
  const mainImageSrc = toSafeImageSrc(selectedItem?.imageUrl);

  // Swipe-down to dismiss
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, scrollTop: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    const scrollEl = scrollContainerRef.current;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    if (scrollTop > 5) return;
    dragStartRef.current = { y: e.touches[0].clientY, scrollTop };
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const scrollEl = scrollContainerRef.current;
    if (scrollEl && scrollEl.scrollTop > 5) {
      setIsDragging(false);
      setDragY(0);
      return;
    }
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    if (dy > 0) {
      setDragY(dy);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (dragY > DISMISS_THRESHOLD) {
      onOpenChange(false);
    }
    setDragY(0);
    setIsDragging(false);
  }, [dragY, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {open && selectedItem && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close detail"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/35"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[95dvh] rounded-t-[2.2rem] bg-[#F2F2F7] overflow-hidden shadow-2xl"
            style={{
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              opacity: dragY > 0 ? Math.max(0.5, 1 - dragY / 400) : 1,
            }}
          >
            <div
              ref={scrollContainerRef}
              className="relative h-full overflow-y-auto overscroll-contain touch-pan-y hide-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <div className="sticky top-0 z-30 bg-[var(--brand-primary)] px-5 pt-2 pb-4 flex items-center justify-between">
                <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-white/45" />
                <div className="text-white font-medium text-base">{t('product.detail', locale)}</div>
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--brand-primary)] rounded-b-[2.2rem] px-5 pb-8 pt-1 relative">
                <div
                  className="relative h-40 w-full cursor-pointer"
                  onClick={() => setFullscreenImage(mainImageSrc ?? FALLBACK_IMAGE_SRC)}
                >
                  {mainImageSrc ? (
                    <Image
                      src={mainImageSrc}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      alt={selectedItem.name}
                      referrerPolicy="no-referrer"
                      priority
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                  ) : (
                    <Image
                      src={FALLBACK_IMAGE_SRC}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      alt={selectedItem.name}
                      priority
                    />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/16 px-3 py-2">
                    <p className="text-[11px] text-white/80">{t('product.quantity', locale)}</p>
                    <p className="text-white text-sm font-medium">{selectedItem.quantity} {t('product.pieces', locale)}</p>
                  </div>
                  <div className="rounded-xl bg-white/16 px-3 py-2">
                    <p className="text-[11px] text-white/80">{t('product.price', locale)}</p>
                    <p className="text-white text-sm font-medium">{formatCurrency(selectedItem.price)}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 -mt-6 relative z-10 pb-24">
                <div className="bg-white rounded-[1.6rem] p-5 border border-gray-200 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-[1.35rem] leading-tight font-medium text-gray-900 mb-2">{toDisplayText(selectedItem.name)}</h2>
                    <Badge className={`${stock.color} border px-2.5 py-0.5 rounded-full font-medium text-xs`}>
                      {stock.label}
                    </Badge>
                  </div>

                  {/* Barcode */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 mb-5">
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium">{t('product.barcode', locale)}</p>
                      <p className="text-gray-900 text-sm font-mono mt-0.5">{toDisplayText(selectedItem.barcode)}</p>
                    </div>
                    {selectedItem.barcode && (
                      <button
                        onClick={() => copyBarcode(selectedItem.barcode)}
                        className="shrink-0 w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        {copiedBarcode === selectedItem.barcode
                          ? <Check className="w-4 h-4 text-green-600" />
                          : <Clipboard className="w-4 h-4 text-[var(--brand-primary)]" />}
                      </button>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                      {t('product.productInfo', locale)}
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                      <DataRow label={t('product.category', locale)} value={toDisplayText(selectedItem.category)} />
                      <DataRow label={t('product.brand', locale)} value={toDisplayText(selectedItem.brand)} />
                      <DataRow label={t('product.series', locale)} value={toDisplayText(selectedItem.series)} />
                      <DataRow label={t('product.expiryDate', locale)} value={toDisplayText(selectedItem.expiryDate)} isLast />
                    </div>
                  </div>

                  {/* Quantity & Price */}
                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                      {t('product.qtyPrice', locale)}
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                      <DataRow label={t('product.price', locale)} value={formatCurrency(selectedItem.price)} />
                      <DataRow label={t('product.quantity', locale)} value={`${selectedItem.quantity} ${t('product.pieces', locale)}`} />
                      <DataRow label={t('product.quantityPerBox', locale)} value={selectedItem.quantityPerBox > 0 ? `${selectedItem.quantityPerBox}` : toDisplayText('')} isLast />
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedItem.notes && (
                    <div className="mb-2">
                      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                        {t('product.notes', locale)}
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-gray-900 text-sm">{selectedItem.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-[#F2F2F7] via-[#F2F2F7] to-transparent">
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full h-12 rounded-full bg-[var(--brand-primary)] text-white font-medium shadow-lg shadow-orange-900/20 active:scale-[0.99] transition"
                >
                  {t('product.close', locale)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && selectedItem && (
        <FullscreenImageViewer
          src={toSafeImageSrc(fullscreenImage) ?? FALLBACK_IMAGE_SRC}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </>
  );
}
