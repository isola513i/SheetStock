'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type BarcodeScannerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
};

const SCANNER_REGION_ID = 'scanner-region';

export function BarcodeScannerSheet({ open, onOpenChange, onDetected }: BarcodeScannerSheetProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let scanner: any = null;
    let cancelled = false;

    const start = async () => {
      try {
        setError(null);
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        scanner = new Html5Qrcode(SCANNER_REGION_ID);
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            // Haptic feedback on supported devices for scan success.
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(40);
            }
            onDetected(decodedText);
            onOpenChange(false);
          },
          () => undefined
        );
      } catch {
        setError('ไม่สามารถเปิดกล้องเพื่อสแกนบาร์โค้ดได้');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => undefined).finally(() => scanner?.clear());
      }
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2.5rem] px-5 pt-6 bg-white border-none focus:outline-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}
      >
        <h3 className="text-lg font-medium text-gray-900 mb-2">สแกนบาร์โค้ด</h3>
        <p className="text-sm text-gray-500 mb-4">เล็งกล้องไปที่บาร์โค้ดสินค้าเพื่อค้นหาอัตโนมัติ</p>
        <div id={SCANNER_REGION_ID} className="w-full min-h-[320px] rounded-xl overflow-hidden bg-black/5" />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </SheetContent>
    </Sheet>
  );
}
