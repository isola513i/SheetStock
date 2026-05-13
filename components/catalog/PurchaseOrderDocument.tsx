'use client';

import { forwardRef } from 'react';
import { FALLBACK_IMAGE_SRC } from '@/components/ProductImage';
import type { CartLine, PurchaseOrderCustomer, PurchaseOrderSeller } from './quote-types';

const DEFAULT_SELLER: PurchaseOrderSeller = {
  name: 'KOREA WHOLESALE',
  address: 'เลขที่ 300 แขวงคลองถนน เขตสายไหม กรุงเทพมหานคร 10220',
};

const THAI_DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toPurchaseOrderImageSrc(imageUrl: string, exportSafeImages: boolean) {
  if (!imageUrl) return FALLBACK_IMAGE_SRC;
  if (!exportSafeImages) return imageUrl;
  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

function readChunk(value: number): string {
  const digits = String(value).split('').map(Number);
  return digits.map((digit, index) => {
    if (digit === 0) return '';
    const position = digits.length - index - 1;
    if (position === 1 && digit === 1) return THAI_UNITS[position];
    if (position === 1 && digit === 2) return `ยี่${THAI_UNITS[position]}`;
    if (position === 0 && digit === 1 && digits.length > 1) return 'เอ็ด';
    return `${THAI_DIGITS[digit]}${THAI_UNITS[position]}`;
  }).join('');
}

function numberToThaiBaht(value: number) {
  const rounded = Math.round(value * 100);
  const baht = Math.floor(rounded / 100);
  const satang = rounded % 100;
  if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน';

  const chunks = String(baht).split(/(?=(?:\d{6})+$)/).filter(Boolean).map(Number);
  const bahtText = chunks.map((chunk, index) => {
    const text = readChunk(chunk);
    const million = chunks.length - index - 1;
    return text ? `${text}${'ล้าน'.repeat(million)}` : '';
  }).join('') || 'ศูนย์';

  if (satang === 0) return `${bahtText}บาทถ้วน`;
  return `${bahtText}บาท${readChunk(satang)}สตางค์`;
}

type PurchaseOrderDocumentProps = {
  lines: CartLine[];
  customer: PurchaseOrderCustomer;
  poNumber: string;
  issueDate: Date;
  seller?: PurchaseOrderSeller;
  exportSafeImages?: boolean;
};

export const PurchaseOrderDocument = forwardRef<HTMLDivElement, PurchaseOrderDocumentProps>(function PurchaseOrderDocument({
  lines,
  customer,
  poNumber,
  issueDate,
  seller = DEFAULT_SELLER,
  exportSafeImages = false,
}, ref) {
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return (
    <div ref={ref} className="w-[794px] min-h-[1123px] bg-white text-[#111827] px-10 py-9 font-sans">
      <header className="flex items-start justify-between gap-8 border-b border-gray-200 pb-6">
        <div className="flex items-start gap-5">
          <div className="h-14 w-14 rounded-lg border border-gray-200 flex items-center justify-center text-[11px] font-black leading-none">
            korea<br />wholesale
          </div>
          <div>
            <p className="text-xs text-gray-500">ผู้รับคำสั่งซื้อ :</p>
            <h1 className="text-sm font-bold tracking-wide">{seller.name}</h1>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-gray-600">{seller.address}</p>
            {seller.taxId && <p className="mt-1 text-[11px] text-gray-600">เลขภาษี: {seller.taxId}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-500">(ต้นฉบับ)</p>
          <p className="mt-1 text-4xl font-bold text-[#49A7DF]">ใบสั่งซื้อ</p>
          <p className="mt-1 text-xs font-semibold tracking-wide text-gray-500">PURCHASE ORDER</p>
          <p className="mt-2 rounded-full bg-[#EEF7FF] px-3 py-1 text-[11px] font-semibold text-[#2B78A6]">สำหรับเปิดออเดอร์ใน Peak</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-[1fr_270px] gap-6">
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="font-semibold">ผู้สั่งซื้อ :</span>
            <span>{customer.name || '-'}</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="font-semibold">โทร :</span>
            <span>{customer.phone || '-'}</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="font-semibold">ที่อยู่ :</span>
            <span>-</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] gap-3">
            <span className="font-semibold">เลขภาษี :</span>
            <span>-</span>
          </div>
        </div>
        <div className="rounded-lg bg-[#DDEFFE] p-4 text-sm">
          <div className="grid grid-cols-[95px_1fr] gap-y-2">
            <span className="font-semibold">เลขที่เอกสาร :</span>
            <span>{poNumber}</span>
            <span className="font-semibold">วันที่ออก :</span>
            <span>{formatDate(issueDate)}</span>
            <span className="font-semibold">อ้างอิง :</span>
            <span>-</span>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="grid grid-cols-[1fr_82px_64px_96px_112px] rounded-t-md bg-[#DDEFFE] px-3 py-3 text-sm font-bold">
          <span>รายการสินค้า / Barcode สำหรับคีย์ใน Peak</span>
          <span className="text-right">จำนวน</span>
          <span className="text-center">หน่วย</span>
          <span className="text-right">ราคาต่อหน่วย</span>
          <span className="text-right">ยอดรวม</span>
        </div>
        <div>
          {lines.map((line, index) => {
            const subtotal = line.unitPrice * line.quantity;
            const imageSrc = toPurchaseOrderImageSrc(line.imageUrl, exportSafeImages);
            return (
              <div key={line.productId} className="grid grid-cols-[1fr_82px_64px_96px_112px] gap-0 border-b border-gray-200 px-3 py-4 text-sm">
                <div className="min-w-0">
                  <div className="flex gap-3">
                    <span className="w-5 shrink-0 text-right">{index + 1}.</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt=""
                      className="h-12 w-12 rounded-md object-contain"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE_SRC;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{line.barcode || '-'}</p>
                      <p className="mt-1 text-sm leading-snug">{line.name || '-'}</p>
                      <p className="mt-1 text-xs leading-snug text-gray-600">{[line.brand, line.category, line.series].filter(Boolean).join(' • ')}</p>
                    </div>
                  </div>
                </div>
                <span className="text-right font-semibold">{line.quantity.toFixed(2)}</span>
                <span className="text-center">ชิ้น</span>
                <span className="text-right">{formatMoney(line.unitPrice)}</span>
                <span className="text-right">{formatMoney(subtotal)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-auto pt-16">
        <div className="border-t border-gray-300 pt-5">
          <div className="grid grid-cols-[90px_1fr_280px] items-start gap-6">
            <div className="text-sm font-bold">สรุป</div>
            <div className="text-sm">
              <p className="font-semibold">ยอดรวมใบสั่งซื้อ</p>
              <p className="mt-3 text-xs text-gray-600">{numberToThaiBaht(total)}</p>
            </div>
            <div>
              <div className="rounded-md bg-[#DDEFFE] px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold">ยอดรวมใบสั่งซื้อ</span>
                <span className="text-xl font-bold text-gray-700">{formatMoney(total)} บาท</span>
              </div>
              <div className="mt-3 flex justify-between px-4 text-sm">
                <span className="font-semibold">ยอดสำหรับเปิดเอกสารใน Peak:</span>
                <span>{formatMoney(total)} บาท</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-300 pt-5">
          <p className="text-sm font-bold">หมายเหตุสำหรับทีมขาย / แอดมิน</p>
          <p className="mt-3 text-sm text-gray-600">เอกสารนี้เป็นใบสั่งซื้อจากลูกค้า เพื่อใช้เปิดเอกสารขายต่อใน Peak และส่งต่อให้ทีมโกดัง ไม่ใช่ใบกำกับภาษีหรือหลักฐานการชำระเงิน</p>
          <div className="mt-12 ml-24 text-center text-sm">
            <p className="font-semibold">KOREA WHOLESALE</p>
            <p>{formatDate(issueDate)}</p>
          </div>
        </div>
      </footer>
    </div>
  );
});
