// Isolated comparison adapters; original Financials components remain unchanged.
"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePropertyAccess } from "@/app/components/property-access-gate";
import { CreditCard, FileMinus2, FileText, RefreshCw, Search, X } from "lucide-react";
import type { Reservation } from "@/app/data/pms-data";
import { DateRangeFilter } from "@/app/components/modules/financials/date-range-filter";
import {
  type CreditNote,
  type CreditNoteDetails,
  type CreditNoteStatus,
  type Invoice,
  type InvoiceDetails,
  type InvoiceStatus,
  type Refund,
  type RefundDetails,
  type RefundStatus,
  completeRefund,
  createCreditNote,
  createInvoice,
  createRefund,
  getCreditNote,
  getFinancialApiErrorMessage,
  getInvoice,
  getRefund,
  issueCreditNote,
  issueInvoice,
  listCreditNotes,
  listInvoices,
  listRefunds,
  postInvoicePayment,
  voidCreditNote,
  voidInvoice,
  voidInvoicePayment,
  voidRefund
} from "@/app/lib/financial-documents-api";

type PageProps = {
  propertyId: string;
  reservations: Reservation[];
  setToast: (message: string) => void;
  initialReference?: string;
};

type InvoicePageProps = PageProps & {
  onReservationChanged?: (reservationId: string) => Promise<void> | void;
};

export function CreditDrawer({ propertyId, creditId, setToast, onClose, onChanged }: { propertyId: string; creditId: string; setToast: (message: string) => void; onClose: () => void; onChanged: () => void }) {
  const finance = usePropertyAccess().role === "finance";
  const [details, setDetails] = useState<CreditNoteDetails | null>(null);
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => { try { setDetails(await getCreditNote(propertyId, creditId)); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } }, [creditId, propertyId, setToast]);
  useEffect(() => { void load(); }, [load]);
  if (!details) return <Drawer title="Loading credit note..." onClose={onClose}><p className="p-5 text-sm text-slate-500">Loading data from MongoDB...</p></Drawer>;
  const credit = details.credit;
  async function run(action: () => Promise<unknown>, success: string) { setWorking(true); try { await action(); setToast(success); await load(); onChanged(); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } finally { setWorking(false); } }
  return <Drawer title={credit.credit_note_no} subtitle={`Invoice ${credit.invoice_no}`} onClose={onClose}><div className="space-y-5 p-5"><div className="flex gap-2"><DocumentStatus value={credit.status} />{!finance && credit.status === "draft" ? <ActionButton disabled={working} onClick={() => void run(() => issueCreditNote(propertyId, credit._id), "Credit note issued and applied.")}>Issue Credit Note</ActionButton> : null}{!finance && credit.status !== "voided" ? <button type="button" disabled={working} onClick={() => { const reason = window.prompt("Why are you voiding this credit note?"); if (reason?.trim()) void run(() => voidCreditNote(propertyId, credit._id, reason.trim()), "Credit note voided."); }} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600">Void</button> : null}</div><div className="rounded-md border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-slate-500">Credit value</p><p className="mt-2 text-2xl font-bold text-blue-700">{money(credit.total_credit, credit.currency)}</p></div><InfoGrid items={[["Guest", credit.guest_snapshot.name], ["Reservation", credit.reservation_no], ["Credit date", dateOnly(credit.credit_date)], ["Reason type", readable(credit.reason_code)]]} /><section><h3 className="font-semibold">Reason</h3><p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{credit.reason}</p></section><section><h3 className="mb-3 font-semibold">Credit lines</h3>{credit.line_items.map((line) => <div key={line._id} className="flex justify-between rounded-md border border-line p-3 text-sm"><span>{line.description}</span><b>{money(line.total_amount, credit.currency)}</b></div>)}</section><section><h3 className="mb-3 font-semibold">Audit history</h3>{details.logs.map((log) => <div key={log._id} className="mb-2 rounded-md bg-slate-50 p-3 text-sm"><b>{readable(log.action)}</b><p>{log.description}</p><p className="text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</section></div></Drawer>;
}

