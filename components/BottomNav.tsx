'use client';

import { LayoutGrid, ScanLine, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { InventoryTabKey } from '@/lib/types';

type BottomNavProps = {
  activeTab: InventoryTabKey;
  setActiveTab: (tab: InventoryTabKey) => void;
  onScanClick?: () => void;
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
      className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5 cursor-pointer px-5 py-2 rounded-xl transition-colors duration-200 ${active ? 'text-[var(--brand-primary)]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
    >
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[var(--brand-primary)] rounded-b-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <motion.div animate={{ scale: active ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
        {icon}
      </motion.div>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export function BottomNav({ activeTab, setActiveTab, onScanClick }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200/60 px-6 pt-2 flex justify-between items-center z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <NavItem
        icon={<LayoutGrid className="w-6 h-6" />}
        label="สินค้า"
        active={activeTab === 'inventory'}
        onClick={() => setActiveTab('inventory')}
      />

      <div className="relative -top-5">
        <button
          type="button"
          onClick={onScanClick}
          className="w-14 h-14 min-w-11 min-h-11 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
        >
          <ScanLine className="w-7 h-7" />
        </button>
      </div>

      <NavItem
        icon={<Settings className="w-6 h-6" />}
        label="ตั้งค่า"
        active={activeTab === 'settings'}
        onClick={() => setActiveTab('settings')}
      />
    </nav>
  );
}
