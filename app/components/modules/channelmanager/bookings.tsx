"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Filter, Printer, RefreshCw, Search, X } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";

type ChannelBooking = {
  id: string;
  reservation_no: string;
  unique_id: string;
  property_name: string;
  source: string;
  provider: string;
  status: string;
  customer: string;
  booked_at: string;
  check_in: string;
  check_out: string;
  rooms_count: number;
  currency: string;
  total: number;
  paid: number;
  pms_accepted: boolean;
  received_at: string | null;
};

type BookingDetail = ChannelBooking & {
  booker: { name?: string; email?: string; phone?: string; country?: string };
  rooms: { room_type_name: string; room_number: string; rate_plan_name: string; meal_plan: string; nightly_rate: number }[];
  guest_remarks: string;
  event_id: string;
};

type BookingHistory = {
  _id: string;
  action: string;
  description: string;
  created_at: string;
  actor?: { name?: string };
  changes?: { field: string; from?: unknown; to?: unknown }[];
};

type BookingResponse = { bookings: ChannelBooking[]; total: number; page: number; pages: number; providers: string[] };
type DetailTab = "info" | "revisions" | "timeline";

function date(value: string | null | undefined) { return value ? value.slice(0, 10) : "—"; }
function dateTime(value: string | null | undefined) { return value ? new Date(value).toLocaleString() : "—"; }
function money(amount: number, currency: string) { return `${currency || ""} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim(); }
function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function ChannelManagerBookingsPage({ propertyId, setToast }: { propertyId: string; setToast: (message: string) => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<BookingResponse>({ bookings: [], total: 0, page: 1, pages: 1, providers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<BookingResponse>("/channel-bookings", {
        params: { property_id: propertyId, search, provider, status, page, limit: 10 }
      });
      setResult(response.data);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not load imported channel bookings."));
    } finally {
      setLoading(false);
    }
  }, [propertyId, search, provider, status, page]);

  useEffect(() => { void refresh(); }, [refresh]);

  function exportCsv() {
    const rows = [
      ["Status", "Unique ID", "PMS Reservation", "Property", "Customer", "Check-in", "Check-out", "Rooms Count", "PMS Accepted", "Currency", "Total"],
      ...result.bookings.map((booking) => [booking.status, booking.unique_id, booking.reservation_no, booking.property_name, booking.customer, date(booking.check_in), date(booking.check_out), booking.rooms_count, booking.pms_accepted ? "Yes" : "No", booking.currency, booking.total])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `channel-bookings-page-${result.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Current page of imported bookings exported");
  }

  return <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
    <section className="rounded-md border border-line bg-white">
      <div className="border-b border-line px-5 py-4"><h1 className="text-xl font-semibold">Channel Bookings</h1><p className="mt-1 text-sm text-slate-500">Imported reservations saved in this property’s PMS database. No browser-local sample bookings are shown.</p></div>
      <div className="flex flex-wrap items-center border-b border-line">
        <label className="relative min-w-[260px] flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 text-slate-400 -translate-y-1/2" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search booking, guest, or reference" className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm" /></label>
        <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50"><Filter className="h-4 w-4" />Advanced Search</button>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
        <button type="button" onClick={exportCsv} disabled={!result.bookings.length} className="m-2 inline-flex h-10 items-center gap-2 rounded border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" />Export page</button>
      </div>
      {advancedOpen ? <div className="grid gap-4 border-b border-line bg-slate-50 px-5 py-4 md:grid-cols-3">
        <label className="block text-sm font-semibold">Source / OTA<select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }} className="focus-ring mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"><option value="">All imported providers</option>{result.providers.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-semibold">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="focus-ring mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal"><option value="">All statuses</option>{["confirmed", "tentative", "checked_in", "checked_out", "cancelled", "no_show", "blocked"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label className="block text-sm font-semibold">Property<input value={result.bookings[0]?.property_name || propertyId} disabled className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal text-slate-500" /></label>
      </div> : null}
      {error ? <p role="alert" className="m-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead><tr className="border-b border-line bg-white text-slate-900">{["Status", "Unique ID", "Property", "Customer", "Dates", "Rooms Count", "PMS Ack", "Total", "Actions"].map((heading) => <th key={heading} className={`px-5 py-4 font-semibold ${heading === "Actions" ? "text-right" : ""}`} title={heading === "PMS Ack" ? "PMS accepted and saved the imported reservation; this is not an OTA acknowledgement." : undefined}>{heading}</th>)}</tr></thead><tbody>
        {result.bookings.map((booking) => <tr key={booking.id} className="border-b border-line last:border-0"><td className="px-5 py-4 capitalize">{booking.status.replaceAll("_", " ")}</td><td className="px-5 py-4 font-medium">{booking.unique_id}</td><td className="px-5 py-4">{booking.property_name}</td><td className="px-5 py-4">{booking.customer}</td><td className="px-5 py-4">{date(booking.check_in)} → {date(booking.check_out)}</td><td className="px-5 py-4">{booking.rooms_count}</td><td className="px-5 py-4">{booking.pms_accepted ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Accepted</span> : "Pending"}</td><td className="px-5 py-4 whitespace-nowrap">{money(booking.total, booking.currency)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedId(booking.id)} className="font-semibold text-blue-500 hover:text-blue-700">View</button></td></tr>)}
      </tbody></table></div>
      {loading ? <p className="px-5 py-10 text-center text-sm text-slate-500">Loading imported bookings…</p> : !result.bookings.length ? <p className="px-5 py-16 text-center text-sm text-slate-500">No imported channel bookings match these filters. Test bookings appear here after the provider sends them to the PMS.</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-sm"><span className="text-slate-500">{result.total} imported booking{result.total === 1 ? "" : "s"} · Page {result.page} of {result.pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="inline-flex items-center gap-1 rounded border border-line px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button><button type="button" disabled={page >= result.pages || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded border border-line px-3 py-2 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button></div></div>
    </section>
    {selectedId ? <BookingDrawer propertyId={propertyId} bookingId={selectedId} onClose={() => setSelectedId("")} setToast={setToast} /> : null}
  </main>;
}

function BookingDrawer({ propertyId, bookingId, onClose, setToast }: { propertyId: string; bookingId: string; onClose: () => void; setToast: (message: string) => void }) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [tab, setTab] = useState<DetailTab>("info");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const revisions = useMemo(() => history.filter((entry) => entry.changes?.length), [history]);

  useEffect(() => {
    let active = true;
    api.get<{ booking: BookingDetail; history: BookingHistory[] }>(`/channel-bookings/${bookingId}`, { params: { property_id: propertyId } })
      .then((response) => { if (active) { setBooking(response.data.booking); setHistory(response.data.history); } })
      .catch((failure) => { if (active) setError(getApiErrorMessage(failure, "Could not load booking details.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, bookingId]);

  function copy(value: string) {
    void navigator.clipboard?.writeText(value);
    setToast("Booking reference copied");
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-black/45"><button type="button" aria-label="Close booking details" className="hidden flex-1 bg-black/20 lg:block" onClick={onClose} /><aside className="flex h-full w-full max-w-[680px] flex-col bg-white shadow-2xl">
    <header className="border-b border-line px-6 py-5"><div className="flex items-center gap-4"><button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">Booking {booking?.unique_id || "details"}</h2><p className="mt-1 text-xs text-slate-500">Imported channel reservation · {booking?.source || "Loading"}</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm"><Printer className="h-4 w-4" />Print</button></div></header>
    {booking ? <nav className="flex gap-6 border-b border-line px-6 text-sm font-semibold">{(["info", "revisions", "timeline"] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 py-4 capitalize ${tab === value ? "border-blue-500 text-blue-500" : "border-transparent text-slate-500"}`}>{value}</button>)}</nav> : null}
    <div className="flex-1 overflow-y-auto px-6 py-6 text-sm">{loading ? <p className="text-slate-500">Loading booking details…</p> : error ? <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p> : booking ? <>
      {tab === "info" ? <div className="space-y-6">
        <section><h3 className="border-b border-line pb-2 text-base font-semibold">Reservation</h3><dl className="mt-3 space-y-2"><Detail label="Status" value={booking.status.replaceAll("_", " ")} /><Detail label="Source" value={booking.source} /><Detail label="PMS reservation" value={booking.reservation_no} /><Detail label="Provider reference" value={<span className="inline-flex items-center gap-2">{booking.unique_id}<button type="button" onClick={() => copy(booking.unique_id)} aria-label="Copy provider reference" className="text-blue-500"><Copy className="h-4 w-4" /></button></span>} /><Detail label="Property" value={booking.property_name} /><Detail label="Booked at" value={dateTime(booking.booked_at)} /><Detail label="Received by PMS" value={dateTime(booking.received_at)} /><Detail label="PMS acknowledgement" value="Accepted and saved; OTA acknowledgement is not tracked" />{booking.event_id ? <Detail label="Provider event ID" value={booking.event_id} /> : null}</dl></section>
        <section><h3 className="border-b border-line pb-2 text-base font-semibold">Stay and guest</h3><dl className="mt-3 space-y-2"><Detail label="Check-in" value={date(booking.check_in)} /><Detail label="Check-out" value={date(booking.check_out)} /><Detail label="Rooms" value={String(booking.rooms_count)} /><Detail label="Guest" value={booking.booker?.name || booking.customer} /><Detail label="Email" value={booking.booker?.email || "—"} /><Detail label="Phone" value={booking.booker?.phone || "—"} /><Detail label="Country" value={booking.booker?.country || "—"} /></dl></section>
        <section><h3 className="border-b border-line pb-2 text-base font-semibold">Room and rate</h3><div className="mt-3 space-y-3">{booking.rooms.map((room, index) => <div key={`${room.room_type_name}-${index}`} className="rounded border border-line p-3"><p className="font-semibold">{room.room_type_name || "Room"} · {room.room_number || "Physical room unassigned"}</p><p className="mt-1 text-slate-500">{room.rate_plan_name || "No rate plan"} · {room.meal_plan || "No meal plan"} · {money(room.nightly_rate, booking.currency)} nightly</p></div>)}</div></section>
        <section><h3 className="border-b border-line pb-2 text-base font-semibold">Financials</h3><dl className="mt-3 space-y-2"><Detail label="Total" value={money(booking.total, booking.currency)} /><Detail label="Paid" value={money(booking.paid, booking.currency)} /><Detail label="Remaining" value={money(Math.max(0, booking.total - booking.paid), booking.currency)} /></dl><p className="mt-2 text-xs text-slate-500">An invoice or non-cash posting is not proof of guest payment.</p></section>
        {booking.guest_remarks ? <section><h3 className="border-b border-line pb-2 text-base font-semibold">Guest remarks</h3><p className="mt-3 whitespace-pre-wrap">{booking.guest_remarks}</p></section> : null}
      </div> : null}
      {tab === "revisions" ? revisions.length ? <div className="space-y-4">{revisions.map((entry) => <article key={entry._id} className="rounded border border-line p-4"><p className="font-semibold">{entry.description}</p><p className="mt-1 text-xs text-slate-500">{dateTime(entry.created_at)}</p><ul className="mt-3 space-y-2">{entry.changes?.map((change, index) => <li key={`${entry._id}-${index}`} className="text-slate-600"><b>{change.field}:</b> {String(change.from ?? "—")} → {String(change.to ?? "—")}</li>)}</ul></article>)}</div> : <p className="text-slate-500">No reservation field changes have been recorded. A provider revision feed is not connected.</p> : null}
      {tab === "timeline" ? history.length ? <ol className="space-y-4">{history.map((entry) => <li key={entry._id} className="border-l-2 border-blue-500 pl-4"><p className="font-semibold">{entry.description}</p><p className="mt-1 text-xs text-slate-500">{dateTime(entry.created_at)} · {entry.actor?.name || "System"}</p></li>)}</ol> : <p className="text-slate-500">No audit events recorded for this reservation.</p> : null}
    </> : null}</div>
  </aside></div>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) { return <div className="grid grid-cols-[150px_1fr] gap-3"><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></div>; }
