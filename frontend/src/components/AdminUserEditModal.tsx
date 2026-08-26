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
  onDelete: (userId: number) => void;
};

export default function AdminUserEditModal({
  user,
  open,
  onClose,
  onSuccess,
  onDelete,
}: AdminUserEditModalProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState("es");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setEmail(user.email);
    setName(user.name || "");
    setPassword("");
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
      const payload: {
        email: string;
        name: string;
        locale: string;
        is_admin: boolean;
        password?: string;
      } = {
        email: email.trim(),
        name: name.trim(),
        locale,
        is_admin: isAdmin,
      };
      if (password.trim()) {
        payload.password = password;
      }
      const updated = await api.updateAdminUser(user.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    const ok = window.confirm(t("admin.deleteUserConfirm", { email: user.email }));
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteAdminUser(user.id);
      onDelete(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  const busy = saving || deleting;

  return (
    <Modal open={open} onClose={onClose} title={t("admin.editUserTitle")} subtitle={user.email}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">{t("auth.email")}</span>
          <input
            type="email"
            className="input w-full"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

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
          <span className="mb-1 block text-muted">{t("auth.password")}</span>
          <input
            type="password"
            className="input w-full"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("admin.passwordHint")}
            minLength={8}
            autoComplete="new-password"
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-4">
          <button
            type="button"
            className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            onClick={handleDelete}
            disabled={busy}
          >
            {deleting ? "..." : t("admin.deleteUser")}
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {saving ? "..." : t("admin.saveUser")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
