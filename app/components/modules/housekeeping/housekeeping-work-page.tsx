"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { useHousekeepingAutoRefresh } from "@/app/lib/use-housekeeping-auto-refresh";
import { RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/app/lib/api";
import { getMyHousekeepingWork, updateMyCleaningTask, type MyHousekeepingWork, type MyCleaningTask } from "@/app/lib/housekeeping-work-api";
import { HkButton, RightDrawer, SegmentedTabs } from "./components/housekeeping-ui";
import { HousekeepingDashboard } from "./housekeeping-dashboard";
const tabs = ["Requests", "Assigned to me", "In progress", "Completed today"] as const;
type Tab = typeof tabs[number];
export function HousekeepingWorkPage({ propertyId, dashboard = false }: { propertyId: string; dashboard?: boolean }) {
  const [work, setWork] = useState<MyHousekeepingWork | null>(null);
  const [tab, setTab] = useState<Tab>("Assigned to me");
  const searchParams = useSearchParams();
  useEffect(() => { const target = searchParams.get("tab"); if (target === "requests") setTab("Requests"); else if (target === "assigned") setTab("Assigned to me"); }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [completeTask, setCompleteTask] = useState<MyCleaningTask | null>(null);
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState(false);
  const lock = useRef(false);
  const loadWork = useCallback(async (quiet: boolean, signal: AbortSignal) => {
    if (!quiet) setLoading(true);
    try { const result = await getMyHousekeepingWork(propertyId, signal); if (signal.aborted) return false; setWork(result); setError(""); return true; }
    catch (failure) { if (signal.aborted) return false; if (!quiet || (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0))) setWork(null); setError(getApiErrorMessage(failure, "Could not refresh your housekeeping tasks. Displayed tasks may be out of date.")); return false; }
    finally { if (!signal.aborted) setLoading(false); }
  }, [propertyId]);
  const { refresh, waitForRefresh } = useHousekeepingAutoRefresh(loadWork, lock);
  async function action(task: MyCleaningTask, kind: "claim" | "start" | "complete") {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await waitForRefresh();
      await updateMyCleaningTask(propertyId, task.room_id, kind, kind === "complete" ? notes.trim() : undefined);
      const refreshed = await refresh();
      setCompleteTask(null); setNotes("");
      if (kind === "claim") setTab("Assigned to me"); else if (kind === "start") setTab("In progress"); else setTab("Completed today");
      if (refreshed) setNotice(kind === "claim" ? "Request assigned to you." : kind === "start" ? "Cleaning started." : "Cleaning completed. Front Desk can see the updated room status.");
    } catch (failure) { await refresh(); setError(getApiErrorMessage(failure, "The task could not be updated. Refresh and try again.")); }
    finally { lock.current = false; setBusy(false); }
  }
  const counts = work ? [work.requests.length, work.assigned.length, work.in_progress.length, work.completed_today.length] : [0, 0, 0, 0];
  const tasks = !work ? [] : tab === "Requests" ? work.requests : tab === "Assigned to me" ? work.assigned : work.in_progress;
  const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { timeZone: work?.timezone || "Asia/Colombo", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  if (dashboard) return <main className="space-y-5 p-4 lg:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Housekeeping overview</h1><p className="mt-2 text-sm text-slate-500">{work ? `${work.attendant.name} · ${work.date}` : "Requests, your work and team assignments"}</p></div><HkButton disabled={busy || loading} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh tasks</HkButton></header>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    {loading ? <p role="status" className="text-sm text-slate-500">Refreshing your tasks...</p> : null}
    
    {work ? <HousekeepingDashboard propertyId={propertyId} work={work} busy={busy || loading} onClaim={task => void action(task, "claim")} /> : null}
  </main>;
  return <main className="space-y-5 p-4 lg:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">My housekeeping</h1><p className="mt-2 text-sm text-slate-500">{work ? `${work.attendant.name} · ${work.attendant.employee_number} · ${work.date}` : "Your requests, assigned rooms and cleaning progress"}</p></div><HkButton disabled={busy || loading} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh tasks</HkButton></header>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    {loading ? <p role="status" className="text-sm text-slate-500">Refreshing your tasks...</p> : null}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tabs.map((label, index) => <button type="button" key={label} onClick={() => { setTab(label); setHistory(false); }} className="rounded-xl border border-line bg-white p-5 text-left"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-3xl">{counts[index]}</strong></button>)}</div>
    <SegmentedTabs tabs={tabs} active={tab} onChange={value => { setTab(value); setHistory(false); }} />
    <p className="text-sm text-slate-500">Updates every 30 seconds while this tab is visible.</p>
    {work ? tab === "Completed today" ? <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{history ? "Recent completed history" : "Completed today"}</h2><HkButton onClick={() => setHistory(value => !value)}>{history ? "Today only" : "Recent history"}</HkButton></div>
      {(history ? work.recent_completed : work.completed_today).map(item => <article key={item.id} className="rounded-xl border border-line bg-white p-5"><h3 className="font-bold">Room {item.room_number}</h3><p className="mt-1 text-sm text-slate-500">{item.room_type} · Completed {dateTime(item.completed_at)}</p>{item.notes ? <p className="mt-3 whitespace-pre-wrap break-words text-sm">{item.notes}</p> : null}</article>)}
      {!(history ? work.recent_completed : work.completed_today).length ? <p className="rounded-xl border border-line bg-white p-6 text-slate-500">No completed tasks {history ? "in recent history" : "today"}.</p> : null}
    </section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tasks.map(task => <article key={task.id} className="space-y-3 rounded-xl border border-line bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-xl font-bold">Room {task.room_number}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{task.priority} priority</span></div><p className="text-sm text-slate-500">{task.room_type}{task.floor ? ` · ${task.floor}` : ""}</p>{task.notes ? <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p> : null}
      {task.blocked_reason ? <p className="text-sm text-amber-700">{task.blocked_reason}</p> : null}
      <HkButton variant={tab === "In progress" ? "green" : "primary"} disabled={busy || loading || Boolean(task.blocked_reason) || (tab !== "In progress" && work.in_progress.length > 0)} onClick={() => { if (tab === "In progress") { setCompleteTask(task); setNotes(""); } else void action(task, tab === "Requests" ? "claim" : "start"); }}>{tab === "Requests" ? "Claim request" : tab === "Assigned to me" ? "Start cleaning" : "Complete cleaning"}</HkButton>
    </article>)}{!tasks.length ? <p className="col-span-full rounded-xl border border-line bg-white p-6 text-slate-500">{tab === "Requests" ? "No unassigned requests right now." : tab === "Assigned to me" ? "No rooms assigned to you yet." : "You are not currently cleaning a room."}</p> : null}</section> : null}
    {work?.in_progress.length ? <p className="text-sm text-slate-500">Finish your current cleaning task before starting or claiming another room.</p> : null}
    {completeTask ? <RightDrawer title={`Complete cleaning · ${completeTask.room_number}`} onClose={() => { if (!busy) setCompleteTask(null); }} width="max-w-xl"><form className="space-y-5 p-6" onSubmit={event => { event.preventDefault(); void action(completeTask, "complete"); }}>
      <p className="text-sm text-slate-500">Confirm that cleaning is finished. This does not perform an inspection.</p>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<label className="grid gap-2 text-sm font-semibold">Completion notes (optional)<textarea maxLength={1000} rows={4} disabled={busy} value={notes} onChange={event => setNotes(event.target.value)} className="rounded-md border border-line bg-white p-3 font-normal" /></label><div className="flex justify-end gap-3"><HkButton disabled={busy} onClick={() => setCompleteTask(null)}>Cancel</HkButton><HkButton variant="green" type="submit" disabled={busy}>{busy ? "Saving..." : "Confirm completed"}</HkButton></div>
    </form></RightDrawer> : null}
  </main>;
}
