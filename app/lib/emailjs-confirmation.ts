import emailjs from "@emailjs/browser";
import type { Reservation } from "@/app/data/pms-data";
import { property } from "@/app/data/pms-data";

export type ConfirmationEmailResult =
  | { ok: true; sentAt: string }
  | { ok: false; failureMessage: string };

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendReservationConfirmation(booking: Reservation): Promise<ConfirmationEmailResult> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return { ok: false, failureMessage: "EmailJS environment variables are not configured." };
  }

  if (!isValidEmail(booking.email)) {
    return { ok: false, failureMessage: "The guest email address is invalid." };
  }

  const roomDetails = (booking.reservationRooms ?? [])
    .map((line) => `${line.roomType} - Room ${line.roomNumber}${line.isFoc ? " (Complimentary accommodation)" : ""}`)
    .join(", ") || `${booking.roomType} - Room ${booking.room}`;
  const balance = Math.max(booking.total - booking.paid, 0);

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: booking.email,
        guest_title: booking.guestTitle ?? "",
        guest_name: booking.guest,
        hotel_name: property.name,
        hotel_address: property.address,
        hotel_phone: property.phone,
        reservation_number: booking.resNo,
        booking_reference: booking.bookingReference ?? booking.bookingRef,
        check_in_date: booking.checkIn,
        check_out_date: booking.checkOut,
        nights: String(Math.max(booking.isDayRoom ? 0 : nightsBetween(booking.checkIn, booking.checkOut), 0)),
        room_details: roomDetails,
        rate_plan: booking.ratePlanName ?? "",
        meal_plan: booking.mealPlan ?? "",
        currency: booking.currency ?? property.currency,
        total_amount: booking.total.toFixed(2),
        paid_amount: booking.paid.toFixed(2),
        balance_amount: balance.toFixed(2),
        cancellation_policy: booking.cancellationPolicy ?? "",
        guest_remarks: booking.guestRemarks ?? ""
      },
      { publicKey }
    );
    return { ok: true, sentAt: new Date().toISOString() };
  } catch (error) {
    return {
      ok: false,
      failureMessage: error instanceof Error ? error.message : "EmailJS could not send the message."
    };
  }
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

