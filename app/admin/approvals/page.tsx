'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Clock, ShieldCheck, Store, UserPlus, XCircle } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BottomNav } from '@/components/BottomNav';
import { useToast } from '@/components/ui/toast';
import type { CustomerRegistration, UserRole } from '@/lib/types';

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

const TIERS = [
  { id: 'vip', name: 'VIP', desc: 'เห็นราคา VIP', color: 'bg-blue-100 text-blue-700' },
  { id: 'vvip', name: 'VVIP', desc: 'เห็นราคา VVIP', color: 'bg-purple-100 text-purple-700' },
];

export default function AdminApprovalsPage() {
  const { toast } = useToast();
  const { data: me, isLoading: isMeLoading } = useSWR<{ user: { role: UserRole; name: string } | null }>('/api/auth/me', fetcher);
  const { data: regData, mutate } = useSWR<{ items: CustomerRegistration[] }>(
    me?.user?.role === 'admin' ? '/api/admin/registrations' : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const [approving, setApproving] = useState<CustomerRegistration | null>(null);
  const [rejecting, setRejecting] = useState<CustomerRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const items = regData?.items ?? [];

  const handleApprove = async (tierId: string) => {
    if (!approving) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${approving.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? 'อนุมัติไม่สำเร็จ', 'error');
        return;
      }
      toast(`อนุมัติ ${approving.storeName} เรียบร้อย`, 'success');
      setApproving(null);
      await mutate();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${rejecting.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        toast('ปฏิเสธไม่สำเร็จ', 'error');
        return;
      }
      toast(`ปฏิเสธ ${rejecting.storeName} แล้ว`, 'info');
      setRejecting(null);
      setRejectReason('');
      await mutate();
    } finally {
      setLoading(false);
    }
  };

  if (isMeLoading) {
    return (
      <main className="min-h-dvh bg-[#F2F2F7] px-5 pt-20">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (me?.user?.role !== 'admin') {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F2F2F7] px-6 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-900 font-medium mb-1">ไม่มีสิทธิ์เข้าถึง</p>
        <p className="text-sm text-gray-500">เฉพาะ Admin เท่านั้น</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F2F2F7] flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-[var(--brand-primary)] rounded-b-[1.5rem] px-5 text-white shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 24 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium leading-tight">อนุมัติสมาชิกใหม่</h1>
            <p className="text-white/70 text-xs mt-0.5">จัดการคำขอสมัครสมาชิกลูกค้า</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${items.length > 0 ? 'bg-yellow-300' : 'bg-green-300'}`} />
          <span className="text-sm text-white/90">
            {items.length > 0 ? `${items.length} คำขอรออนุมัติ` : 'ไม่มีคำขอรออนุมัติ'}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8"
          >
            {/* Stacked icon illustration */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" strokeWidth={1.5} />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-200 opacity-60" />
              <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-green-300 opacity-40" />
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mb-2">เรียบร้อยทุกคำขอ</h2>
            <p className="text-sm text-gray-400 leading-relaxed max-w-[220px]">
              ทุกคำขอสมัครสมาชิกได้รับการดำเนินการแล้ว
            </p>

            <div className="mt-8 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-gray-500 font-medium">ระบบพร้อมรับคำขอใหม่</span>
            </div>
          </motion.div>
        ) : (
          <div className="pt-4">
          <AnimatePresence>
            <div className="space-y-3">
              {items.map((reg, idx) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{reg.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3" />
                          {reg.storeName}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        รอ
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      <p>{reg.phone}</p>
                      <p>สมัครเมื่อ {new Date(reg.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 flex">
                    <button
                      onClick={() => { setRejecting(reg); setRejectReason(''); }}
                      className="flex-1 h-11 text-sm text-red-500 font-medium flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      ปฏิเสธ
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => setApproving(reg)}
                      className="flex-1 h-11 text-sm text-green-600 font-medium flex items-center justify-center gap-1.5 hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      อนุมัติ
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
          </div>
        )}
      </div>

      {/* Approve Sheet — tier selection */}
      <Sheet open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 bg-white border-none" showCloseButton={false}>
          {approving && (
            <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <h3 className="text-base font-medium text-gray-900 mb-1">เลือกระดับลูกค้า</h3>
              <p className="text-xs text-gray-500 mb-5">{approving.storeName} — {approving.name}</p>

              <div className="space-y-2 mb-5">
                {TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => handleApprove(tier.id)}
                    disabled={loading}
                    className="w-full h-14 rounded-xl border border-gray-200 px-4 flex items-center justify-between hover:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tier.color}`}>{tier.name}</span>
                      <span className="text-sm text-gray-700">{tier.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setApproving(null)}
                className="w-full h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Sheet */}
      <Sheet open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-6 bg-white border-none" showCloseButton={false}>
          {rejecting && (
            <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
              <h3 className="text-base font-medium text-gray-900 mb-1">ปฏิเสธคำขอ</h3>
              <p className="text-xs text-gray-500 mb-5">{rejecting.storeName} — {rejecting.name}</p>

              <div className="mb-5">
                <label className="text-xs text-gray-500 mb-1.5 block">เหตุผล (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="เช่น ข้อมูลไม่ครบ"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRejecting(null)}
                  className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav activePage="approvals" userRole="admin" />
    </div>
  );
}
