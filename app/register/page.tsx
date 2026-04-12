'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          password,
          storeName: storeName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error ?? 'สมัครสมาชิกไม่สำเร็จ';
        setError(msg);
        toast(msg, 'error');
        return;
      }
      setSuccess(true);
      toast('สมัครสมาชิกสำเร็จ', 'success');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-medium text-gray-900 mb-2">สมัครสมาชิกสำเร็จ</h1>
        <p className="text-sm text-gray-500 mb-8">รอการอนุมัติจาก Admin<br />ระบบจะแจ้งเตือนเมื่อบัญชีพร้อมใช้งาน</p>
        <button
          onClick={() => router.push('/login')}
          className="h-14 w-full max-w-xs rounded-full bg-[var(--brand-primary)] text-white text-lg font-medium"
        >
          กลับหน้าเข้าสู่ระบบ
        </button>
      </main>
    );
  }

  const inputClass = (hasError?: boolean) =>
    `h-14 w-full rounded-lg border bg-[#F3F3F3] px-4 text-base outline-none ${hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[var(--brand-primary)]'}`;

  return (
    <main className="min-h-dvh bg-white text-gray-900">
      <div className="mx-auto min-h-dvh w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="mt-6 text-[2rem] leading-tight text-gray-900">สมัครสมาชิก</h1>
        <p className="mt-2 text-sm text-gray-500">สมัครเพื่อดูราคาพิเศษ รอ admin อนุมัติ</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-700">ชื่อ-นามสกุล</label>
            <input type="text" placeholder="กรอกชื่อ-นามสกุล" value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700">ชื่อร้าน</label>
            <input type="text" placeholder="กรอกชื่อร้านค้า" value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputClass()} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700">เบอร์โทรศัพท์</label>
            <input type="tel" inputMode="tel" placeholder="กรอกเบอร์โทร (10 หลัก)" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass()} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass()}
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" aria-label="Toggle password">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 h-14 w-full rounded-full bg-[var(--brand-primary)] text-white text-lg font-medium disabled:opacity-60"
          >
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>

          <p className="text-center text-sm text-gray-500">
            มีบัญชีแล้ว?{' '}
            <button type="button" onClick={() => router.push('/login')} className="text-[var(--brand-primary)] underline">
              เข้าสู่ระบบ
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
