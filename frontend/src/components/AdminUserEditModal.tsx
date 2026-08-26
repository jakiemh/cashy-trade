"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { useLocale } from "@/contexts/LocaleContext";
import { AdminUser, api } from "@/lib/api";

type AdminUserEditModalProps = {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
};

export default function AdminUserEditModal({
  user,
  open,
  onClose,
  onSuccess,
}: AdminUserEditModalProps) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("es");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setName(user.name || "");
    setLocale(user.locale || "es");
    setIsAdmin(user.is_admin);
    setError("");
  }, [user, open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateAdminUser(user.id, {
        name: name.trim(),
        locale,
        is_admin: isAdmin,
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("admin.editUserTitle")}
      subtitle={user.email}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("auth.name")}</span>
          <input
            type="text"
            className="input w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("settings.language")}</span>
          <select
            className="input w-full"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            <option value="es">{t("settings.spanish")}</option>
            <option value="en">{t("settings.english")}</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(event) => setIsAdmin(event.target.checked)}
            className="h-4 w-4 rounded border-emerald-200 text-emerald-600"
          />
          {t("admin.isAdmin")}
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "..." : t("admin.saveUser")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
