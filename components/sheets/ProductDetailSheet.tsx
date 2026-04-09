'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, ChevronRight, Copy, Package, X } from 'lucide-react';
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

type GalleryImage = { src: string; label: string };

function FullscreenImageViewer({ images, initialIndex, onClose }: { images: GalleryImage[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const lastDistRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(images.length - 1, i + 1)), [images.length]);

  // Pinch-to-zoom via touch events (rAF-throttled for smooth 60fps)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (rafId) return; // skip if a frame is already scheduled
        // Capture coordinates synchronously — TouchEvent may be recycled before rAF fires
        const x0 = e.touches[0].clientX, y0 = e.touches[0].clientY;
        const x1 = e.touches[1].clientX, y1 = e.touches[1].clientY;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const dx = x0 - x1;
          const dy = y0 - y1;
          const distSq = dx * dx + dy * dy;
          if (lastDistRef.current > 0) {
            const delta = distSq / lastDistRef.current;
            // delta is ratio of squared distances, so take sqrt once
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

  // Double-tap to toggle zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale((prev) => (prev > 1 ? 1 : 2.5));
    }
    lastTapRef.current = now;
  }, []);

  // Swipe detection for navigation
  const touchStartXRef = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (scale > 1) return; // Don't swipe while zoomed
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [scale, goNext, goPrev]);

  const current = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <p className="text-white/70 text-sm">{current.label} ({currentIndex + 1}/{images.length})</p>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image area with pinch zoom */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full overflow-hidden"
        onClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        >
          <Image
            key={current.src}
            src={current.src}
            fill
            sizes="100vw"
            className="object-contain"
            alt={current.label}
            referrerPolicy="no-referrer"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        </div>
      </div>

      {/* Navigation + zoom hint */}
      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3">
        <p className="text-center text-white/40 text-[10px] mb-3">
          {scale > 1 ? 'แตะ 2 ครั้งเพื่อย่อ' : 'แตะ 2 ครั้งเพื่อขยาย • ใช้ 2 นิ้วซูม'}
        </p>
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              disabled={currentIndex === images.length - 1}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
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

function formatCount(value: number, zeroAsDash = false) {
  if (zeroAsDash && value === 0) return '-';
  return String(value);
}

function formatThaiDate(value: string) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return toDisplayText(value);
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year > 2400) year -= 543;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return toDisplayText(value);
  return parsed.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
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

