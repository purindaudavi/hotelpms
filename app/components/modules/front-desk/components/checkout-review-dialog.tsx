"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { getBookingsApiErrorMessage, getCheckoutReview, type CheckoutReview } from "@/app/lib/bookings-api";
import { InvoiceDrawer } from "../../financials/financial-documents-page";

const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CheckoutReviewDialog({ propertyId, reservationId, onClose, onConfirm, setToast }: {
  propertyId: string; reservationId: string; onClose: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
  setToast: (message: string) => void;
}) {
  const [review, setReview] = useState<CheckoutReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const lock = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    try {
      const result = await getCheckoutReview(propertyId, reservationId);
      if (current === request.current) { setReview(result); setError(""); }
    } catch (failure) {
      if (current === request.current) { setError(getBookingsApiErrorMessage(failure)); setReview(null); }
    } finally { if (current === request.current) setLoading(false); }
  }, [propertyId, reservationId]);
  useEffect(() => { void refresh(); return () => { request.current += 1; }; }, [refresh]);
  async function confirm() {
    if (lock.current || loading || !review?.can_check_out) return;
    lock.current = true; setSaving(true); setError("");
    try {
      const result = await onConfirm();
      if (!result.ok) { await refresh(); setError(result.error); }
    } catch (failure) { await refresh(); setError(getBookingsApiErrorMessage(failure)); }
    finally { lock.current = false; setSaving(false); }
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-line p-5"><div><h2 id="checkout-title" className="text-xl font-semibold">Review checkout</h2><p className="mt-1 text-sm text-slate-500">{review ? `${review.guest_name} · ${review.reservation_no}` : "Checking the saved guest bill..."}</p></div><button type="button" disabled={saving} aria-label="Close checkout review" onClick={onClose} className="rounded-md border border-line p-2"><X className="h-4 w-4" /></button></header>
      <div className="space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-slate-500">Review all recorded room and service charges. Any services not yet entered must be added by authorized staff before checkout. Balances are checked again when you confirm.</p>
        {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? <p role="status" className="text-sm text-slate-500">Refreshing checkout balances...</p> : null}
        {!loading && review ? <>
          {review.invoices.map((invoice) => <article key={invoice.id} className="rounded-lg border border-line p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{invoice.reference}</h3><p className="mt-1 text-xs capitalize text-slate-500">{invoice.status.replaceAll("_", " ")}</p></div>{invoice.id !== "reservation" ? <button type="button" disabled={saving} onClick={() => setInvoiceId(invoice.id)} className="rounded-md border border-line px-3 py-2 font-semibold text-blue-700">View invoice / payment</button> : null}</div>
            {invoice.lines.length ? <ul className="mt-3 space-y-2 border-t border-line pt-3">{invoice.lines.map((line, index) => <li key={index} className="flex justify-between gap-4"><span className="min-w-0">{line.description} <span className="text-xs text-slate-500">× {line.quantity}</span></span><span className="shrink-0">{money(line.amount, invoice.currency)}</span></li>)}</ul> : null}
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Total", invoice.total], ["Paid", invoice.paid], ["Credit", invoice.credited], ["Unpaid", invoice.balance_due]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{money(Number(value), invoice.currency)}</dd></div>)}</dl>
          </article>)}
          {review.totals_by_currency.map((group) => <div key={group.currency} className="rounded-lg border border-line bg-slate-50 p-4"><p className="text-sm text-slate-500">Remaining balance</p><p className="mt-1 text-xl font-bold">{money(group.balance_due, group.currency)}</p>{group.refund_due > 0 ? <p className="mt-2 text-sm text-amber-700">Refund due: {money(group.refund_due, group.currency)}. Ask an owner/administrator to arrange this.</p> : null}</div>)}
          {review.issues.length ? <ul className="list-disc space-y-2 rounded-lg border border-amber-200 bg-amber-50 py-3 pl-8 pr-4 text-sm text-amber-900">{review.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">No outstanding recorded charges. Ready to check out.</p>}
          {review.invoices.some((invoice) => invoice.id === "reservation" && invoice.balance_due > 0) ? <p className="text-sm text-slate-500">This legacy stay has no active invoice. Ask an owner/administrator to reconcile its invoice or record the existing reservation payment workflow.</p> : null}
        </> : null}
      </div>
      <footer className="flex flex-wrap justify-end gap-3 border-t border-line p-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">Back</button><button type="button" disabled={saving || loading} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh balance</button><button type="button" disabled={saving || loading || !review?.can_check_out} onClick={() => void confirm()} className="reservation-primary-action rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Checking out..." : "Confirm checkout"}</button></footer>
    </section>
    {invoiceId ? <div className="fixed inset-0 z-[70]"><InvoiceDrawer propertyId={propertyId} invoiceId={invoiceId} setToast={setToast} onClose={() => { setInvoiceId(null); void refresh(); }} onChanged={() => { void refresh(); }} /></div> : null}
  </div>;
}
