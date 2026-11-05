"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePropertyAccess } from "@/app/components/property-access-gate";
import { groupHousekeepingJobs, type HousekeepingJob } from "@/app/lib/housekeeping-activity-jobs";
import { Plus, RefreshCw } from "lucide-react";
import { property, type Room } from "@/app/data/pms-data";
import type { HousekeepingAction, HousekeepingActivity, HousekeepingAttendant, HousekeepingBoardTab, HousekeepingStatus, HousekeepingTask } from "../types";
import type { HousekeepingModuleProps } from "../types";
import {
  activityDateKey,
  formatActivityTime,
  statusClass,
  statusPillClass
} from "../utils";
import { Field, HkButton, RightDrawer, SearchField, SegmentedTabs } from "../components/housekeeping-ui";

type BoardProps = HousekeepingModuleProps & {
  roomStatuses: Record<string, HousekeepingStatus>;
  attendantByRoom: Record<string, string>;
  attendants: HousekeepingAttendant[];
  activities: HousekeepingActivity[];
  tasksByRoom: Record<string, HousekeepingTask>;
  busy: boolean;
  requestCleaning: (roomId: string, roomCode: string, details: { priority: string; notes: string }) => Promise<boolean>;
  showDayEnd: boolean;
  setShowDayEnd: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string;
  refreshHousekeeping: () => Promise<void>;
  startCleaning: (roomId: string, roomCode: string) => Promise<boolean>;
  completeCleaning: (roomId: string, roomCode: string) => Promise<boolean>;
  assignAttendant: (roomId: string, roomCode: string, attendantId: string) => Promise<boolean>;
  createAttendant: (attendant: Omit<HousekeepingAttendant, "id">) => Promise<void>;
};

const boardTabs: HousekeepingBoardTab[] = ["All", "Requests", "Clean", "Dirty", "Occupied", "WIP", "Available", "Activity"];

