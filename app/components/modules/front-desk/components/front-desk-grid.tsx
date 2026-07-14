import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Reservation, Room } from "@/app/data/pms-data";
import { statusDotClass, statusPillClass } from "../constants";
import { DeskColumn, DeskTab } from "../types";
import { bookingMatchesCell, cellClass, groupRooms, occupiedOnDate, reservationRoomNumbers } from "../utils";
import { IconButton } from "./controls";

type FrontDeskGridProps = {
  columns: DeskColumn[];
  displayedDateRange: string;
  roomList: Room[];
  reservations: Reservation[];
  tab: DeskTab;
  dayUse: boolean;
  gridDays: number;
  gridStartDate: string;
  dayUseDate: string;
  onDayUseChange: (enabled: boolean) => void;
  onGridDaysChange: (days: number) => void;
  onGridStartDateChange: (date: string) => void;
  onDayUseDateChange: (date: string) => void;
  onPreviousRange: () => void;
  onNextRange: () => void;
  onBookingClick: (booking: Reservation) => void;
};

export function FrontDeskGrid({
  columns,
  displayedDateRange,
  roomList,
  reservations,
  tab,
  dayUse,
  gridDays,
  gridStartDate,
  dayUseDate,
  onDayUseChange,
  onGridDaysChange,
  onGridStartDateChange,
  onDayUseDateChange,
  onPreviousRange,
  onNextRange,
  onBookingClick
}: FrontDeskGridProps) {
  const roomsByType = groupRooms(roomList);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Previous range" onClick={onPreviousRange}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <div className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold">{displayedDateRange}</div>
          <IconButton label="Next range" onClick={onNextRange}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Day Use
            <button
              type="button"
              aria-pressed={dayUse}
              onClick={() => onDayUseChange(!dayUse)}
              className={`h-7 w-12 rounded-full p-0.5 transition ${dayUse ? "bg-ink" : "bg-slate-200"}`}
            >
              <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${dayUse ? "translate-x-5" : ""}`} />
            </button>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            Grid Days:
            <select
              value={gridDays}
              onChange={(event) => onGridDaysChange(Number(event.target.value))}
              disabled={dayUse}
              className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm font-normal disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value={7}>7 Days</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </label>
          <input
            type="date"
            value={dayUse ? dayUseDate : gridStartDate}
            onChange={(event) => {
              if (dayUse) onDayUseDateChange(event.target.value);
              else onGridStartDateChange(event.target.value);
            }}
            className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
          />
        </div>
      </div>

      <div className="table-scroll overflow-x-auto">
        <table className="min-w-[1320px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-48 border-b border-r border-line bg-white px-3 py-3 text-left font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1">
                  Rooms <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`min-w-[86px] border-b border-r border-line px-3 py-2 text-center font-semibold ${
                    dayUse ? "bg-emerald-50" : column.active ? "bg-teal-100 text-slate-800" : column.weekend ? "bg-rose-50 text-rose-600" : "bg-white"
                  }`}
                >
                  <span className="block">{column.label}</span>
                  <span>{column.subLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SummaryRow label="Availability" columns={columns} roomList={roomList} reservations={reservations} dayUse={dayUse} />
            <SummaryRow label="Occupied" columns={columns} roomList={roomList} reservations={reservations} dayUse={dayUse} mode="occupied" />
            <SummaryRow label="Occupancy %" columns={columns} roomList={roomList} reservations={reservations} dayUse={dayUse} mode="occupancy" />
            <SummaryRow label="Total (All)" columns={columns} roomList={roomList} reservations={reservations} dayUse={dayUse} mode="total" />

            {roomsByType.map(({ type, rooms }) => (
              <RoomGroup
                key={type}
                type={type}
                rooms={rooms}
                columns={columns}
                reservations={reservations}
                tab={tab}
                dayUse={dayUse}
                onBookingClick={onBookingClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex min-h-20 flex-wrap items-center justify-center gap-4 border-t border-line bg-slate-50 px-4 py-3 text-xs text-slate-700">
        {Object.entries(statusDotClass).map(([status, className]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${className}`} />
            {status}
          </span>
        ))}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  columns,
  roomList,
  reservations,
  dayUse,
  mode = "availability"
}: {
  label: string;
  columns: DeskColumn[];
  roomList: Room[];
  reservations: Reservation[];
  dayUse: boolean;
  mode?: "availability" | "occupied" | "occupancy" | "total";
}) {
  return (
    <tr className="text-slate-500">
      <td className="sticky left-0 z-10 border-b border-r border-line bg-slate-50 px-3 py-2 font-semibold">
        {label === "Availability" ? <ChevronDown className="mr-1 inline h-3.5 w-3.5" /> : null}
        {label}
      </td>
      {columns.map((column) => {
        const sellableRooms = roomList.filter((room) => room.status !== "Out of Order" && room.status !== "Maintenance");
        const occupied = occupiedOnDate(sellableRooms, reservations, column.date, dayUse);
        const available = Math.max(sellableRooms.length - occupied, 0);
        const occupancy = Math.round((occupied / Math.max(sellableRooms.length, 1)) * 100);
        const value = mode === "occupied" ? occupied : mode === "occupancy" ? `${occupancy}%` : mode === "total" ? `${available} / ${occupied} (${occupancy}%)` : available;
        return (
          <td key={`${label}-${column.key}`} className={cellClass(column, dayUse, "border-b border-r border-line px-3 py-2 text-center")}>
            {value}
          </td>
        );
      })}
    </tr>
  );
}

