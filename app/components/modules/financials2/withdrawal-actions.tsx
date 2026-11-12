// Comparison adapter, preserving the existing recipient and approval workflow.
"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { usePropertyAccess } from "@/app/components/property-access-gate";
import { DateRangeFilter } from "@/app/components/modules/financials/date-range-filter";
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


export function Financials2WithdrawalView({ propertyId, id, setToast, onClose, onChanged }: { propertyId: string; id: string; setToast: (message: string) => void; onClose: () => void; onChanged: () => void }) {
  const access = usePropertyAccess();
  const canApprove = access.role === "owner";
  const [details, setDetails] = useState<Awaited<ReturnType<typeof getWithdrawal>> | null>(null);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setDetails(await getWithdrawal(propertyId, id)); setFailure(""); } catch (error) { setFailure(getWithdrawalApiErrorMessage(error)); } }, [propertyId, id]);
  useEffect(() => { void load(); }, [load]);
  async function run(action: () => Promise<unknown>) { if (busy) return; setBusy(true); try { await action(); await load(); onChanged(); setToast("Withdrawal updated."); } catch (error) { setToast(getWithdrawalApiErrorMessage(error)); throw error; } finally { setBusy(false); } }
  async function onComplete(item: Withdrawal, note: string, date: string) { if (!canApprove || busy) return; await run(() => completeWithdrawal(propertyId, item, note, new Date(date).toISOString())); }
  function onVoid() { if (!canApprove || !details || busy) return; const reason = window.prompt("Reason for rejecting/voiding this withdrawal record:"); if (reason?.trim()) void run(() => voidWithdrawal(propertyId, id, reason.trim())).catch(() => undefined); }
  if (failure) return <Modal title="Withdrawal unavailable" onClose={onClose}><p role="alert" className="text-sm text-red-600">{failure}</p><button onClick={() => void load()} className="mt-4 rounded-lg border border-line p-2">Retry</button></Modal>;
  if (!details) return <Modal title="Loading withdrawal" onClose={onClose}><p className="text-sm text-slate-500">Loading…</p></Modal>;
  return <WithdrawalDetails details={details} onClose={onClose} onVoid={onVoid} onComplete={onComplete} canApprove={canApprove} />;
}
export function CreateWithdrawalDialog({ propertyId, onClose, onCreated, setToast }: Props & { onClose: () => void; onCreated: (message: string) => Promise<void> }) {
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-line bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4"><div className="flex items-center gap-3"><CircleDollarSign /><h2 className="text-xl font-bold">{title}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><div className="p-6">{children}</div></div></div>;
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
