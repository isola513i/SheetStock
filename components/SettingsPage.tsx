'use client';

import { useState } from 'react';
import { Clock, Grid3X3, List, LogOut, Moon, RefreshCcw, ShieldCheck, Smartphone, Sun, Trash2, Vibrate } from 'lucide-react';
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

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
        enabled ? 'bg-[var(--brand-primary)]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, right, onClick }: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="w-full flex items-center gap-3 px-1 py-2.5 text-left cursor-pointer"
    >
      <div className="h-9 w-9 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      {right && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{right}</div>}
    </div>
  );
}

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
  const roleBg = userRole === 'admin' ? 'bg-red-100 text-red-700' : userRole === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearScansOpen, setConfirmClearScansOpen] = useState(false);

  return (
    <main className="px-5 pb-28 pt-4 space-y-4">
      {/* Account */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-lg font-medium">
            {(userName ?? '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{userName ?? 'ไม่ทราบ'}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5 ${roleBg}`}>
              <ShieldCheck className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
        </div>
        {userName && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-11 rounded-xl border border-red-200 text-red-500 text-sm inline-flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        )}
      </section>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-primary)] inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--text-muted)]" />
              สแกนล่าสุด
            </p>
            <button
              type="button"
              onClick={() => setConfirmClearScansOpen(true)}
              className="text-[11px] text-red-500 font-medium"
            >
              ล้างทั้งหมด
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {recentScans.map((barcode, idx) => (
              <button
                key={`${barcode}-${idx}`}
                type="button"
                onClick={() => onScanItemClick(barcode)}
                className="shrink-0 h-9 px-3 rounded-lg bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] font-mono hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {barcode}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Preferences */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-1 divide-y divide-[var(--border-subtle)]">
        <SettingRow
          icon={darkMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          label="โหมดมืด"
          description="ปรับสีหน้าจอให้ถนอมสายตา"
          right={<ToggleSwitch enabled={darkMode} onToggle={onToggleDarkMode} />}
          onClick={onToggleDarkMode}
        />
        <SettingRow
          icon={<Vibrate className="h-4.5 w-4.5" />}
          label="การสั่น"
          description="สั่นเบาเมื่อกดปุ่มหรือสแกน"
          right={<ToggleSwitch enabled={hapticsEnabled} onToggle={onToggleHaptics} />}
          onClick={onToggleHaptics}
        />
        <SettingRow
          icon={viewMode === 'list' ? <List className="h-4.5 w-4.5" /> : <Grid3X3 className="h-4.5 w-4.5" />}
          label="มุมมองสินค้า"
          description={viewMode === 'list' ? 'แสดงแบบรายการ' : 'แสดงแบบตาราง'}
          right={
            <div className="flex bg-[var(--bg-secondary)] rounded-lg p-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChangeViewMode('list'); }}
                className={`h-7 w-8 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-card)] shadow-sm' : ''}`}
              >
                <List className={`h-3.5 w-3.5 ${viewMode === 'list' ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChangeViewMode('grid'); }}
                className={`h-7 w-8 rounded-md flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-card)] shadow-sm' : ''}`}
              >
                <Grid3X3 className={`h-3.5 w-3.5 ${viewMode === 'grid' ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`} />
              </button>
            </div>
          }
          onClick={() => onChangeViewMode(viewMode === 'list' ? 'grid' : 'list')}
        />
      </section>

      {/* Actions */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-1 divide-y divide-[var(--border-subtle)]">
        <SettingRow
          icon={<RefreshCcw className="h-4.5 w-4.5" />}
          label="รีเฟรชข้อมูล"
          description="โหลดข้อมูลสินค้าใหม่จากเซิร์ฟเวอร์"
          onClick={onRefreshData}
        />
        <SettingRow
          icon={<Trash2 className="h-4.5 w-4.5 text-red-500" />}
          label="รีเซ็ตการตั้งค่า"
          description="คืนค่าทั้งหมดกลับเป็นค่าเริ่มต้น"
          onClick={() => setConfirmResetOpen(true)}
        />
      </section>

      {/* About */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
            <Smartphone className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">SheetStock Mobile</p>
            <p className="text-[11px] text-[var(--text-muted)]">v0.2.0</p>
          </div>
        </div>
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
