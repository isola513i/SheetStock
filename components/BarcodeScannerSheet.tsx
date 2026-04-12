'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { RefreshCcw } from 'lucide-react';

type BarcodeScannerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
};

const SCANNER_REGION_ID = 'scanner-region';

function stopAllCameraTracks() {
  try {
    const video = document.getElementById(SCANNER_REGION_ID)?.querySelector('video');
    if (video?.srcObject && 'getTracks' in (video.srcObject as MediaStream)) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  } catch { /* ignore */ }
}

export function BarcodeScannerSheet({ open, onOpenChange, onDetected }: BarcodeScannerSheetProps) {
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!open) return;

    let scanner: any = null;
    let stopped = false;
    let isRunning = false;

    const start = async () => {
      try {
        setError(null);
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;

        scanner = new Html5Qrcode(SCANNER_REGION_ID);
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(40);
            }
            onDetected(decodedText);
            onOpenChange(false);
          },
          () => undefined
        );
        isRunning = true;
      } catch {
        if (!stopped) setError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
      }
    };

    start();

    return () => {
      stopped = true;
      if (scanner && isRunning) {
        scanner.stop().catch(() => undefined).finally(() => {
          scanner?.clear();
          stopAllCameraTracks();
        });
      } else {
        scanner?.clear?.();
        stopAllCameraTracks();
      }
    };
  }, [open, retryKey, onDetected, onOpenChange]);

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
        {error && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium"
            >
              <RefreshCcw className="w-4 h-4" />
              ลองใหม่
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
