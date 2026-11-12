"use client";
import { useState } from "react";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { Field, Sheet, fieldClass, primaryClass } from "./financials2/financials2-actions";
import { money } from "./financials2/financials2-data";

export function OpeningBalanceForm({ propertyId, balances, onClose, onSaved }: { propertyId: string; balances: { currency: string; balance: number; opening_set_at?: string }[]; onClose: () => void; onSaved: () => void }) {
  const [currency, setCurrency] = useState("LKR"), [amount, setAmount] = useState(""), [note, setNote] = useState(""), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const existing = balances.find(b => b.currency === currency), alreadySet = Boolean(existing?.opening_set_at);
  return <Sheet title="Set opening balance" subtitle="Owner setup - once per property and currency." onClose={() => { if (!busy) onClose(); }}><form className="space-y-5" onSubmit={async e => { e.preventDefault(); if (busy || alreadySet || !confirmed) return; setBusy(true); try { await api.post("/money-requests/funds/opening", { property_id: propertyId, currency, amount: Number(amount), note: note.trim(), confirmed_before_recorded_movements: confirmed }); onSaved(); } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); } }}>
    <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">Enter hotel cash/bank funds held before the payments and spending already recorded in this PMS. Do not enter today's total bank balance if it already includes those payments - that would count them twice.</p>
    <Field label="Currency"><input required pattern="[A-Z]{3}" maxLength={3} value={currency} onChange={e => { setCurrency(e.target.value.toUpperCase()); setConfirmed(false); }} disabled={busy} className={fieldClass} /></Field>
    {alreadySet ? <p role="alert" className="rounded-xl border border-line p-4 text-sm">An opening balance for {currency} has already been set. It cannot be added twice.</p> : <><Field label="Opening amount"><input required type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} className={fieldClass} /></Field><Field label="Opening balance note"><textarea required minLength={5} maxLength={1000} placeholder="Where this opening amount came from" value={note} onChange={e => setNote(e.target.value)} disabled={busy} className={fieldClass} /></Field>
      {amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0 && <div className="space-y-2 rounded-xl border border-line p-4 text-sm"><p>Existing recorded movements: {money(existing?.balance || 0, currency)}</p><p>Opening amount: {money(Number(amount), currency)}</p><p className="font-bold">Balance after setup: {money((existing?.balance || 0) + Number(amount), currency)}</p></div>}
      <label className="flex items-start gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />I confirm this opening amount is before the existing recorded movements. It will be added once and is not a guest payment or revenue.</label>
    </>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={busy || alreadySet || !confirmed || amount === "" || Number(amount) < 0 || note.trim().length < 5} className={primaryClass}>{busy ? "Saving…" : "Save opening balance"}</button>
  </form></Sheet>;
}
