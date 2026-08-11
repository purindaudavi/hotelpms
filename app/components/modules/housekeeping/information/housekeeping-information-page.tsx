"use client";

import { useMemo, useState } from "react";
import { Download, List, Table2, X } from "lucide-react";
import { property, type Reservation } from "@/app/data/pms-data";
import type {
  HousekeepingActivity,
  HousekeepingInfoTab,
  HousekeepingModuleProps,
  HousekeepingReservation,
  HousekeepingStatus
} from "../types";
import { reservationPillClass, statusLabel } from "../utils";
import {
  HelpVideoButton,
  HelpVideoModal,
  HkButton,
  SearchField,
  SegmentedTabs
} from "../components/housekeeping-ui";

type InformationProps = HousekeepingModuleProps & {
  roomStatuses: Record<string, HousekeepingStatus>;
  attendantByRoom: Record<string, string>;
  activities: HousekeepingActivity[];
};

type InformationRow = HousekeepingReservation & {
  checkInIso: string;
  checkOutIso: string;
  isDayRoom: boolean;
  housekeeping: string;
  attendant: string;
  progress: string;
  latestActivity: string;
};

const infoTabs: HousekeepingInfoTab[] = ["Arrival", "Departure", "In House", "All", "Other"];
const inactiveReservationStatuses = new Set(["Cancelled", "No Show", "Blocked"]);

export function HousekeepingInformationPage({
  reservations,
  roomList,
  roomStatuses,
  attendantByRoom,
  activities
}: InformationProps) {
  const [activeTab, setActiveTab] = useState<HousekeepingInfoTab>("Arrival");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dateFrom, setDateFrom] = useState(property.systemDate);
  const [dateTo, setDateTo] = useState(property.systemDate);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const rows = useMemo(
    () => buildHousekeepingReservations(
      reservations,
      property.systemDate,
      roomList,
      roomStatuses,
      attendantByRoom,
      activities
    ),
    [activities, attendantByRoom, reservations, roomList, roomStatuses]
  );
  const visibleRows = useMemo(
    () => filterBySearch(rowsForTab(activeTab, rows, dateFrom, dateTo), query),
    [activeTab, dateFrom, dateTo, query, rows]
  );
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function changeDateFrom(value: string) {
    setDateFrom(value);
    if (value > dateTo) setDateTo(value);
  }

  function changeDateTo(value: string) {
    setDateTo(value);
    if (value < dateFrom) setDateFrom(value);
  }

  function resetToday() {
    setDateFrom(property.systemDate);
    setDateTo(property.systemDate);
  }

  return (
    <main className="space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Housekeeping Information</h1>
        <p className="mt-2 text-slate-500">Plan arrivals, departures and stayover work from MongoDB reservations and housekeeping records.</p>
        <div className="mt-4 max-w-xl">
          <SegmentedTabs tabs={infoTabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <SearchField value={query} onChange={setQuery} placeholder="Search guest, booking, room or room type" />
          <DateField label="From" value={dateFrom} onChange={changeDateFrom} />
          <DateField label="To" value={dateTo} onChange={changeDateTo} />
          <HkButton onClick={resetToday}>Today</HkButton>
        </div>
      </section>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <TitleBlock activeTab={activeTab} count={visibleRows.length} dateFrom={dateFrom} dateTo={dateTo} />
        <div className="flex items-center gap-3">
          <HelpVideoButton onClick={() => setShowHelp(true)} />
          <button type="button" aria-label="Card view" onClick={() => setView("grid")} className={`grid h-12 w-12 place-items-center rounded-md border border-line ${view === "grid" ? "bg-ink text-white" : "bg-white text-ink"}`}><Table2 className="h-5 w-5" /></button>
          <button type="button" aria-label="List view" onClick={() => setView("list")} className={`grid h-12 w-12 place-items-center rounded-md border border-line ${view === "list" ? "bg-ink text-white" : "bg-white text-ink"}`}><List className="h-5 w-5" /></button>
          <HkButton disabled={!visibleRows.length} onClick={() => downloadReservations(visibleRows, activeTab, dateFrom, dateTo)}><Download className="h-4 w-4" />Export CSV</HkButton>
        </div>
      </section>

      <InformationContent
        activeTab={activeTab}
        rows={visibleRows}
        view={view}
        onView={(row) => setSelectedId(row.id)}
      />

      {selected ? <ReservationInformationDrawer row={selected} onClose={() => setSelectedId("")} /> : null}
      {showHelp ? <HelpVideoModal onClose={() => setShowHelp(false)} /> : null}
    </main>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-ink">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-md border border-line bg-white px-3 font-normal" />
    </label>
  );
}

