'use client';

import { useState } from 'react';
import { Bell, Clock, LogOut, Moon, RefreshCcw, ShieldCheck, Smartphone, Sun, Trash2, UserPlus } from 'lucide-react';
import type { InventoryViewMode, UserRole } from '@/lib/types';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';

type SettingsPageProps = {
  viewMode: InventoryViewMode;
  hapticsEnabled: boolean;
  darkMode: boolean;
  onChangeViewMode: (mode: InventoryViewMode) => void;
  onToggleHaptics: () => void;
  onToggleDarkMode: () => void;
  onRefreshData: () => void;
  onResetPreferences: () => void;
  onLogout: () => void;
  userRole?: UserRole;
  userName?: string;
  recentScans: string[];
  onClearRecentScans: () => void;
  onScanItemClick: (barcode: string) => void;
};

export function SettingsPage({
  viewMode,
  hapticsEnabled,
  darkMode,
  onChangeViewMode,
  onToggleHaptics,
  onToggleDarkMode,
  onRefreshData,
  onResetPreferences,
  onLogout,
  userRole,
  userName,
  recentScans,
  onClearRecentScans,
  onScanItemClick,
}: SettingsPageProps) {
  const roleLabel = userRole === 'admin' ? 'Admin' : userRole === 'sale' ? 'Sale' : userRole === 'customer' ? 'Customer' : 'Guest';
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearScansOpen, setConfirmClearScansOpen] = useState(false);

  return (
    <main className="px-5 pb-28 pt-4 space-y-4">
      {/* Account */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--text-primary)]">บัญชีผู้ใช้</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{userName ? `เข้าสู่ระบบแล้ว: ${userName}` : 'ยังไม่ได้เข้าสู่ระบบ'}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabel}
          </span>
        </div>
        {userName && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full min-h-11 rounded-xl bg-red-50 text-red-600 text-sm inline-flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        )}
      </section>

      {/* Admin: manage registrations */}
      {userRole === 'admin' && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
          <p className="text-sm text-[var(--text-primary)] mb-3">จัดการระบบ</p>
          <button
            type="button"
            onClick={() => { window.location.href = '/admin/approvals'; }}
            className="w-full min-h-11 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm inline-flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            อนุมัติสมาชิกใหม่
          </button>
        </section>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              สแกนล่าสุด
            </p>
            <button
              type="button"
              onClick={() => setConfirmClearScansOpen(true)}
              className="text-[11px] text-red-500"
            >
              ล้างทั้งหมด
            </button>
          </div>
          <div className="space-y-1.5">
            {recentScans.map((barcode, idx) => (
              <button
                key={`${barcode}-${idx}`}
                type="button"
                onClick={() => onScanItemClick(barcode)}
                className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] px-3 text-left text-sm text-[var(--text-primary)] truncate hover:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {barcode}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Display */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
        <p className="text-sm text-[var(--text-primary)]">การแสดงผล</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeViewMode('list')}
            className={`min-h-11 rounded-xl text-sm ${viewMode === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}
          >
            โหมดรายการ
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('grid')}
            className={`min-h-11 rounded-xl text-sm ${viewMode === 'grid' ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}
          >
            โหมดตาราง
          </button>
        </div>
      </section>

      {/* Experience */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-2">
        <p className="text-sm text-[var(--text-primary)]">ประสบการณ์ใช้งาน</p>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-full min-h-11 rounded-xl border border-[var(--border-color)] px-3 flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
            {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            โหมดมืด
          </span>
          <span className={`text-xs ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>{darkMode ? 'เปิด' : 'ปิด'}</span>
        </button>

        {/* Haptic toggle */}
        <button
          type="button"
          onClick={onToggleHaptics}
          className="w-full min-h-11 rounded-xl border border-[var(--border-color)] px-3 flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <Bell className="h-4 w-4" />
            Haptic Feedback
          </span>
          <span className={`text-xs ${hapticsEnabled ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>{hapticsEnabled ? 'เปิด' : 'ปิด'}</span>
        </button>
      </section>

      {/* Data management */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-2">
        <button
          type="button"
          onClick={onRefreshData}
          className="w-full min-h-11 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm inline-flex items-center justify-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          รีเฟรชข้อมูล
        </button>
        <button
          type="button"
          onClick={() => setConfirmResetOpen(true)}
          className="w-full min-h-11 rounded-xl bg-red-50 text-red-600 text-sm inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          รีเซ็ตการตั้งค่า
        </button>
      </section>

      {/* About */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        <p className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <Smartphone className="h-4 w-4" />
          SheetStock Mobile
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">v0.2.0 — Mobile-first inventory dashboard</p>
      </section>

      {/* Confirm Reset */}
      <ConfirmSheet
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="รีเซ็ตการตั้งค่าทั้งหมด?"
        description="ระบบจะคืนค่าโหมดแสดงผล, ตัวกรอง, และการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น"
        confirmLabel="รีเซ็ต"
        variant="danger"
        onConfirm={onResetPreferences}
      />

      {/* Confirm Clear Scans */}
      <ConfirmSheet
        open={confirmClearScansOpen}
        onOpenChange={setConfirmClearScansOpen}
        title="ล้างประวัติสแกนทั้งหมด?"
        description="ข้อมูลบาร์โค้ดที่สแกนล่าสุดจะถูกลบ"
        confirmLabel="ล้าง"
        variant="warning"
        onConfirm={onClearRecentScans}
      />
    </main>
  );
}
