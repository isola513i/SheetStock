'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { t, getLocale, setLocale, type Locale } from '@/lib/i18n';

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
  const [locale, setLocaleState] = useState<Locale>('th');

  useEffect(() => { setLocaleState(getLocale()); }, []);

  const toggleLocale = () => {
    const next = locale === 'th' ? 'en' : 'th';
    setLocale(next);
    setLocaleState(next);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setPasswordError('');
    setLoading(true);
    setError('');
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      setEmailError(t('login.emailRequired', locale));
      setLoading(false);
      return;
    }
    if (!normalizedPassword) {
      setPasswordError(t('login.passwordRequired', locale));
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
    <main className="min-h-dvh bg-white text-gray-900">
      <div className="mx-auto min-h-dvh w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        {/* Language toggle */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600"
          >
            <Globe className="w-3.5 h-3.5" />
            {locale === 'th' ? 'EN' : 'TH'}
          </button>
        </div>

        <h1 className="mt-4 text-[2.2rem] leading-[2.6rem] text-gray-900">{t('login.welcome', locale)}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('login.subtitle', locale)}</p>

        <form onSubmit={onSubmit} className="mt-9 space-y-4">
          <div>
            <label className="mb-2 block text-[1.12rem] text-gray-900">{t('login.email', locale)}</label>
            <input
              type="email"
              placeholder={t('login.emailPlaceholder', locale)}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`h-14 w-full rounded-lg border bg-[#F3F3F3] px-4 text-lg outline-none ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[var(--brand-primary)]'}`}
            />
            {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-[1.12rem] text-gray-900">{t('login.password', locale)}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder', locale)}
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

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-14 w-full rounded-full bg-[var(--brand-primary)] text-white text-[1.25rem] disabled:opacity-60"
          >
            {loading ? t('login.loading', locale) : t('login.submit', locale)}
          </button>

          <button
            type="button"
            onClick={() => router.push('/register')}
            className="h-14 w-full rounded-full border-2 border-[var(--brand-primary)] bg-transparent text-[var(--brand-primary)] text-[1.25rem]"
          >
            {t('login.register', locale)}
          </button>
        </form>

      </div>
    </main>
  );
}