function TitleBlock({ activeTab, count, dateFrom, dateTo }: { activeTab: HousekeepingInfoTab; count: number; dateFrom: string; dateTo: string }) {
  const titles: Record<HousekeepingInfoTab, string> = {
    Arrival: "Arrivals",
    Departure: "Departures",
    "In House": "In-House Guests",
    All: "Reservations in Range",
    Other: "Exceptions"
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{titles[activeTab]}</h2>
      <p className="mt-2 text-slate-500">{count} record{count === 1 ? "" : "s"} · {formatStayDate(dateFrom)} to {formatStayDate(dateTo)}</p>
    </div>
  );
}

function InformationContent({ activeTab, rows, view, onView }: {
  activeTab: HousekeepingInfoTab;
  rows: InformationRow[];
  view: "grid" | "list";
  onView: (row: InformationRow) => void;
}) {
  if (!rows.length) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-slate-500">No {activeTab.toLowerCase()} records match the selected dates and search.</div>;
  }
  if (view === "list") return <ReservationsTable rows={rows} onView={onView} />;

  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((reservation) => <ReservationInfoCard key={reservation.id} reservation={reservation} onView={() => onView(reservation)} />)}
    </section>
  );
}

function buildHousekeepingReservations(
  reservations: Reservation[],
  businessDate: string,
  roomList: HousekeepingModuleProps["roomList"],
  roomStatuses: Record<string, HousekeepingStatus>,
  attendantByRoom: Record<string, string>,
  activities: HousekeepingActivity[]
): InformationRow[] {
  const roomsByCode = new Map(roomList.map((room) => [room.code, room]));

  return reservations
    .map((reservation): InformationRow => {
      const roomNumbers = reservation.reservationRooms?.map((room) => room.roomNumber).filter(Boolean) ?? [];
      const roomTypes = reservation.reservationRooms?.map((room) => room.roomType).filter(Boolean) ?? [];
      const effectiveRoomNumbers = roomNumbers.length ? roomNumbers : reservation.room && reservation.room !== "-" ? [reservation.room] : [];
      const configuredRooms = effectiveRoomNumbers.map((code) => roomsByCode.get(code)).filter((room) => Boolean(room));
      const statuses = configuredRooms.map((room) => roomStatuses[room!.id] ?? room!.housekeeping);
      const housekeeping = effectiveRoomNumbers.length
        ? effectiveRoomNumbers.map((code) => {
          const room = roomsByCode.get(code);
          return `${code}: ${room ? roomStatuses[room.id] ?? room.housekeeping : "Archived room"}`;
        }).join(", ")
        : "No physical room assigned";
      const assignedAttendants = Array.from(new Set(configuredRooms.map((room) => attendantByRoom[room!.id]).filter(Boolean)));
      const roomActivities = activities
        .filter((activity) => effectiveRoomNumbers.includes(activity.roomCode))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const latest = roomActivities[0];
      const guestCount = reservation.reservationRooms?.reduce((sum, room) => sum + room.adults + room.children, 0);

      return {
        id: reservation.id,
        bookingId: reservation.resNo,
        guest: reservation.guest,
        room: effectiveRoomNumbers.join(", ") || "Unassigned",
        roomType: Array.from(new Set(roomTypes)).join(", ") || reservation.roomType || "Unassigned",
        status: housekeepingReservationStatus(reservation),
        stayFrom: formatStayDate(reservation.checkIn),
        stayTo: formatStayDate(reservation.checkOut),
        nights: stayNights(reservation),
        guests: guestCount || reservation.adults + reservation.children,
        country: reservation.country || "-",
        group: housekeepingReservationGroup(reservation, businessDate),
        checkInIso: reservation.checkIn,
        checkOutIso: reservation.checkOut,
        isDayRoom: Boolean(reservation.isDayRoom),
        housekeeping,
        attendant: assignedAttendants.join(", ") || "Unassigned",
        progress: progressLabel(statuses, effectiveRoomNumbers.length),
        latestActivity: latest ? `${latest.state}: ${latest.status} · ${latest.attendant}` : "No housekeeping activity"
      };
    })
    .sort((left, right) => left.room.localeCompare(right.room, undefined, { numeric: true }));
}

