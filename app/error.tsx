'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-gray-500 mb-6">ระบบพบปัญหาบางอย่าง กรุณาลองใหม่อีกครั้ง</p>
      <button
        onClick={reset}
        className="h-11 px-6 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        ลองใหม่
      </button>
    </div>
  );
}
