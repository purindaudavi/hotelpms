"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { getReservations } from "@/app/lib/bookings-api";
import type { Reservation } from "@/app/data/pms-data";
type Props = { propertyId: string; activePath: string };
type MoneyRow = { currency: string; collected: number; outstanding: number; expenses: number; payables: number; pending_refunds: number; pending_withdrawals: number };
const labels: Array<[Exclude<keyof MoneyRow, "currency">, string]> = [["collected", "Guest payments posted"], ["outstanding", "Unpaid invoice balance"], ["expenses", "Posted expenses"], ["payables", "Unpaid supplier purchases"], ["pending_refunds", "Pending refunds"], ["pending_withdrawals", "Pending withdrawals"]];
export function FinanceWorkspacePage({ propertyId, activePath }: Props) {
  const billingMode = activePath.startsWith("reservation/");
  const [rows, setRows] = useState<MoneyRow[]>([]), [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [search, setSearch] = useState(() => decodeURIComponent(activePath.split("/")[2] || ""));
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (billingMode) setReservations(await getReservations(propertyId));
      else setRows((await api.get<{ currencies: MoneyRow[] }>("/finance/overview", { params: { property_id: propertyId } })).data.currencies);
    } catch (failure) { setError(getApiErrorMessage(failure, "Could not load Finance records.")); setRows([]); setReservations([]); }
    finally { setLoading(false); }
  }, [billingMode, propertyId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const base = `/properties/${encodeURIComponent(propertyId)}`;
  const visible = reservations.filter(item => [item.id, item.resNo, item.guest, item.room].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <main className="space-y-5 p-4 lg:p-6"><header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-semibold">{billingMode ? "Reservation billing" : "Finance overview"}</h1><p className="mt-2 text-sm text-slate-500">{billingMode ? "Read-only stay details for invoicing and payment follow-up." : "Recorded payments, balances and spending across all dates. Each currency is shown separately."}</p></div><button disabled={loading} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button></header>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}{loading ? <p role="status" className="text-sm text-slate-500">Loading Finance records...</p> : null}
    {!billingMode ? <><div className="flex flex-wrap gap-3">{[["Invoices & payments", "financials/invoices"], ["Payables", "financials/payables"], ["Receivables", "financials/receivables"], ["Financial reports", "reports"]].map(([label, path]) => <Link key={path} href={`${base}/${path}`} className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-blue-600">{label}</Link>)}</div>{rows.map(row => <section key={row.currency} className="space-y-3"><h2 className="text-xl font-semibold">{row.currency}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{labels.map(([key, label]) => <article key={key} className="rounded-xl border border-line bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{row.currency} {row[key].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></article>)}</div></section>)}{!loading && !error && !rows.length ? <p className="rounded-xl border border-line bg-white p-6 text-slate-500">No financial records yet.</p> : null}<p className="text-sm text-slate-500">Payments posted are recorded guest receipts, before completed refunds. Pending requests do not count as money withdrawn. These figures do not represent a bank balance.</p></> : null}
    {billingMode ? <><label className="block max-w-xl text-sm font-semibold">Search reservation, guest or room<input aria-label="Search billing reservations" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white p-3" /></label><div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line">{["Reservation", "Guest", "Rooms", "Check-in", "Check-out", "Status", "Billing"].map(label => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id} className="border-b border-line last:border-0"><td className="px-4 py-4">{item.resNo}</td><td className="px-4 py-4">{item.guest}</td><td className="px-4 py-4">{item.room || "Unassigned"}</td><td className="whitespace-nowrap px-4 py-4">{item.checkIn}</td><td className="whitespace-nowrap px-4 py-4">{item.checkOut}</td><td className="whitespace-nowrap px-4 py-4">{item.status}</td><td className="px-4 py-4"><Link className="whitespace-nowrap font-semibold text-blue-600" href={`${base}/financials/invoices`}>Invoices & payments</Link></td></tr>)}</tbody></table>{!loading && !visible.length ? <p className="p-6 text-slate-500">No matching billing reservations.</p> : null}</div></> : null}
  </main>;
}
