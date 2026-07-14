"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { Room } from "@/app/data/pms-data";
import type { HousekeepingActivity, HousekeepingAttendant, HousekeepingBoardTab, HousekeepingStatus } from "../types";
import type { HousekeepingModuleProps } from "../types";
import { HOUSEKEEPING_SYSTEM_DATE, HOUSEKEEPING_TODAY } from "../constants";
import { groupActivities, nowLabel, statusClass, statusPillClass } from "../utils";
import { Field, HelpVideoButton, HelpVideoModal, HkButton, RightDrawer, SearchField, SegmentedTabs } from "../components/housekeeping-ui";

type BoardProps = HousekeepingModuleProps & {
  roomStatuses: Record<string, HousekeepingStatus>;
  setRoomStatuses: React.Dispatch<React.SetStateAction<Record<string, HousekeepingStatus>>>;
  attendantByRoom: Record<string, string>;
  setAttendantByRoom: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  attendants: HousekeepingAttendant[];
  setAttendants: React.Dispatch<React.SetStateAction<HousekeepingAttendant[]>>;
  activities: HousekeepingActivity[];
  setActivities: React.Dispatch<React.SetStateAction<HousekeepingActivity[]>>;
  showDayEnd: boolean;
  setShowDayEnd: React.Dispatch<React.SetStateAction<boolean>>;
};

const boardTabs: HousekeepingBoardTab[] = ["All", "Clean", "Dirty", "Occupied", "WIP", "Available", "Activity"];

export function HousekeepingBoardPage({
  roomList,
  setRoomList,
  setToast,
  roomStatuses,
  setRoomStatuses,
  attendantByRoom,
  setAttendantByRoom,
  attendants,
  setAttendants,
  activities,
  setActivities,
  showDayEnd,
  setShowDayEnd
}: BoardProps) {
  const [activeTab, setActiveTab] = useState<HousekeepingBoardTab>("All");
  const [query, setQuery] = useState("");
  const [assignRoom, setAssignRoom] = useState<Room | null>(null);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const roomRows = useMemo(
    () =>
      roomList.map((room) => ({
        ...room,
        hkStatus: roomStatuses[room.id] ?? (room.status === "Occupied" ? "Occupied" : "Clean"),
        hkAttendant: attendantByRoom[room.id] ?? ""
      })),
    [attendantByRoom, roomList, roomStatuses]
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
    const matchesTab = activeTab === "All" || activeTab === "Activity" || (activeTab === "Available" ? room.hkStatus === "Clean" : room.hkStatus === activeTab);
    return matchesSearch && matchesTab;
  });

  function addActivity(room: Room, status: HousekeepingStatus, state: HousekeepingActivity["state"], attendant = attendantByRoom[room.id] || "aa") {
    const activity: HousekeepingActivity = {
      id: `hk-act-${Date.now()}`,
      roomCode: room.code,
      roomType: room.type,
      attendant,
      status,
      state,
      createdAt: nowLabel(),
      finishedAt: state === "Completed" ? nowLabel() : undefined
    };
    setActivities((current) => [activity, ...current]);
  }

  function updateStatus(room: Room, status: HousekeepingStatus) {
    setRoomStatuses((current) => ({ ...current, [room.id]: status }));
    setRoomList((current) => current.map((item) => (item.id === room.id ? { ...item, housekeeping: status } : item)));
    addActivity(room, status, status === "Clean" ? "Completed" : "Started");
    setToast(`Room ${room.code} marked ${status}`);
  }

  function assignAttendant(room: Room, attendant: string) {
    setAttendantByRoom((current) => ({ ...current, [room.id]: attendant }));
    addActivity(room, roomStatuses[room.id] ?? "Clean", "Assigned", attendant);
    setAssignRoom(null);
    setToast(`Room ${room.code} assigned to ${attendant}`);
  }

  return (
    <main className="space-y-5 p-4 lg:p-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <HkButton onClick={() => setToast("Housekeeping board refreshed")}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </HkButton>
          <MetricBadge label="Clean" value={counts.Clean} className="bg-emerald-100 text-emerald-700" />
          <MetricBadge label="Dirty" value={counts.Dirty} className="bg-rose-100 text-rose-700" />
          <MetricBadge label="Occupied" value={counts.Occupied} className="bg-amber-100 text-amber-700" />
          <MetricBadge label="WIP" value={counts.WIP} className="bg-blue-100 text-blue-700" />
        </div>
        <div className="flex items-center gap-4">
          <HelpVideoButton onClick={() => setShowHelp(true)} />
          <SearchField value={query} onChange={setQuery} placeholder="Search by room code / type / attendant" />
        </div>
      </section>

      <SegmentedTabs tabs={boardTabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Activity" ? (
        <ActivityView activities={activities} onRefresh={() => setToast("Housekeeping activity refreshed")} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-4">
          {visibleRooms.length ? (
            visibleRooms.map((room) => (
              <RoomCard key={room.id} room={room} onAssign={() => setAssignRoom(room)} onStart={() => updateStatus(room, "WIP")} onComplete={() => updateStatus(room, "Clean")} />
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-line bg-white p-8 text-slate-500">No rooms to show. Select a property or try a different tab/search.</div>
          )}
        </section>
      )}

      {assignRoom ? (
        <AssignDrawer
          room={assignRoom}
          attendants={attendants}
          currentAttendant={attendantByRoom[assignRoom.id] ?? "aa"}
          activities={activities.filter((activity) => activity.roomCode === assignRoom.code)}
          onClose={() => setAssignRoom(null)}
          onAssign={assignAttendant}
          onAddEmployee={() => setShowNewEmployee(true)}
        />
      ) : null}

      {showNewEmployee ? <NewEmployeeDrawer onClose={() => setShowNewEmployee(false)} onCreate={(employee) => setAttendants((current) => [...current, employee])} /> : null}

      {showDayEnd ? <DayEndModal onClose={() => setShowDayEnd(false)} onRun={() => runDayEnd(roomList, setRoomStatuses, setRoomList, setActivities, setShowDayEnd, setToast)} /> : null}

      {showHelp ? <HelpVideoModal onClose={() => setShowHelp(false)} /> : null}
    </main>
  );
}

function MetricBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return <span className={`rounded-md px-3 py-2 text-sm font-semibold ${className}`}>{label} {value}</span>;
}

function RoomCard({
  room,
  onAssign,
  onStart,
  onComplete
}: {
  room: Room & { hkStatus: HousekeepingStatus; hkAttendant: string };
  onAssign: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const isOccupied = room.hkStatus === "Occupied";
  return (
    <article className={`rounded-xl border border-line border-l-4 bg-white p-5 shadow-sm ${statusClass(room.hkStatus)}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-ink">{room.code}</h3>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(room.hkStatus)}`}>{room.hkStatus}</span>
        </div>
        <button onClick={onAssign} className="h-9 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-slate-50">Assign</button>
      </div>
      <p className="text-sm text-slate-600">{room.type}</p>
      <p className="mt-4 text-sm text-slate-600">HK Attendant: {room.hkAttendant || "-"}</p>
      <div className="my-5 border-t border-emerald-200" />
      <p className="mb-6 text-2xl font-bold text-ink">{isOccupied ? "Occupied" : "Available"}</p>
      <HkButton variant={isOccupied ? "green" : "purple"} className="w-full" onClick={isOccupied ? onComplete : onStart}>
        {isOccupied ? "Complete" : "Start"}
      </HkButton>
    </article>
  );
}

function ActivityView({ activities, onRefresh }: { activities: HousekeepingActivity[]; onRefresh: () => void }) {
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [attendantFilter, setAttendantFilter] = useState("All attendants");
  const [roomFilter, setRoomFilter] = useState("");
  const grouped = groupActivities(
    activities.filter((activity) => {
      const statusMatch = statusFilter === "All statuses" || activity.status === statusFilter;
      const attendantMatch = attendantFilter === "All attendants" || activity.attendant === attendantFilter;
      const roomMatch = !roomFilter || activity.roomCode.includes(roomFilter);
      return statusMatch && attendantMatch && roomMatch;
    })
  );
  const attendants = Array.from(new Set(activities.map((activity) => activity.attendant)));

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line bg-white p-8 text-slate-500">No rooms to show. Select a property or try a different tab/search.</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-ink">Housekeeping Activity by Attendant</h2>
        <HkButton onClick={onRefresh}><RefreshCw className="h-4 w-4" />Refresh</HkButton>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
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
        <input value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} placeholder="Filter by room no" className="h-12 rounded-md border border-line px-3" />
        <input type="date" className="h-12 rounded-md border border-line px-3" />
        <HkButton onClick={() => { setStatusFilter("All statuses"); setAttendantFilter("All attendants"); setRoomFilter(""); }}>Clear filters</HkButton>
      </div>
      {Object.entries(grouped).map(([attendant, items]) => (
        <div key={attendant} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-ink">{attendant} <span className="text-base font-medium text-slate-500">({items.length} jobs)</span></h3>
            <div className="flex gap-2 text-sm font-semibold">
              <span className="rounded bg-blue-100 px-3 py-1 text-blue-700">Started: {items.filter((item) => item.state === "Started").length}</span>
              <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-700">Completed: {items.filter((item) => item.state === "Completed").length}</span>
            </div>
          </div>
          <div className="space-y-3">
            {items.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function ActivityRow({ activity }: { activity: HousekeepingActivity }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-ink">Room {activity.roomCode}</strong>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${statusPillClass(activity.status)}`}>{activity.status}</span>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${activity.state === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{activity.state === "Completed" ? "Completed" : "In Progress"}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">HK: {activity.status} ({activity.state === "Completed" ? `Completed by: ${activity.attendant}` : `Attendant: ${activity.attendant}`})</p>
      <p className="mt-2 text-xs text-slate-500">Created: {activity.createdAt} {activity.finishedAt ? `Finished: ${activity.finishedAt}` : ""}</p>
    </div>
  );
}

function AssignDrawer({
  room,
  attendants,
  currentAttendant,
  activities,
  onClose,
  onAssign,
  onAddEmployee
}: {
  room: Room;
  attendants: HousekeepingAttendant[];
  currentAttendant: string;
  activities: HousekeepingActivity[];
  onClose: () => void;
  onAssign: (room: Room, attendant: string) => void;
  onAddEmployee: () => void;
}) {
  const [selected, setSelected] = useState(currentAttendant);
  return (
    <RightDrawer title="Assign a Housekeeping Attendant" onClose={onClose} width="max-w-xl">
      <div className="space-y-6 p-8">
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span>Select an Attendant</span>
            <span>{room.code}</span>
          </div>
          <div className="flex gap-2">
            <select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-12 flex-1 rounded-md border border-indigo-500 px-4 outline-none">
              {attendants.map((attendant) => <option key={attendant.id}>{attendant.name}</option>)}
            </select>
            <HkButton onClick={onAddEmployee}><Plus className="h-4 w-4" /></HkButton>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-b border-line pb-6">
          <HkButton onClick={onClose}>Cancel</HkButton>
          <HkButton variant="primary" onClick={() => onAssign(room, selected)}>Assign</HkButton>
        </div>
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-700">Housekeeping History - Room {room.code}</h3>
          <div className="max-h-[520px] space-y-4 overflow-y-auto border-l-2 border-slate-200 pl-6">
            {activities.length ? activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />) : <p className="text-sm text-slate-500">No history for this room.</p>}
          </div>
        </section>
      </div>
    </RightDrawer>
  );
}

function NewEmployeeDrawer({ onClose, onCreate }: { onClose: () => void; onCreate: (employee: HousekeepingAttendant) => void }) {
  const [form, setForm] = useState({
    employeeNo: "",
    name: "",
    department: "",
    status: "active",
    phone: "",
    email: "",
    joinedIso: "2026-06-16T09:41:52.453Z"
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    onCreate({ id: `hk-${Date.now()}`, ...form, status: form.status === "inactive" ? "inactive" : "active" });
    onClose();
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
          <HkButton onClick={onClose}>Cancel</HkButton>
          <HkButton type="submit" variant="primary">Create</HkButton>
        </div>
      </form>
    </RightDrawer>
  );
}

function DayEndModal({ onClose, onRun }: { onClose: () => void; onRun: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
      <section className="w-full max-w-xl rounded-lg bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">Day End Process Required</h2>
            <p className="mt-2 text-slate-500">The hotel&apos;s system date {HOUSEKEEPING_SYSTEM_DATE} does not match today&apos;s date {HOUSEKEEPING_TODAY}. Please run the Day End Process.</p>
          </div>
          <button onClick={onClose} className="text-slate-500">x</button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <HkButton variant="primary" onClick={onRun}>Run Day End Process</HkButton>
          <HkButton onClick={onClose}>Remind me in 20 minutes</HkButton>
        </div>
      </section>
    </div>
  );
}

function runDayEnd(
  rooms: Room[],
  setRoomStatuses: React.Dispatch<React.SetStateAction<Record<string, HousekeepingStatus>>>,
  setRoomList: React.Dispatch<React.SetStateAction<Room[]>>,
  setActivities: React.Dispatch<React.SetStateAction<HousekeepingActivity[]>>,
  setShowDayEnd: React.Dispatch<React.SetStateAction<boolean>>,
  setToast: (message: string) => void
) {
  const nextStatuses = rooms.reduce<Record<string, HousekeepingStatus>>((acc, room) => {
    acc[room.id] = room.status === "Occupied" ? "Occupied" : "Clean";
    return acc;
  }, {});
  setRoomStatuses(nextStatuses);
  setRoomList((current) => current.map((room) => ({ ...room, housekeeping: nextStatuses[room.id] ?? "Clean" })));
  setActivities((current) => [
    {
      id: `hk-day-end-${Date.now()}`,
      roomCode: "All",
      roomType: "Property",
      attendant: "System",
      status: "Clean",
      state: "Completed",
      createdAt: nowLabel(),
      finishedAt: nowLabel()
    },
    ...current
  ]);
  setShowDayEnd(false);
  setToast("Day End Process completed");
}
