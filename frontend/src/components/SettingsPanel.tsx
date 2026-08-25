"use client";

import { FormEvent, useEffect, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { api } from "@/lib/api";
import { CASHY_AVATARS, DEFAULT_CASHY_AVATAR } from "@/lib/cashy";
import { normalizeLocale, type Locale } from "@/lib/i18n";

type SettingsPanelProps = {
  onSaved?: () => void;
  compact?: boolean;
};

export default function SettingsPanel({ onSaved, compact = false }: SettingsPanelProps) {
  const { t, setLocale: applyLocale } = useLocale();
  const [botName, setBotName] = useState("Cashy");
  const [locale, setLocale] = useState<Locale>("es");
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_CASHY_AVATAR);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then((settings) => {
      setBotName(settings.bot_name || "Cashy");
      setLocale(normalizeLocale(settings.locale));
      setAvatarUrl(settings.bot_avatar_url || DEFAULT_CASHY_AVATAR);
      setLoading(false);
    });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.updateSettings({
        bot_name: botName,
        bot_avatar_url: avatarUrl,
        locale,
      });
      applyLocale(locale);
      setMessage(t("common.saved"));
      onSaved?.();
      window.dispatchEvent(new CustomEvent("cashy-settings-updated"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{t("common.loading")}</p>;
  }

  return (
    <form className={`space-y-5 ${compact ? "" : "max-w-2xl"}`} onSubmit={onSubmit}>
      <div className="flex items-center gap-4">
        <CashyAvatar src={avatarUrl} size={compact ? 64 : 80} />
        <div>
          <p className="font-medium text-slate-800">{botName}</p>
          <p className="text-sm text-muted">{t("settings.preview")}</p>
        </div>
      </div>

      <div>
        <label className="mb-3 block text-sm text-muted">{t("settings.chooseCashy")}</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {CASHY_AVATARS.map((avatar) => {
            const selected = avatarUrl === avatar.path;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarUrl(avatar.path)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                    : "border-emerald-100 bg-white hover:border-emerald-200"
                }`}
              >
                <div className="flex justify-center">
                  <CashyAvatar
                    src={avatar.path}
                    size={96}
                    className={selected ? "border-brand-500" : "border-emerald-200"}
                  />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">{avatar.name}</p>
                <p className="mt-1 text-xs text-muted">{avatar.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">{t("settings.botName")}</label>
        <input className="input-field" value={botName} onChange={(e) => setBotName(e.target.value)} />
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">{t("settings.language")}</label>
        <select
          className="input-field"
          value={locale}
          onChange={(e) => setLocale(normalizeLocale(e.target.value))}
        >
          <option value="es">{t("settings.spanish")}</option>
          <option value="en">{t("settings.english")}</option>
        </select>
      </div>

      <button className="btn-primary w-full sm:w-auto" type="submit">
        {t("common.save")}
      </button>
      {message ? <p className="text-sm font-medium text-brand-600">{message}</p> : null}
    </form>
  );
}
