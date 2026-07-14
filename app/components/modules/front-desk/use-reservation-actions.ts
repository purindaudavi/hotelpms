"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Reservation, Room } from "@/app/data/pms-data";
import { currentSessionUser } from "@/app/lib/current-user";
import { isValidEmail, sendReservationConfirmation } from "@/app/lib/emailjs-confirmation";
import { deleteReservation, saveReservationRecord } from "@/app/lib/reservation-repository";
import type { RatePlan, ReservationForm } from "./types";
import { formToReservation, reservationRoomNumbers } from "./utils";

const invalidCheckInStatuses = new Set(["Cancelled", "No Show", "Blocked", "Checked-out"]);

type UseReservationActionsOptions = {
  propertyId: string;
  businessDate: string;
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  ratePlans: RatePlan[];
  setToast: (message: string) => void;
};

export type ReservationSaveResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: string };

export function useReservationActions(options: UseReservationActionsOptions) {
  const { propertyId, businessDate, reservations, setReservations, roomList, setRoomList, ratePlans, setToast } = options;

  async function deliverEmail(booking: Reservation) {
    const result = await sendReservationConfirmation(booking);
    const updated: Reservation = result.ok
      ? { ...booking, emailStatus: "sent", emailSentAt: result.sentAt, emailFailureMessage: undefined, updatedAt: new Date().toISOString() }
      : { ...booking, emailStatus: "failed", emailFailureMessage: result.failureMessage, updatedAt: new Date().toISOString() };

    setReservations((current) => saveReservationRecord(current, updated));
    setToast(result.ok ? "Reservation saved and confirmation email sent." : "Reservation saved, but the confirmation email could not be sent.");
    return updated;
  }

  async function saveReservation(form: ReservationForm): Promise<ReservationSaveResult> {
    const existing = reservations.find((booking) => booking.id === form.id);

    if (form.checkInNow) {
      if (invalidCheckInStatuses.has(form.status)) return { ok: false, error: `A ${form.status} reservation cannot be checked in.` };
      if (form.checkIn > businessDate || (form.isDayRoom ? form.checkIn !== businessDate : form.checkOut <= businessDate)) {
        return { ok: false, error: "The business date is outside this reservation's stay dates." };
      }

      for (const line of form.roomLines) {
        const room = roomList.find((item) => item.code === line.roomNumber);
        const alreadyOwned = existing?.status === "Checked-in" && reservationRoomNumbers(existing).includes(line.roomNumber);
        if (!room || (!alreadyOwned && room.status !== "Available") || (!alreadyOwned && room.housekeeping !== "Clean")) {
          return { ok: false, error: `Room ${line.roomNumber || "(unassigned)"} is not available and clean for immediate check-in.` };
        }
      }
    }

    let booking = formToReservation(form, propertyId, ratePlans, existing, businessDate, currentSessionUser.name);
    if (form.checkInNow) {
      const now = new Date().toISOString();
      booking = {
        ...booking,
        status: "Checked-in",
        checkedInAt: existing?.checkedInAt ?? now,
        checkedInBy: existing?.checkedInBy ?? currentSessionUser.name
      };

      const assigned = new Set(reservationRoomNumbers(booking));
      const previouslyAssigned = new Set(existing ? reservationRoomNumbers(existing) : []);
      setRoomList((current) => current.map((room) => {
        if (assigned.has(room.code)) return { ...room, status: "Occupied", housekeeping: "Occupied" };
        if (previouslyAssigned.has(room.code)) return { ...room, status: "Available", housekeeping: "Dirty" };
        return room;
      }));
    }

    setReservations((current) => saveReservationRecord(current, booking));
    setToast(`Reservation ${existing ? "updated" : "created"} locally`);

    if (form.sendEmail && isValidEmail(booking.email)) booking = await deliverEmail(booking);
    return { ok: true, reservation: booking };
  }

  function removeReservation(bookingId: string) {
    const existing = reservations.find((booking) => booking.id === bookingId);
    if (existing?.status === "Checked-in") {
      const assigned = new Set(reservationRoomNumbers(existing));
      setRoomList((current) => current.map((room) => assigned.has(room.code)
        ? { ...room, status: "Available", housekeeping: "Dirty" }
        : room));
    }
    setReservations((current) => deleteReservation(current, bookingId));
    setToast("Reservation removed from the shared local PMS source");
  }

  return { saveReservation, removeReservation, deliverEmail };
}
