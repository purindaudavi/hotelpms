import { property, type Reservation, type ReservationStatus } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import type { ReservationFormState } from "./types";

export function mergeReservations(reservations: Reservation[]) {
  return reservations;
}

export function formatShortDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateInRange(value: string, from: string, to: string) {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function weekdayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function statusLabel(status: ReservationStatus) {
  if (status === "Confirmed") return "CONF";
  if (status === "Tentative") return "TENT";
  if (status === "Checked-in") return "checked-in";
  if (status === "Checked-out") return "checked-out";
  return status;
}

export function statusTone(status: ReservationStatus) {
  if (status === "Confirmed") return "bg-cyan-100 text-cyan-700";
  if (status === "Tentative") return "bg-yellow-100 text-yellow-700";
  if (status === "Checked-in") return "bg-emerald-100 text-emerald-700";
  if (status === "Checked-out") return "bg-pink-100 text-pink-700";
  if (status === "Cancelled") return "bg-slate-200 text-slate-600";
  if (status === "No Show") return "bg-stone-200 text-stone-700";
  return "bg-fuchsia-100 text-fuchsia-700";
}

export function searchReservation(booking: Reservation, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    booking.resNo,
    booking.bookingRef,
    booking.guest,
    booking.phone,
    booking.email,
    booking.country,
    booking.source,
    booking.status,
    booking.room,
    booking.roomType
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function reservationToForm(booking?: Reservation | null): ReservationFormState {
  return {
    id: booking?.id,
    resNo: booking?.resNo ?? String(1052712000 + Math.floor(Math.random() * 9000)),
    bookingRef: booking?.bookingRef ?? String(2000000000 + Math.floor(Math.random() * 900000000)),
    reservationDate: booking?.reservationDate ?? property.systemDate,
    checkIn: booking?.checkIn ?? property.systemDate,
    checkOut: booking?.checkOut ?? addDays(property.systemDate, 1),
    rooms: booking?.rooms ?? 1,
    source: booking?.source ?? "Agoda",
    status: booking?.status ?? "Confirmed",
    guest: booking?.guest ?? "",
    phone: booking?.phone ?? "",
    email: booking?.email ?? "",
    country: booking?.country ?? "",
    roomType: booking?.roomType ?? "Deluxe Double Room",
    room: booking?.room ?? "02",
    adults: booking?.adults ?? 2,
    children: booking?.children ?? 0,
    total: booking?.total ?? 0,
    paid: booking?.paid ?? 0
  };
}

export function formToReservation(form: ReservationFormState, existing?: Reservation): Reservation {
  return {
    ...existing,
    id: form.id ?? existing?.id ?? createUuid(),
    resNo: form.resNo,
    bookingRef: form.bookingRef,
    reservationDate: form.reservationDate,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    rooms: Number(form.rooms) || 1,
    source: form.source,
    status: form.status,
    guest: form.guest.trim() || "Walk-in Guest",
    phone: form.phone,
    email: form.email || "-",
    country: form.country || "-",
    roomType: form.roomType,
    room: form.room,
    adults: Number(form.adults) || 1,
    children: Number(form.children) || 0,
    total: Number(form.total) || 0,
    paid: Number(form.paid) || 0,
    bookingSource: existing?.bookingSource ?? form.source,
    bookingReference: existing?.bookingReference ?? form.bookingRef,
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };
}

export function exportCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const body = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  return false;
}
