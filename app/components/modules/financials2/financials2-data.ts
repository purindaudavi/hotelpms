import type { Invoice, CreditNote, Refund } from "@/app/lib/financial-documents-api";
import type { BackendFinancialTransaction } from "@/app/lib/transactions-api";
import type { BackendExpense, BackendPurchase } from "@/app/lib/purchases-expenses-api";
import type { Withdrawal } from "@/app/lib/withdrawals-api";

export type FinanceData = { invoices: Invoice[]; credits: CreditNote[]; refunds: Refund[]; withdrawals: Withdrawal[]; purchases: BackendPurchase[]; expenses: BackendExpense[]; transactions: BackendFinancialTransaction[] };
export const emptyFinanceData: FinanceData = { invoices: [], credits: [], refunds: [], withdrawals: [], purchases: [], expenses: [], transactions: [] };
export type RecordKind = "invoice" | "credit_note" | "refund" | "withdrawal" | "purchase" | "supplier_payment" | "expense" | "payment" | "night_audit" | "money_request" | "money_request_return" | "other";
export type FinanceSelection = { kind: RecordKind; id: string; invoiceId?: string };
export type Activity = FinanceSelection & { key: string; number: string; date: string; recordedAt?: string; party: string; reference: string; description: string; amount: number; currency: string; status: string; paymentStatus?: "paid" | "unpaid"; paymentMethod?: string; direction: "in" | "out" | "non_cash" | "review"; actor: string };
export const kindNames: Record<RecordKind, string> = { invoice: "Invoice", payment: "Guest payment", credit_note: "Credit note", refund: "Refund", withdrawal: "Withdrawal", purchase: "Bill", supplier_payment: "Supplier payment", expense: "Expense", night_audit: "Night Audit posting", money_request: "Staff payment", money_request_return: "Unused advance returned", other: "Other" };
export function pretty(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
export function money(amount: number, currency: string) { return `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
export function localToday() { const value = new Date(); return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
export function inDateRange(value: string, from: string, to: string) { const day = value.slice(0, 10); return (!from || day >= from) && (!to || day <= to); }
export function invoiceOwing(invoice: Invoice) { return !["draft", "voided", "credited"].includes(invoice.status) && invoice.balance_due > 0; }
export function isOverdue(due: string, today = localToday()) { return Boolean(due) && due.slice(0, 10) < today; }

function billPaymentStatus(bill?: BackendPurchase): Activity["paymentStatus"] {
  return bill?.status === "paid" ? "paid" : bill?.status === "to_be_paid" ? "unpaid" : undefined;
}
export function supplierPaymentMethod(purchase: BackendPurchase) {
  const method = purchase.payment_method?.trim();
  if (!method) return "Not specified";
  if (method.toLowerCase() === "other") return purchase.payment_method_details?.trim() ? `Other — ${purchase.payment_method_details.trim()}` : "Other (not specified)";
  return pretty(method);
}
export function activityMatchesStatus(activity: Activity, status: string) {
  return status === "all" || activity.status === status || activity.paymentStatus === status;
}

// Merge posted financial events with drafts/requests. A document represented by
// a transaction appears once; a supplier payment is its own separate event.
export function buildActivity(data: FinanceData): Activity[] {
  const invoices = new Map(data.invoices.map(item => [item._id, item]));
  const invoiceFor = (number: string, reservation: string) => data.invoices.find(item => item.invoice_no === number) || data.invoices.find(item => item.reservation_id === reservation);
  const rows: Activity[] = [];
  const represented = new Set<string>();
  for (const transaction of data.transactions) {
    const rawKind = String(transaction.source_type);
    const kind = (Object.hasOwn(kindNames, rawKind) ? rawKind : "other") as RecordKind;
    const credit = data.credits.find(item => kind === "credit_note" && item._id === transaction.source_id);
    const refund = data.refunds.find(item => kind === "refund" && item._id === transaction.source_id);
    const withdrawal = data.withdrawals.find(item => kind === "withdrawal" && item._id === transaction.source_id);
    const purchase = data.purchases.find(item => ["purchase", "supplier_payment"].includes(kind) && item._id === transaction.source_id);
    const expense = data.expenses.find(item => kind === "expense" && item._id === transaction.source_id);
    const invoice = kind === "invoice" ? invoices.get(transaction.source_id) : invoices.get(credit?.invoice_id || refund?.invoice_id || "") || invoiceFor(transaction.source_number, transaction.reservation_id || "");
    // Historical Night Audit inflow flags are not proof of receiving payment.
    const direction = kind === "night_audit" ? "review" : ["invoice", "credit_note", "purchase"].includes(kind) ? "non_cash" : transaction.direction === "in" ? "in" : transaction.direction === "out" ? "out" : "non_cash";
    rows.push({ key: `transaction:${transaction._id}`, kind, id: transaction.source_id, invoiceId: invoice?._id, number: transaction.source_number || transaction.transaction_no,
      date: transaction.transaction_date, recordedAt: transaction.created_at, party: withdrawal?.paid_to || purchase?.supplier_name || expense?.expense_type || credit?.guest_snapshot.name || invoice?.billing_snapshot.name || "—",
      reference: transaction.reservation_no || transaction.transaction_no, description: transaction.description, amount: transaction.amount, currency: transaction.currency,
      status: transaction.status, paymentStatus: kind === "purchase" ? billPaymentStatus(purchase) : undefined, paymentMethod: kind === "supplier_payment" && purchase ? supplierPaymentMethod(purchase) : undefined, direction, actor: transaction.created_by?.name || "System" });
    represented.add(`${rawKind}:${transaction.source_id}`);
  }
  function add(kind: RecordKind, id: string, fields: Omit<Activity, "kind" | "id" | "key">) {
    if (!represented.has(`${kind}:${id}`)) rows.push({ key: `${kind}:${id}`, kind, id, ...fields });
  }
  for (const item of data.invoices) add("invoice", item._id, { invoiceId: item._id, number: item.invoice_no, date: item.invoice_date, recordedAt: item.created_at, party: item.billing_snapshot.name, reference: item.reservation_no, description: item.notes || "Guest invoice", amount: item.grand_total, currency: item.currency, status: item.status, direction: "non_cash", actor: item.created_by?.name || "System" });
  for (const item of data.credits) add("credit_note", item._id, { invoiceId: item.invoice_id, number: item.credit_note_no, date: item.credit_date, recordedAt: item.created_at, party: item.guest_snapshot.name, reference: item.invoice_no, description: item.reason, amount: item.total_credit, currency: item.currency, status: item.status, direction: "non_cash", actor: item.created_by?.name || "System" });
  for (const item of data.refunds) add("refund", item._id, { invoiceId: item.invoice_id, number: item.refund_no, date: item.requested_at || item.created_at, recordedAt: item.created_at, party: invoices.get(item.invoice_id)?.billing_snapshot.name || "Guest", reference: item.invoice_no, description: item.reason, amount: item.amount, currency: item.currency, status: item.status, direction: "out", actor: item.requested_by?.name || "System" });
  for (const item of data.withdrawals) add("withdrawal", item._id, { number: item.withdrawal_no, date: item.status === "pending" ? item.requested_at || item.created_at : item.money_received_at, recordedAt: item.created_at, party: item.paid_to, reference: item.reference_number || "—", description: item.reason, amount: item.amount, currency: item.currency, status: item.status, direction: "out", actor: item.requested_by?.name || item.recorded_by?.name || "System" });
  for (const item of data.purchases) add("purchase", item._id, { number: item.purchase_no, date: item.purchase_date, recordedAt: item.created_at, party: item.supplier_name, reference: item.supplier_invoice_no, description: item.narration, amount: item.amount, currency: item.currency, status: item.status, paymentStatus: billPaymentStatus(item), direction: "non_cash", actor: "—" });
  for (const item of data.expenses.filter(item => !item.cash_request_id)) add("expense", item._id, { number: item.expense_no, date: item.expense_date, recordedAt: item.created_at, party: item.expense_type, reference: item.paid_using, description: item.description, amount: item.amount, currency: item.currency, status: item.status, direction: "out", actor: "—" });
  // Keep financial dates descending; within a day show the newest recorded event first.
  // Updates to older documents must not move them above newly recorded activity.
  const recordedTime = (row: Activity) => {
    const time = Date.parse(row.recordedAt || "");
    return Number.isFinite(time) ? time : Date.parse(row.date) || 0;
  };
  return rows.sort((a, b) => b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)) || recordedTime(b) - recordedTime(a) || b.key.localeCompare(a.key));
}

export type CashSummary = { currency: string; received: number; spent: number; refunded: number; withdrawn: number; outstanding: number; suppliers: number; pending: number; returned: number };
export function summarizeFinance(data: FinanceData, from = "", to = "", currency = "all"): CashSummary[] {
  const grouped = new Map<string, CashSummary>();
  const bucket = (code: string) => { if (!grouped.has(code)) grouped.set(code, { currency: code, received: 0, spent: 0, refunded: 0, withdrawn: 0, outstanding: 0, suppliers: 0, pending: 0, returned: 0 }); return grouped.get(code)!; };
  const allowed = (code: string, date: string) => (currency === "all" || code === currency) && inDateRange(date, from, to);
  for (const entry of data.transactions) {
    if (entry.status !== "posted" || !allowed(entry.currency, entry.transaction_date)) continue;
    const row = bucket(entry.currency);
    if (entry.source_type === "payment" && entry.direction === "in") row.received += entry.amount;
    else if (entry.source_type === "refund" && entry.direction === "out") row.refunded += entry.amount;
    else if (["withdrawal", "money_request"].includes(entry.source_type) && entry.direction === "out") row.withdrawn += entry.amount;
    else if (["expense", "supplier_payment"].includes(entry.source_type) && entry.direction === "out") row.spent += entry.amount;
  }
  for (const entry of data.transactions) if (entry.status === "posted" && entry.source_type === "money_request_return" && entry.direction === "in" && allowed(entry.currency, entry.transaction_date)) bucket(entry.currency).returned += entry.amount;
  for (const invoice of data.invoices) if (allowed(invoice.currency, invoice.invoice_date) && invoiceOwing(invoice)) bucket(invoice.currency).outstanding += invoice.balance_due;
  for (const item of data.purchases) if (allowed(item.currency, item.purchase_date) && item.status === "to_be_paid") bucket(item.currency).suppliers += item.amount;
  for (const item of data.withdrawals) if (allowed(item.currency, item.requested_at || item.created_at) && item.status === "pending") bucket(item.currency).pending += item.amount;
  for (const row of grouped.values()) for (const key of ["received", "spent", "refunded", "withdrawn", "outstanding", "suppliers", "pending", "returned"] as const) row[key] = Math.round((row[key] + Number.EPSILON) * 100) / 100;
  return [...grouped.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
