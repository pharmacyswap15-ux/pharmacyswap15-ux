"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Database,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Store,
} from "lucide-react";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { cn } from "@/lib/cn";

export function LoginForm({
  next,
  localMode,
  error: initialError,
}: {
  next: string;
  localMode: boolean;
  error?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const error =
    state.error ??
    (initialError === "demo" ? "تعذر الدخول بالحساب التجريبي — تحقق من بيانات القاعدة." : null);

  return (
    <div className="mx-auto w-full max-w-[1020px] px-3 py-5 sm:px-5">
      <div className="grid overflow-hidden rounded-md border border-line bg-surface lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="border-b border-line p-5 lg:border-b-0 lg:border-e">
          <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand">
            <ShieldCheck size={11} strokeWidth={2} aria-hidden />
            دخول الصيدليات المرخصة
          </p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">
            تسجيل الدخول إلى فارماسواب
          </h1>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
            أدخل بيانات حساب الصيدلية للوصول إلى السوق الحي، إدارة عروضك، ومتابعة عروض البدل
            الواردة.
          </p>

          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next} />

            <div>
              <label className="label" htmlFor="login-email">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field num pe-8 text-start"
                  placeholder="pharmacy@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="login-password">
                كلمة المرور
              </label>
              <div className="relative">
                <LockKeyhole
                  size={14}
                  className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field pe-8 ps-9"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute start-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-ink-faint hover:bg-sunken hover:text-ink"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <p className="flex items-start gap-1.5 rounded-sm border border-crimson-line bg-crimson-soft px-2.5 py-2 text-[11px] text-crimson-ink">
                <CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <LogIn size={15} strokeWidth={2} aria-hidden />
              )}
              {pending ? "جارٍ التحقق…" : "دخول الصيدلية"}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <p className="text-[10.5px] text-ink-muted">ليس لديك حساب؟</p>
            <Link href="/onboarding" className="text-[11px] font-semibold text-brand hover:underline">
              إنشاء ملف صيدلية جديد
            </Link>
          </div>

          <p className="mt-2 flex items-center gap-1 text-[9.5px] text-ink-faint">
            <Database size={10} aria-hidden />
            {localMode
              ? "الوضع المحلي — البيانات تُحفظ في مجلد .data على السيرفر."
              : "متصل بقاعدة Supabase السحابية."}
          </p>
        </div>

        <div className="bg-canvas p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
              <Store size={13} className="text-ink-muted" aria-hidden />
              الدخول إلى الحساب
            </h2>
          </div>

          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">
            {localMode
              ? "استخدم بريدك الإلكتروني وكلمة المرور المسجلة في هذا السيرفر المحلي أو أنشئ حساباً جديداً فوراً."
              : "استخدم البريد الإلكتروني وكلمة المرور الخاصة بصيدليتك المسجلة في قاعدة البيانات السحابية."}
          </p>

          <div className="mt-3 rounded-sm border border-line bg-surface p-2.5">
            <p className="text-[10px] font-semibold text-ink">ملاحظات أساسية</p>
            <ul className="mt-1 space-y-1 ps-3 text-[10px] leading-relaxed text-ink-muted">
              <li className="list-disc">يفترض النظام تسجيل جميع الصيدليات بشكل حقيقي.</li>
              <li className="list-disc">يتم حفظ بيانات السوق ضمن قاعدة الإنترنت أو قاعدة محلية وفق الإعداد.</li>
              <li className="list-disc">للاستخدام الفعلي، حدّد Supabase وبيئة Vercel بشكل صحيح.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
