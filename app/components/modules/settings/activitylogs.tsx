"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw, Search } from "lucide-react";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { usePropertyAccess } from "@/app/components/property-access-gate";

type Filters = { search: string; user: string; entity_type: string; date_from: string; date_to: string };
type Log = { id: string; created_at: string; entity_type: string; entity_id: string; action: string; description: string;
  actor: { user_id: string; name: string; email: string }; changes: { field: string; from: unknown; to: unknown }[] };
type Result = { logs: Log[]; total: number; page: number; pages: number; timezone: string; entity_types: string[] };
const emptyFilters: Filters = { search: "", user: "", entity_type: "", date_from: "", date_to: "" };
const fieldClass = "focus-ring h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm";
const buttonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold disabled:opacity-50";
const names: Record<string, string> = { purchase: "Bills", funds_opening: "Opening balances", housekeeping_task: "Housekeeping", financial_transaction: "Transactions", money_request: "Money requests", business_block: "Business blocks" };
const pretty = (value: string) => names[value] || value.replaceAll("_", " ").replace(/^./, s => s.toUpperCase());
const display = (value: unknown) => value === null || value === undefined ? "Not set" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
const time = (value: string, timezone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(new Date(value));

export function ActivityLogsPage({ propertyId }: { propertyId: string }) {
  const { role } = usePropertyAccess();
  const allowed = role === "owner" || role === "administrator";
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [query, setQuery] = useState({ filters: emptyFilters, page: 1 });
  const [snapshot, setSnapshot] = useState<{ key: string; data: Result; at: Date } | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [automatic, setAutomatic] = useState(true), [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState("");
  const exportController = useRef<AbortController | null>(null);
  const key = `${propertyId}:${JSON.stringify(query)}`;
  const current = snapshot?.key === key ? snapshot : null;
  const data = current?.data;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(q => JSON.stringify(q.filters) === JSON.stringify(draft) ? q : { filters: draft, page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    exportController.current?.abort(); setExporting(false); setExportError("");
    return () => exportController.current?.abort();
  }, [key, allowed]);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let inFlight = false;
    const load = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true; setLoading(true); setError("");
      try {
        const response = await api.get<Result>("/activity-logs", { params: { property_id: propertyId, ...query.filters, page: query.page, limit: 50 }, signal: controller.signal });
        if (!controller.signal.aborted) {
          if (query.page > response.data.pages) { setQuery(q => ({ ...q, page: response.data.pages })); return; }
          setSnapshot({ key, data: response.data, at: new Date() });
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          if ([401, 403].includes((e as { response?: { status?: number } })?.response?.status || 0)) setSnapshot(null);
          setError(getApiErrorMessage(e, "Could not load activity logs. Try Refresh."));
        }
      } finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const refreshVisible = () => { if (automatic && !document.hidden) void load(); };
    const timer = setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible); document.addEventListener("visibilitychange", refreshVisible);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refreshVisible); document.removeEventListener("visibilitychange", refreshVisible); };
  }, [allowed, propertyId, query, key, automatic, revision]);

  const download = async () => {
    if (exporting) return;
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setExportError("");
    try {
      const response = await api.get<Blob>("/activity-logs/export", { params: { property_id: propertyId, ...query.filters }, responseType: "blob", signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(response.data), a = document.createElement("a");
      a.href = url; a.download = "activity-logs.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (controller.signal.aborted) return;
      let message = getApiErrorMessage(e, "Could not export activity logs. Try a smaller date range.");
      const blob = (e as { response?: { data?: unknown } })?.response?.data;
      if (blob instanceof Blob) { try { message = JSON.parse(await blob.text()).message || message; } catch { /* Use the fallback for non-JSON failures. */ } }
      if (!controller.signal.aborted) setExportError(message);
    } finally { if (!controller.signal.aborted) setExporting(false); }
  };

  if (!allowed) return <main className="p-6"><h1 className="text-2xl font-bold">Activity Logs</h1><p className="mt-3 text-slate-500">Only the property Owner or Administrator can view this activity history.</p></main>;
  const changeFilter = (name: keyof Filters, value: string) => setDraft(f => ({ ...f, [name]: value }));
  const filtersPending = JSON.stringify(draft) !== JSON.stringify(query.filters);

  return <main className="settings-appearance min-w-0 space-y-5 p-4 lg:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Activity Logs</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">See who changed reservations, financial records, housekeeping and property settings.</p></div>
      <div className="flex flex-wrap gap-2"><Link href={`/properties/${propertyId}/night-audit`} className={buttonClass}>Open Night Audit</Link><button disabled={loading || filtersPending} onClick={() => setRevision(v => v + 1)} className={buttonClass}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button><button disabled={exporting || !data || filtersPending || !!error} onClick={() => void download()} className={`${buttonClass.replace("bg-white", "bg-ink")} settings-primary-action text-white`}><Download className="h-4 w-4" />{exporting ? "Exporting…" : "Export CSV"}</button></div>
    </header>
    <section className="space-y-4 rounded-xl border border-line bg-white p-5" aria-label="Activity filters">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="min-w-0"><span className="mb-2 flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4" />Search activity</span><input type="search" maxLength={200} placeholder="Reservation, invoice, action or description" value={draft.search} onChange={e => changeFilter("search", e.target.value)} className={fieldClass} /></label>
        <label className="min-w-0"><span className="mb-2 block text-sm font-semibold">User</span><input maxLength={200} placeholder="Name or email" value={draft.user} onChange={e => changeFilter("user", e.target.value)} className={fieldClass} /></label>
        <label className="min-w-0"><span className="mb-2 block text-sm font-semibold">Module</span><select value={draft.entity_type} onChange={e => changeFilter("entity_type", e.target.value)} className={fieldClass}><option value="">All modules</option>{(data?.entity_types || snapshot?.data.entity_types || []).map(s => <option value={s} key={s}>{pretty(s)}</option>)}</select></label>
        <label className="min-w-0"><span className="mb-2 block text-sm font-semibold">From date</span><input type="date" value={draft.date_from} onChange={e => changeFilter("date_from", e.target.value)} className={fieldClass} /></label>
        <label className="min-w-0"><span className="mb-2 block text-sm font-semibold">To date</span><input type="date" value={draft.date_to} onChange={e => changeFilter("date_to", e.target.value)} className={fieldClass} /></label>
        <div className="flex flex-wrap items-end gap-4"><button className={buttonClass} onClick={() => { setDraft(emptyFilters); setQuery({ filters: emptyFilters, page: 1 }); }}>Clear filters</button><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={automatic} onChange={e => setAutomatic(e.target.checked)} />Auto-refresh</label></div>
      </div>
      <p className="text-xs text-slate-500">Times and date filters use {data?.timezone || "the hotel timezone"}. Auto-refresh checks every 30 seconds while this tab is visible. CSV exports all matching records, up to 5,000.</p>
    </section>
    {error && <p role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-600">{error}{data && " Previously loaded records are shown below."}</p>}
    {exportError && <p role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-600">{exportError}</p>}
    <section aria-busy={loading} className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4"><h2 className="font-semibold">{data ? `${data.total.toLocaleString()} ${data.total === 1 ? "activity" : "activities"}` : "Activity history"}</h2><span className="text-xs text-slate-500" role="status">{loading || filtersPending ? "Loading activities…" : current ? `Updated ${current.at.toLocaleTimeString()}` : ""}</span></div>
      {data?.logs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-line text-slate-500">{["Date / time", "Performed by", "Module", "Activity"].map(label => <th scope="col" key={label} className="px-5 py-4 font-semibold">{label}</th>)}</tr></thead><tbody>{data.logs.map(log => <tr key={log.id} className="border-b border-line align-top last:border-0">
        <td className="w-48 whitespace-nowrap px-5 py-5"><time dateTime={log.created_at}>{time(log.created_at, data.timezone)}</time></td>
        <td className="max-w-[220px] px-5 py-5"><p className="break-words font-semibold">{log.actor.name}</p>{log.actor.email && <p className="mt-1 break-all text-xs text-slate-500">{log.actor.email}</p>}</td>
        <td className="px-5 py-5"><span className="inline-block whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{pretty(log.entity_type)}</span></td>
        <td className="min-w-[320px] max-w-2xl px-5 py-5"><p className="font-semibold">{pretty(log.action)}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-500">{log.description}</p>
          <details className="mt-3"><summary className="w-fit cursor-pointer font-medium text-blue-600">View details{log.changes.length ? ` (${log.changes.length} ${log.changes.length === 1 ? "change" : "changes"})` : ""}</summary><div className="mt-3 space-y-3 rounded-lg border border-line p-3"><p className="break-all text-xs text-slate-500">Record ID: {log.entity_id}</p>{log.actor.user_id && <p className="break-all text-xs text-slate-500">User ID: {log.actor.user_id}</p>}{log.changes.length ? log.changes.map((change, index) => <div key={`${change.field}-${index}`} className="border-t border-line pt-3"><p className="break-words font-semibold">{pretty(change.field)}</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><div><span className="text-xs text-slate-500">Before</span><pre className="mt-1 whitespace-pre-wrap break-all font-sans text-xs">{display(change.from)}</pre></div><div><span className="text-xs text-slate-500">After</span><pre className="mt-1 whitespace-pre-wrap break-all font-sans text-xs">{display(change.to)}</pre></div></div></div>) : <p className="text-xs text-slate-500">No field comparison was saved for this event.</p>}</div></details>
        </td>
      </tr>)}</tbody></table></div> : <p className="px-5 py-14 text-center text-sm text-slate-500">{loading || filtersPending ? "Loading activities…" : error ? "Activity records could not be loaded." : "No recorded activities match these filters."}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><p className="text-slate-500">Page {data?.page || query.page} of {data?.pages || 1}</p><div className="flex gap-2"><button disabled={loading || filtersPending || query.page <= 1} className={buttonClass} onClick={() => setQuery(q => ({ ...q, page: q.page - 1 }))}>Previous</button><button disabled={loading || filtersPending || !data || query.page >= data.pages} className={buttonClass} onClick={() => setQuery(q => ({ ...q, page: q.page + 1 }))}>Next</button></div></footer>
    </section>
    <p className="max-w-3xl text-xs leading-5 text-slate-500">This history shows events already saved by the PMS. Actions that were never logged cannot be reconstructed. Historical user names are kept as recorded; this page does not edit or delete activity records.</p>
  </main>;
}
