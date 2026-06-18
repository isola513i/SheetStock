'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, FileImage, FileText, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ProductImage } from '@/components/ProductImage';
import { getCheckoutUnitLabel } from '@/lib/catalog-units';
import { PurchaseOrderDocument } from './PurchaseOrderDocument';
import type { CartLine, PurchaseOrderCustomer } from './quote-types';

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makePurchaseOrderNumber(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `PO-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(resolve, 6000);
      img.onload = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      img.onerror = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
    });
  }));
}

type CartSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  customer: PurchaseOrderCustomer;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveLine: (productId: string) => void;
  onClearCart: () => void;
};

export function CartSheet({
  open,
  onOpenChange,
  lines,
  customer,
  customerName,
  onCustomerNameChange,
  onUpdateQuantity,
  onRemoveLine,
  onClearCart,
}: CartSheetProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [issueDate] = useState(() => new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const poNumber = useMemo(() => makePurchaseOrderNumber(issueDate), [issueDate]);
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const itemCount = lines.length;
  const purchaseOrderCustomer = useMemo(() => ({
    ...customer,
    name: customerName.trim() || customer.name || 'ลูกค้า',
  }), [customer, customerName]);

  const commitQuantity = (productId: string, quantity: number) => {
    onUpdateQuantity(productId, quantity);
    setDraftQuantities((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const exportPurchaseOrder = async (format: 'png' | 'pdf') => {
    if (!documentRef.current || lines.length === 0) return;
    setIsExporting(true);
    try {
      await waitForImages(documentRef.current);
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(documentRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 794,
        height: documentRef.current.scrollHeight,
      });
      const filename = `${poNumber}.${format}`;

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        return;
      }

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(filename);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="catalog-theme max-h-[92dvh] rounded-t-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-0 pt-0 overflow-hidden" showCloseButton={false}>
          <div className="flex h-full max-h-[92dvh] flex-col">
            <div className="shrink-0 px-5 pt-3 pb-4 border-b border-[var(--border-subtle)]">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-color)]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)]">ใบสั่งซื้อ PO</p>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">{itemCount} รายการในตะกร้า</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  aria-label="ปิดตะกร้า"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
                    <ShoppingCart className="h-7 w-7 text-[var(--text-muted)]" />
                  </div>
                  <p className="font-medium text-[var(--text-primary)]">ยังไม่มีสินค้าในตะกร้า</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">เพิ่มสินค้าเพื่อสร้างใบสั่งซื้อ PO</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
                    <label htmlFor="po-customer-name" className="text-xs font-semibold text-[var(--text-secondary)]">
                      ชื่อลูกค้าในใบ PO
                    </label>
                    <input
                      id="po-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(event) => onCustomerNameChange(event.target.value)}
                      placeholder={customer.name || 'กรอกชื่อลูกค้า'}
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-primary)_16%,transparent)]"
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                      ชื่อนี้จะถูกนำไปแสดงในช่องผู้สั่งซื้อของใบ PO
                    </p>
                  </div>
                  {lines.map((line) => (
                    <div key={line.productId} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
                      {(() => {
                        const unitLabel = getCheckoutUnitLabel(line);
                        return (
                      <div className="flex gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-card)]">
                          <ProductImage src={line.imageUrl} alt={line.name} sizes="64px" className="object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">{line.name || line.barcode}</p>
                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{line.barcode}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveLine(line.productId)}
                              className="shrink-0 rounded-lg p-2 text-[var(--status-danger)]"
                              aria-label={`ลบ ${line.name} ออกจากตะกร้า`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-[var(--text-muted)]">ราคา</p>
                              <p className="font-semibold text-[var(--catalog-emphasis)]">฿{formatMoney(line.unitPrice)}</p>
                              <p className={`mt-0.5 text-[11px] ${line.stock <= 0 ? 'text-[var(--status-danger)]' : 'text-[var(--text-muted)]'}`}>
                                {line.stock <= 0 ? 'สินค้าหมด' : `เหลือ ${line.stock.toLocaleString('th-TH')} ${unitLabel}`}
                              </p>
                            </div>
                            <div className="flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
                              <button
                                type="button"
                                onClick={() => commitQuantity(line.productId, line.quantity - 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)]"
                                aria-label="ลดจำนวน"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, line.stock)}
                                step={1}
                                value={draftQuantities[line.productId] ?? String(line.quantity)}
                                onChange={(event) => {
                                  setDraftQuantities((current) => ({
                                    ...current,
                                    [line.productId]: event.target.value.replace(/[^\d]/g, ''),
                                  }));
                                }}
                                onBlur={(event) => {
                                  const raw = event.target.value.trim();
                                  const parsed = raw === '' ? 1 : Number(raw);
                                  commitQuantity(line.productId, Number.isFinite(parsed) ? parsed : 1);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                  }
                                }}
                                className="w-14 border-0 bg-transparent text-center text-sm font-semibold text-[var(--text-primary)] outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                aria-label={`จำนวน${unitLabel}`}
                              />
                              <button
                                type="button"
                                onClick={() => commitQuantity(line.productId, line.quantity + 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)]"
                                aria-label="เพิ่มจำนวน"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between border-t border-[var(--border-color)] pt-2 text-sm">
                            <span className="text-[var(--text-secondary)]">รวม {line.quantity.toLocaleString('th-TH')} {unitLabel}</span>
                            <span className="font-semibold text-[var(--catalog-emphasis)]">฿{formatMoney(line.unitPrice * line.quantity)}</span>
                          </div>
                        </div>
                      </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">ยอดรวม</span>
                <span className="text-xl font-bold text-[var(--catalog-emphasis)]">฿{formatMoney(total)}</span>
              </div>
              {lines.length > 0 && (
                <p className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">บันทึกเป็นใบสั่งซื้อ PO เพื่อส่งให้ทีมเปิดเอกสารขายใน Peak และประสานงานโกดัง</p>
              )}
              <div className="grid grid-cols-[0.9fr_1.1fr] gap-2">
                <button
                  type="button"
                  disabled={lines.length === 0 || isExporting}
                  onClick={() => exportPurchaseOrder('png')}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-primary)] disabled:opacity-50"
                >
                  <FileImage className="h-4 w-4" /> PNG
                </button>
                <button
                  type="button"
                  disabled={lines.length === 0 || isExporting}
                  onClick={() => exportPurchaseOrder('pdf')}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-sm font-semibold text-[var(--bg-card)] disabled:opacity-50"
                >
                  {isExporting ? <Download className="h-4 w-4 animate-bounce" /> : <FileText className="h-4 w-4" />} บันทึก PDF
                </button>
              </div>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="mt-3 h-10 w-full rounded-xl text-sm font-medium text-[var(--status-danger)]"
                >
                  ล้างตะกร้า
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="pointer-events-none fixed left-[-9999px] top-0">
        <PurchaseOrderDocument
          ref={documentRef}
          lines={lines}
          customer={purchaseOrderCustomer}
          poNumber={poNumber}
          issueDate={issueDate}
          exportSafeImages={true}
        />
      </div>
    </>
  );
}
