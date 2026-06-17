'use client';

import { memo } from 'react';
import { LayoutGrid, LogIn, PackageSearch, ScanLine, Settings, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

type ActivePage = 'inventory' | 'catalog' | 'settings' | 'approvals';

type BottomNavProps = {
  activePage: ActivePage;
  userRole: UserRole;
  isGuest?: boolean;
  pendingCount?: number;
  className?: string;
  onScanClick?: () => void;
  onSettingsClick?: () => void;
  onInventoryClick?: () => void;
};

function NavItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-11 flex-col items-center justify-center gap-1 cursor-pointer rounded-lg px-3 py-2 transition-[background-color,color] duration-150 ${active ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary-strong)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]'}`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-[var(--status-danger)] text-[var(--bg-card)] text-[9px] font-bold rounded-md flex items-center justify-center">{badge}</span>
        ) : null}
      </div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

export const BottomNav = memo(function BottomNav({ activePage, userRole, isGuest, pendingCount, className, onScanClick, onSettingsClick, onInventoryClick }: BottomNavProps) {
  const router = useRouter();
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-[1180px] items-center justify-around border-t border-[var(--border-color)] px-2 pt-2',
        className
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)', backgroundColor: 'var(--bg-card)' }}
    >
      {/* Customer/Guest: catalog as home. Admin/Sale: inventory as home */}
      {isCustomer || isGuest ? (
        <NavItem
          icon={<PackageSearch className="w-5.5 h-5.5" />}
          label="สินค้า"
          active={activePage === 'catalog'}
          onClick={() => {
            if (onInventoryClick) onInventoryClick();
            else router.push('/catalog');
          }}
        />
      ) : (
        <NavItem
          icon={<LayoutGrid className="w-5.5 h-5.5" />}
          label="สินค้า"
          active={activePage === 'inventory'}
          onClick={() => {
            if (onInventoryClick) onInventoryClick();
            else router.push('/');
          }}
        />
      )}

      {isGuest && (
        <NavItem
          icon={<LogIn className="w-5.5 h-5.5" />}
          label="เข้าสู่ระบบ"
          onClick={() => router.push('/login')}
        />
      )}

      {/* Scan tab — admin/sale only */}
      {!isCustomer && !isGuest && (
        <NavItem
          icon={<ScanLine className="w-5.5 h-5.5" />}
          label="สแกน"
          onClick={onScanClick}
        />
      )}

      {/* Admin: approvals tab */}
      {isAdmin && (
        <NavItem
          icon={<UserCheck className="w-5.5 h-5.5" />}
          label="อนุมัติ"
          active={activePage === 'approvals'}
          badge={pendingCount}
          onClick={() => router.push('/admin/approvals')}
        />
      )}

      {/* Settings */}
      <NavItem
        icon={<Settings className="w-5.5 h-5.5" />}
        label="ตั้งค่า"
        active={activePage === 'settings'}
        onClick={() => {
          if (onSettingsClick) onSettingsClick();
          else router.push('/?tab=settings');
        }}
      />
    </nav>
  );
});