export function HousekeepingBoardPage({
  roomList,
  setToast,
  roomStatuses,
  attendantByRoom,
  attendants,
  activities,
  tasksByRoom,
  busy,
  requestCleaning,
  showDayEnd,
  setShowDayEnd,
  loading,
  error,
  refreshHousekeeping,
  startCleaning,
  completeCleaning,
  assignAttendant: saveAssignment,
  createAttendant
}: BoardProps) {
  const frontDesk = usePropertyAccess().role === "front_desk";
  const canCreate = usePropertyAccess().permissions.includes("housekeeping.staff.manage");
  const canAssign = usePropertyAccess().permissions.includes("housekeeping.assign");
  const canRequest = usePropertyAccess().permissions.includes("housekeeping.request");
  const [activeTab, setActiveTab] = useState<HousekeepingBoardTab>("All");
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();
  useEffect(() => { const room = searchParams.get("room"); if (room) setQuery(room); }, [searchParams]);
  const [assignRoom, setAssignRoom] = useState<Room | null>(null);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [requestRoom, setRequestRoom] = useState<Room | null>(null);

  const roomRows = useMemo(
    () =>
      roomList.map((room) => ({
        ...room,
        task: tasksByRoom[room.id],
        hkStatus: roomStatuses[room.id] ?? (room.status === "Occupied" ? "Occupied" : "Clean"),
        hkAttendant: attendantByRoom[room.id] ?? ""
      })),
    [attendantByRoom, roomList, roomStatuses, tasksByRoom]
  );

  const counts = roomRows.reduce<Record<HousekeepingStatus, number>>(
    (acc, room) => {
      acc[room.hkStatus] += 1;
      return acc;
    },
    { Clean: 0, Dirty: 0, Occupied: 0, WIP: 0 }
  );

  const visibleRooms = roomRows.filter((room) => {
    const searchTarget = `${room.code} ${room.type} ${room.hkAttendant}`.toLowerCase();
    const matchesSearch = searchTarget.includes(query.toLowerCase());
    const matchesTab =
      activeTab === "All" ||
      activeTab === "Activity" ||
      (activeTab === "Available"
        ? room.status === "Available" && room.hkStatus === "Clean"
        : activeTab === "Requests" ? room.task?.status === "requested" : room.hkStatus === activeTab);
    return matchesSearch && matchesTab;
  });

  async function assignAttendant(room: Room, attendantId: string) {
    if (!attendantId) {
      setToast("Select an active housekeeping attendant");
      return;
    }
    if (await saveAssignment(room.id, room.code, attendantId)) setAssignRoom(null);
  }

  function remindDayEndLater() {
    setShowDayEnd(false);
    window.setTimeout(() => setShowDayEnd(true), 20 * 60 * 1000);
    setToast("Day End reminder scheduled for 20 minutes");
  }

  return (
    <main className="space-y-5 p-4 lg:p-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <HkButton onClick={() => void refreshHousekeeping()} disabled={loading || busy}>
            <RefreshCw className="h-4 w-4" />
            {loading ? "Refreshing..." : "Refresh"}
          </HkButton>
          <MetricBadge label="Clean" value={counts.Clean} className="bg-emerald-100 text-emerald-700" />
          <MetricBadge label="Dirty" value={counts.Dirty} className="bg-rose-100 text-rose-700" />
          <MetricBadge label="Occupied" value={counts.Occupied} className="bg-amber-100 text-amber-700" />
          <MetricBadge label="WIP" value={counts.WIP} className="bg-blue-100 text-blue-700" />
          <MetricBadge label="Requests" value={roomRows.filter(room => room.task?.status === "requested").length} className="bg-amber-100 text-amber-700" />
        </div>
        {activeTab !== "Activity" ? <div className="flex w-full items-center gap-4 sm:w-auto">
          <SearchField value={query} onChange={setQuery} placeholder="Search by room code / type / attendant" />
        </div> : null}
      </section>

      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <p className="text-sm text-slate-500">Updates every 30 seconds.</p>

      <SegmentedTabs tabs={boardTabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Activity" ? (
        <ActivityView activities={activities} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-4">
          {visibleRooms.length ? (
            visibleRooms.map((room) => (
              <RoomCard key={room.id} room={room} busy={busy || loading} canAssign={canAssign} canRequest={canRequest} assignmentOnly={frontDesk} onRequest={() => setRequestRoom(room)} onAssign={() => setAssignRoom(room)} onStart={() => void startCleaning(room.id, room.code)} onComplete={() => void completeCleaning(room.id, room.code)} />
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-line bg-white p-8 text-slate-500">No rooms to show. Select a property or try a different tab/search.</div>
          )}
        </section>
      )}

      {assignRoom ? (
        <AssignDrawer
          room={assignRoom}
          error={error}
          attendants={attendants}
          currentAttendant={attendants.find((attendant) => attendant.name === attendantByRoom[assignRoom.id])?.id ?? ""}
          activities={activities.filter((activity) => activity.roomCode === assignRoom.code)}
          onClose={() => setAssignRoom(null)}
          onAssign={assignAttendant}
          onAddEmployee={canCreate ? () => setShowNewEmployee(true) : undefined}
        />
      ) : null}

      {requestRoom ? <RequestDrawer room={requestRoom} error={error} onClose={() => setRequestRoom(null)} onRequest={async (details) => { if (await requestCleaning(requestRoom.id, requestRoom.code, details)) setRequestRoom(null); }} /> : null}
      {canCreate && showNewEmployee ? <NewEmployeeDrawer onClose={() => setShowNewEmployee(false)} onCreate={createAttendant} /> : null}

      {!frontDesk && showDayEnd ? (
        <DayEndModal
          onClose={() => setShowDayEnd(false)}
          onRemind={remindDayEndLater}
          onRun={() => { setShowDayEnd(false); void refreshHousekeeping(); setToast("Housekeeping Day End reviewed from MongoDB"); }}
        />
      ) : null}

    </main>
  );
}

function MetricBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return <span className={`rounded-md px-3 py-2 text-sm font-semibold ${className}`}>{label} {value}</span>;
}

