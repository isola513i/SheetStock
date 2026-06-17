'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Eye, EyeOff, LockKeyhole, Phone, Store, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/toast';

type RegisterField = 'name' | 'storeName' | 'phone' | 'password';
type RegisterErrors = Partial<Record<RegisterField, string>>;

function normalizePhone(value: string) {
  return value.trim().replace(/\D/g, '');
}

function validateRegisterField(field: RegisterField, value: string): string {
  const trimmed = value.trim();
  if (field === 'name' && !trimmed) return 'กรุณากรอกชื่อ-นามสกุล';
  if (field === 'storeName' && !trimmed) return 'กรุณากรอกชื่อร้าน';
  if (field === 'phone') {
    const phone = normalizePhone(value);
    if (!phone) return 'กรุณากรอกเบอร์โทรศัพท์';
    if (!/^\d{9,10}$/.test(phone)) return 'เบอร์โทรต้องมี 9-10 หลัก';
  }
  if (field === 'password') {
    if (!value) return 'กรุณากรอกรหัสผ่าน';
    if (value.length < 6) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  }
  return '';
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const values: Record<RegisterField, string> = { name, storeName, phone, password };

  const setFieldError = (field: RegisterField, value: string) => {
    const message = validateRegisterField(field, value);
    setErrors((current) => ({ ...current, [field]: message || undefined }));
    return message;
  };

  const validateAll = () => {
    const nextErrors: RegisterErrors = {};
    (Object.keys(values) as RegisterField[]).forEach((field) => {
      const message = validateRegisterField(field, values[field]);
      if (message) nextErrors[field] = message;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!validateAll()) return;

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
        setFormError(msg);
        toast(msg, 'error');
        return;
      }
      setSuccess(true);
      toast('สมัครสมาชิกสำเร็จ', 'success');
    } finally {
      setLoading(false);
    }
  };

  const inputWrapClass = (field: RegisterField) =>
    `flex h-14 items-center rounded-2xl border bg-[var(--bg-card)] px-4 transition-[border-color,box-shadow,background-color] ${
      errors[field]
        ? 'border-[var(--status-danger)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--status-danger)_14%,transparent)]'
        : 'border-[var(--border-color)] focus-within:border-[var(--catalog-header-action)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--catalog-header-action)_18%,transparent)]'
    }`;

  if (success) {
    return (
      <main className="catalog-theme flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] px-6 text-center text-[var(--text-primary)]">
        <section className="w-full max-w-md rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-8 shadow-[0_24px_60px_-46px_rgba(41,51,92,0.5)]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--status-success)_12%,var(--bg-card))]">
            <CheckCircle className="h-10 w-10 text-[var(--status-success)]" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-[var(--catalog-header)]">สมัครสมาชิกสำเร็จ</h1>
          <p className="mb-8 text-sm leading-6 text-[var(--text-muted)]">รอการอนุมัติจาก Admin<br />ระบบจะแจ้งเตือนเมื่อบัญชีพร้อมใช้งาน</p>
          <button
            onClick={() => router.push('/login')}
            className="h-14 w-full rounded-[1.35rem] bg-[var(--catalog-header)] text-lg font-semibold text-[var(--bg-card)]"
          >
            กลับหน้าเข้าสู่ระบบ
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="catalog-theme min-h-dvh overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
      <div className="auth-shell mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:grid lg:min-h-0 lg:max-w-[1060px] lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch lg:overflow-visible lg:p-0">
        <section className="auth-hero relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#cf8610_0%,#f3a712_48%,#f6c14e_100%)] px-5 pb-20 pt-5 text-[var(--catalog-header-text)] shadow-[0_30px_60px_-36px_rgba(207,134,16,0.48)] lg:min-h-[680px] lg:rounded-l-[2.5rem] lg:rounded-r-none lg:px-8 lg:pb-8 lg:pt-8 lg:shadow-[0_32px_80px_-52px_rgba(207,134,16,0.58)]">
          <div className="absolute inset-x-10 bottom-0 h-16 rounded-t-[2rem] bg-[color:color-mix(in_oklab,var(--bg-card)_10%,transparent)]" />
          <div className="auth-orb auth-orb-a absolute right-[-2.5rem] top-[-2rem] h-32 w-32 rounded-full bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)] blur-2xl" />
          <div className="auth-orb auth-orb-b absolute left-[-3rem] top-16 h-28 w-28 rounded-full bg-[color:color-mix(in_oklab,var(--catalog-header)_18%,transparent)] blur-2xl" />
          <div className="auth-note absolute inset-x-8 bottom-8 hidden rounded-[2rem] border border-[color:color-mix(in_oklab,var(--catalog-header)_12%,var(--bg-card))] bg-[color:color-mix(in_oklab,var(--bg-card)_88%,var(--catalog-header-action))] p-5 text-sm leading-6 text-[var(--catalog-header)] shadow-[0_18px_46px_-34px_rgba(41,51,92,0.42)] lg:block">
            <p className="font-semibold text-[var(--catalog-header)]">สมัครเพื่อเข้าถึงราคาสมาชิก</p>
            <p className="mt-1 text-[color:color-mix(in_oklab,var(--catalog-header)_82%,var(--text-secondary))]">กรอกข้อมูลร้านและเบอร์โทรให้ครบ ทีมงานจะตรวจสอบและอนุมัติสิทธิ์ก่อนใช้งาน</p>
          </div>

          <div className="relative z-10 flex items-center justify-start">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--bg-card)_12%,transparent)] text-[var(--catalog-header-text)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--bg-card)_18%,transparent)]"
              aria-label="กลับ"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="auth-logo-wrap relative z-10 flex justify-center pt-14 lg:pt-24">
            <div className="flex h-36 w-36 items-center justify-center rounded-[2.25rem] bg-[color:color-mix(in_oklab,var(--bg-card)_12%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] lg:h-44 lg:w-44 lg:rounded-[2.75rem]">
              <Image src="/icons/logo.svg" alt="SheetStock logo" width={104} height={104} className="h-[6.5rem] w-[6.5rem] lg:h-32 lg:w-32" priority />
            </div>
          </div>
        </section>

        <section className="auth-panel relative z-10 -mt-12 flex-1 rounded-[2.25rem] bg-[var(--bg-card)] px-5 pb-5 pt-7 shadow-[0_24px_48px_-32px_rgba(41,51,92,0.38)] lg:-mt-0 lg:flex lg:flex-col lg:justify-center lg:rounded-l-none lg:rounded-r-[2.5rem] lg:border lg:border-l-0 lg:border-[var(--border-subtle)] lg:px-14 lg:py-12 lg:shadow-[0_32px_80px_-60px_rgba(41,51,92,0.42)]">
          <div className="auth-copy text-center lg:text-left">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--catalog-header-action)] lg:block">Member Request</p>
            <h1 className="text-[1.65rem] font-semibold leading-tight text-[var(--catalog-header)] lg:mt-2 lg:text-[2.1rem]">สมัครสมาชิก</h1>
            <p className="mx-auto mt-2 max-w-[18rem] text-[14px] leading-6 text-[var(--text-muted)] lg:mx-0 lg:max-w-[26rem] lg:text-[15px]">สมัครเพื่อดูราคาพิเศษ รอ admin อนุมัติ</p>
          </div>

          <form onSubmit={onSubmit} className="auth-form mt-6 space-y-4 lg:mt-8 lg:max-w-[30rem]">
            <div className="auth-field">
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">ชื่อ-นามสกุล</label>
              <div className={`auth-input-wrap ${inputWrapClass('name')}`}>
                <UserRound className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={name}
                  onBlur={() => setFieldError('name', name)}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) setFieldError('name', event.target.value);
                  }}
                  className="h-full w-full bg-transparent pl-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  aria-invalid={!!errors.name}
                />
              </div>
              {errors.name ? <p className="mt-1.5 text-xs text-[var(--status-danger)]">{errors.name}</p> : null}
            </div>

            <div className="auth-field">
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">ชื่อร้าน</label>
              <div className={`auth-input-wrap ${inputWrapClass('storeName')}`}>
                <Store className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="กรอกชื่อร้านค้า"
                  value={storeName}
                  onBlur={() => setFieldError('storeName', storeName)}
                  onChange={(event) => {
                    setStoreName(event.target.value);
                    if (errors.storeName) setFieldError('storeName', event.target.value);
                  }}
                  className="h-full w-full bg-transparent pl-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  aria-invalid={!!errors.storeName}
                />
              </div>
              {errors.storeName ? <p className="mt-1.5 text-xs text-[var(--status-danger)]">{errors.storeName}</p> : null}
            </div>

            <div className="auth-field">
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">เบอร์โทรศัพท์</label>
              <div className={`auth-input-wrap ${inputWrapClass('phone')}`}>
                <Phone className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="กรอกเบอร์โทร (10 หลัก)"
                  value={phone}
                  onBlur={() => setFieldError('phone', phone)}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (errors.phone) setFieldError('phone', event.target.value);
                  }}
                  className="h-full w-full bg-transparent pl-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  aria-invalid={!!errors.phone}
                />
              </div>
              {errors.phone ? <p className="mt-1.5 text-xs text-[var(--status-danger)]">{errors.phone}</p> : null}
            </div>

            <div className="auth-field">
              <label className="mb-2 block text-[13px] font-semibold text-[var(--catalog-header)]">รหัสผ่าน</label>
              <div className={`auth-input-wrap ${inputWrapClass('password')}`}>
                <LockKeyhole className="h-4.5 w-4.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onBlur={() => setFieldError('password', password)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setFieldError('password', event.target.value);
                  }}
                  className="h-full w-full bg-transparent pl-3 pr-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  aria-invalid={!!errors.password}
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
              {errors.password ? <p className="mt-1.5 text-xs text-[var(--status-danger)]">{errors.password}</p> : null}
            </div>

            {formError ? (
              <div className="rounded-2xl border border-[color:color-mix(in_oklab,var(--catalog-emphasis)_20%,var(--border-color))] bg-[color:color-mix(in_oklab,var(--catalog-emphasis)_8%,var(--bg-card))] px-4 py-3 text-sm text-[var(--catalog-emphasis)]">
                {formError}
              </div>
            ) : null}

            <div className="auth-actions space-y-3 pt-1 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-3 lg:space-y-0 lg:pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-[1.35rem] bg-[linear-gradient(90deg,#d88d11_0%,#f3a712_52%,#f6bc41_100%)] text-[1.08rem] font-semibold text-white shadow-[0_18px_30px_-20px_rgba(243,167,18,0.9)] transition-[transform,filter,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[0_22px_34px_-20px_rgba(243,167,18,0.95)] active:translate-y-0 disabled:opacity-60"
              >
                {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex h-14 w-full items-center justify-center rounded-[1.35rem] border border-[color:color-mix(in_oklab,var(--catalog-header)_16%,var(--border-color))] bg-[var(--bg-card)] text-[1.08rem] font-semibold text-[var(--catalog-header)] transition-[background-color,border-color,color] hover:border-[var(--catalog-header-action)] hover:bg-[var(--brand-primary-soft)]"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
