"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, FileMinus2, FileText, RefreshCw, Search, X } from "lucide-react";
import type { Reservation } from "@/app/data/pms-data";
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
};

type InvoicePageProps = PageProps & {
  onReservationChanged?: (reservationId: string) => Promise<void> | void;
};

const invoiceStatuses: Array<InvoiceStatus | "all"> = [
  "all", "draft", "issued", "partially_paid", "paid", "credited", "voided"
];
const creditStatuses: Array<CreditNoteStatus | "all"> = ["all", "draft", "issued", "voided"];
const refundStatuses: Array<RefundStatus | "all"> = ["all", "pending", "completed", "voided"];

export function InvoicesPage({ propertyId, reservations, setToast, onReservationChanged }: InvoicePageProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listInvoices(propertyId, { status, search: search.trim(), limit: 100 });
      setInvoices(response.invoices);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [propertyId, search, setToast, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return <div className="space-y-5">
    <PageHeader
      title="Invoices"
      description="Create and manage official guest bills from saved reservations."
      loading={loading}
      onRefresh={() => void load()}
      action={<button type="button" onClick={() => setShowCreate(true)} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">+ Create Invoice</button>}
    />
    <Filters search={search} onSearch={setSearch} status={status} statuses={invoiceStatuses} onStatus={(value) => setStatus(value as InvoiceStatus | "all")} />
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead><tr className="border-b border-line bg-slate-50 text-slate-500">
            {['Invoice No', 'Reservation', 'Guest', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Credit', 'Balance', 'Status', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
          </tr></thead>
          <tbody>{invoices.map((invoice) => <tr key={invoice._id} className="border-b border-line last:border-0 hover:bg-slate-50">
            <td className="px-4 py-4 font-semibold">{invoice.invoice_no}</td>
            <td className="px-4 py-4">{invoice.reservation_no}</td>
            <td className="px-4 py-4"><p className="font-medium">{invoice.billing_snapshot.name}</p><p className="text-xs text-slate-500">{invoice.billing_snapshot.email || "No email"}</p></td>
            <td className="px-4 py-4">{dateOnly(invoice.invoice_date)}</td>
            <td className="px-4 py-4">{dateOnly(invoice.due_date)}</td>
            <td className="px-4 py-4 font-semibold">{money(invoice.grand_total, invoice.currency)}</td>
            <td className="px-4 py-4">{money(invoice.paid_amount, invoice.currency)}</td>
            <td className="px-4 py-4">{money(invoice.credited_amount, invoice.currency)}</td>
            <td className="px-4 py-4 font-semibold">{money(invoice.balance_due, invoice.currency)}</td>
            <td className="px-4 py-4"><DocumentStatus value={invoice.status} /></td>
            <td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(invoice._id)} className="rounded border border-line px-3 py-2 font-semibold">View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <EmptyState loading={loading} empty={!invoices.length} label="No invoices match these filters." />
    </section>

    {showCreate ? <CreateInvoiceDialog propertyId={propertyId} reservations={reservations} setToast={setToast} onClose={() => setShowCreate(false)} onCreated={(invoice) => { setShowCreate(false); setInvoices((current) => [invoice, ...current]); setSelectedId(invoice._id); }} /> : null}
    {selectedId ? <InvoiceDrawer key={selectedId} propertyId={propertyId} invoiceId={selectedId} setToast={setToast} onClose={() => setSelectedId(null)} onChanged={(reservationId) => { void load(); void onReservationChanged?.(reservationId); }} /> : null}
  </div>;
}

export function CreditNotesPage({ propertyId, setToast }: PageProps) {
  const [credits, setCredits] = useState<CreditNote[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CreditNoteStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCreditNotes(propertyId, { status, search: search.trim(), limit: 100 });
      setCredits(response.credits);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [propertyId, search, setToast, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return <div className="space-y-5">
    <PageHeader title="Credit Notes" description="Correct issued invoices while keeping a complete financial history." loading={loading} onRefresh={() => void load()} />
    <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Create a credit note from an issued invoice in Financials → Invoices. A credit note reduces the invoice balance; it is not a payment.</p>
    <Filters search={search} onSearch={setSearch} status={status} statuses={creditStatuses} onStatus={(value) => setStatus(value as CreditNoteStatus | "all")} />
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm">
        <thead><tr className="border-b border-line bg-slate-50 text-slate-500">{['Credit Note', 'Invoice', 'Reservation', 'Guest', 'Date', 'Reason', 'Value', 'Status', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
        <tbody>{credits.map((credit) => <tr key={credit._id} className="border-b border-line last:border-0 hover:bg-slate-50">
          <td className="px-4 py-4 font-semibold">{credit.credit_note_no}</td><td className="px-4 py-4">{credit.invoice_no}</td><td className="px-4 py-4">{credit.reservation_no}</td><td className="px-4 py-4">{credit.guest_snapshot.name}</td><td className="px-4 py-4">{dateOnly(credit.credit_date)}</td><td className="max-w-[260px] truncate px-4 py-4">{credit.reason}</td><td className="px-4 py-4 font-semibold">{money(credit.total_credit, credit.currency)}</td><td className="px-4 py-4"><DocumentStatus value={credit.status} /></td><td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(credit._id)} className="rounded border border-line px-3 py-2 font-semibold">View</button></td>
        </tr>)}</tbody>
      </table></div>
      <EmptyState loading={loading} empty={!credits.length} label="No credit notes match these filters." />
    </section>
    {selectedId ? <CreditDrawer key={selectedId} propertyId={propertyId} creditId={selectedId} setToast={setToast} onClose={() => setSelectedId(null)} onChanged={() => void load()} /> : null}
  </div>;
}

export function RefundsPage({ propertyId, setToast }: PageProps) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RefundStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listRefunds(propertyId, { status, search: search.trim(), limit: 100 });
      setRefunds(response.refunds);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [propertyId, search, setToast, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return <div className="space-y-5">
    <PageHeader title="Refunds" description="Track money returned against posted invoice payments." loading={loading} onRefresh={() => void load()} />
    <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Start a refund from an invoice when its Refund Due amount is greater than zero. Complete it only after the money has actually been returned.</p>
    <Filters search={search} onSearch={setSearch} status={status} statuses={refundStatuses} onStatus={(value) => setStatus(value as RefundStatus | "all")} />
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm">
        <thead><tr className="border-b border-line bg-slate-50 text-slate-500">{["Refund No", "Invoice", "Reservation", "Requested", "Method", "Reason", "Amount", "Status", "Action"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
        <tbody>{refunds.map((refund) => <tr key={refund._id} className="border-b border-line last:border-0 hover:bg-slate-50">
          <td className="px-4 py-4 font-semibold">{refund.refund_no}</td><td className="px-4 py-4">{refund.invoice_no}</td><td className="px-4 py-4">{refund.reservation_no}</td><td className="px-4 py-4">{dateOnly(refund.requested_at)}</td><td className="px-4 py-4">{readable(refund.refund_method)}</td><td className="max-w-[260px] truncate px-4 py-4">{refund.reason}</td><td className="px-4 py-4 font-semibold">{money(refund.amount, refund.currency)}</td><td className="px-4 py-4"><DocumentStatus value={refund.status} /></td><td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(refund._id)} className="rounded border border-line px-3 py-2 font-semibold">View</button></td>
        </tr>)}</tbody>
      </table></div>
      <EmptyState loading={loading} empty={!refunds.length} label="No refunds match these filters." />
    </section>
    {selectedId ? <RefundDrawer key={selectedId} propertyId={propertyId} refundId={selectedId} setToast={setToast} onClose={() => setSelectedId(null)} onChanged={() => void load()} /> : null}
  </div>;
}

export function ReservationFinancialsPanel({ propertyId, booking, setToast }: { propertyId: string; booking: Reservation; setToast: (message: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listInvoices(propertyId, { reservationId: booking.id, limit: 100 });
      setInvoices(response.invoices);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [booking.id, propertyId, setToast]);

  useEffect(() => { void load(); }, [load]);

  async function createDraft() {
    setWorkingId("create");
    try {
      const invoice = await createInvoice(propertyId, booking.id);
      setInvoices((current) => [invoice, ...current]);
      setToast(`Draft invoice ${invoice.invoice_no} created.`);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setWorkingId("");
    }
  }

  async function issue(invoice: Invoice) {
    setWorkingId(invoice._id);
    try {
      const saved = await issueInvoice(propertyId, invoice._id);
      setInvoices((current) => current.map((item) => item._id === saved._id ? saved : item));
      setToast(`Invoice ${saved.invoice_no} issued.`);
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setWorkingId("");
    }
  }

  return <div className="mt-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Invoices from MongoDB</h3><p className="text-xs text-slate-500">Invoice totals and payment balances are calculated by the backend.</p></div>
      <button type="button" disabled={workingId === "create"} onClick={() => void createDraft()} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{workingId === "create" ? "Creating..." : "Create Draft Invoice"}</button>
    </div>
    {invoices.map((invoice) => <article key={invoice._id} className="rounded-md border border-line p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileText className="h-4 w-4"/><b>{invoice.invoice_no}</b><DocumentStatus value={invoice.status}/></div><p className="mt-2 text-xs text-slate-500">Issued value {money(invoice.grand_total, invoice.currency)} · Paid {money(invoice.paid_amount, invoice.currency)} · Credited {money(invoice.credited_amount, invoice.currency)}</p></div><div className="text-right"><b>{money(invoice.balance_due, invoice.currency)}</b><p className="text-xs text-slate-500">Balance due</p></div></div>
      <div className="mt-3 flex flex-wrap gap-2">{invoice.status === "draft" ? <button type="button" disabled={workingId === invoice._id} onClick={() => void issue(invoice)} className="rounded border border-line px-3 py-2 font-semibold disabled:opacity-50">Issue</button> : null}<a href={`/properties/${propertyId}/financials/invoices`} className="rounded border border-line px-3 py-2 font-semibold">Open invoice workspace</a></div>
    </article>)}
    {!loading && !invoices.length ? <Muted>No invoices have been created for this reservation.</Muted> : null}
    {loading ? <Muted>Loading invoices from MongoDB...</Muted> : null}
  </div>;
}

function InvoiceDrawer({ propertyId, invoiceId, setToast, onClose, onChanged }: { propertyId: string; invoiceId: string; setToast: (message: string) => void; onClose: () => void; onChanged: (reservationId: string) => void }) {
  const [details, setDetails] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [showCredit, setShowCredit] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDetails(await getInvoice(propertyId, invoiceId)); }
    catch (error) { setToast(getFinancialApiErrorMessage(error)); }
    finally { setLoading(false); }
  }, [invoiceId, propertyId, setToast]);
  useEffect(() => { void load(); }, [load]);

  if (!details && loading) return <Drawer title="Loading invoice..." onClose={onClose}><p className="p-5 text-sm text-slate-500">Loading data from MongoDB...</p></Drawer>;
  if (!details) return null;
  const invoice = details.invoice;
  const pendingRefundTotal = (details.refunds || []).filter((refund) => refund.status === "pending").reduce((total, refund) => total + refund.amount, 0);
  const availableRefund = Math.max(invoice.refund_due - pendingRefundTotal, 0);

  async function run(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    try { await action(); setToast(success); await load(); onChanged(invoice.reservation_id); }
    catch (error) { setToast(getFinancialApiErrorMessage(error)); }
    finally { setWorking(false); }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setToast("Enter a payment amount greater than zero."); return; }
    await run(() => postInvoicePayment(propertyId, invoice._id, { amount, paymentMethod, paymentReference }), "Invoice payment recorded.");
    setPaymentAmount(""); setPaymentReference("");
  }

  return <Drawer title={invoice.invoice_no} onClose={onClose} subtitle={`Reservation ${invoice.reservation_no}`}>
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center gap-2"><DocumentStatus value={invoice.status} />{invoice.status === "draft" ? <ActionButton disabled={working} onClick={() => void run(() => issueInvoice(propertyId, invoice._id), "Invoice issued successfully.")}>Issue Invoice</ActionButton> : null}{!["draft", "voided", "credited"].includes(invoice.status) ? <ActionButton disabled={working} onClick={() => setShowCredit(true)}>Create Credit Note</ActionButton> : null}{availableRefund > 0 && details.payments.some((payment) => payment.status === "posted") ? <ActionButton disabled={working} onClick={() => setShowRefund(true)}>Create Refund</ActionButton> : null}{invoice.status !== "voided" ? <button type="button" disabled={working} onClick={() => { const reason = window.prompt("Why are you voiding this invoice?"); if (reason?.trim()) void run(() => voidInvoice(propertyId, invoice._id, reason.trim()), "Invoice voided."); }} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">Void</button> : null}</div>
      <MoneySummary invoice={invoice} />
      <InfoGrid items={[["Guest", invoice.billing_snapshot.name], ["Email", invoice.billing_snapshot.email || "Not provided"], ["Check-in", dateOnly(invoice.stay_snapshot.check_in)], ["Check-out", dateOnly(invoice.stay_snapshot.check_out)], ["Rooms", invoice.stay_snapshot.room_numbers.join(", ") || "Unassigned"], ["Due date", dateOnly(invoice.due_date)]]} />
      <section><h3 className="mb-3 font-semibold">Invoice lines</h3><div className="space-y-2">{invoice.line_items.map((line) => <div key={line._id} className="rounded-md border border-line p-3 text-sm"><div className="flex justify-between gap-3"><div><b>{line.description}</b><p className="text-xs text-slate-500">{line.source_type.replaceAll("_", " ")} · {line.quantity} × {money(line.unit_price, invoice.currency)}</p></div><b>{money(line.total_amount, invoice.currency)}</b></div></div>)}</div></section>
      {["issued", "partially_paid"].includes(invoice.status) ? <form onSubmit={(event) => void submitPayment(event)} className="rounded-md border border-line bg-slate-50 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />Post payment</h3><div className="grid gap-3 sm:grid-cols-3"><Input label="Amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={setPaymentAmount} /><Select label="Method" value={paymentMethod} onChange={setPaymentMethod} options={["cash", "credit_card", "debit_card", "bank_transfer", "online", "other"]} /><Input label="Reference" value={paymentReference} onChange={setPaymentReference} /></div><ActionButton disabled={working} type="submit">Record Payment</ActionButton></form> : null}
      <section><h3 className="mb-3 font-semibold">Payments</h3><div className="space-y-2">{details.payments.map((payment) => <div key={payment._id} className="flex items-center justify-between rounded-md border border-line p-3 text-sm"><div><b>{money(payment.amount, payment.currency)}</b><p className="text-xs text-slate-500">{payment.payment_method.replaceAll("_", " ")} · {payment.payment_reference || "No reference"} · {payment.status}</p></div>{payment.status !== "voided" ? <button type="button" disabled={working} className="text-xs font-semibold text-red-600" onClick={() => { const reason = window.prompt("Why are you voiding this payment?"); if (reason?.trim()) void run(() => voidInvoicePayment(propertyId, invoice._id, payment._id, reason.trim()), "Payment voided."); }}>Void</button> : null}</div>)}{!details.payments.length ? <Muted>No invoice payments</Muted> : null}</div></section>
      <section><h3 className="mb-3 font-semibold">Credit notes</h3><div className="space-y-2">{details.credits.map((credit) => <div key={credit._id} className="flex justify-between rounded-md border border-line p-3 text-sm"><span><b>{credit.credit_note_no}</b><br/><span className="text-xs text-slate-500">{credit.reason} · {credit.status}</span></span><b>{money(credit.total_credit, credit.currency)}</b></div>)}{!details.credits.length ? <Muted>No credit notes</Muted> : null}</div></section>
      <section><h3 className="mb-3 font-semibold">Refunds</h3><div className="space-y-2">{(details.refunds || []).map((refund) => <div key={refund._id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3 text-sm"><div><b>{refund.refund_no}</b><p className="text-xs text-slate-500">{readable(refund.refund_method)} · {refund.reason} · {readable(refund.status)}</p></div><div className="flex items-center gap-3"><b>{money(refund.amount, refund.currency)}</b>{refund.status === "pending" ? <button type="button" disabled={working} className="text-xs font-semibold text-emerald-700" onClick={() => { if (window.confirm(`Complete ${refund.refund_no}? Only continue after the money has been returned.`)) void run(() => completeRefund(propertyId, refund._id), "Refund completed."); }}>Complete</button> : null}{refund.status !== "voided" ? <button type="button" disabled={working} className="text-xs font-semibold text-red-600" onClick={() => { const reason = window.prompt("Why are you voiding this refund record?"); if (reason?.trim()) void run(() => voidRefund(propertyId, refund._id, reason.trim()), "Refund voided."); }}>Void</button> : null}</div></div>)}{!(details.refunds || []).length ? <Muted>No refunds</Muted> : null}</div></section>
      <section><h3 className="mb-3 font-semibold">Audit history</h3><div className="space-y-2">{details.logs.map((log) => <div key={log._id} className="rounded-md bg-slate-50 p-3 text-sm"><b>{readable(log.action)}</b><p className="mt-1 text-slate-600">{log.description}</p><p className="mt-1 text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</div></section>
    </div>
    {showCredit ? <CreateCreditDialog propertyId={propertyId} invoice={invoice} setToast={setToast} onClose={() => setShowCredit(false)} onCreated={async () => { setShowCredit(false); await load(); onChanged(invoice.reservation_id); }} /> : null}
    {showRefund ? <CreateRefundDialog propertyId={propertyId} invoice={invoice} payments={details.payments} refunds={details.refunds || []} maxAmount={availableRefund} setToast={setToast} onClose={() => setShowRefund(false)} onCreated={async () => { setShowRefund(false); await load(); onChanged(invoice.reservation_id); }} /> : null}
  </Drawer>;
}

function CreditDrawer({ propertyId, creditId, setToast, onClose, onChanged }: { propertyId: string; creditId: string; setToast: (message: string) => void; onClose: () => void; onChanged: () => void }) {
  const [details, setDetails] = useState<CreditNoteDetails | null>(null);
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => { try { setDetails(await getCreditNote(propertyId, creditId)); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } }, [creditId, propertyId, setToast]);
  useEffect(() => { void load(); }, [load]);
  if (!details) return <Drawer title="Loading credit note..." onClose={onClose}><p className="p-5 text-sm text-slate-500">Loading data from MongoDB...</p></Drawer>;
  const credit = details.credit;
  async function run(action: () => Promise<unknown>, success: string) { setWorking(true); try { await action(); setToast(success); await load(); onChanged(); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } finally { setWorking(false); } }
  return <Drawer title={credit.credit_note_no} subtitle={`Invoice ${credit.invoice_no}`} onClose={onClose}><div className="space-y-5 p-5"><div className="flex gap-2"><DocumentStatus value={credit.status} />{credit.status === "draft" ? <ActionButton disabled={working} onClick={() => void run(() => issueCreditNote(propertyId, credit._id), "Credit note issued and applied.")}>Issue Credit Note</ActionButton> : null}{credit.status !== "voided" ? <button type="button" disabled={working} onClick={() => { const reason = window.prompt("Why are you voiding this credit note?"); if (reason?.trim()) void run(() => voidCreditNote(propertyId, credit._id, reason.trim()), "Credit note voided."); }} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600">Void</button> : null}</div><div className="rounded-md border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-slate-500">Credit value</p><p className="mt-2 text-2xl font-bold text-blue-700">{money(credit.total_credit, credit.currency)}</p></div><InfoGrid items={[["Guest", credit.guest_snapshot.name], ["Reservation", credit.reservation_no], ["Credit date", dateOnly(credit.credit_date)], ["Reason type", readable(credit.reason_code)]]} /><section><h3 className="font-semibold">Reason</h3><p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{credit.reason}</p></section><section><h3 className="mb-3 font-semibold">Credit lines</h3>{credit.line_items.map((line) => <div key={line._id} className="flex justify-between rounded-md border border-line p-3 text-sm"><span>{line.description}</span><b>{money(line.total_amount, credit.currency)}</b></div>)}</section><section><h3 className="mb-3 font-semibold">Audit history</h3>{details.logs.map((log) => <div key={log._id} className="mb-2 rounded-md bg-slate-50 p-3 text-sm"><b>{readable(log.action)}</b><p>{log.description}</p><p className="text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</section></div></Drawer>;
}

function RefundDrawer({ propertyId, refundId, setToast, onClose, onChanged }: { propertyId: string; refundId: string; setToast: (message: string) => void; onClose: () => void; onChanged: () => void }) {
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
      <div className="flex flex-wrap gap-2"><DocumentStatus value={refund.status} />{refund.status === "pending" ? <ActionButton disabled={working} onClick={() => { if (window.confirm("Complete this refund only after the money has actually been returned. Continue?")) void run(() => completeRefund(propertyId, refund._id), "Refund completed."); }}>Complete Refund</ActionButton> : null}{refund.status !== "voided" ? <button type="button" disabled={working} onClick={() => { const reason = window.prompt("Why are you voiding this refund record?"); if (reason?.trim()) void run(() => voidRefund(propertyId, refund._id, reason.trim()), "Refund voided."); }} className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">Void</button> : null}</div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-slate-500">Refund amount</p><p className="mt-2 text-2xl font-bold text-emerald-700">{money(refund.amount, refund.currency)}</p></div>
      <InfoGrid items={[["Reservation", refund.reservation_no], ["Guest", details.invoice?.billing_snapshot.name || refund.guest_id], ["Method", readable(refund.refund_method)], ["Requested", dateTime(refund.requested_at)], ["Reference", refund.reference_number || "Not provided"], ["Original payment", details.payment?.payment_reference || details.payment?._id || "Unavailable"]]} />
      <section><h3 className="font-semibold">Reason</h3><p className="mt-2 rounded-md bg-slate-50 p-3 text-sm">{refund.reason}</p></section>
      <section><h3 className="mb-3 font-semibold">Audit history</h3>{details.logs.map((log) => <div key={log._id} className="mb-2 rounded-md bg-slate-50 p-3 text-sm"><b>{readable(log.action)}</b><p>{log.description}</p><p className="text-xs text-slate-500">{log.actor?.name || "System"} · {dateTime(log.created_at)}</p></div>)}</section>
    </div>
  </Drawer>;
}

function CreateInvoiceDialog({ propertyId, reservations, setToast, onClose, onCreated }: PageProps & { onClose: () => void; onCreated: (invoice: Invoice) => void }) {
  const [reservationId, setReservationId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const eligible = useMemo(() => reservations.filter((item) => !["Cancelled", "No Show", "Blocked"].includes(item.status)), [reservations]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!reservationId) { setToast("Select a reservation first."); return; } setSaving(true); try { const invoice = await createInvoice(propertyId, reservationId, { dueDate }); setToast(`Draft invoice ${invoice.invoice_no} created.`); onCreated(invoice); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } finally { setSaving(false); } }
  return <Modal title="Create Invoice" onClose={onClose}><form onSubmit={(event) => void submit(event)} className="space-y-4 p-5"><Select label="Reservation" value={reservationId} onChange={setReservationId} options={eligible.map((item) => ({ value: item.id, label: `${item.resNo} · ${item.guest} · ${money(item.total, item.currency || "LKR")}` }))} placeholder="Select a saved reservation" /><Input label="Due date (optional)" type="date" value={dueDate} onChange={setDueDate} /><p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Room charges are copied from the reservation’s saved nightly rates. The backend generates the invoice number and totals.</p><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 font-semibold">Cancel</button><ActionButton type="submit" disabled={saving}>{saving ? "Creating..." : "Create Draft"}</ActionButton></div></form></Modal>;
}

function CreateCreditDialog({ propertyId, invoice, setToast, onClose, onCreated }: { propertyId: string; invoice: Invoice; setToast: (message: string) => void; onClose: () => void; onCreated: () => void }) {
  const [reasonCode, setReasonCode] = useState("billing_error"); const [reason, setReason] = useState(""); const [lineId, setLineId] = useState(invoice.line_items[0]?._id || ""); const [description, setDescription] = useState(""); const [quantity, setQuantity] = useState("1"); const [amount, setAmount] = useState(""); const [saving, setSaving] = useState(false);
  const selectedLine = invoice.line_items.find((line) => line._id === lineId);
  async function submit(event: FormEvent) { event.preventDefault(); if (!reason.trim() || !description.trim()) { setToast("Enter the credit reason and line description."); return; } const unitAmount = Number(amount); const parsedQuantity = Number(quantity); if (unitAmount <= 0 || parsedQuantity <= 0) { setToast("Credit quantity and amount must be greater than zero."); return; } setSaving(true); try { const response = await createCreditNote(propertyId, { invoiceId: invoice._id, reasonCode, reason: reason.trim(), invoiceLineId: lineId || undefined, category: selectedLine?.source_type || "other", description: description.trim(), quantity: parsedQuantity, unitAmount }); setToast(`Draft credit note ${response.credit.credit_note_no} created.`); onCreated(); } catch (error) { setToast(getFinancialApiErrorMessage(error)); } finally { setSaving(false); } }
  return <Modal title="Create Credit Note" onClose={onClose}><form onSubmit={(event) => void submit(event)} className="space-y-4 p-5"><p className="text-sm text-slate-600">Invoice {invoice.invoice_no} · Maximum remaining credit {money(invoice.grand_total - invoice.credited_amount, invoice.currency)}</p><Select label="Reason type" value={reasonCode} onChange={setReasonCode} options={["billing_error", "cancelled_service", "overcharge", "rate_correction", "guest_compensation", "tax_correction", "other"]} /><Input label="Reason" value={reason} onChange={setReason} /><Select label="Original invoice line" value={lineId} onChange={setLineId} options={invoice.line_items.map((line) => ({ value: line._id, label: `${line.description} · ${money(line.total_amount, invoice.currency)}` }))} /><Input label="Credit description" value={description} onChange={setDescription} /><div className="grid grid-cols-2 gap-3"><Input label="Quantity" type="number" min="0.01" step="0.01" value={quantity} onChange={setQuantity} /><Input label={`Amount per unit (${invoice.currency})`} type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} /></div><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 font-semibold">Cancel</button><ActionButton type="submit" disabled={saving}>{saving ? "Creating..." : "Create Draft Credit"}</ActionButton></div></form></Modal>;
}

function CreateRefundDialog({ propertyId, invoice, payments, refunds, maxAmount, setToast, onClose, onCreated }: { propertyId: string; invoice: Invoice; payments: InvoiceDetails["payments"]; refunds: InvoiceDetails["refunds"]; maxAmount: number; setToast: (message: string) => void; onClose: () => void; onCreated: () => void }) {
  const postedPayments = payments.filter((payment) => payment.status === "posted").map((payment) => ({
    ...payment,
    refundableAmount: Math.max(payment.amount - refunds.filter((refund) => refund.payment_id === payment._id && refund.status !== "voided").reduce((total, refund) => total + refund.amount, 0), 0)
  })).filter((payment) => payment.refundableAmount > 0);
  const [paymentId, setPaymentId] = useState(postedPayments[0]?._id || "");
  const selectedPayment = postedPayments.find((payment) => payment._id === paymentId);
  const allowedAmount = Math.min(maxAmount, selectedPayment?.refundableAmount || maxAmount);
  const [amount, setAmount] = useState(String(Math.min(maxAmount, postedPayments[0]?.refundableAmount || maxAmount)));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!paymentId) { setToast("Select the original payment."); return; }
    if (!Number.isFinite(value) || value <= 0) { setToast("Enter a refund amount greater than zero."); return; }
    if (value > allowedAmount) { setToast(`Refund cannot exceed ${money(allowedAmount, invoice.currency)} for this payment.`); return; }
    if (!reason.trim()) { setToast("Enter the reason for this refund."); return; }
    setSaving(true);
    try {
      const response = await createRefund(propertyId, {
        invoiceId: invoice._id,
        paymentId,
        amount: value,
        refundMethod: method as Parameters<typeof createRefund>[1]["refundMethod"],
        referenceNumber: reference.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined
      });
      setToast(`Refund ${response.refund.refund_no} created as pending.`);
      onCreated();
    } catch (error) {
      setToast(getFinancialApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return <Modal title="Create Refund" onClose={onClose}>
    <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Invoice {invoice.invoice_no} has {money(maxAmount, invoice.currency)} still available to refund. Creating this record does not send money; complete it after the refund is processed.</p>
      <Select label="Original payment" value={paymentId} onChange={(value) => { setPaymentId(value); const payment = postedPayments.find((item) => item._id === value); if (payment) setAmount(String(Math.min(maxAmount, payment.refundableAmount))); }} options={postedPayments.map((payment) => ({ value: payment._id, label: `${money(payment.refundableAmount, payment.currency)} available · ${readable(payment.payment_method)} · ${payment.payment_reference || "No reference"}` }))} />
      <div className="grid gap-3 sm:grid-cols-2"><Input label={`Amount (${invoice.currency})`} type="number" min="0.01" max={allowedAmount} step="0.01" value={amount} onChange={setAmount} /><Select label="Refund method" value={method} onChange={setMethod} options={["cash", "credit_card", "debit_card", "bank_transfer", "online", "other"]} /></div>
      <Input label="Refund reference (optional)" value={reference} onChange={setReference} />
      <Input label="Reason" value={reason} onChange={setReason} />
      <Input label="Notes (optional)" value={notes} onChange={setNotes} />
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded border border-line px-4 py-2 font-semibold">Cancel</button><ActionButton type="submit" disabled={saving}>{saving ? "Creating..." : "Create Pending Refund"}</ActionButton></div>
    </form>
  </Modal>;
}

function PageHeader({ title, description, loading, onRefresh, action }: { title: string; description: string; loading: boolean; onRefresh: () => void; action?: React.ReactNode }) { return <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex gap-2"><button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>{action}</div></header>; }
function Filters({ search, onSearch, status, statuses, onStatus }: { search: string; onSearch: (value: string) => void; status: string; statuses: string[]; onStatus: (value: string) => void }) { return <div className="grid gap-3 sm:grid-cols-[1fr_260px]"><label className="flex items-center gap-2 rounded-md border border-line bg-white px-3"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search number, guest, reservation or email" className="h-11 w-full bg-transparent outline-none" /></label><select value={status} onChange={(event) => onStatus(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3">{statuses.map((item) => <option key={item} value={item}>{readable(item)}</option>)}</select></div>; }
function MoneySummary({ invoice }: { invoice: Invoice }) { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Total", invoice.grand_total], ["Paid", invoice.paid_amount], ["Credited", invoice.credited_amount], ["Balance", invoice.balance_due], ["Refund Due", invoice.refund_due]].map(([label, value]) => <div key={String(label)} className={`rounded-md border p-3 ${label === "Refund Due" && Number(value) > 0 ? "border-amber-300 bg-amber-50" : "border-line bg-slate-50"}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-bold">{money(Number(value), invoice.currency)}</p></div>)}</div>; }
function DocumentStatus({ value }: { value: string }) { const tone = value === "paid" || value === "issued" || value === "completed" ? "bg-emerald-100 text-emerald-700" : value === "draft" || value === "pending" ? "bg-amber-100 text-amber-700" : value === "partially_paid" ? "bg-blue-100 text-blue-700" : value === "voided" ? "bg-slate-200 text-slate-600" : "bg-purple-100 text-purple-700"; return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{readable(value)}</span>; }
function EmptyState({ loading, empty, label }: { loading: boolean; empty: boolean; label: string }) { if (!loading && !empty) return null; return <p className="p-8 text-center text-sm text-slate-500">{loading ? "Loading from MongoDB..." : label}</p>; }
function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[70] bg-black/45"><aside className="ml-auto h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4"><div><h2 className="text-xl font-bold">{title}</h2>{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}</div><button type="button" onClick={onClose} className="rounded border border-line p-2" aria-label="Close"><X className="h-5 w-5"/></button></header>{children}</aside></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4"><section className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-lg bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded border border-line p-2"><X className="h-5 w-5"/></button></header>{children}</section></div>; }
function Input({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) { return <label className="grid gap-1 text-sm font-semibold">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 font-normal" /></label>; }
function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }>; placeholder?: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 font-normal">{placeholder ? <option value="">{placeholder}</option> : null}{options.map((option) => { const value = typeof option === "string" ? option : option.value; const label = typeof option === "string" ? readable(option) : option.label; return <option key={value} value={value}>{label}</option>; })}</select></label>; }
function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" {...props} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{children}</button>; }
function InfoGrid({ items }: { items: Array<[string, string]> }) { return <dl className="grid grid-cols-2 gap-4 rounded-md border border-line p-4 text-sm">{items.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>; }
function Muted({ children }: { children: React.ReactNode }) { return <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">{children}</p>; }
function readable(value: string) { return value.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function dateOnly(value: string) { return value ? value.slice(0, 10) : "-"; }
function dateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function money(value: number, currency: string) { return `${currency} ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
