"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, LayoutGrid, List } from "lucide-react";
import { Reservation } from "@/app/data/pms-data";
import { statusPillClass } from "../constants";
import { DeskTab } from "../types";
import { parseDate } from "../utils";
import { IconButton } from "./controls";

type ReservationListViewProps = {
  tab: Exclude<DeskTab, "Front Desk">;
  reservations: Reservation[];
  businessDate: string;
  onBookingSelect: (booking: Reservation) => void;
  setToast: (message: string) => void;
};

type ViewMode = "grid" | "list";

export function ReservationListView({ tab, reservations, businessDate, onBookingSelect, setToast }: ReservationListViewProps) {
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>(tab === "All" ? "list" : "grid");
  const config = getListConfig(tab);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reservations
      .filter((booking) => reservationMatchesTab(booking, tab, businessDate))
      .filter((booking) => {
        if (!query) return true;
        return [booking.resNo, booking.bookingReference ?? booking.bookingRef, booking.guest, booking.roomType, booking.bookingSource ?? booking.source, booking.room].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.guest.localeCompare(b.guest));
  }, [businessDate, reservations, search, tab]);

  const visibleRows = rows.slice(0, rowsPerPage);
  const total = rows.length;

  function downloadCsv() {
    const header = ["Booking ID", "Guest", "Room Type", "Stay", "Status", "Booking Source", "Created On"];
    const body = rows.map((booking) => [booking.resNo, booking.guest, booking.roomType, stayLabel(booking), booking.status, booking.bookingSource ?? booking.source, booking.createdAt ?? booking.reservationDate]);
    const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `front-desk-${tab.toLowerCase().replaceAll(" ", "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`${config.title} exported`);
  }

  return (
    <section className="min-h-[740px] rounded-lg bg-white px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{config.title}</h2>
          <p className="mt-2 text-base text-slate-500">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <IconToggle label="Grid view" active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-5 w-5" />
          </IconToggle>
          <IconToggle label="List view" active={viewMode === "list"} onClick={() => setViewMode("list")}>
            <List className="h-5 w-5" />
          </IconToggle>
          <IconButton label="Download reservations" onClick={downloadCsv}>
            <Download className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search guest or booking ID..."
        className="focus-ring mt-7 h-11 w-full max-w-sm rounded-md border border-line bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400"
      />

      {visibleRows.length ? (
        <>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["Booking ID", "Guest", "Room Type", "Stay", "Status", "Booking Source", "Created On"].map((head) => (
                    <th key={head} className="px-3 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((booking) => (
                  <tr key={booking.id} className="cursor-pointer border-b border-line hover:bg-slate-50" onClick={() => onBookingSelect(booking)}>
                    <td className="px-3 py-4 font-medium text-ink">{booking.resNo}</td>
                    <td className="px-3 py-4 font-medium text-ink">{booking.guest}</td>
                    <td className="px-3 py-4 text-ink">{booking.roomType}</td>
                    <td className="px-3 py-4 text-ink">{stayLabel(booking)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${statusPillClass[booking.status]}`}>
                        {booking.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-ink">{booking.bookingSource ?? booking.source}</td>
                    <td className="px-3 py-4 text-ink">{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : booking.reservationDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>Rows per page:</span>
              <span className="relative">
                <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))} className="focus-ring h-10 appearance-none rounded-md border border-line bg-white px-4 pr-10 text-ink">
                  {[10, 25, 50].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              </span>
              <span>{paginationLabel(total, config.noun)}</span>
            </div>
            <div className="flex flex-1 items-center justify-center gap-5">
              <button type="button" disabled className="inline-flex items-center gap-1 font-semibold text-slate-400">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="grid h-12 w-12 place-items-center rounded-md border border-line bg-white font-semibold text-ink">1</span>
              <button type="button" disabled className="inline-flex items-center gap-1 font-semibold text-slate-400">
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="grid min-h-[420px] place-items-center text-base text-slate-500">{config.empty}</div>
      )}
    </section>
  );
}

function IconToggle({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-12 w-12 place-items-center rounded-md border border-line ${active ? "bg-ink text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function getListConfig(tab: Exclude<DeskTab, "Front Desk">) {
  if (tab === "Arrival") {
    return {
      title: "Arrivals",
      subtitle: "Guests scheduled to arrive today",
      empty: "No arrivals found.",
      noun: "arrivals"
    };
  }

  if (tab === "Departure") {
    return {
      title: "Departures",
      subtitle: "Guests scheduled to depart today",
      empty: "No departures found.",
      noun: "departures"
    };
  }

  if (tab === "In House") {
    return {
      title: "In-House Guests",
      subtitle: "Guests currently checked into the hotel",
      empty: "No in-house guests found.",
      noun: "in-house guests"
    };
  }

  return {
    title: "All Reservations",
    subtitle: "View all reservations across statuses",
    empty: "No reservations found.",
    noun: "reservations"
  };
}

function reservationMatchesTab(booking: Reservation, tab: Exclude<DeskTab, "Front Desk">, businessDate: string) {
  const inactive = booking.status === "Cancelled" || booking.status === "No Show" || booking.status === "Blocked";
  if (tab === "Arrival") return booking.checkIn === businessDate && !inactive && booking.status !== "Checked-in" && booking.status !== "Checked-out";
  if (tab === "Departure") return booking.checkOut === businessDate && !inactive && booking.status !== "Checked-out";
  if (tab === "In House") return booking.status === "Checked-in";
  return true;
}

function stayLabel(booking: Reservation) {
  return `${shortDate(booking.checkIn)} - ${shortDate(booking.checkOut)}`;
}

function shortDate(value: string) {
  const date = parseDate(value);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${String(date.getDate()).padStart(2, "0")}`;
}

function paginationLabel(total: number, noun: string) {
  if (!total) return `Showing 0 to 0 of 0 ${noun}`;
  return `Showing 1 to ${total} of ${total} ${noun}`;
}
