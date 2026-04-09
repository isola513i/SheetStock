'use client';

import { useEffect } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Catalog error:', error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">โหลดหน้าสินค้าไม่สำเร็จ</h2>
      <p className="text-sm text-gray-500 mb-6">กรุณาลองใหม่อีกครั้ง</p>
      <div className="flex gap-3">
        <a
          href="/"
          className="h-11 px-5 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </a>
        <button
          onClick={reset}
          className="h-11 px-5 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
