"use client";

import { useMemo, useState } from "react";
import { Download, List, Play, Table2 } from "lucide-react";
import type { HousekeepingInfoTab, HousekeepingReservation } from "../types";
import type { HousekeepingModuleProps } from "../types";
import { housekeepingReservations } from "../constants";
import { reservationPillClass, statusLabel } from "../utils";
import { HelpVideoButton, HelpVideoModal, HkButton, SegmentedTabs } from "../components/housekeeping-ui";

type InformationProps = HousekeepingModuleProps;

const infoTabs: HousekeepingInfoTab[] = ["Arrival", "Departure", "In House", "All", "Other"];

export function HousekeepingInformationPage({ reservations }: InformationProps) {
  const [activeTab, setActiveTab] = useState<HousekeepingInfoTab>("Arrival");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showHelp, setShowHelp] = useState(false);
  const rows = useMemo(() => housekeepingReservations, []);

  return (
    <main className="space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Information</h1>
        <div className="mt-4 max-w-xl">
          <SegmentedTabs tabs={infoTabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <section className="flex items-start justify-between gap-4">
        <TitleBlock activeTab={activeTab} />
        <div className="flex items-center gap-3">
          <HelpVideoButton onClick={() => setShowHelp(true)} />
          <button onClick={() => setView("grid")} className={`grid h-12 w-12 place-items-center rounded-md border border-line ${view === "grid" ? "bg-ink text-white" : "bg-white text-ink"}`}><Table2 className="h-5 w-5" /></button>
          <button onClick={() => setView("list")} className={`grid h-12 w-12 place-items-center rounded-md border border-line ${view === "list" ? "bg-ink text-white" : "bg-white text-ink"}`}><List className="h-5 w-5" /></button>
          <HkButton><Download className="h-4 w-4" /></HkButton>
        </div>
      </section>

      <InformationContent activeTab={activeTab} rows={rows} view={view} />

      {showHelp ? <HelpVideoModal onClose={() => setShowHelp(false)} /> : null}
      <span className="sr-only">{reservations.length} live reservations available</span>
    </main>
  );
}

function TitleBlock({ activeTab }: { activeTab: HousekeepingInfoTab }) {
  const copy: Record<HousekeepingInfoTab, { title: string; subtitle: string }> = {
    Arrival: { title: "Arrivals", subtitle: "Guests scheduled to arrive today" },
    Departure: { title: "Departures", subtitle: "Guests scheduled to depart today" },
    "In House": { title: "In-House Guests", subtitle: "Guests currently checked into the hotel" },
    All: { title: "All Reservations", subtitle: "All reservations within the selected date range" },
    Other: { title: "Other Reservations", subtitle: "Reservations marked as cancelled, no-show, blocks or other special statuses" }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{copy[activeTab].title}</h2>
      <p className="mt-2 text-slate-500">{copy[activeTab].subtitle}</p>
    </div>
  );
}

function InformationContent({ activeTab, rows, view }: { activeTab: HousekeepingInfoTab; rows: HousekeepingReservation[]; view: "grid" | "list" }) {
  if (activeTab === "All") return <AllReservationsTable rows={rows} />;

  const groupMap: Record<Exclude<HousekeepingInfoTab, "All">, HousekeepingReservation["group"]> = {
    Arrival: "arrival",
    Departure: "departure",
    "In House": "in-house",
    Other: "other"
  };
  const filtered = rows.filter((row) => row.group === groupMap[activeTab]);

  if (!filtered.length) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-slate-500">No {activeTab.toLowerCase()}s found.</div>;
  }

  return (
    <section className="min-h-[300px] rounded-lg border border-line bg-white p-6">
      <h3 className="mb-5 text-2xl font-bold text-ink">{activeTab === "Other" ? "Other" : activeTab}</h3>
      <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" : "space-y-3"}>
        {filtered.map((reservation) => <ReservationInfoCard key={reservation.id} reservation={reservation} compact={view === "list"} />)}
      </div>
    </section>
  );
}

function ReservationInfoCard({ reservation, compact }: { reservation: HousekeepingReservation; compact: boolean }) {
  return (
    <article className={`overflow-hidden rounded-xl border border-line bg-white shadow-sm ${compact ? "max-w-full" : "max-w-[260px]"}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-ink">{reservation.guest}</h4>
            <p className="mt-2 text-sm text-slate-500">#{reservation.bookingId} - {reservation.roomType} - Room {reservation.room}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${reservationPillClass(reservation.status)}`}>{statusLabel(reservation.status)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-line p-5 text-sm">
        <div>
          <strong className="text-ink">Stay:</strong>
          <p className="mt-1 text-slate-500">{reservation.stayFrom} - {reservation.stayTo} ({reservation.nights} night)</p>
        </div>
        <div>
          <strong className="text-ink">Guests:</strong> {reservation.guests}
        </div>
      </div>
    </article>
  );
}

function AllReservationsTable({ rows }: { rows: HousekeepingReservation[] }) {
  return (
    <section className="overflow-x-auto rounded-lg border border-line bg-white p-4">
      <table className="min-w-[1180px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-sm font-bold text-ink">
            <th className="px-3 py-3">Booking ID</th>
            <th className="px-3 py-3">Guest</th>
            <th className="px-3 py-3">Room</th>
            <th className="px-3 py-3">Room Type</th>
            <th className="px-3 py-3">Stay</th>
            <th className="px-3 py-3">Nights</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="px-3 py-3">{row.bookingId}</td>
              <td className="px-3 py-3">{row.guest}</td>
              <td className="px-3 py-3">{row.room}</td>
              <td className="px-3 py-3">{row.roomType}</td>
              <td className="px-3 py-3">{row.stayFrom.replace(", 2026", "")} - {row.stayTo.replace(", 2026", "")}</td>
              <td className="px-3 py-3">{row.nights}</td>
              <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${reservationPillClass(row.status)}`}>{row.status}</span></td>
              <td className="px-3 py-3">{row.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
