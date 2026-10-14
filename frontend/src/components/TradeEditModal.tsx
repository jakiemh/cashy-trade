"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatMoney, formatPct } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import {
  AccountType,
  api,
  formatOptionLabel,
  OptionSide,
  OptionType,
  previewTradePnl,
  Trade,
} from "@/lib/api";

type TradeEditModalProps = {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateValue(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function TradeEditModal({ trade, open, onClose, onSuccess }: TradeEditModalProps) {
  const { t } = useLocale();
  const [entryPrice, setEntryPrice] = useState("");
  const [entryQty, setEntryQty] = useState("");
  const [optionType, setOptionType] = useState<OptionType>("call");
  const [optionSide, setOptionSide] = useState<OptionSide>("long");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [exitAt, setExitAt] = useState("");
  const [exitReason, setExitReason] = useState("manual");
  const [notes, setNotes] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("real");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trade || !open) return;
    setEntryPrice(String(trade.entry_price));
    setEntryQty(String(trade.entry_qty));
    setOptionType((trade.option_type as OptionType) || "call");
    setOptionSide((trade.option_side as OptionSide) || "long");
    setStrike(trade.strike != null ? String(trade.strike) : "");
    setExpiration(toDateValue(trade.expiration));
    setStopLoss(trade.stop_loss != null ? String(trade.stop_loss) : "");
    setTakeProfit(trade.take_profit != null ? String(trade.take_profit) : "");
    setExitPrice(trade.exit_price != null ? String(trade.exit_price) : "");
    setExitAt(toDatetimeLocalValue(trade.exit_at));
    setExitReason(trade.exit_reason || "manual");
    setNotes(trade.notes || "");
    setAccountType(trade.account_type || "real");
    setError("");
  }, [trade, open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trade) return;
    setSaving(true);
    setError("");
    try {
      const isOption = trade.instrument_type === "option";
      const payload: Record<string, unknown> = {
        entry_price: Number(entryPrice),
        entry_qty: Number(entryQty),
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
        notes: notes || null,
        account_type: accountType,
      };
      if (isOption) {
        payload.option_type = optionType;
        payload.option_side = optionSide;
        payload.strike = Number(strike);
        payload.expiration = expiration;
      }
      if (trade.status === "closed") {
        payload.exit_price = Number(exitPrice);
        payload.exit_reason = exitReason;
        if (exitAt) payload.exit_at = new Date(exitAt).toISOString();
      }
      await api.updateTrade(trade.id, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!trade) return null;

  const isOption = trade.instrument_type === "option";
  const title = isOption ? formatOptionLabel(trade) : trade.symbol;
  const qtyLabel = isOption ? t("trade.contracts") : t("journal.shares");
  const priceLabel = isOption ? t("trade.buyPrice") : t("journal.entry");

  const preview =
    trade.status === "closed" && exitPrice && entryPrice
      ? previewTradePnl(Number(entryPrice), Number(entryQty || trade.entry_qty), Number(exitPrice), {
          instrument_type: trade.instrument_type,
          option_side: isOption ? optionSide : trade.option_side,
          contract_multiplier: trade.contract_multiplier,
        })
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("journal.editTrade")} — ${title}`}
      subtitle={trade.status === "closed" ? t("journal.editClosedHint") : t("journal.editOpenHint")}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm text-muted">{t("trade.accountType")}</label>
          <select
            className="input-field"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
          >
            <option value="real">{t("trade.accountReal")}</option>
            <option value="paper">{t("trade.accountPaper")}</option>
          </select>
        </div>

        {isOption ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-muted">{t("trade.optionType")}</label>
              <select
                className="input-field"
                value={optionType}
                onChange={(e) => setOptionType(e.target.value as OptionType)}
              >
                <option value="call">{t("trade.call")}</option>
                <option value="put">{t("trade.put")}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-muted">{t("trade.optionSide")}</label>
              <select
                className="input-field"
                value={optionSide}
                onChange={(e) => setOptionSide(e.target.value as OptionSide)}
              >
                <option value="long">{t("trade.sideLong")}</option>
                <option value="short">{t("trade.sideShort")}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-muted">{t("trade.strike")}</label>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="any"
                required
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-muted">{t("trade.expiration")}</label>
              <input
                className="input-field"
                type="date"
                required
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-muted">{priceLabel}</label>
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
            <label className="mb-2 block text-sm text-muted">{qtyLabel}</label>
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
          {!isOption ? (
            <>
              <div>
                <label className="mb-2 block text-sm text-muted">{t("journal.stop")}</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted">{t("journal.target")}</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        {trade.status === "closed" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-muted">
                  {isOption ? t("trade.sellPrice") : t("trade.exitPrice")}
                </label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
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
            <div>
              <label className="mb-2 block text-sm text-muted">{t("journal.exit")}</label>
              <input
                className="input-field"
                type="datetime-local"
                value={exitAt}
                onChange={(e) => setExitAt(e.target.value)}
              />
            </div>
            {preview ? (
              <p className="text-sm text-slate-700">
                {t("trade.estimatedPnl")}: {formatMoney(preview.pnl_usd)} ({formatPct(preview.pnl_pct)})
              </p>
            ) : null}
          </>
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
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? t("trade.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
