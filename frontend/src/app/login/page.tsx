"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { api, setToken } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      router.push("/dashboard");
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
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">{t("app.title")}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("auth.loginSubtitle")}</p>
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
          <input
            className="input-field"
            placeholder={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="text-right">
            <Link className="text-sm font-medium text-brand-600 hover:underline" href="/forgot-password">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <button className="btn-primary w-full py-3" disabled={loading} type="submit">
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.noAccount")}{" "}
          <Link className="font-medium text-brand-600 hover:underline" href="/register">
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
