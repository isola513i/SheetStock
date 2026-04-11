'use client';

import { memo } from 'react';
import { ChartNoAxesCombined, LayoutGrid, PackageSearch, ScanLine, Settings, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRole } from '@/lib/types';

const TAB_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30 };
const ICON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };

type ActivePage = 'inventory' | 'catalog' | 'pricing' | 'settings' | 'approvals';

type BottomNavProps = {
  activePage: ActivePage;
  userRole: UserRole;
  onScanClick?: () => void;
  onSettingsClick?: () => void;
  onInventoryClick?: () => void;
};

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
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
      <motion.div animate={{ scale: active ? 1.1 : 1 }} transition={ICON_SPRING}>
        {icon}
      </motion.div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

export const BottomNav = memo(function BottomNav({ activePage, userRole, onScanClick, onSettingsClick, onInventoryClick }: BottomNavProps) {
  const router = useRouter();
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin';
  const canSeePricing = userRole === 'admin' || userRole === 'sale';

  return (
    <nav
      className="fixed bottom-0 w-full backdrop-blur-md border-t border-[var(--border-color)] px-2 pt-2 flex justify-around items-center z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)', backgroundColor: 'color-mix(in srgb, var(--bg-card) 80%, transparent)' }}
    >
      {/* Customer: catalog as home. Admin/Sale: inventory as home */}
      {isCustomer ? (
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

      {/* Admin/Sale: pricing tab */}
      {canSeePricing && (
        <NavItem
          icon={<ChartNoAxesCombined className="w-5.5 h-5.5" />}
          label="ราคา"
          active={activePage === 'pricing'}
          onClick={() => router.push('/pricing')}
        />
      )}

      {/* Scan button — admin/sale only */}
      {!isCustomer && (
        <div className="relative -top-4">
          <button
            type="button"
            onClick={onScanClick}
            className="w-13 h-13 min-w-11 min-h-11 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
          >
            <ScanLine className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Admin: approvals tab */}
      {isAdmin && (
        <NavItem
          icon={<UserCheck className="w-5.5 h-5.5" />}
          label="อนุมัติ"
          active={activePage === 'approvals'}
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
