import Link from "next/link";
import type { MyCleaningTask, MyHousekeepingWork } from "@/app/lib/housekeeping-work-api";
import { HkButton } from "./components/housekeeping-ui";

export function HousekeepingDashboard({ propertyId, work, busy, onClaim }: {
  propertyId: string; work: MyHousekeepingWork; busy: boolean; onClaim: (task: MyCleaningTask) => void;
}) {
  const board = `/properties/${encodeURIComponent(propertyId)}/housekeeping/board`;
  const own = [...work.in_progress, ...work.assigned];
  const team = work.team_assignments ?? [];
  const linkClass = "inline-flex min-h-11 items-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-blue-600";
  return <>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Pending requests", work.requests.length], ["Assigned to me", work.assigned.length], ["My work in progress", work.in_progress.length], ["Completed by me today", work.completed_today.length]].map(([label, count]) => <div key={label} className="min-w-0 rounded-xl border border-line bg-white p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl">{count}</strong></div>)}
    </div>
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
      <section aria-labelledby="cleaning-requests-heading" className="min-w-0 space-y-3"><div><h2 id="cleaning-requests-heading" className="text-xl font-bold">Housekeeping requests</h2><p className="mt-1 text-sm text-slate-500">Waiting for an attendant. Claim a request to take it on.</p></div>
        {work.requests.map(task => <article key={task.id} className="space-y-3 rounded-xl border border-line bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-lg font-bold">Room {task.room_number}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{task.priority} priority</span></div><p className="text-sm text-slate-500">{task.room_type}{task.floor ? ` · ${task.floor}` : ""}</p>{task.notes ? <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p> : null}<HkButton variant="primary" disabled={busy || !!task.blocked_reason || work.in_progress.length > 0} onClick={() => onClaim(task)}>Claim request</HkButton></article>)}
        {!work.requests.length ? <p className="rounded-xl border border-line bg-white p-5 text-sm text-slate-500">No pending requests right now.</p> : null}
        {work.in_progress.length > 0 ? <p className="text-sm text-slate-500">Finish your current cleaning task before claiming another room.</p> : null}
      </section>
      <section aria-labelledby="my-cleaning-heading" className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="my-cleaning-heading" className="text-xl font-bold">My housekeeping work</h2><p className="mt-1 text-sm text-slate-500">Your assigned rooms and current cleaning job.</p></div><Link href={board} className={linkClass}>Open my work</Link></div>
        {own.map(task => <article key={task.id} className="space-y-2 rounded-xl border border-line bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Room {task.room_number}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{task.status === "in_progress" ? "In progress" : "Assigned to you"}</span></div><p className="text-sm text-slate-500">{task.room_type}</p>{task.notes ? <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p> : null}{task.blocked_reason ? <p className="text-sm text-amber-700">{task.blocked_reason}</p> : null}</article>)}
        {!own.length ? <p className="rounded-xl border border-line bg-white p-5 text-sm text-slate-500">No rooms assigned to you yet.</p> : null}
      </section>
    </div>
    <section aria-labelledby="team-cleaning-heading" className="min-w-0 space-y-3"><div><h2 id="team-cleaning-heading" className="text-xl font-bold">Team assignments</h2><p className="mt-1 text-sm text-slate-500">See who is handling other rooms. Only your own tasks can be updated.</p></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{team.map(task => <article key={task.id} className="space-y-2 rounded-xl border border-line bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Room {task.room_number}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{task.status === "in_progress" ? "In progress" : "Assigned"}</span></div><p className="text-sm text-slate-500">{task.room_type}</p><p className="break-words text-sm">Assigned to <strong>{task.attendant_name}</strong></p></article>)}</div>
      {!team.length ? <p className="rounded-xl border border-line bg-white p-5 text-sm text-slate-500">No active assignments for other attendants.</p> : null}
    </section>
  </>;
}
