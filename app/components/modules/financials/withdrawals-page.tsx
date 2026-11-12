"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { usePropertyAccess } from "@/app/components/property-access-gate";
import { DateRangeFilter } from "./date-range-filter";
import {
  type Withdrawal,
  type WithdrawalAuditLog,
  type WithdrawalPaymentMethod,
  type WithdrawalSourceAccount,
  type WithdrawalStatus,
  type WithdrawalRecipient,
  listWithdrawalRecipients,
  createWithdrawal,
  completeWithdrawal,
  getWithdrawal,
  getWithdrawalApiErrorMessage,
  listWithdrawals,
  voidWithdrawal
} from "@/app/lib/withdrawals-api";

type Props = {
  propertyId: string;
  setToast: (message: string) => void;
  initialReference?: string;
};

const sourceAccounts: Array<{ value: WithdrawalSourceAccount; label: string }> = [
  { value: "cash_on_hand", label: "Cash on hand" },
  { value: "petty_cash", label: "Petty cash" },
  { value: "main_bank_account", label: "Main bank account" },
  { value: "other", label: "Other" }
];
const paymentMethods: Array<{ value: WithdrawalPaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" }
];

export function WithdrawalsPage({ propertyId, setToast, initialReference = "" }: Props) {
  const role = usePropertyAccess().role;
  const finance = ["administrator", "finance"].includes(role || "");
  const canApprove = role === "owner";
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totals, setTotals] = useState<Array<{ currency: string; amount: number; count: number }>>([]);
  const [search, setSearch] = useState(initialReference);
  const [status, setStatus] = useState<WithdrawalStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<{ withdrawal: Withdrawal; logs: WithdrawalAuditLog[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setWithdrawals([]);
    setTotals([]);
    try {
      const response = await listWithdrawals(propertyId, { search: search.trim(), status, dateFrom, dateTo, limit: 100 });
      setWithdrawals(response.withdrawals);
      setTotals(response.totals);
    } catch (error) {
      setToast(getWithdrawalApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, propertyId, search, setToast, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openDetails(id: string) {
    try {
      setSelected(await getWithdrawal(propertyId, id));
    } catch (error) {
      setToast(getWithdrawalApiErrorMessage(error));
    }
  }

  async function handleComplete(withdrawal: Withdrawal, note: string, date: string) {
    try { const response = await completeWithdrawal(propertyId, withdrawal, note, new Date(date).toISOString()); setToast(response.message); setSelected(null); await load(); }
    catch (failure) { setToast(getWithdrawalApiErrorMessage(failure)); throw failure; }
  }

  async function handleVoid(withdrawal: Withdrawal) {
    const reason = window.prompt(`Why are you voiding ${withdrawal.withdrawal_no}?`);
    if (!reason?.trim()) return;
    try {
      const response = await voidWithdrawal(propertyId, withdrawal._id, reason.trim());
      setToast(response.message);
      setSelected(null);
      await load();
    } catch (error) {
      setToast(getWithdrawalApiErrorMessage(error));
    }
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="mt-1 text-sm text-slate-500">{finance ? "Prepare a withdrawal request for Owner approval. Pending requests do not post money." : "Review pending requests or record completed withdrawals. Approve only after money has actually been received."}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        {(finance || canApprove) && <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">
          <Plus size={16} /> {finance ? "Request Withdrawal" : "Record Withdrawal"}
        </button>}
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Completed withdrawals" value={String(totals.reduce((sum, item) => sum + item.count, 0))} />
      <SummaryCard label="Total money withdrawn" value={totals.length ? totals.map((item) => money(item.amount, item.currency)).join(" · ") : "LKR 0.00"} />
      <SummaryCard label="Records shown" value={String(withdrawals.length)} />
    </div>

    <div className="flex flex-wrap gap-3">
      <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-md border border-line bg-white px-3">
        <Search size={17} className="text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search number, recipient, reason or reference..." className="w-full bg-transparent py-3 outline-none" />
      </label>
      <select value={status} onChange={(event) => setStatus(event.target.value as WithdrawalStatus | "all")} className="rounded-md border border-line bg-white px-4 py-3">
        <option value="all">All statuses</option>
        <option value="pending">Pending approval</option>
        <option value="completed">Completed</option>
        <option value="voided">Voided</option>
      </select>
    </div>
    <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} disabled={loading} />

    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead><tr className="border-b border-line bg-slate-50 text-slate-500">
            {['Withdrawal No', 'Money received', 'Recipient', 'Reason', 'Source', 'Method', 'Amount', 'Recorded by', 'Status', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
          </tr></thead>
          <tbody>
            {!loading && withdrawals.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">No withdrawals found.</td></tr>}
            {withdrawals.map((withdrawal) => <tr key={withdrawal._id} className="border-b border-line last:border-0 hover:bg-slate-50">
              <td className="px-4 py-4 font-semibold">{withdrawal.withdrawal_no}</td>
              <td className="px-4 py-4">{withdrawal.status === "pending" ? "Awaiting approval" : dateTime(withdrawal.money_received_at)}</td>
              <td className="px-4 py-4">{withdrawal.paid_to}{withdrawal.recipient_role && <span className="mt-1 block text-xs text-slate-500">{recipientRoleLabel(withdrawal.recipient_role)}</span>}</td>
              <td className="max-w-[280px] px-4 py-4"><span className="line-clamp-2">{withdrawal.reason}</span></td>
              <td className="px-4 py-4">{label(withdrawal.source_account)}</td>
              <td className="px-4 py-4">{label(withdrawal.payment_method)}</td>
              <td className={`px-4 py-4 font-semibold ${withdrawal.status === "voided" ? "line-through text-slate-400" : ""}`}>{money(withdrawal.amount, withdrawal.currency)}</td>
              <td className="px-4 py-4">{withdrawal.recorded_by?.name || "System"}</td>
              <td className="px-4 py-4"><StatusBadge status={withdrawal.status} /></td>
              <td className="px-4 py-4"><button type="button" onClick={() => void openDetails(withdrawal._id)} className="inline-flex items-center gap-1 font-semibold text-indigo-600"><Eye size={16} /> View</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {showCreate && <CreateWithdrawalDialog propertyId={propertyId} onClose={() => setShowCreate(false)} onCreated={async (message) => { setShowCreate(false); setToast(message); await load(); }} setToast={setToast} />}
    {selected && <WithdrawalDetails details={selected} onClose={() => setSelected(null)} onVoid={() => void handleVoid(selected.withdrawal)} onComplete={handleComplete} canApprove={canApprove} />}
  </div>;
}

function CreateWithdrawalDialog({ propertyId, onClose, onCreated, setToast }: Props & { onClose: () => void; onCreated: (message: string) => Promise<void> }) {
  const finance = ["administrator", "finance"].includes(usePropertyAccess().role || "");
  const [recipients, setRecipients] = useState<WithdrawalRecipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientError, setRecipientError] = useState("");
  const [recipientAttempt, setRecipientAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadingRecipients(true); setRecipientError(""); setRecipients([]); setRecipientId("");
    void listWithdrawalRecipients(propertyId).then(values => { if (active) setRecipients(values); })
      .catch(error => { if (active) setRecipientError(getWithdrawalApiErrorMessage(error)); })
      .finally(() => { if (active) setLoadingRecipients(false); });
    return () => { active = false; };
  }, [propertyId, recipientAttempt]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [sourceAccount, setSourceAccount] = useState<WithdrawalSourceAccount>("cash_on_hand");
  const [paymentMethod, setPaymentMethod] = useState<WithdrawalPaymentMethod>("cash");
  const [reason, setReason] = useState("");
  const [receivedAt, setReceivedAt] = useState(localDateTimeValue());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recipientId) return setToast("Select the withdrawal recipient.");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setToast("Enter an amount greater than zero.");
    if (!reason.trim()) return setToast("Enter the reason for this withdrawal.");
    setSaving(true);
    try {
      const response = await createWithdrawal(propertyId, {
        recipientUserId: recipientId,
        amount: numericAmount,
        currency,
        sourceAccount,
        paymentMethod,
        reason: reason.trim(),
        moneyReceivedAt: new Date(receivedAt).toISOString(),
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim()
      });
      await onCreated(response.message);
    } catch (error) {
      setToast(getWithdrawalApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return <Modal title={finance ? "Request Withdrawal" : "Record Withdrawal"} onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      <p className="rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-600">{finance ? "This creates a pending request. Owner/Admin must approve it before a withdrawal is posted." : "This records a completed withdrawal. Use it only after the recipient has received the money."}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={finance ? "Requested recipient" : "Paid to"}><select aria-label={finance ? "Requested recipient" : "Paid to"} required value={recipientId} disabled={saving || loadingRecipients || recipients.length === 0} onChange={event => setRecipientId(event.target.value)} className={inputClass}><option value="">{loadingRecipients ? "Loading recipients..." : "Select Owner or Administrator"}</option>{recipients.map(recipient => <option key={recipient.user_id} value={recipient.user_id}>{recipient.name} · {recipientRoleLabel(recipient.role)}</option>)}</select></Field>
        <Field label="Amount"><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} /></Field>
        <Field label="Currency"><input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))} minLength={3} maxLength={3} required className={inputClass} /></Field>
        <Field label={finance ? "Request date and time" : "Money received date and time"}><input type="datetime-local" value={receivedAt} max={localDateTimeValue()} onChange={(event) => setReceivedAt(event.target.value)} required className={inputClass} /></Field>
        <Field label="Source account"><select value={sourceAccount} onChange={(event) => setSourceAccount(event.target.value as WithdrawalSourceAccount)} className={inputClass}>{sourceAccounts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Payment method"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as WithdrawalPaymentMethod)} className={inputClass}>{paymentMethods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Reference number (optional)"><input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className={inputClass} /></Field>
      </div>
      <p className="text-sm text-slate-500">The recipient receives the money. Owner/Admin reviews requests; selecting a recipient does not send money.</p>
      {recipientError ? <p role="alert" className="text-sm text-red-600">{recipientError}</p> : !loadingRecipients && recipients.length === 0 ? <p role="alert" className="text-sm text-amber-600">No eligible recipient accounts are available. A registered property Owner or Administrator is required.</p> : null}
      {!loadingRecipients && (recipientError || recipients.length === 0) ? <button type="button" disabled={saving} onClick={() => setRecipientAttempt(value => value + 1)} className="text-sm font-semibold text-blue-600">Reload recipients</button> : null}
      <Field label="Reason"><textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} placeholder="Example: Owner cash withdrawal for personal use" className={inputClass} /></Field>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className={inputClass} /></Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 font-semibold">Cancel</button>
        <button disabled={saving || loadingRecipients || !recipientId} className="rounded-md bg-slate-900 disabled:opacity-50 px-4 py-2 font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">{saving ? "Saving..." : finance ? "Submit Withdrawal Request" : "Record Completed Withdrawal"}</button>
      </div>
    </form>
  </Modal>;
}

function WithdrawalDetails({ details, onClose, onVoid, onComplete, canApprove }: { details: { withdrawal: Withdrawal; logs: WithdrawalAuditLog[] }; onClose: () => void; onVoid: () => void; onComplete: (item: Withdrawal, note: string, date: string) => Promise<void>; canApprove: boolean }) {
  const [note, setNote] = useState(""), [date, setDate] = useState(localDateTimeValue), [saving, setSaving] = useState(false);
  const item = details.withdrawal;
  return <Modal title={item.withdrawal_no} onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-center justify-between"><StatusBadge status={item.status} />{canApprove && item.status !== "voided" && <button type="button" onClick={onVoid} className="rounded-md border border-red-500 px-4 py-2 font-semibold text-red-600">{item.status === "pending" ? "Reject Request" : "Void Withdrawal"}</button>}</div>
      {item.status === "pending" ? !item.recipient_user_id ? <p className="rounded-lg border border-amber-300 p-3 text-sm text-amber-700">This older request has no verified recipient. Owner must reject it and a new request must select an Owner or Administrator.</p> : !canApprove ? <p className="rounded-lg border border-line p-3 text-sm text-slate-500">Awaiting Owner approval. This request has not posted a withdrawal.</p> : <form className="space-y-3 rounded-lg border border-line p-4" onSubmit={event => { event.preventDefault(); if (saving) return; setSaving(true); void onComplete(item, note.trim(), date).catch(() => undefined).finally(() => setSaving(false)); }}><p className="text-sm text-slate-500">Approve only after the recipient has actually received this money.</p><Field label="Actual money received"><input type="datetime-local" required value={date} onChange={event => setDate(event.target.value)} className={inputClass} /></Field><Field label="Approval note"><textarea required minLength={5} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} className={inputClass} /></Field><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Approve and Record"}</button></form> : null}
      {item.approved_by?.name ? <p className="text-sm text-slate-500">Approved by {item.approved_by.name} · {item.approval_note}</p> : null}
      <div className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2">
        <Detail label={item.status === "pending" ? "Requested recipient" : "Paid to"} value={item.paid_to} />
        {item.recipient_role && <Detail label="Recipient role at request" value={recipientRoleLabel(item.recipient_role)} />}
        {item.requested_by?.name && <Detail label="Requested by" value={item.requested_by.name} />}
        {item.requested_at && <Detail label="Requested on" value={dateTime(item.requested_at)} />}
        {item.approved_at && <Detail label="Approved on" value={dateTime(item.approved_at)} />}
        <Detail label="Amount" value={money(item.amount, item.currency)} />
        <Detail label="Money received" value={item.status === "pending" ? "Awaiting approval" : dateTime(item.money_received_at)} />
        <Detail label="Recorded in PMS" value={dateTime(item.created_at)} />
        <Detail label="Source account" value={label(item.source_account)} />
        <Detail label="Payment method" value={label(item.payment_method)} />
        <Detail label="Reference" value={item.reference_number || "Not provided"} />
        <Detail label="Recorded by" value={item.recorded_by?.name || "System"} />
        <div className="sm:col-span-2"><Detail label="Reason" value={item.reason} /></div>
        {item.notes && <div className="sm:col-span-2"><Detail label="Notes" value={item.notes} /></div>}
        {item.status === "voided" && <div className="sm:col-span-2"><Detail label="Void reason" value={item.void_reason || "Not provided"} /></div>}
      </div>
      <section><h3 className="mb-3 text-lg font-bold">Audit history</h3><div className="space-y-2">{details.logs.map((log) => <div key={log._id} className="rounded-md bg-slate-50 p-3"><p className="font-semibold">{log.description}</p><p className="mt-1 text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</div></section>
    </div>
  </Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-line bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4"><div className="flex items-center gap-3"><CircleDollarSign /><h2 className="text-xl font-bold">{title}</h2></div><button type="button" onClick={onClose}><X /></button></header><div className="p-6">{children}</div></div></div>;
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-semibold">{fieldLabel}</span>{children}</label>; }
function Detail({ label: detailLabel, value }: { label: string; value: string }) { return <div><p className="text-sm text-slate-500">{detailLabel}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function SummaryCard({ label: cardLabel, value }: { label: string; value: string }) { return <div className="rounded-lg border border-line bg-white p-4"><p className="text-sm text-slate-500">{cardLabel}</p><p className="mt-2 text-xl font-bold">{value}</p></div>; }
function StatusBadge({ status }: { status: WithdrawalStatus }) { return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{status}</span>; }
function label(value: string) { return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function money(value: number, currency: string) { return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function dateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(); }
function localDateTimeValue() { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
const inputClass = "w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-indigo-500";

function recipientRoleLabel(role: "owner" | "administrator") {
  return role === "owner" ? "Owner" : "Administrator";
}