function RoomGroup({
  type,
  rooms,
  columns,
  reservations,
  tab,
  dayUse,
  onBookingClick
}: {
  type: string;
  rooms: Room[];
  columns: DeskColumn[];
  reservations: Reservation[];
  tab: DeskTab;
  dayUse: boolean;
  onBookingClick: (booking: Reservation) => void;
}) {
  return (
    <>
      <tr>
        <td className="sticky left-0 z-10 border-b border-r border-line bg-slate-100 px-3 py-2 font-semibold">
          <ChevronDown className="mr-1 inline h-3.5 w-3.5" />
          {type}
        </td>
        {columns.map((column) => {
          const sellableRooms = rooms.filter((room) => room.status !== "Out of Order" && room.status !== "Maintenance");
          const occupied = occupiedOnDate(sellableRooms, reservations, column.date, dayUse);
          return (
            <td key={`${type}-${column.key}`} className={cellClass(column, dayUse, "border-b border-r border-line bg-slate-100 px-3 py-2 text-center font-semibold")}>
              {Math.max(sellableRooms.length - occupied, 0)}/{sellableRooms.length}
            </td>
          );
        })}
      </tr>
      {rooms.map((room) => (
        <tr key={room.id}>
          <td className="sticky left-0 z-10 border-b border-r border-line bg-white px-3 py-2 font-semibold text-slate-700">
            <span className={`mr-2 inline-block h-3.5 w-3.5 rounded-full ${room.status === "Occupied" ? "bg-yellow-400" : "bg-green-500"}`} />
            Room {room.code}
          </td>
          {columns.map((column) => {
            const bookings = reservations.filter((booking) => reservationRoomNumbers(booking).includes(room.code) && bookingMatchesCell(booking, column.date, tab, dayUse));
            return (
              <td key={`${room.id}-${column.key}`} className={cellClass(column, dayUse, "h-11 border-b border-r border-line px-1.5 py-1 align-middle")}>
                <div className="flex min-w-0 gap-1">
                  {bookings.slice(0, 2).map((booking) => (
                    <BookingPill key={`${booking.id}-${column.key}`} booking={booking} onClick={() => onBookingClick(booking)} />
                  ))}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function BookingPill({ booking, onClick }: { booking: Reservation; onClick: () => void }) {
  const icon = (booking.bookingSource ?? booking.source) === "Travel Agent" ? "TA" : "A";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 max-w-[132px] items-center gap-1 overflow-hidden rounded px-1.5 text-left text-xs font-semibold text-white shadow-sm ${statusPillClass[booking.status]}`}
      title={`${booking.guest} - ${booking.resNo}`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500 text-[10px] text-white">{icon}</span>
      <span className="truncate">{booking.guest}</span>
    </button>
  );
}
