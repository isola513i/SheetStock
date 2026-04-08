'use client';

import { Bell, ChartNoAxesCombined, LogIn, PackageSearch, RefreshCcw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import type { InventoryViewMode, UserRole } from '@/lib/types';

type SettingsPageProps = {
  viewMode: InventoryViewMode;
  hapticsEnabled: boolean;
  onChangeViewMode: (mode: InventoryViewMode) => void;
  onToggleHaptics: () => void;
  onRefreshData: () => void;
  onResetPreferences: () => void;
  onOpenLogin: () => void;
  onOpenPricing: () => void;
  onOpenCatalog: () => void;
  userRole?: UserRole;
  userName?: string;
};

export function SettingsPage({
  viewMode,
  hapticsEnabled,
  onChangeViewMode,
  onToggleHaptics,
  onRefreshData,
  onResetPreferences,
  onOpenLogin,
  onOpenPricing,
  onOpenCatalog,
  userRole,
  userName,
}: SettingsPageProps) {
  const roleLabel = userRole === 'admin' ? 'Admin' : userRole === 'sale' ? 'Sale' : userRole === 'customer' ? 'Customer' : 'Guest';

  return (
    <main className="px-5 pb-28 pt-4 space-y-4">
      <section className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-900">บัญชีผู้ใช้</p>
            <p className="text-xs text-gray-500 mt-1">{userName ? `เข้าสู่ระบบแล้ว: ${userName}` : 'ยังไม่ได้เข้าสู่ระบบ'}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenLogin}
          className="mt-3 w-full min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm inline-flex items-center justify-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          ไปหน้า Login (เตรียมระบบ)
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
        <p className="text-sm text-gray-900">ทางลัดการใช้งาน</p>
        {(userRole === 'sale' || userRole === 'admin') && (
          <button
            type="button"
            onClick={onOpenPricing}
            className="w-full min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm inline-flex items-center justify-center gap-2"
          >
            <ChartNoAxesCombined className="h-4 w-4" />
            ไปหน้า Pricing Dashboard
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCatalog}
          className="w-full min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm inline-flex items-center justify-center gap-2"
        >
          <PackageSearch className="h-4 w-4" />
          ไปหน้าสินค้า (Catalog)
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-gray-900">การแสดงผล</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeViewMode('list')}
            className={`min-h-11 rounded-xl text-sm ${viewMode === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            โหมดรายการ
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('grid')}
            className={`min-h-11 rounded-xl text-sm ${viewMode === 'grid' ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            โหมดตาราง
          </button>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-gray-900">ประสบการณ์ใช้งาน</p>
        <button
          type="button"
          onClick={onToggleHaptics}
          className="w-full min-h-11 rounded-xl border border-gray-200 px-3 flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
            <Bell className="h-4 w-4" />
            Haptic Feedback
          </span>
          <span className={`text-xs ${hapticsEnabled ? 'text-green-600' : 'text-gray-500'}`}>{hapticsEnabled ? 'เปิด' : 'ปิด'}</span>
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
        <button
          type="button"
          onClick={onRefreshData}
          className="w-full min-h-11 rounded-xl bg-gray-100 text-gray-700 text-sm inline-flex items-center justify-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          รีเฟรชข้อมูล
        </button>
        <button
          type="button"
          onClick={onResetPreferences}
          className="w-full min-h-11 rounded-xl bg-red-50 text-red-600 text-sm inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          รีเซ็ตการตั้งค่า
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="inline-flex items-center gap-2 text-sm text-gray-700">
          <Smartphone className="h-4 w-4" />
          SheetStock Mobile
        </p>
        <p className="text-xs text-gray-500 mt-1">หน้า Settings พร้อมต่อระบบ Login ในขั้นตอนถัดไป</p>
      </section>
    </main>
  );
}
