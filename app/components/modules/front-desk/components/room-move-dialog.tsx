"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Reservation, Room } from "@/app/data/pms-data";
import { getBookingsApiErrorMessage, moveReservationRooms } from "@/app/lib/bookings-api";
import { getRoomCatalog } from "@/app/lib/rooms-api";

export function RoomMoveDialog({ propertyId, businessDate, booking, onClose, onMoved }: {
  propertyId: string; businessDate: string; booking: Reservation;
  onClose: () => void; onMoved: (saved: Reservation) => void;
}) {
  const lines = booking.reservationRooms ?? [];
  const [lineId, setLineId] = useState(lines[0]?.id ?? "");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const line = lines.find((item) => item.id === lineId);
  const destinations = rooms.filter((room) => room.type === line?.roomType && room.id !== line?.roomId && room.status === "Available" && room.housekeeping === "Clean");
  useEffect(() => {
    let cancelled = false;
    void getRoomCatalog(propertyId).then((catalog) => { if (!cancelled) setRooms(catalog.rooms); })
      .catch((failure) => { if (!cancelled) setError(getBookingsApiErrorMessage(failure)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || !line || !destination || !reason.trim()) return;
    locked.current = true; setSaving(true); setError("");
    try {
      const saved = await moveReservationRooms(propertyId, booking.id, {
        business_date: businessDate, reason: reason.trim(),
        moves: [{ room_line_id: line.id, from_physical_room_id: line.roomId, to_physical_room_id: destination }]
      });
      onMoved(saved);
    } catch (failure) { setError(getBookingsApiErrorMessage(failure)); }
    finally { locked.current = false; setSaving(false); }
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="room-move-title">
    <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-xl border border-line bg-white p-6 shadow-xl">
      <h2 id="room-move-title" className="text-xl font-semibold">Move in-house guest</h2>
      <p className="text-sm text-slate-500">Effective {businessDate}. Same room type; rates, payments and guest details stay unchanged.</p>
      <label className="grid gap-1 text-sm font-semibold">Current assignment
        <select value={lineId} disabled={saving} onChange={(event) => { setLineId(event.target.value); setDestination(""); }} className="h-11 rounded-md border border-line bg-white px-3">
          {lines.map((item) => <option key={item.id} value={item.id}>{item.roomNumber} — {item.roomType}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Move to
        <select value={destination} required disabled={loading || saving} onChange={(event) => setDestination(event.target.value)} className="h-11 rounded-md border border-line bg-white px-3">
          <option value="">{loading ? "Loading rooms..." : "Select an available, clean room"}</option>
          {destinations.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}
        </select>
      </label>
      {!loading && !destinations.length ? <p className="text-sm text-amber-700">No clean, available destination in this room type. Prepare another room first.</p> : null}
      <p className="text-xs text-slate-500">Availability for the remaining stay is checked again when you save. The previous room will be marked dirty.</p>
      <label className="grid gap-1 text-sm font-semibold">Reason
        <textarea value={reason} required maxLength={500} disabled={saving} onChange={(event) => setReason(event.target.value)} placeholder="For example: air conditioner needs repair" className="min-h-20 rounded-md border border-line bg-white p-3" />
      </label>
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={saving || loading || !line || !destination || !reason.trim()} className="reservation-primary-action rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Moving..." : "Move guest"}</button>
      </div>
    </form>
  </div>;
}