function hasImage(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function ProductDetailSheet({
  open,
  onOpenChange,
  selectedItem,
  fullscreenImage,
  setFullscreenImage,
}: ProductDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const stock = getStockStatus(selectedItem?.totalQuantity ?? 0);
  const mainImageSrc = toSafeImageSrc(selectedItem?.imageUrl);

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
          <div className="absolute inset-x-0 bottom-0 h-[95dvh] rounded-t-[2.2rem] bg-[#F2F2F7] overflow-hidden shadow-2xl">
            <div
              className="relative h-full overflow-y-auto overscroll-contain touch-pan-y hide-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="sticky top-0 z-30 bg-[var(--brand-primary)] px-5 pt-2 pb-4 flex items-center justify-between">
                <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-white/45" />
                <div className="text-white font-medium text-base">รายละเอียดสินค้า</div>
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--brand-primary)] rounded-b-[2.2rem] px-5 pb-8 pt-1 relative">
                <div className="relative h-40 w-full">
                  {mainImageSrc ? (
                    <Image
                      src={mainImageSrc}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      alt={selectedItem.details}
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
                      alt={selectedItem.details}
                      priority
                    />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/16 px-3 py-2">
                    <p className="text-[11px] text-white/80">จำนวนรวม</p>
                    <p className="text-white text-sm font-medium">{selectedItem.totalQuantity} ชิ้น</p>
                  </div>
                  <div className="rounded-xl bg-white/16 px-3 py-2">
                    <p className="text-[11px] text-white/80">เวลาแสกน</p>
                    <p className="text-white text-sm font-medium">{toDisplayText(selectedItem.totalScanTime)}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 -mt-6 relative z-10 pb-24">
                <div className="bg-white rounded-[1.6rem] p-5 border border-gray-200 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-[1.35rem] leading-tight font-medium text-gray-900 mb-2">{toDisplayText(selectedItem.details)}</h2>
                    <Badge className={`${stock.color} border px-2.5 py-0.5 rounded-full font-medium text-xs`}>
                      {stock.label}
                    </Badge>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-5 mb-5 border-b border-dashed border-gray-200 hide-scrollbar snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="shrink-0 w-24 space-y-2 cursor-pointer" onClick={() => setFullscreenImage(mainImageSrc ?? FALLBACK_IMAGE_SRC)}>
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 snap-start">
                        <Image src={mainImageSrc ?? FALLBACK_IMAGE_SRC} fill sizes="96px" className="object-cover" alt="รูป" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูป</p>
                    </div>
                    <div className={`shrink-0 w-24 space-y-2 ${hasImage(selectedItem.perBoxImageUrl) ? 'cursor-pointer' : ''}`} onClick={() => hasImage(selectedItem.perBoxImageUrl) && setFullscreenImage(toSafeImageSrc(selectedItem.perBoxImageUrl))}>
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 snap-start">
                        {hasImage(selectedItem.perBoxImageUrl) ? (
                          <Image src={toSafeImageSrc(selectedItem.perBoxImageUrl) ?? FALLBACK_IMAGE_SRC} fill sizes="96px" className="object-cover" alt="รูปต่อลัง" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-gray-400">ไม่มีรูปต่อลัง</div>
                        )}
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูปต่อลัง</p>
                    </div>
                    <div className={`shrink-0 w-24 space-y-2 ${hasImage(selectedItem.expiryImageUrl) ? 'cursor-pointer' : ''}`} onClick={() => hasImage(selectedItem.expiryImageUrl) && setFullscreenImage(toSafeImageSrc(selectedItem.expiryImageUrl))}>
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 snap-start">
                        {hasImage(selectedItem.expiryImageUrl) ? (
                          <Image src={toSafeImageSrc(selectedItem.expiryImageUrl) ?? FALLBACK_IMAGE_SRC} fill sizes="96px" className="object-cover" alt="รูปวันหมดอายุ" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-gray-400">ไม่มีรูปวันหมดอายุ</div>
                        )}
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูปวันหมดอายุ</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                      ข้อมูลทั่วไป
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                      <DataRow label="วันที่" value={formatThaiDate(selectedItem.date)} />
                      <DataRow label="เวลาสแกน" value={toDisplayText(selectedItem.totalScanTime)} />
                      <DataRow label="เหตุผลหลัก" value={toDisplayText(selectedItem.mainReason)} />
                      <DataRow label="ประเภทข้อมูล" value={toDisplayText(selectedItem.dataType)} isLast />
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                      ตำแหน่งและบาร์โค้ด
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                      <DataRow label="จากที่ไหน" value={toDisplayText(selectedItem.fromLocation)} />
                      <DataRow label="ส่งที่ไหน" value={toDisplayText(selectedItem.toLocation)} />
                      <DataRow label="บาร์โค้ดกล่อง" value={toDisplayText(selectedItem.boxBarcode)} />
                      <DataRow label="บาร์โค้ดแผ่น" value={toDisplayText(selectedItem.itemBarcode)} isLast />
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[var(--brand-primary)] rounded-full"></div>
                      จำนวนและราคา
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                      <DataRow label="จำนวนนับ" value={selectedItem.countedQuantity} />
                      <DataRow label="จำนวนรวม" value={selectedItem.totalQuantity} />
                      <DataRow label="ราคาหน้าร้าน" value={formatCurrency(selectedItem.storePrice, true)} />
                      <DataRow label="ราคาเปลี่ยน" value={formatCurrency(selectedItem.changedPrice, true)} />
                      <DataRow label="นับครั้งที่" value={formatCount(selectedItem.countNumber, true)} />
                      <DataRow label="รายการทั้งหมด" value={formatCount(selectedItem.ofHowManyItems, true)} />
                      <DataRow label="นับรวมชิ้น" value={selectedItem.totalPiecesCounted} isLast />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 mb-2">
                    <span className="text-sm text-gray-500 font-medium">ลิงก์รูปภาพสินค้า</span>
                    <button
                      onClick={() => {
                        if (!selectedItem.imageLinkUrl) return;
                        navigator.clipboard.writeText(selectedItem.imageLinkUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      disabled={!selectedItem.imageLinkUrl}
                      className="flex items-center gap-1.5 text-[var(--brand-primary)] text-sm font-medium bg-orange-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-[#F2F2F7] via-[#F2F2F7] to-transparent">
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full h-12 rounded-full bg-[var(--brand-primary)] text-white font-medium shadow-lg shadow-orange-900/20 active:scale-[0.99] transition"
                >
                  ปิดหน้ารายละเอียด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && selectedItem && (
        <FullscreenImageViewer
          images={[
            { src: toSafeImageSrc(selectedItem.imageUrl) ?? FALLBACK_IMAGE_SRC, label: 'รูปสินค้า' },
            ...(hasImage(selectedItem.perBoxImageUrl)
              ? [{ src: toSafeImageSrc(selectedItem.perBoxImageUrl) ?? FALLBACK_IMAGE_SRC, label: 'รูปต่อลัง' }]
              : []),
            ...(hasImage(selectedItem.expiryImageUrl)
              ? [{ src: toSafeImageSrc(selectedItem.expiryImageUrl) ?? FALLBACK_IMAGE_SRC, label: 'วันหมดอายุ' }]
              : []),
          ]}
          initialIndex={(() => {
            const allSrcs = [
              toSafeImageSrc(selectedItem.imageUrl),
              ...(hasImage(selectedItem.perBoxImageUrl) ? [toSafeImageSrc(selectedItem.perBoxImageUrl)] : []),
              ...(hasImage(selectedItem.expiryImageUrl) ? [toSafeImageSrc(selectedItem.expiryImageUrl)] : []),
            ];
            const idx = allSrcs.indexOf(toSafeImageSrc(fullscreenImage));
            return idx >= 0 ? idx : 0;
          })()}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </>
  );
}