export function RefundDrawer({ propertyId, refundId, setToast, onClose, onChanged }: { propertyId: string; refundId: string; setToast: (message: string) => void; onClose: () => void; onChanged: () => void }) {
  const finance = usePropertyAccess().role === "finance";
  const [details, setDetails] = useState<RefundDetails | null>(null);
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    try { setDetails(await getRefund(propertyId, refundId)); }
    catch (error) { setToast(getFinancialApiErrorMessage(error)); }
  }, [propertyId, refundId, setToast]);
  useEffect(() => { void load(); }, [load]);
  if (!details) return <Drawer title="Loading refund..." onClose={onClose}><p className="p-5 text-sm text-slate-500">Loading data from MongoDB...</p></Drawer>;
  const refund = details.refund;
  async function run(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    try { await action(); setToast(success); await load(); onChanged(); }
    catch (error) { setToast(getFinancialApiErrorMessage(error)); }
    finally { setWorking(false); }
  }
  return <Drawer title={refund.refund_no} subtitle={`Invoice ${refund.invoice_no}`} onClose={onClose}>
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap gap-2"><DocumentStatus value={refund.status} />{!finance && refund.status === "pending" ? <ActionButton disabled={working} onClick={() => { if (window.confirm("Complete this refund only after the money has actually been returned. Continue?")) void run(() => completeRefund(propertyId, refund._id), "Refund completed."); }}>Complete Refund</ActionButton> : null}{!finance && refund.status !== "voided" ? <button type="button" disabled={working} onClick={() => { const reason = window.prompt("Why are you voiding this refund record?"); if (reason?.trim()) void run(() => voidRefund(propertyId, refund._id, reason.trim()), "Refund voided."); }} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">Void</button> : null}</div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-slate-500">Refund amount</p><p className="mt-2 text-2xl font-bold text-emerald-700">{money(refund.amount, refund.currency)}</p></div>
      <InfoGrid items={[["Reservation", refund.reservation_no], ["Guest", details.invoice?.billing_snapshot.name || refund.guest_id], ["Method", readable(refund.refund_method)], ["Requested", dateTime(refund.requested_at)], ["Reference", refund.reference_number || "Not provided"], ["Original payment", details.payment?.payment_reference || details.payment?._id || "Unavailable"]]} />
      <section><h3 className="font-semibold">Reason</h3><p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{refund.reason}</p></section>
      <section><h3 className="mb-3 font-semibold">Audit history</h3>{details.logs.map((log) => <div key={log._id} className="mb-2 rounded-md bg-slate-50 p-3 text-sm"><b>{readable(log.action)}</b><p>{log.description}</p><p className="text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</section>
    </div>
  </Drawer>;
}

function PageHeader({ title, description, loading, onRefresh, action }: { title: string; description: string; loading: boolean; onRefresh: () => void; action?: React.ReactNode }) { return <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex gap-2"><button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>{action}</div></header>; }
function Filters({ search, onSearch, status, statuses, onStatus, dateFrom, dateTo, onDateFrom, onDateTo, loading }: { search: string; onSearch: (value: string) => void; status: string; statuses: string[]; onStatus: (value: string) => void; dateFrom: string; dateTo: string; onDateFrom: (value: string) => void; onDateTo: (value: string) => void; loading: boolean }) {
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-[1fr_260px]"><label className="flex items-center gap-2 rounded-md border border-line bg-white px-3"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search number, guest, reservation or email" className="h-11 w-full bg-transparent outline-none" /></label><select value={status} onChange={(event) => onStatus(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3">{statuses.map((item) => <option key={item} value={item}>{readable(item)}</option>)}</select></div>
    <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={onDateFrom} onDateToChange={onDateTo} disabled={loading} />
  </div>;
}
function MoneySummary({ invoice }: { invoice: Invoice }) { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Total", invoice.grand_total], ["Paid", invoice.paid_amount], ["Credited", invoice.credited_amount], ["Balance", invoice.balance_due], ["Refund Due", invoice.refund_due]].map(([label, value]) => <div key={String(label)} className={`rounded-md border p-3 ${label === "Refund Due" && Number(value) > 0 ? "border-amber-300 bg-amber-50" : "border-line bg-slate-50"}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-bold">{money(Number(value), invoice.currency)}</p></div>)}</div>; }
function DocumentStatus({ value }: { value: string }) { const tone = value === "paid" || value === "issued" || value === "completed" ? "bg-emerald-100 text-emerald-700" : value === "draft" || value === "pending" ? "bg-amber-100 text-amber-700" : value === "partially_paid" ? "bg-blue-100 text-blue-700" : value === "voided" ? "bg-slate-200 text-slate-600" : "bg-purple-100 text-purple-700"; return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{readable(value)}</span>; }
function EmptyState({ loading, empty, label }: { loading: boolean; empty: boolean; label: string }) { if (!loading && !empty) return null; return <p className="p-8 text-center text-sm text-slate-500">{loading ? "Loading from MongoDB..." : label}</p>; }
function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[70] bg-black/45"><aside className="ml-auto h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4"><div><h2 className="text-xl font-bold">{title}</h2>{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}</div><button type="button" onClick={onClose} className="rounded border border-line p-2" aria-label="Close"><X className="h-5 w-5"/></button></header>{children}</aside></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4"><section className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-lg bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded border border-line p-2"><X className="h-5 w-5"/></button></header>{children}</section></div>; }
function Input({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) { return <label className="grid gap-1 text-sm font-semibold">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 font-normal" /></label>; }
function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }>; placeholder?: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 font-normal">{placeholder ? <option value="">{placeholder}</option> : null}{options.map((option) => { const value = typeof option === "string" ? option : option.value; const label = typeof option === "string" ? readable(option) : option.label; return <option key={value} value={value}>{label}</option>; })}</select></label>; }
function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" {...props} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700">{children}</button>; }
function InfoGrid({ items }: { items: Array<[string, string]> }) { return <dl className="grid grid-cols-2 gap-4 rounded-md border border-line p-4 text-sm">{items.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>; }
function Muted({ children }: { children: React.ReactNode }) { return <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">{children}</p>; }
function readable(value: string) { return value.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function dateOnly(value: string) { return value ? value.slice(0, 10) : "-"; }
function dateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function money(value: number, currency: string) { return `${currency} ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
