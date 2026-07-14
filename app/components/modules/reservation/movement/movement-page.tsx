"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Reservation } from "@/app/data/pms-data";
import { reservationSystemDate } from "../constants";
import type { MovementKind, ReservationModuleProps } from "../types";
import { dateInRange, exportCsv, searchReservation } from "../utils";
import { EmptyState, Field, Panel, ReservationPageFrame, SearchBox, StatusPill, TextInput, ToolbarButton } from "../components/reservation-ui";

const copy: Record<MovementKind, { title: string; panel: string; empty: string; subtitle: string }> = {
  arrivals: {
    title: "Arrivals",
    panel: "Today's Arrivals",
    empty: "No arrivals scheduled.",
    subtitle: "Guests scheduled to arrive today"
  },
  departures: {
    title: "Departures",
    panel: "Today's Departures",
    empty: "No departures scheduled.",
    subtitle: "Guests scheduled to depart today"
  },
  "in-house": {
    title: "In-House",
    panel: "Current In-House Guests",
    empty: "No in-house guests found.",
    subtitle: "Guests currently checked into the hotel"
  }
};

export function MovementPage({ kind, reservations, setToast }: ReservationModuleProps & { kind: MovementKind }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [agent, setAgent] = useState("");
  const [stayFrom, setStayFrom] = useState(reservationSystemDate);
  const [stayTo, setStayTo] = useState(reservationSystemDate);
  const [createdDate, setCreatedDate] = useState("");
  const [expectedOnly, setExpectedOnly] = useState(kind === "arrivals");

  const combinedRows = reservations;

  const rows = useMemo(() => {
    return combinedRows.filter((booking) => {
      if (!searchReservation(booking, query)) return false;
      if (status && !booking.status.toLowerCase().includes(status.toLowerCase())) return false;
      if (agent && !booking.source.toLowerCase().includes(agent.toLowerCase())) return false;
      if (createdDate && booking.reservationDate !== createdDate) return false;

      if (kind === "arrivals") {
        if (!dateInRange(booking.checkIn, stayFrom, stayTo)) return false;
        if (["Cancelled", "No Show", "Blocked", "Checked-out"].includes(booking.status)) return false;
        if (expectedOnly && !["Confirmed", "Tentative"].includes(booking.status)) return false;
      }
      if (kind === "departures") {
        if (!dateInRange(booking.checkOut, stayFrom, stayTo)) return false;
        if (!["Confirmed", "Tentative", "Checked-in"].includes(booking.status)) return false;
      }
      if (kind === "in-house") {
        if (!dateInRange(booking.checkIn, stayFrom, stayTo)) return false;
        if (booking.status !== "Checked-in") return false;
      }
      return true;
    });
  }, [agent, combinedRows, createdDate, expectedOnly, kind, query, status, stayFrom, stayTo]);

  function exportRows() {
    exportCsv(
      `${kind}.csv`,
      rows.map((booking) => ({
        "Booking ID": booking.resNo,
        Guest: booking.guest,
        "Room Type": booking.roomType,
        Stay: `${booking.checkIn} - ${booking.checkOut}`,
        Status: booking.status,
        "Booking Source": booking.bookingSource ?? booking.source,
        "Created On": booking.reservationDate
      }))
    );
    setToast(`${copy[kind].title} CSV exported`);
  }

  return (
    <ReservationPageFrame>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{copy[kind].title}</h1>
        <ToolbarButton tone="dark" icon={<Download className="h-4 w-4" />} onClick={exportRows}>
          Export CSV
        </ToolbarButton>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
        <Field label="Search">
          <SearchBox value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." />
        </Field>
        <Field label="Status Filter">
          <TextInput value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Type status to filter" />
        </Field>
        <Field label="Travel Agent">
          <TextInput value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="Type agent name" />
        </Field>
        <Field label="Stay From">
          <TextInput type="date" value={stayFrom} onChange={(event) => setStayFrom(event.target.value)} />
        </Field>
        <Field label="Stay To">
          <TextInput type="date" value={stayTo} onChange={(event) => setStayTo(event.target.value)} />
        </Field>
        <Field label="Created Date">
          <TextInput type="date" value={createdDate} onChange={(event) => setCreatedDate(event.target.value)} />
        </Field>
        <div className="self-end" />
      </div>

      <Panel
        title={copy[kind].panel}
        action={
          kind === "arrivals" ? (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={expectedOnly} onChange={(event) => setExpectedOnly(event.target.checked)} className="h-4 w-4 accent-slate-950" />
              Show only Expected arrivals
            </label>
          ) : null
        }
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <EmptyState>{copy[kind].empty}</EmptyState>
        ) : (
          <MovementTable rows={rows} />
        )}
      </Panel>
    </ReservationPageFrame>
  );
}

function MovementTable({ rows }: { rows: Reservation[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] text-left text-sm">
        <thead className="text-slate-500">
          <tr className="border-b border-line">
            {["Booking ID", "Guest", "Room Type", "Stay", "Status", "Travel Agent", "Created On"].map((heading) => (
              <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => (
            <tr key={booking.id} className="border-b border-line">
              <td className="px-5 py-3 font-medium">{booking.resNo}</td>
              <td className="px-5 py-3">{booking.guest}</td>
              <td className="px-5 py-3">{booking.roomType}</td>
              <td className="px-5 py-3">{booking.checkIn} - {booking.checkOut}</td>
              <td className="px-5 py-3">
                <StatusPill status={booking.status} />
              </td>
              <td className="px-5 py-3">{booking.source}</td>
              <td className="px-5 py-3">{booking.reservationDate || "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-slate-500">
        <span>Rows per page:</span>
        <span className="rounded-md border border-line px-4 py-2">10</span>
        <span>Showing 1 to {rows.length} of {rows.length}</span>
      </div>
    </div>
  );
}
