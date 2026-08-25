"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { api } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen flex items-center justify-center bg-app-gradient">
      <div className="glass-card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <CashyAvatar src={DEFAULT_CASHY_AVATAR} size={96} />
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">{t("auth.forgotTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("auth.forgotSubtitle")}</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <input
            className="input-field"
            placeholder={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          <button className="btn-primary w-full py-3" disabled={loading} type="submit">
            {loading ? t("auth.sendingReset") : t("auth.sendResetLink")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link className="font-medium text-brand-600 hover:underline" href="/login">
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