function RoomCard({
  room,
  busy,
  canAssign,
  canRequest,
  onRequest,
  assignmentOnly = false,
  onAssign,
  onStart,
  onComplete
}: {
  room: Room & { hkStatus: HousekeepingStatus; hkAttendant: string; task?: HousekeepingTask };
  busy: boolean; canAssign: boolean; canRequest: boolean; onRequest: () => void;
  assignmentOnly?: boolean;
  onAssign: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const unavailable = room.status === "Maintenance" || room.status === "Out of Order";
  const isOccupied = room.status === "Occupied";
  const needsAttendant = !room.hkAttendant && (room.hkStatus === "Dirty" || room.hkStatus === "WIP");
  const action =
    isOccupied
      ? { label: "Guest In House", disabled: true, onClick: undefined }
      : unavailable
        ? { label: room.status, disabled: true, onClick: undefined }
        : needsAttendant
          ? { label: room.task?.status === "requested" ? "Awaiting assignment" : "Assign Attendant First", disabled: !canAssign, onClick: onAssign }
        : assignmentOnly && ["Dirty", "WIP"].includes(room.hkStatus)
          ? { label: "Assigned to housekeeping", disabled: true, onClick: undefined }
        : room.hkStatus === "Dirty"
          ? { label: "Start Cleaning", disabled: false, onClick: onStart }
          : room.hkStatus === "WIP"
            ? { label: "Complete Cleaning", disabled: false, onClick: onComplete }
            : { label: "Ready for Guest", disabled: true, onClick: undefined };
  return (
    <article className={`rounded-xl border border-line border-l-4 bg-white p-5 shadow-sm ${statusClass(room.hkStatus)}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-ink">{room.code}</h3>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(room.hkStatus)}`}>{room.hkStatus}</span>
        </div>
        {canAssign ? <button disabled={busy || isOccupied || unavailable || room.hkStatus === "WIP"} onClick={onAssign} className="h-9 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-50">Assign</button> : null}
      </div>
      <p className="text-sm text-slate-600">{room.type}</p>
      <p className="mt-4 text-sm text-slate-600">HK Attendant: {room.hkAttendant || "-"}</p>
      {room.task?.status === "requested" ? <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800"><b>Requested · {room.task.priority || "normal"} priority</b><p>Waiting for an attendant{room.task.requestedBy ? ` · Requested by ${room.task.requestedBy}` : ""}</p>{room.task.notes ? <p className="mt-1 whitespace-pre-wrap">{room.task.notes}</p> : null}</div> : null}
      <div className="my-5 border-t border-emerald-200" />
      <p className="mb-6 text-2xl font-bold text-ink">{room.status}</p>
      {canRequest ? <HkButton disabled={busy || isOccupied || unavailable || room.hkStatus === "WIP" || room.task?.status === "requested" || (room.task?.status === "assigned" && Boolean(room.hkAttendant))} className="mb-3 w-full" onClick={onRequest}>Request housekeeping</HkButton> : null}
      <HkButton disabled={busy || action.disabled} variant={room.hkStatus === "WIP" ? "green" : "purple"} className="w-full" onClick={action.onClick}>
        {action.label}
      </HkButton>
    </article>
  );
}

function ActivityView({ activities }: { activities: HousekeepingActivity[] }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [actionFilter, setActionFilter] = useState("All actions");
  const [attendantFilter, setAttendantFilter] = useState("All attendants");
  const [roomFilter, setRoomFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const filtered = groupHousekeepingJobs(activities).filter(job => job.events.some(activity => {
      const statusMatch = statusFilter === "All statuses" || activity.status === statusFilter;
      const attendantMatch = attendantFilter === "All attendants" || activity.attendant === attendantFilter;
      const needle = roomFilter.trim().toLowerCase();
      const roomMatch = !needle || [activity.roomCode, activity.actorName || "", activity.attendant].some(value => value.toLowerCase().includes(needle));
      const dateMatch = !dateFilter || activityDateKey(activity.createdAt) === dateFilter;
      return statusMatch && attendantMatch && roomMatch && dateMatch && (actionFilter === "All actions" || activity.action === actionFilter);
    }));
  const attendants = Array.from(new Set(activities.map((activity) => activity.attendant)));
  const filterCount = [statusFilter !== "All statuses", actionFilter !== "All actions", attendantFilter !== "All attendants", Boolean(roomFilter.trim()), Boolean(dateFilter)].filter(Boolean).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-ink">Housekeeping activity</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? "cleaning job" : "cleaning jobs"} · Each job shows who performed every step.</p></div>
        <button type="button" aria-expanded={filtersOpen} aria-controls="housekeeping-activity-filters" onClick={() => setFiltersOpen(value => !value)} className="inline-flex h-11 items-center rounded-md border border-line bg-white px-4 text-sm font-semibold md:hidden">Filters{filterCount ? ` (${filterCount})` : ""}</button>
      </div>
      <div id="housekeeping-activity-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 md:grid md:grid-cols-3 xl:grid-cols-6`}>
        <select aria-label="Filter activity action" value={actionFilter} onChange={event => setActionFilter(event.target.value)} className="h-12 min-w-0 rounded-md border border-line px-3"><option>All actions</option>{Object.entries(activityActions).map(([action, labels]) => <option key={action} value={action}>{labels.title}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-md border border-line px-3">
          <option>All statuses</option>
          <option>Clean</option>
          <option>Dirty</option>
          <option>Occupied</option>
          <option>WIP</option>
        </select>
        <select value={attendantFilter} onChange={(event) => setAttendantFilter(event.target.value)} className="h-12 rounded-md border border-line px-3">
          <option>All attendants</option>
          {attendants.map((attendant) => <option key={attendant}>{attendant}</option>)}
        </select>
        <input value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} placeholder="Search room or person" className="h-12 min-w-0 rounded-md border border-line px-3" />
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-12 rounded-md border border-line px-3" />
        <HkButton onClick={() => { setStatusFilter("All statuses"); setActionFilter("All actions"); setAttendantFilter("All attendants"); setRoomFilter(""); setDateFilter(""); }}>Clear filters</HkButton>
      </div>
      <div className="space-y-4">{filtered.map(job => <ActivityJobCard key={job.id} job={job} />)}</div>
      {!filtered.length ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-slate-500">
          No housekeeping activity matches the current filters.
        </div>
      ) : null}
    </section>
  );
}

const activityActions: Record<HousekeepingAction, { title: string; by: string }> = {
  requested: { title: "Requested", by: "Requested by" },
  assigned: { title: "Assigned", by: "Assigned by" },
  claimed: { title: "Claimed", by: "Claimed by" },
  cleaning_started: { title: "Cleaning started", by: "Started by" },
  cleaning_completed: { title: "Cleaning completed", by: "Completed by" },
  inspection_completed: { title: "Inspected", by: "Inspected by" },
  room_marked_dirty: { title: "Marked dirty", by: "Recorded by" }
};
const activityRoles: Record<string, string> = { owner: "Owner", administrator: "Administrator", front_desk: "Front Desk", housekeeping: "Housekeeping", member: "General member" };

function ActivityJobCard({ job }: { job: HousekeepingJob }) {
  const latest = job.events[job.events.length - 1];
  const last = (action: HousekeepingAction) => [...job.events].reverse().find(event => event.action === action);
  const assigned = [...job.events].reverse().find(event => event.attendant && event.attendant !== "Unassigned");
  const completed = last("cleaning_completed");
  const steps: HousekeepingAction[] = ["requested", "assigned", ...(last("claimed") ? ["claimed" as const] : []), "cleaning_started", "cleaning_completed", ...(last("inspection_completed") ? ["inspection_completed" as const] : [])];
  return <article data-housekeeping-job={job.id} className="min-w-0 rounded-xl border border-line bg-slate-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold text-ink">Room {latest.roomCode}</h3><span className={`rounded px-2 py-1 text-xs font-semibold ${statusPillClass(latest.status)}`}>{latest.action ? activityActions[latest.action]?.title : latest.state}</span></div><time dateTime={latest.createdAt} className="text-xs text-slate-500">{formatActivityTime(latest.createdAt)}</time></div>
    <p className="mt-2 break-words text-sm text-slate-500">Assigned attendant: <strong>{assigned?.attendant || "Unassigned"}</strong></p>
    <dl className="mt-4 divide-y divide-line">{steps.map(action => {
      const event = last(action);
      const role = event ? activityRoles[event.actorRole || ""] : "";
      return <div key={action} className="grid grid-cols-[118px_minmax(0,1fr)] gap-x-3 gap-y-1 py-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
        <dt className="text-sm text-slate-500">{activityActions[action].by}</dt>
        <dd className="min-w-0 break-words text-sm text-ink"><strong>{event ? event.actorName || "Not recorded" : action === "assigned" && last("claimed") ? "Self-claimed" : "Not recorded"}</strong>{role ? <span className="font-normal text-slate-500"> · {role}</span> : null}</dd>
        {event ? <dd className="col-start-2 text-xs text-slate-500 sm:col-start-auto"><time dateTime={event.createdAt}>{formatActivityTime(event.createdAt)}</time></dd> : null}
      </div>;
    })}</dl>
    {completed?.completionNotes?.trim() ? <div className="mt-3 border-t border-line pt-3"><p className="text-xs font-semibold text-slate-500">Completion notes</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-ink">{completed.completionNotes}</p></div> : null}
    <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-blue-600">Full activity ({job.events.length})</summary><div className="mt-3 space-y-3">{job.events.map(event => <ActivityRow key={event.id} activity={event} />)}</div></details>
  </article>;
}
function activityStatus(value?: string) {
  return ({ requested: "Requested", assigned: "Assigned", in_progress: "In progress", completed: "Completed", clean: "Clean", dirty: "Dirty", inspected: "Inspected" } as Record<string, string>)[value || ""] || value || "Not recorded";
}
function ActivityRow({ activity }: { activity: HousekeepingActivity }) {
  const labels = activity.action ? activityActions[activity.action] : undefined;
  const role = activityRoles[activity.actorRole || ""];
  return (
    <article className="min-w-0 rounded-lg border border-line bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <strong className="text-ink">Room {activity.roomCode}</strong>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${statusPillClass(activity.status)}`}>{labels?.title || activity.state}</span>
        <time dateTime={activity.createdAt} className="ml-auto text-xs text-slate-500">{formatActivityTime(activity.createdAt)}</time>
      </div>
      <p className="mt-2 break-words text-sm text-ink">{labels?.by || "By"}: <strong>{activity.actorName || "Not recorded"}</strong>{role ? <span className="text-slate-500"> · {role}</span> : null}</p>
      {activity.attendant && activity.attendant !== "Unassigned" ? <p className="mt-1 break-words text-sm text-slate-500">Assigned attendant: {activity.attendant}</p> : null}
      {activity.completionNotes?.trim() ? <div className="mt-3 border-t border-line pt-3"><p className="text-xs font-semibold text-slate-500">Completion notes</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-ink">{activity.completionNotes}</p></div> : null}
      <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium text-blue-600">Details</summary><div className="mt-2 space-y-2 border-t border-line pt-2 text-slate-500"><p>Status change: {activityStatus(activity.previousStatus)} → {activityStatus(activity.resultStatus)}</p>{activity.notes?.trim() ? <div><p className="text-xs font-semibold">{activity.action === "cleaning_completed" ? "Full completion note" : "Task notes at this event"}</p><p className="mt-1 whitespace-pre-wrap break-words text-ink">{activity.notes}</p></div> : null}{!role ? <p>Role was not recorded for this event.</p> : null}</div></details>
    </article>
  );
}

function RequestDrawer({ room, error, onClose, onRequest }: { room: Room; error: string; onClose: () => void; onRequest: (details: { priority: string; notes: string }) => Promise<void> }) {
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const requestLock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (requestLock.current) return;
    requestLock.current = true; setSaving(true);
    try { await onRequest({ priority, notes: notes.trim() }); }
    finally { requestLock.current = false; setSaving(false); }
  }
  return <RightDrawer title={`Request housekeeping · ${room.code}`} onClose={() => { if (!saving) onClose(); }} width="max-w-xl"><form onSubmit={submit} className="space-y-5 p-6">
    <p className="text-sm text-slate-500">Create an unassigned room-cleaning request. Owner/Admin or Front Desk can assign an available attendant from the Requests tab.</p>
    {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <label className="grid gap-2 text-sm font-semibold">Priority<select value={priority} disabled={saving} onChange={event => setPriority(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3">{["low", "normal", "high", "urgent"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-semibold">Request notes<textarea value={notes} disabled={saving} maxLength={1000} onChange={event => setNotes(event.target.value)} rows={4} placeholder="What needs cleaning or preparing?" className="rounded-md border border-line bg-white p-3 font-normal" /></label>
    <div className="flex justify-end gap-3"><HkButton disabled={saving} onClick={onClose}>Cancel</HkButton><HkButton disabled={saving} type="submit" variant="primary">{saving ? "Requesting..." : "Send request"}</HkButton></div>
  </form></RightDrawer>;
}

function AssignDrawer({
  room,
  error,
  attendants,
  currentAttendant,
  activities,
  onClose,
  onAssign,
  onAddEmployee
}: {
  room: Room;
  error: string;
  attendants: HousekeepingAttendant[];
  currentAttendant: string;
  activities: HousekeepingActivity[];
  onClose: () => void;
  onAssign: (room: Room, attendant: string) => Promise<void>;
  onAddEmployee?: () => void;
}) {
  const [selected, setSelected] = useState(currentAttendant);
  const [assigning, setAssigning] = useState(false);
  async function submitAssignment() {
    if (assigning || !selected) return;
    setAssigning(true);
    try { await onAssign(room, selected); } finally { setAssigning(false); }
  }
  return (
    <RightDrawer title="Assign a Housekeeping Attendant" onClose={onClose} width="max-w-xl">
      <div className="space-y-6 p-8">
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span>Select an Attendant</span>
            <span>{room.code}</span>
          </div>
          <div className="flex gap-2">
            <select aria-label="Housekeeping attendant" disabled={assigning} value={selected} onChange={(event) => setSelected(event.target.value)} className="h-12 min-w-0 flex-1 rounded-md border border-indigo-500 px-4 outline-none">
              <option value="">Select attendant</option>
              {attendants.filter((attendant) => attendant.status === "active").map((attendant) => <option disabled={attendant.available === false} key={attendant.id} value={attendant.id}>{attendant.name}{attendant.available === false ? ` · Busy in ${attendant.busyRooms?.join(", ") || "another room"}` : ` · Available (${attendant.queuedRooms?.length || 0} queued)`}</option>)}
            </select>
            {onAddEmployee ? <HkButton onClick={onAddEmployee}><Plus className="h-4 w-4" /></HkButton> : null}
          </div>
          {!attendants.some((attendant) => attendant.status === "active") ? <p className="mt-3 text-sm text-amber-700">No active attendants. Ask an owner/administrator to add or activate one.</p> : null}
          {attendants.some(attendant => attendant.status === "active") && !attendants.some(attendant => attendant.status === "active" && attendant.available !== false) ? <p className="mt-3 text-sm text-amber-700">All active attendants are busy. Use Request housekeeping to leave this room in the queue.</p> : null}
          {!onAddEmployee ? <p className="mt-3 text-sm text-slate-500">Assign an existing attendant here. Cleaning completion stays with authorized staff.</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-b border-line pb-6">
          <HkButton disabled={assigning} onClick={onClose}>Cancel</HkButton>
          <HkButton disabled={assigning || !selected || attendants.find(attendant => attendant.id === selected)?.available === false} variant="primary" onClick={() => void submitAssignment()}>{assigning ? "Assigning..." : "Assign"}</HkButton>
        </div>
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-700">Housekeeping History - Room {room.code}</h3>
          <div className="max-h-[520px] space-y-4 overflow-y-auto border-l-2 border-slate-200 pl-6">
            {activities.length ? groupHousekeepingJobs(activities).map(job => <ActivityJobCard key={job.id} job={job} />) : <p className="text-sm text-slate-500">No history for this room.</p>}
          </div>
        </section>
      </div>
    </RightDrawer>
  );
}

function NewEmployeeDrawer({ onClose, onCreate }: { onClose: () => void; onCreate: (employee: Omit<HousekeepingAttendant, "id">) => Promise<void> }) {
  const [form, setForm] = useState({
    employeeNo: "",
    name: "",
    department: "",
    status: "active",
    phone: "",
    email: "",
    joinedIso: new Date().toISOString()
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.employeeNo.trim() || !form.name.trim()) {
      setError("Employee number and name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onCreate({ ...form, status: form.status === "inactive" ? "inactive" : "active" });
      onClose();
    } catch {
      setError("The attendant could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer title="New Employee" subtitle={'Fill details and click "Create"'} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-6 p-8">
        <Field label="Employee No" value={form.employeeNo} onChange={(value) => setForm((current) => ({ ...current, employeeNo: value }))} />
        <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Field label="Department" value={form.department} onChange={(value) => setForm((current) => ({ ...current, department: value }))} />
        <Field label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
        <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
        <Field label="Joined (ISO)" value={form.joinedIso} onChange={(value) => setForm((current) => ({ ...current, joinedIso: value }))} />
        <div className="flex justify-end gap-3">
          {error ? <p className="mr-auto self-center text-sm text-red-600">{error}</p> : null}
          <HkButton onClick={onClose}>Cancel</HkButton>
          <HkButton type="submit" variant="primary" disabled={saving}>{saving ? "Creating..." : "Create"}</HkButton>
        </div>
      </form>
    </RightDrawer>
  );
}

function DayEndModal({ onClose, onRun, onRemind }: { onClose: () => void; onRun: () => void; onRemind: () => void }) {
  const today = new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(new Date());
  const systemDate = new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(new Date(`${property.systemDate}T00:00:00`));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
      <section className="w-full max-w-xl rounded-lg bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">Day End Process Required</h2>
            <p className="mt-2 text-slate-500">The hotel&apos;s system date {systemDate} does not match today&apos;s date {today}. Review the MongoDB housekeeping board. Dirty and WIP rooms will remain unfinished.</p>
          </div>
          <button onClick={onClose} className="text-slate-500">x</button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <HkButton variant="primary" onClick={onRun}>Run Day End Process</HkButton>
          <HkButton onClick={onRemind}>Remind me in 20 minutes</HkButton>
        </div>
      </section>
    </div>
  );
}
