'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/toast';
import { t, getLocale, type Locale } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [locale] = useState<Locale>(() => getLocale());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentifierError('');
    setPasswordError('');
    setLoading(true);
    setError('');
    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier) {
      setIdentifierError(t('login.phoneRequired', locale));
      setLoading(false);
      return;
    }
    if (!normalizedPassword) {
      setPasswordError(t('login.passwordRequired', locale));
      setLoading(false);
      return;
    }

    const body = { phone: normalizedIdentifier, password: normalizedPassword };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = payload?.error ?? t('login.failed', locale);
        setError(msg);
        toast(msg, 'error');
        return;
      }

      toast(t('login.success', locale), 'success');
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="catalog-theme h-dvh overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#cf8610_0%,#f3a712_48%,#f6c14e_100%)] px-5 pb-20 pt-5 text-[var(--catalog-header-text)] shadow-[0_30px_60px_-36px_rgba(207,134,16,0.48)]">
          <div className="absolute inset-x-10 bottom-0 h-16 rounded-t-[2rem] bg-[color:color-mix(in_oklab,var(--bg-card)_10%,transparent)]" />
          <div className="absolute right-[-2.5rem] top-[-2rem] h-32 w-32 rounded-full bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)] blur-2xl" />
          <div className="absolute left-[-3rem] top-16 h-28 w-28 rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header)_18%,transparent)] blur-2xl" />

          <div className="relative z-10 flex items-center justify-start">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push('/catalog');
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--bg-card)_12%,transparent)] text-[var(--catalog-header-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)]"
              aria-label="กลับ"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="relative z-10 flex justify-center pt-14">
            <div className="flex h-36 w-36 items-center justify-center rounded-[2.25rem] bg-[color:color-mix(in_oklab,var(--bg-card)_12%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Image src="/icons/logo.svg" alt="SheetStock logo" width={104} height={104} className="h-[6.5rem] w-[6.5rem]" priority />
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-12 flex-1 rounded-[2.25rem] bg-[var(--bg-card)] px-5 pb-5 pt-7 shadow-[0_24px_48px_-32px_rgba(41,51,92,0.38)]">
          <div className="text-center">
            <h2 className="text-[1.65rem] font-semibold leading-tight text-[var(--catalog-header)]">เข้าสู่ระบบ</h2>
            <p className="mx-auto mt-2 max-w-[18rem] text-[14px] leading-6 text-[var(--text-muted)]">
              กรอกรหัสลูกค้าหรือเบอร์โทร พร้อมรหัสผ่านเพื่อเข้าใช้งานต่อ
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">{t('login.phone', locale)}</label>
              <div className={`flex h-14 items-center rounded-2xl border bg-[var(--bg-card)] px-4 transition-[border-color,box-shadow,background-color] ${identifierError ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : 'border-[var(--border-color)] focus-within:border-[var(--catalog-header-action)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_18%,transparent)]'}`}>
                <Phone className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder={t('login.phonePlaceholder', locale)}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value.trimStart())}
                  className="h-full w-full bg-transparent pl-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
              {identifierError ? <p className="mt-1.5 text-xs text-red-500">{identifierError}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">{t('login.password', locale)}</label>
              <div className={`flex h-14 items-center rounded-2xl border bg-[var(--bg-card)] px-4 transition-[border-color,box-shadow,background-color] ${passwordError ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : 'border-[var(--border-color)] focus-within:border-[var(--catalog-header-action)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_18%,transparent)]'}`}>
                <LockKeyhole className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder', locale)}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-full w-full bg-transparent pl-3 pr-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError ? <p className="mt-1.5 text-xs text-red-500">{passwordError}</p> : null}
            </div>

            {error ? (
              <div className="rounded-2xl border border-[color:color-mix(in_oklab,var(--catalog-emphasis)_20%,var(--border-color))] bg-[color:color-mix(in_oklab,var(--catalog-emphasis)_8%,var(--bg-card))] px-4 py-3 text-sm text-[var(--catalog-emphasis)]">
                {error}
              </div>
            ) : null}

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-[1.35rem] bg-[linear-gradient(90deg,#d88d11_0%,#f3a712_52%,#f6bc41_100%)] text-[1.08rem] font-semibold text-white shadow-[0_18px_30px_-20px_rgba(243,167,18,0.9)] transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[0_22px_34px_-20px_rgba(243,167,18,0.95)] active:translate-y-0 disabled:opacity-60"
              >
                {loading ? t('login.loading', locale) : t('login.submit', locale)}
              </button>

              <button
                type="button"
                onClick={() => router.push('/register')}
                className="flex h-14 w-full items-center justify-center rounded-[1.35rem] border border-[color:color-mix(in_oklab,var(--catalog-header)_16%,var(--border-color))] bg-[var(--bg-card)] text-[1.08rem] font-semibold text-[var(--catalog-header)] transition-[background-color,border-color,color] hover:border-[var(--catalog-header-action)] hover:bg-[var(--brand-primary-soft)]"
              >
                {t('login.register', locale)}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
