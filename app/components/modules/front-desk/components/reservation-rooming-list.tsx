"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import type { Reservation, ReservationOccupant, ReservationRoom } from "@/app/data/pms-data";
import { roomTypes } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import { currentSessionUser } from "@/app/lib/current-user";
import { exportCsv } from "../../reservation/utils";

type RoomingListProps = {
  booking: Reservation;
  onUpdate: (reservation: Reservation, action: string, description: string) => void;
  setToast: (message: string) => void;
};

type OccupantDraft = Pick<ReservationOccupant, "id" | "roomLineId" | "name" | "title" | "guestType" | "isPrimary" | "isMainBooker" | "email" | "phone" | "country">;

export function ReservationRoomingList({ booking, onUpdate, setToast }: RoomingListProps) {
  const rooms = booking.reservationRooms ?? [];
  const occupants = booking.occupants ?? [];
  const [draft, setDraft] = useState<OccupantDraft | null>(null);
  const [error, setError] = useState("");

  const occupantsByRoom = useMemo(() => new Map(rooms.map((room) => [room.id, occupants.filter((guest) => guest.roomLineId === room.id)])), [occupants, rooms]);

  function startAdd(room: ReservationRoom) {
    setError("");
    setDraft({ id: createUuid(), roomLineId: room.id, name: "", title: "", guestType: "Adult", isPrimary: !(occupantsByRoom.get(room.id)?.some((guest) => guest.isPrimary)), isMainBooker: false, email: "", phone: "", country: "" });
  }

  function saveGuest() {
    if (!draft?.name.trim()) { setError("Guest name is required."); return; }
    const room = rooms.find((line) => line.id === draft.roomLineId);
    if (!room) { setError("Select a reservation room."); return; }
    const duplicate = occupants.find((guest) => guest.id !== draft.id && guest.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && guest.roomLineId !== draft.roomLineId && !guest.isMainBooker);
    if (duplicate) { setError("This occupant is already assigned to another room."); return; }

    const otherGuests = occupants.filter((guest) => guest.id !== draft.id && guest.roomLineId === draft.roomLineId);
    const adults = otherGuests.filter((guest) => guest.guestType === "Adult").length + (draft.guestType === "Adult" ? 1 : 0);
    const children = otherGuests.filter((guest) => guest.guestType === "Child").length + (draft.guestType === "Child" ? 1 : 0);
    const configured = roomTypes.find((type) => type.id === room.roomTypeId || type.name === room.roomType);
    if (adults > Math.min(room.adults, configured?.maxAdults ?? room.adults) || children > Math.min(room.children, configured?.maxChildren ?? room.children)) {
      setError(`Guest assignment exceeds the configured ${room.adults} adult / ${room.children} child occupancy for room ${room.roomNumber || "unassigned"}.`);
      return;
    }

    const now = new Date().toISOString();
    const existing = occupants.find((guest) => guest.id === draft.id);
    let nextGuests = occupants.filter((guest) => guest.id !== draft.id);
    if (draft.isPrimary) nextGuests = nextGuests.map((guest) => guest.roomLineId === draft.roomLineId ? { ...guest, isPrimary: false, updatedAt: now } : guest);
    nextGuests.push({
      ...draft,
      propertyId: booking.propertyId || "",
      reservationId: booking.id,
      name: draft.name.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });
    onUpdate({ ...booking, occupants: nextGuests, updatedAt: now }, existing ? "Guest updated" : "Guest added", `${draft.name.trim()} was ${existing ? "updated" : "added"} in the rooming list by ${currentSessionUser.name}.`);
    setDraft(null);
    setToast(existing ? "Rooming-list guest updated" : "Rooming-list guest added");
  }

  function removeGuest(guest: ReservationOccupant) {
    if (!window.confirm(`Remove ${guest.name} from this reservation rooming list?`)) return;
    if (guest.isPrimary && occupants.filter((item) => item.id !== guest.id && item.isPrimary).length === 0) {
      setToast("At least one primary guest must remain on the reservation");
      return;
    }
    onUpdate({ ...booking, occupants: occupants.filter((item) => item.id !== guest.id), updatedAt: new Date().toISOString() }, "Guest removed", `${guest.name} was removed from the rooming list.`);
  }

  function exportRoomingList() {
    exportCsv(`rooming-list-${booking.resNo}.csv`, rooms.map((room) => roomingRow(room, occupantsByRoom.get(room.id) ?? [], booking)));
    setToast("Rooming list CSV exported");
  }

  function printRoomingList() {
    const popup = window.open("", "_blank", "width=1000,height=700");
    if (!popup) { setToast("Allow pop-ups to print the rooming list"); return; }
    const rows = rooms.map((room) => {
      const row = roomingRow(room, occupantsByRoom.get(room.id) ?? [], booking);
      return `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
    popup.document.write(`<html><head><title>Rooming List ${escapeHtml(booking.resNo)}</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h1>Rooming List - ${escapeHtml(booking.resNo)}</h1><table><thead><tr><th>Room</th><th>Room Type</th><th>Primary Guest</th><th>Other Guests</th><th>Adults</th><th>Children</th><th>Stay</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between gap-2">
      <p className="text-sm text-slate-500">Assign primary guests and companions to each reservation room.</p>
      <div className="flex gap-2">
        <button type="button" onClick={exportRoomingList} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold"><Download className="h-4 w-4" />CSV</button>
        <button type="button" onClick={printRoomingList} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold"><Printer className="h-4 w-4" />Print</button>
      </div>
    </div>
    {rooms.map((room) => {
      const guests = occupantsByRoom.get(room.id) ?? [];
      const primary = guests.find((guest) => guest.isPrimary);
      const companions = guests.filter((guest) => !guest.isPrimary);
      return <section key={room.id} className="rounded-lg border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="font-semibold">Room {room.roomNumber || "Unassigned"} · {room.roomType}</h4><p className="mt-1 text-xs text-slate-500">{room.adults} adult(s), {room.children} child(ren) · {booking.checkIn} – {booking.checkOut}</p></div>
          <button type="button" onClick={() => startAdd(room)} className="inline-flex items-center gap-1 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />Add guest</button>
        </div>
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
          <p><span className="text-slate-500">Primary guest:</span> <b>{primary?.name || "Not assigned"}</b></p>
          <p className="mt-1"><span className="text-slate-500">Companions:</span> {companions.map((guest) => guest.name).join(", ") || "Not added"}</p>
        </div>
        <div className="mt-2 space-y-2">{guests.map((guest) => <div key={guest.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
          <span><b>{guest.name}</b> <span className="text-xs text-slate-500">{guest.isPrimary ? "Primary" : guest.guestType}{guest.isMainBooker ? " · Main booker" : ""}</span></span>
          <span className="flex gap-1"><button type="button" aria-label={`Edit ${guest.name}`} onClick={() => { setError(""); setDraft({ ...guest }); }} className="rounded p-2 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Remove ${guest.name}`} onClick={() => removeGuest(guest)} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></span>
        </div>)}</div>
      </section>;
    })}
    {!occupants.some((guest) => guest.isPrimary) ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">At least one primary guest is required.</p> : null}

    {draft ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"><div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
      <div className="flex justify-between"><h3 className="text-lg font-semibold">{occupants.some((guest) => guest.id === draft.id) ? "Edit guest" : "Add companion guest"}</h3><button type="button" onClick={() => setDraft(null)}><X className="h-5 w-5" /></button></div>
      {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RoomingInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <RoomingInput label="Title" value={draft.title || ""} onChange={(value) => setDraft({ ...draft, title: value })} />
        <label className="grid gap-1 text-sm font-semibold">Room<select value={draft.roomLineId} onChange={(event) => setDraft({ ...draft, roomLineId: event.target.value })} className="h-10 rounded-md border border-line px-3 font-normal">{rooms.map((room) => <option key={room.id} value={room.id}>Room {room.roomNumber || "Unassigned"} - {room.roomType}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">Guest type<select value={draft.guestType} onChange={(event) => setDraft({ ...draft, guestType: event.target.value as "Adult" | "Child" })} className="h-10 rounded-md border border-line px-3 font-normal"><option>Adult</option><option>Child</option></select></label>
        <RoomingInput label="Email" value={draft.email || ""} onChange={(value) => setDraft({ ...draft, email: value })} />
        <RoomingInput label="Phone" value={draft.phone || ""} onChange={(value) => setDraft({ ...draft, phone: value })} />
        <RoomingInput label="Country" value={draft.country || ""} onChange={(value) => setDraft({ ...draft, country: value })} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" checked={draft.isPrimary} onChange={(event) => setDraft({ ...draft, isPrimary: event.target.checked })} />Primary guest for room</label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDraft(null)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={saveGuest} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Save guest</button></div>
    </div></div> : null}
  </div>;
}

function roomingRow(room: ReservationRoom, guests: ReservationOccupant[], booking: Reservation) {
  return {
    Room: room.roomNumber || "Unassigned",
    "Room Type": room.roomType,
    "Primary Guest": guests.find((guest) => guest.isPrimary)?.name || "Not assigned",
    "Other Guests": guests.filter((guest) => !guest.isPrimary).map((guest) => guest.name).join(", ") || "Not added",
    Adults: room.adults,
    Children: room.children,
    Stay: `${booking.checkIn} - ${booking.checkOut}`
  };
}

function RoomingInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-semibold">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-line px-3 font-normal" /></label>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));
}
