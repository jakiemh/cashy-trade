"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { api } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.resetPassword(token, password);
      setMessage(result.message);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-8 text-center text-sm text-rose-600">
        {t("auth.resetInvalidLink")}{" "}
        <Link className="font-medium text-brand-600 hover:underline" href="/forgot-password">
          {t("auth.sendResetLink")}
        </Link>
      </p>
    );
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <input
        className="input-field"
        placeholder={t("auth.newPassword")}
        type="password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <input
        className="input-field"
        placeholder={t("auth.confirmPassword")}
        type="password"
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button className="btn-primary w-full py-3" disabled={loading} type="submit">
        {loading ? t("auth.resetting") : t("auth.resetPassword")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLocale();

  return (
    <div className="auth-screen flex items-center justify-center bg-app-gradient">
      <div className="glass-card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <CashyAvatar src={DEFAULT_CASHY_AVATAR} size={96} />
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">{t("auth.resetTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("auth.resetSubtitle")}</p>
        </div>
        <Suspense fallback={<p className="mt-8 text-center text-sm text-muted">{t("common.loading")}</p>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted">
          <Link className="font-medium text-brand-600 hover:underline" href="/login">
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
