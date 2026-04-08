'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Package, X } from 'lucide-react';
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

      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-end p-5">
            <button
              onClick={() => setFullscreenImage(null)}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative w-full h-full pb-10">
            <Image
              src={toSafeImageSrc(fullscreenImage) ?? FALLBACK_IMAGE_SRC}
              fill
              sizes="100vw"
              className="object-contain"
              alt="Fullscreen view"
              referrerPolicy="no-referrer"
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </div>
        </div>
      )}
    </>
  );
}
