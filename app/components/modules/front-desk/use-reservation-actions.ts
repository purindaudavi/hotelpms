"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Reservation, ReservationStatus, Room } from "@/app/data/pms-data";
import {
  archiveReservation,
  createReservation,
  createReservationFromBusinessBlock,
  getBookingsApiErrorMessage,
  transitionReservation,
  updateReservation
} from "@/app/lib/bookings-api";
import { currentSessionUser } from "@/app/lib/current-user";
import { saveReservationRecord } from "@/app/lib/reservation-repository";
import { statusEmailCategory } from "@/app/lib/reservation-email";
import type { RatePlan, ReservationForm } from "./types";
import { formToReservation, reservationRoomNumbers } from "./utils";
import { useReservationEmailDelivery } from "./use-reservation-email-delivery";

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
  const emailDelivery = useReservationEmailDelivery({
    setReservations,
    setToast,
    log: () => undefined
  });

  async function saveReservation(form: ReservationForm): Promise<ReservationSaveResult> {
    const existing = reservations.find((booking) => booking.id === form.id);
    const wantsImmediateCheckIn = form.checkInNow && form.status !== "Checked-out";

    if (wantsImmediateCheckIn) {
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

    const draft = formToReservation(form, propertyId, ratePlans, existing, businessDate, currentSessionUser.name);
    const desiredStatus: ReservationStatus = wantsImmediateCheckIn ? "Checked-in" : form.status;

    try {
      let booking: Reservation;
      if (!existing) {
        const createDraft = {
          ...draft,
          status: desiredStatus === "Checked-in" ? "Confirmed" as const : desiredStatus
        };
        booking = form.businessBlockId && form.businessBlockAllocationId
          ? await createReservationFromBusinessBlock(
              propertyId,
              form.businessBlockId,
              form.businessBlockAllocationId,
              createDraft
            )
          : await createReservation(propertyId, createDraft);
      } else {
        booking = await updateReservation(propertyId, { ...draft, status: existing.status });
      }

      booking = await applyReservationStatus(
        propertyId,
        booking,
        desiredStatus,
        businessDate,
        draft.reservationRemarks
      );
      updateRoomState(existing, booking, setRoomList);
      setReservations((current) => saveReservationRecord(current, booking));

      const statusChanged = Boolean(existing && existing.status !== booking.status);
      const emailCategory = !existing
        ? booking.status === "Checked-in"
          ? "check-in"
          : form.sendEmail
            ? "confirmation"
            : undefined
        : statusChanged
          ? statusEmailCategory[booking.status]
          : undefined;

      if (emailCategory) {
        booking = (await emailDelivery.deliver(
          booking,
          emailCategory,
          existing ? "status" : "creation"
        )).booking;
      } else {
        setToast(`Reservation ${existing ? "updated" : "created"} in MongoDB`);
      }
      return { ok: true, reservation: booking };
    } catch (error) {
      return { ok: false, error: getBookingsApiErrorMessage(error) };
    }
  }

  async function removeReservation(bookingId: string) {
    const existing = reservations.find((booking) => booking.id === bookingId);
    try {
      await archiveReservation(propertyId, bookingId);
      if (existing?.status === "Checked-in") {
        const assigned = new Set(reservationRoomNumbers(existing));
        setRoomList((current) => current.map((room) => assigned.has(room.code)
          ? { ...room, status: "Available", housekeeping: "Dirty" }
          : room));
      }
      setReservations((current) => current.filter((booking) => booking.id !== bookingId));
      setToast("Reservation archived in MongoDB");
    } catch (error) {
      setToast(getBookingsApiErrorMessage(error));
      throw error;
    }
  }

  return {
    saveReservation,
    removeReservation,
    deliverEmail: emailDelivery.retry,
    sendManualEmail: emailDelivery.sendManual,
    log: () => undefined
  };
}

async function applyReservationStatus(
  propertyId: string,
  booking: Reservation,
  desiredStatus: ReservationStatus,
  businessDate: string,
  cancellationReason = ""
) {
  if (booking.status === desiredStatus) return booking;

  let current = booking;
  if (current.status === "Tentative" && desiredStatus === "Checked-in") {
    current = await transitionReservation(propertyId, current.id, "confirm");
  }

  if (current.status === "Tentative" && desiredStatus === "Confirmed") {
    return transitionReservation(propertyId, current.id, "confirm");
  }
  if (current.status === "Confirmed" && desiredStatus === "Checked-in") {
    return transitionReservation(propertyId, current.id, "check-in", { businessDate });
  }
  if (current.status === "Checked-in" && desiredStatus === "Checked-out") {
    return transitionReservation(propertyId, current.id, "check-out");
  }
  if (
    desiredStatus === "Cancelled" &&
    ["Tentative", "Confirmed", "Blocked"].includes(current.status)
  ) {
    return transitionReservation(propertyId, current.id, "cancel", {
      reason: cancellationReason?.trim() || "Cancelled from StayPilot"
    });
  }
  if (current.status === "Confirmed" && desiredStatus === "No Show") {
    return transitionReservation(propertyId, current.id, "no-show");
  }

  throw new Error(`Status cannot change directly from ${current.status} to ${desiredStatus}.`);
}

function updateRoomState(
  previous: Reservation | undefined,
  next: Reservation,
  setRoomList: Dispatch<SetStateAction<Room[]>>
) {
  const assigned = new Set(reservationRoomNumbers(next));
  const previouslyAssigned = new Set(previous ? reservationRoomNumbers(previous) : []);

  if (next.status === "Checked-in") {
    setRoomList((current) => current.map((room) => {
      if (assigned.has(room.code)) {
        return { ...room, status: "Occupied", housekeeping: "Occupied" };
      }
      if (previouslyAssigned.has(room.code)) {
        return { ...room, status: "Available", housekeeping: "Dirty" };
      }
      return room;
    }));
    return;
  }

  if (previous?.status === "Checked-in") {
    setRoomList((current) => current.map((room) => previouslyAssigned.has(room.code)
      ? { ...room, status: "Available", housekeeping: "Dirty" }
      : room));
  }
}
