"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatMoney, formatPct } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, formatOptionLabel, previewTradePnl, Trade } from "@/lib/api";

type TradeExitDefaults = {
  exit_price?: number | null;
  exit_reason?: string | null;
};

type TradeExitModalProps = {
  trade: Trade | null;
  defaults?: TradeExitDefaults;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TradeExitModal({
  trade,
  defaults,
  open,
  onClose,
  onSuccess,
}: TradeExitModalProps) {
  const { t } = useLocale();
  const [exitPrice, setExitPrice] = useState("");
  const [exitReason, setExitReason] = useState("manual");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trade || !open) return;
    const suggested =
      defaults?.exit_price != null
        ? String(defaults.exit_price)
        : trade.entry_price != null
          ? String(trade.entry_price)
          : "";
    setExitPrice(suggested);
    setExitReason(defaults?.exit_price != null ? "signal" : "manual");
    setNotes(defaults?.exit_reason && defaults.exit_price != null ? defaults.exit_reason : "");
    setError("");
  }, [trade, defaults, open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trade) return;
    setSaving(true);
    setError("");
    try {
      await api.closeTrade(trade.id, {
        exit_price: Number(exitPrice),
        exit_reason: exitReason,
        notes: notes || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cerrar trade");
    } finally {
      setSaving(false);
    }
  }

  if (!trade) return null;

  const isOption = trade.instrument_type === "option";
  const title = isOption ? formatOptionLabel(trade) : trade.symbol;
  const qtyUnit = isOption ? t("journal.contracts") : t("journal.shares");
  const exitLabel = isOption ? t("trade.sellPrice") : t("trade.exitPrice");
  const entryLabel = isOption ? t("journal.premium") : t("journal.entry");

  const preview =
    exitPrice && trade.entry_price
      ? previewTradePnl(trade.entry_price, trade.entry_qty, Number(exitPrice), {
          instrument_type: trade.instrument_type,
          option_side: trade.option_side,
          contract_multiplier: trade.contract_multiplier,
        })
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("trade.closeTitle")} — ${title}`}
      subtitle={`${entryLabel} ${formatMoney(trade.entry_price)} x ${trade.entry_qty} ${qtyUnit}`}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {defaults?.exit_price != null ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-slate-700">
            <p>{t("trade.cierreHint", { price: formatMoney(defaults.exit_price) })}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-muted">{exitLabel}</label>
            <input
              className="input-field"
              type="number"
              min="0"
              step="any"
              required
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder={isOption ? "3.20" : undefined}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.exitReason")}</label>
            <select
              className="input-field"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
            >
              <option value="manual">{t("trade.reasonManual")}</option>
              <option value="stop">{t("trade.reasonStop")}</option>
              <option value="target">{t("trade.reasonTarget")}</option>
              <option value="signal">{t("trade.reasonSignal")}</option>
              <option value="other">{t("trade.reasonOther")}</option>
            </select>
          </div>
        </div>

        {preview ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              {t("trade.estimatedPnl")}:{" "}
              <span className={preview.pnl_usd >= 0 ? "text-emerald-700" : "text-rose-700"}>
                {formatMoney(preview.pnl_usd)} ({formatPct(preview.pnl_pct)})
              </span>
            </p>
            {isOption ? (
              <p className="mt-1 text-xs text-muted">{t("trade.optionPnlFormula")}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm text-muted">{t("trade.notesOptional")}</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? t("trade.saving") : t("trade.closeSubmit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