function housekeepingReservationStatus(reservation: Reservation): HousekeepingReservation["status"] {
  if (reservation.status === "Checked-in") return "checked-in";
  if (reservation.status === "Checked-out") return "checked-out";
  if (reservation.status === "Tentative") return "tentative";
  if (reservation.status === "Cancelled") return "cancelled";
  if (reservation.status === "No Show") return "no-show";
  if (reservation.status === "Blocked") return "blocked";
  return "confirmed";
}

function housekeepingReservationGroup(reservation: Reservation, businessDate: string): HousekeepingReservation["group"] {
  if (inactiveReservationStatuses.has(reservation.status)) return "other";
  if (reservation.checkOut === businessDate && (reservation.status === "Checked-in" || reservation.status === "Checked-out")) return "departure";
  if (reservation.status === "Checked-in") return "in-house";
  if (reservation.checkIn === businessDate && (reservation.status === "Confirmed" || reservation.status === "Tentative")) return "arrival";
  return "other";
}

function rowsForTab(activeTab: HousekeepingInfoTab, rows: InformationRow[], dateFrom: string, dateTo: string) {
  return rows.filter((row) => {
    const checkInInRange = dateInRange(row.checkInIso, dateFrom, dateTo);
    const checkOutInRange = dateInRange(row.checkOutIso, dateFrom, dateTo);
    const stayTouchesRange = row.checkInIso <= dateTo && row.checkOutIso >= dateFrom;
    const inactive = row.status === "cancelled" || row.status === "no-show" || row.status === "blocked";

    if (activeTab === "Arrival") return !inactive && (row.status === "confirmed" || row.status === "tentative") && checkInInRange;
    if (activeTab === "Departure") return !inactive && (row.status === "checked-in" || row.status === "checked-out") && checkOutInRange;
    if (activeTab === "In House") return row.status === "checked-in" && stayTouchesRange;
    if (activeTab === "Other") return inactive && (checkInInRange || checkOutInRange || stayTouchesRange);
    return stayTouchesRange;
  });
}

function filterBySearch(rows: InformationRow[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    [row.bookingId, row.guest, row.room, row.roomType, row.country, row.attendant, row.housekeeping]
      .some((value) => value.toLowerCase().includes(needle))
  );
}

function dateInRange(value: string, dateFrom: string, dateTo: string) {
  return value >= dateFrom && value <= dateTo;
}

function progressLabel(statuses: Array<HousekeepingStatus | undefined>, roomCount: number) {
  if (!roomCount) return "Room assignment required";
  if (!statuses.length) return "Archived room";
  if (statuses.includes("WIP")) return "Cleaning in progress";
  if (statuses.includes("Dirty")) return "Waiting for cleaning";
  if (statuses.includes("Occupied")) return "Guest in house";
  if (statuses.every((status) => status === "Clean")) return "Ready";
  return "Review required";
}

function stayNights(reservation: Reservation) {
  const checkIn = Date.parse(`${reservation.checkIn}T00:00:00`);
  const checkOut = Date.parse(`${reservation.checkOut}T00:00:00`);
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut)) return 0;
  return Math.max(Math.round((checkOut - checkIn) / 86_400_000), reservation.isDayRoom ? 0 : 1);
}

