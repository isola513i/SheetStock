'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Clock, Grid3X3, List, Loader2, LogIn, LogOut, Megaphone, RefreshCcw, Save, ShieldCheck, Smartphone, Trash2, UserPlus, Vibrate } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AnnouncementItem, InventoryViewMode, UserRole } from '@/lib/types';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { t, getLocale, setLocale, type Locale } from '@/lib/i18n';

type SettingsPageProps = {
  viewMode: InventoryViewMode;
  hapticsEnabled: boolean;
  onChangeViewMode: (mode: InventoryViewMode) => void;
  onToggleHaptics: () => void;
  onRefreshData: () => void;
  onResetPreferences: () => void;
  onLogout: () => Promise<void> | void;
  userRole?: UserRole;
  userName?: string;
  customerTier?: string;
  recentScans: string[];
  onClearRecentScans: () => void;
  onScanItemClick: (barcode: string) => void;
};

const ANNOUNCEMENTS_API_KEY = '/api/announcements';
const ANNOUNCEMENT_SLOTS = 3;

const fetchAnnouncements = async (url: string): Promise<{ items: AnnouncementItem[] }> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load announcements');
  return response.json();
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

function GuestAccountSection() {
  const router = useRouter();
  return (
    <div className="text-center">
      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-lg font-medium mx-auto mb-3">
        ?
      </div>
      <p className="text-sm text-[var(--text-primary)] font-medium mb-1">ยังไม่ได้เข้าสู่ระบบ</p>
      <p className="text-xs text-[var(--text-muted)] mb-4">เข้าสู่ระบบเพื่อดูราคาพิเศษ</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="flex-1 min-h-11 rounded-xl bg-[var(--brand-primary)] text-white text-sm inline-flex items-center justify-center gap-2 font-medium"
        >
          <LogIn className="h-4 w-4" />
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="flex-1 min-h-11 rounded-xl border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] text-sm inline-flex items-center justify-center gap-2 font-medium"
        >
          <UserPlus className="h-4 w-4" />
          สมัครสมาชิก
        </button>
      </div>
    </div>
  );
}

