'use client';

import { memo } from 'react';
import { LayoutGrid, PackageSearch, ScanLine, Settings, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRole } from '@/lib/types';

const TAB_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30 };
const ICON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };

type ActivePage = 'inventory' | 'catalog' | 'settings' | 'approvals';

type BottomNavProps = {
  activePage: ActivePage;
  userRole: UserRole;
  isGuest?: boolean;
  pendingCount?: number;
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
      className={`relative flex min-h-11 flex-col items-center justify-center gap-1 cursor-pointer px-3 py-2 rounded-xl transition-colors duration-200 ${active ? 'text-[var(--brand-primary)]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--brand-primary)] rounded-b-full"
          transition={TAB_SPRING}
        />
      )}
      <motion.div animate={{ scale: active ? 1.1 : 1 }} transition={ICON_SPRING} className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badge}</span>
        ) : null}
      </motion.div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

export const BottomNav = memo(function BottomNav({ activePage, userRole, isGuest, pendingCount, onScanClick, onSettingsClick, onInventoryClick }: BottomNavProps) {
  const router = useRouter();
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-[var(--border-color)] px-2 pt-2 flex justify-around items-center z-40"
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
