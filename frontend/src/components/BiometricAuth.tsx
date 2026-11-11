"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { api, type WebAuthnCredentialInfo } from "@/lib/api";
import {
  clearBiometricLocal,
  dismissBiometricPrompt,
  isBiometricAvailable,
  registerBiometric,
  storedCredentialId,
  syncStoredCredential,
  webauthnErrorKey,
} from "@/lib/webauthn";

function formatWhen(value: string, locale: string) {
  const hasZone = /[zZ]|[+-]\d\d:\d\d$/.test(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(hasZone ? value : `${value}Z`)
  );
}

export function BiometricOffer({ onContinue }: { onContinue: () => void }) {
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enable() {
    setLoading(true);
    setError("");
    try {
      await registerBiometric();
      onContinue();
    } catch (err) {
      setError(t(webauthnErrorKey(err)));
      setLoading(false);
    }
  }

  function skip() {
    dismissBiometricPrompt();
    onContinue();
  }

  return (
    <div className="mt-8 space-y-4 text-center">
      <h2 className="text-lg font-semibold text-slate-800">{t("auth.biometricPromptTitle")}</h2>
      <p className="text-sm text-muted">{t("auth.biometricPromptBody")}</p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button className="btn-primary w-full py-3" disabled={loading} type="button" onClick={enable}>
        {loading ? t("auth.biometricEnabling") : t("auth.biometricEnable")}
      </button>
      <button className="btn-secondary w-full py-3" disabled={loading} type="button" onClick={skip}>
        {t("auth.biometricNotNow")}
      </button>
    </div>
  );
}

export function BiometricSettings() {
  const { locale, t } = useLocale();
  const [available, setAvailable] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const localId = storedCredentialId();

  async function refresh() {
    const [supported, rows] = await Promise.all([
      isBiometricAvailable(),
      api.webauthnCredentials().catch(() => [] as WebAuthnCredentialInfo[]),
    ]);
    syncStoredCredential(rows.map((row) => row.credential_id));
    setAvailable(supported);
    setCredentials(rows);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await registerBiometric();
      await refresh();
      setMessage(t("common.saved"));
    } catch (err) {
      setError(t(webauthnErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: WebAuthnCredentialInfo) {
    const label = row.credential_id === localId ? t("settings.biometricThisDevice") : row.label;
    if (!window.confirm(t("settings.biometricRemoveConfirm", { label }))) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.webauthnDeleteCredential(row.id);
      clearBiometricLocal(row.credential_id);
      await refresh();
      setMessage(t("common.saved"));
    } catch (err) {
      setError(t(webauthnErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-3 border-t border-emerald-100 pt-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{t("settings.biometricTitle")}</h2>
        <p className="mt-1 text-xs text-muted">{t("settings.biometricHint")}</p>
      </div>
      {loading ? <p className="text-sm text-muted">{t("common.loading")}</p> : null}
      {!loading && !available ? <p className="text-sm text-muted">{t("settings.biometricUnavailable")}</p> : null}
      {!loading && available && credentials.length === 0 ? (
        <p className="text-sm text-muted">{t("settings.biometricNone")}</p>
      ) : null}
      {credentials.map((row) => {
        const onThisDevice = row.credential_id === storedCredentialId();
        const when = row.last_used_at || row.created_at;
        const whenLabel = row.last_used_at ? "settings.biometricLastUsed" : "settings.biometricAdded";
        return (
          <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {onThisDevice ? t("settings.biometricThisDevice") : row.label}
              </p>
              <p className="text-xs text-muted">{t(whenLabel, { when: formatWhen(when, locale) })}</p>
            </div>
            <button className="btn-secondary px-3 py-1.5" disabled={busy} type="button" onClick={() => remove(row)}>
              {t("settings.biometricRemove")}
            </button>
          </div>
        );
      })}
      {available && !credentials.some((row) => row.credential_id === storedCredentialId()) ? (
        <button className="btn-secondary w-full sm:w-auto" disabled={busy} type="button" onClick={enable}>
          {busy ? t("settings.biometricEnabling") : t("settings.biometricEnable")}
        </button>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-brand-600">{message}</p> : null}
    </section>
  );
}
