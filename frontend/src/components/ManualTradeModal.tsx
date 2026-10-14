"use client";

import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatMoney } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";
import { AccountType, api, OptionType } from "@/lib/api";
import { datetimeLocalToIso, nowDatetimeLocal } from "@/lib/datetimeLocal";

const ACCOUNT_TYPE_STORAGE_KEY = "cashy_account_type";

function getStoredAccountType(): AccountType {
  if (typeof window === "undefined") return "real";
  return localStorage.getItem(ACCOUNT_TYPE_STORAGE_KEY) === "paper" ? "paper" : "real";
}

type ManualTradeModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ManualTradeModal({ open, onClose, onSuccess }: ManualTradeModalProps) {
  const { t } = useLocale();
  const [symbol, setSymbol] = useState("");
  const [optionType, setOptionType] = useState<OptionType>("call");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState("");
  const [contracts, setContracts] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [entryAt, setEntryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("real");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymbol("");
    setOptionType("call");
    setStrike("");
    setExpiration("");
    setContracts("1");
    setEntryPrice("");
    setEntryAt(nowDatetimeLocal());
    setNotes("");
    setAccountType(getStoredAccountType());
    setError("");
  }, [open]);

  const debit =
    entryPrice && contracts
      ? Number(entryPrice) * Number(contracts) * 100
      : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createTrade({
        symbol: symbol.trim().toUpperCase(),
        instrument_type: "option",
        option_type: optionType,
        option_side: "long",
        strike: Number(strike),
        expiration,
        contract_multiplier: 100,
        entry_price: Number(entryPrice),
        entry_qty: Number(contracts),
        entry_at: entryAt ? datetimeLocalToIso(entryAt) : null,
        strategy: "Bollinger",
        setup_name: "Manual options",
        notes: notes.trim() || null,
        account_type: accountType,
      });
      localStorage.setItem(ACCOUNT_TYPE_STORAGE_KEY, accountType);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("trade.manualTitle")}
      subtitle={t("trade.manualSubtitle")}
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

        <div>
          <label className="mb-2 block text-sm text-muted">{t("trade.entryAt")}</label>
          <input
            className="input-field"
            type="datetime-local"
            required
            value={entryAt}
            onChange={(e) => setEntryAt(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.underlying")}</label>
            <input
              className="input-field"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="SPY"
              autoFocus
            />
          </div>
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
            <label className="mb-2 block text-sm text-muted">{t("trade.contracts")}</label>
            <input
              className="input-field"
              type="number"
              min="1"
              step="1"
              required
              value={contracts}
              onChange={(e) => setContracts(e.target.value)}
            />
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
              placeholder="450"
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
          <div>
            <label className="mb-2 block text-sm text-muted">{t("trade.buyPrice")}</label>
            <input
              className="input-field"
              type="number"
              min="0.0001"
              step="any"
              required
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="2.50"
            />
          </div>
        </div>

        {debit != null && !Number.isNaN(debit) ? (
          <p className="text-sm text-slate-700">
            {t("trade.optionDebit")}: {formatMoney(debit)}
          </p>
        ) : null}

        <div>
          <label className="mb-2 block text-sm text-muted">{t("trade.notesOptional")}</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("trade.manualNotesPlaceholder")}
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
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
