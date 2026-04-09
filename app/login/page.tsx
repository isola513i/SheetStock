'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setPasswordError('');
    setLoading(true);
    setError('');
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      setEmailError('กรุณากรอกอีเมล');
      setLoading(false);
      return;
    }
    if (!normalizedPassword) {
      setPasswordError('กรุณากรอกรหัสผ่าน');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = payload?.error ?? 'เข้าสู่ระบบไม่สำเร็จ';
        setError(msg);
        toast(msg, 'error');
        return;
      }

      toast('เข้าสู่ระบบสำเร็จ', 'success');
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white text-gray-900">
      <div className="mx-auto min-h-dvh w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="mt-8 text-[2.2rem] leading-[2.6rem] text-gray-900">ยินดีต้อนรับกลับ</h1>
        <p className="mt-2 text-sm text-gray-500">เข้าสู่ระบบเพื่อใช้งาน SheetStock ต่อ</p>

        <form onSubmit={onSubmit} className="mt-9 space-y-4">
          <div>
            <label className="mb-2 block text-[1.12rem] text-gray-900">อีเมล</label>
            <input
              type="email"
              placeholder="กรอกอีเมล"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`h-14 w-full rounded-lg border bg-[#F3F3F3] px-4 text-lg outline-none ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[var(--brand-primary)]'}`}
            />
            {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1.12rem] text-gray-900">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`h-14 w-full rounded-lg border bg-[#F3F3F3] px-4 pr-12 text-lg outline-none ${passwordError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[var(--brand-primary)]'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError ? <p className="mt-1 text-xs text-red-500">{passwordError}</p> : null}
          </div>

          <button type="button" className="text-[1.02rem] underline text-[var(--brand-primary)]">
            ลืมรหัสผ่าน?
          </button>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-14 w-full rounded-full bg-[var(--brand-primary)] text-white text-[1.25rem] disabled:opacity-60"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/register')}
            className="h-14 w-full rounded-full border-2 border-[var(--brand-primary)] bg-transparent text-[var(--brand-primary)] text-[1.25rem]"
          >
            สมัครสมาชิก
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white/60 p-3 text-[12px] text-gray-600">
          <p className="text-gray-700">บัญชีทดสอบ (Demo)</p>
          <p>- admin@sheetstock.app / admin1234</p>
          <p>- sale@sheetstock.app / sale1234</p>
          <p>- customer-a@sheetstock.app / cust1234</p>
        </div>
      </div>
    </main>
  );
}
