'use client';

import { AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type ConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
};

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 bg-white border-none" showCloseButton={false}>
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-red-500' : 'text-yellow-500'}`} />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={`flex-1 h-12 rounded-xl text-white text-sm font-medium ${variant === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