function formatStayDate(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00`);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("en-LK", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}

function downloadReservations(rows: InformationRow[], activeTab: HousekeepingInfoTab, dateFrom: string, dateTo: string) {
  const header = ["Booking ID", "Guest", "Room", "Room Type", "Stay From", "Stay To", "Nights", "Guests", "Reservation Status", "Housekeeping", "Attendant", "Progress", "Country"];
  const lines = rows.map((row) => [
    row.bookingId, row.guest, row.room, row.roomType, row.stayFrom, row.stayTo, row.nights, row.guests,
    row.status, row.housekeeping, row.attendant, row.progress, row.country
  ]);
  const csv = [header, ...lines].map((line) => line.map(csvValue).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `housekeeping-${activeTab.toLowerCase().replace(/\s+/g, "-")}-${dateFrom}-${dateTo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value: string | number) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function ReservationInfoCard({ reservation, onView }: { reservation: InformationRow; onView: () => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink">{reservation.guest}</h3>
            <p className="mt-2 text-sm text-slate-500">#{reservation.bookingId} · {reservation.roomType} · Room {reservation.room}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${reservationPillClass(reservation.status)}`}>{statusLabel(reservation.status)}</span>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p><strong>Stay:</strong> {reservation.stayFrom} – {reservation.stayTo}</p>
          <p><strong>Housekeeping:</strong> {reservation.housekeeping}</p>
          <p><strong>Attendant:</strong> {reservation.attendant}</p>
          <p><strong>Progress:</strong> {reservation.progress}</p>
        </div>
      </div>
      <button type="button" onClick={onView} className="w-full border-t border-line px-5 py-3 text-left text-sm font-semibold text-indigo-700 hover:bg-slate-50">View reservation information</button>
    </article>
  );
}

function ReservationsTable({ rows, onView }: { rows: InformationRow[]; onView: (row: InformationRow) => void }) {
  return (
    <section className="overflow-x-auto rounded-lg border border-line bg-white p-4">
      <table className="min-w-[1320px] w-full text-left text-sm">
        <thead><tr className="border-b border-line text-ink">
          {["Booking ID", "Guest", "Room", "Room Type", "Stay", "Reservation", "Housekeeping", "Attendant", "Progress", "Action"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
        </tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id} className="border-b border-line last:border-b-0">
            <td className="px-3 py-3">{row.bookingId}</td><td className="px-3 py-3">{row.guest}</td>
            <td className="px-3 py-3">{row.room}</td><td className="px-3 py-3">{row.roomType}</td>
            <td className="px-3 py-3">{row.stayFrom} – {row.stayTo}</td>
            <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${reservationPillClass(row.status)}`}>{statusLabel(row.status)}</span></td>
            <td className="px-3 py-3">{row.housekeeping}</td><td className="px-3 py-3">{row.attendant}</td>
            <td className="px-3 py-3">{row.progress}</td>
            <td className="px-3 py-3"><button type="button" onClick={() => onView(row)} className="font-semibold text-indigo-700">View</button></td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function ReservationInformationDrawer({ row, onClose }: { row: InformationRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-line p-6">
          <div><h2 className="text-2xl font-bold text-ink">{row.guest}</h2><p className="mt-1 text-slate-500">{row.bookingId}</p></div>
          <button type="button" aria-label="Close reservation information" onClick={onClose} className="rounded-md border border-line p-2"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Detail label="Reservation status" value={statusLabel(row.status)} />
          <Detail label="Room" value={row.room} />
          <Detail label="Room type" value={row.roomType} />
          <Detail label="Guests" value={String(row.guests)} />
          <Detail label="Check-in" value={row.stayFrom} />
          <Detail label="Check-out" value={row.stayTo} />
          <Detail label="Housekeeping" value={row.housekeeping} />
          <Detail label="Attendant" value={row.attendant} />
          <Detail label="Progress" value={row.progress} />
          <Detail label="Latest activity" value={row.latestActivity} />
          <Detail label="Country" value={row.country} />
          <Detail label="Nights" value={String(row.nights)} />
        </div>
        <div className="mt-auto border-t border-line p-6"><HkButton className="w-full" onClick={onClose}>Close</HkButton></div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 font-semibold text-ink">{value}</p></div>;
}
