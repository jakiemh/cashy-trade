"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { api, setToken } from "@/lib/api";
import { CASHY_AVATARS } from "@/lib/cashy";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { access_token } = await api.register(email, password, name);
      setToken(access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-app-gradient px-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <CashyAvatar src={CASHY_AVATARS[1].path} size={96} />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">{t("app.title")}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800">{t("auth.registerTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("auth.registerSubtitle")}</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <input
            className="input-field"
            placeholder={t("auth.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button className="btn-primary w-full py-3" disabled={loading} type="submit">
            {loading ? t("auth.registering") : t("auth.register")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {t("auth.hasAccount")}{" "}
          <Link className="font-medium text-brand-600 hover:underline" href="/login">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
