"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatMoney } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { api, Signal } from "@/lib/api";

type TradeEntryModalProps = {
  signal: Signal | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TradeEntryModal({ signal, open, onClose, onSuccess }: TradeEntryModalProps) {
  const { t } = useLocale();
  const [entryQty, setEntryQty] = useState("10");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!signal || !open) return;
    setEntryQty("10");
    setEntryPrice(signal.entry_price != null ? String(signal.entry_price) : "");
    setStopLoss(signal.stop_loss != null ? String(signal.stop_loss) : "");
    setTakeProfit(signal.take_profit != null ? String(signal.take_profit) : "");
    setNotes("");
    setError("");
  }, [signal, open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!signal) return;
    setSaving(true);
    setError("");
    try {
      await api.createTrade({
        signal_id: signal.id,
        symbol: signal.symbol,
        strategy: signal.strategy,
        setup_name: signal.setup_name,
        entry_price: Number(entryPrice),
        entry_qty: Number(entryQty),
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
        notes: notes || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar trade");
    } finally {
      setSaving(false);
    }
  }

  if (!signal) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("trade.registerTitle")} — ${signal.symbol}`}
      subtitle={signal.setup_name || signal.strategy || signal.type}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-slate-700">
          <p>
            {t("trade.signalHint", {
              entry: formatMoney(signal.entry_price),
              stop: formatMoney(signal.stop_loss),
              target: formatMoney(signal.take_profit),
            })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.shares")}</label>
            <input
              className="input-field"
              type="number"
              min="0.0001"
              step="any"
              required
              value={entryQty}
              onChange={(e) => setEntryQty(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.entryPrice")}</label>
            <input
              className="input-field"
              type="number"
              min="0.0001"
              step="any"
              required
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.stopLoss")}</label>
            <input
              className="input-field"
              type="number"
              min="0.0001"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.takeProfit")}</label>
            <input
              className="input-field"
              type="number"
              min="0.0001"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">{t("trade.notesOptional")}</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. entré un poco tarde, sl movido..."
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? t("trade.saving") : t("trade.registerSubmit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
