"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import type { Reservation } from "@/app/data/pms-data";
import { saveReservationRecord } from "@/app/lib/reservation-repository";
import {
  sendReservationEmail,
  statusEmailCategory,
  type EmailCategory,
  type EmailOptions,
  type EmailResult
} from "@/app/lib/reservation-email";

type DeliveryContext = "creation" | "status" | "manual" | "retry";

type EmailDeliveryOptions = {
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  setToast: (message: string) => void;
  log: (reservationId: string, action: string, description: string) => void;
};

export function useReservationEmailDelivery({ setReservations, setToast, log }: EmailDeliveryOptions) {
  const inFlight = useRef(new Set<string>());

  async function deliver(
    booking: Reservation,
    category: EmailCategory,
    context: DeliveryContext,
    options: EmailOptions = {}
  ): Promise<{ booking: Reservation; result: EmailResult }> {
    const requestKey = `${booking.id}:${category}`;
    if (inFlight.current.has(requestKey)) {
      setToast("This email is already being sent.");
      return {
        booking,
        result: { ok: false, category, reason: "delivery", failureMessage: "Email already in progress." }
      };
    }

    inFlight.current.add(requestKey);
    setToast("Sending email…");

    try {
      const result = await sendReservationEmail(booking, category, options);
      const updated = context === "manual" ? booking : updateEmailState(booking, result);

      if (context !== "manual") {
        setReservations((current) => saveReservationRecord(current, updated));
      }

      const label = categoryLabel(category);
      log(
        booking.id,
        result.ok ? `${label} email sent` : `${label} email failed`,
        result.ok
          ? `${label} email sent to ${(options.to ?? booking.email).trim()}.`
          : `${label} email could not be sent to ${(options.to ?? booking.email).trim() || "the guest"}.`
      );
      setToast(toastMessage(context, result, label));
      return { booking: updated, result };
    } finally {
      inFlight.current.delete(requestKey);
    }
  }

  async function retry(booking: Reservation) {
    const category = statusEmailCategory[booking.status] ?? "confirmation";
    await deliver(booking, category, "retry");
  }

  async function sendManual(
    booking: Reservation,
    category: "reminder" | "general",
    options: EmailOptions = {}
  ) {
    const delivery = await deliver(booking, category, "manual", options);
    return delivery.result.ok;
  }

  return { deliver, retry, sendManual };
}

function updateEmailState(booking: Reservation, result: EmailResult): Reservation {
  const now = new Date().toISOString();
  return result.ok
    ? { ...booking, emailStatus: "sent", emailSentAt: result.sentAt, emailFailureMessage: undefined, updatedAt: now }
    : { ...booking, emailStatus: "failed", emailFailureMessage: result.failureMessage, updatedAt: now };
}

function categoryLabel(category: EmailCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function toastMessage(context: DeliveryContext, result: EmailResult, label: string) {
  if (result.ok) {
    if (context === "creation") return `Reservation saved and ${label} email sent.`;
    if (context === "status") return `Status updated and ${label} email sent.`;
    return `${label} email sent successfully.`;
  }

  if (context === "creation") return "Reservation saved, but the email could not be sent.";
  if (context === "status" && result.reason === "invalid-email") {
    return "Status updated, but no email was sent because the guest email is missing or invalid.";
  }
  if (context === "status") return "Status updated, but the email delivery failed.";
  return `${label} email could not be sent.`;
}