function AdminAnnouncementSection() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, isLoading } = useSWR<{ items: AnnouncementItem[] }>(ANNOUNCEMENTS_API_KEY, fetchAnnouncements, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });
  const [drafts, setDrafts] = useState<string[]>(() => Array.from({ length: ANNOUNCEMENT_SLOTS }, () => ''));
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const serverDrafts = Array.from({ length: ANNOUNCEMENT_SLOTS }, (_, index) => data?.items[index]?.text ?? '');
  const displayDrafts = isDirty ? drafts : serverDrafts;

  const saveAnnouncements = async () => {
    setIsSaving(true);
    setSaveState('idle');
    try {
      const response = await fetch(ANNOUNCEMENTS_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: displayDrafts }),
      });
      if (!response.ok) throw new Error('Failed to save announcements');
      const nextData = await response.json() as { items: AnnouncementItem[] };
      await mutateGlobal(ANNOUNCEMENTS_API_KEY, nextData, false);
      setDrafts(Array.from({ length: ANNOUNCEMENT_SLOTS }, (_, index) => nextData.items[index]?.text ?? ''));
      setIsDirty(false);
      setSaveState('saved');
    } catch (error) {
      console.error(error);
      setSaveState('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          <Megaphone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">Announcement หน้า Catalog</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">แก้ข้อความใหญ่ได้ไม่เกิน 3 รายการ ระบบจะ slide วนให้อัตโนมัติ และช่องที่เว้นว่างจะไม่ถูกแสดง</p>
        </div>
      </div>

      <div className="space-y-3">
        {displayDrafts.map((draft, index) => (
          <label key={index} className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              ข้อความ {index + 1}
            </span>
            <textarea
              value={draft}
              maxLength={180}
              rows={3}
              onChange={(event) => {
                setDrafts((current) => {
                  const base = isDirty ? current : displayDrafts;
                  return base.map((value, currentIndex) => (currentIndex === index ? event.target.value : value));
                });
                setIsDirty(true);
                setSaveState('idle');
              }}
              placeholder="พิมพ์ประกาศที่ต้องการแสดงบนหน้า /catalog"
              className="min-h-[88px] w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-primary)_18%,transparent)]"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--text-muted)]">
          {isLoading ? 'กำลังโหลดข้อความล่าสุด...' : saveState === 'saved' ? 'บันทึกประกาศแล้ว' : saveState === 'error' ? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' : 'เปลี่ยนแปลงได้ทันทีโดยไม่ต้องแก้โค้ด'}
        </p>
        <button
          type="button"
          disabled={isSaving}
          onClick={saveAnnouncements}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          บันทึกประกาศ
        </button>
      </div>
    </section>
  );
}

export function SettingsPage({
  viewMode,
  hapticsEnabled,
  onChangeViewMode,
  onToggleHaptics,
  onRefreshData,
  onResetPreferences,
  onLogout,
  userRole,
  userName,
  customerTier,
  recentScans,
  onClearRecentScans,
  onScanItemClick,
}: SettingsPageProps) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const toggleLocale = () => {
    const next = locale === 'th' ? 'en' : 'th';
    setLocale(next);
    setLocaleState(next);
  };

  const roleLabel = t(userRole === 'admin' ? 'role.admin' : userRole === 'sale' ? 'role.sale' : userRole === 'customer' ? 'role.customer' : 'role.guest', locale);
  const roleBg = userRole === 'admin' ? 'bg-red-100 text-red-700' : userRole === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearScansOpen, setConfirmClearScansOpen] = useState(false);

  return (
    <main className="px-5 pb-28 pt-4 space-y-4">
      {/* Account */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        {userName ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-lg font-medium">
                {userName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBg}`}>
                    <ShieldCheck className="h-3 w-3" />
                    {roleLabel}
                  </span>
                  {customerTier && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      customerTier === 'VVIP' ? 'bg-purple-100 text-purple-700' :
                      customerTier === 'VIP' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {customerTier}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-11 rounded-xl border border-red-200 text-red-500 text-sm inline-flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t('settings.logout', locale)}
            </button>
          </>
        ) : (
          <GuestAccountSection />
        )}
      </section>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text-primary)] inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--text-muted)]" />
              {t('settings.recentScans', locale)}
            </p>
            <button
              type="button"
              onClick={() => setConfirmClearScansOpen(true)}
              className="text-[11px] text-red-500 font-medium"
            >
              {t('settings.clearAll', locale)}
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
          icon={<Vibrate className="h-4.5 w-4.5" />}
          label={t('settings.haptics', locale)}
          description={t('settings.hapticsDesc', locale)}
          right={<ToggleSwitch enabled={hapticsEnabled} onToggle={onToggleHaptics} />}
          onClick={onToggleHaptics}
        />
        <SettingRow
          icon={viewMode === 'list' ? <List className="h-4.5 w-4.5" /> : <Grid3X3 className="h-4.5 w-4.5" />}
          label={t('settings.viewMode', locale)}
          description={viewMode === 'list' ? t('settings.viewModeList', locale) : t('settings.viewModeGrid', locale)}
          right={<ToggleSwitch enabled={viewMode === 'grid'} onToggle={() => onChangeViewMode(viewMode === 'list' ? 'grid' : 'list')} />}
          onClick={() => onChangeViewMode(viewMode === 'list' ? 'grid' : 'list')}
        />
      </section>

      {/* Actions */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-1 divide-y divide-[var(--border-subtle)]">
        <SettingRow
          icon={<RefreshCcw className="h-4.5 w-4.5" />}
          label={t('settings.refreshData', locale)}
          description={t('settings.refreshDataDesc', locale)}
          onClick={onRefreshData}
        />
        <SettingRow
          icon={<Trash2 className="h-4.5 w-4.5 text-red-500" />}
          label={t('settings.resetPrefs', locale)}
          description={t('settings.resetPrefsDesc', locale)}
          onClick={() => setConfirmResetOpen(true)}
        />
      </section>

      {userRole === 'admin' && <AdminAnnouncementSection />}

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
        title={t('settings.resetTitle', locale)}
        description={t('settings.resetDesc', locale)}
        confirmLabel={t('settings.resetConfirm', locale)}
        variant="danger"
        onConfirm={onResetPreferences}
      />

      {/* Confirm Clear Scans */}
      <ConfirmSheet
        open={confirmClearScansOpen}
        onOpenChange={setConfirmClearScansOpen}
        title={t('settings.clearScansTitle', locale)}
        description={t('settings.clearScansDesc', locale)}
        confirmLabel={t('settings.clearScansConfirm', locale)}
        variant="warning"
        onConfirm={onClearRecentScans}
      />
    </main>
  );
}
