import type { Reservation, ReservationStatus } from "@/app/data/pms-data";
import { api, getApiErrorMessage } from "@/app/lib/api";
import { readPropertyDetails } from "@/app/lib/property-repository";

export type EmailCategory = "confirmation" | "check-in" | "check-out" | "cancellation" | "reminder" | "no-show" | "general";

export type EmailOptions = {
  to?: string;
  subject?: string;
  message?: string;
};

export type EmailResult =
  | { ok: true; category: EmailCategory; sentAt: string }
  | { ok: false; category: EmailCategory; reason: "invalid-email" | "delivery"; failureMessage: string };

export const statusEmailCategory: Partial<Record<ReservationStatus, EmailCategory>> = {
  Confirmed: "confirmation",
  "Checked-in": "check-in",
  "Checked-out": "check-out",
  Cancelled: "cancellation",
  "No Show": "no-show"
};

const endpoints: Record<EmailCategory, string> = {
  confirmation: "/mail/confirmation",
  "check-in": "/mail/check-in",
  "check-out": "/mail/check-out",
  cancellation: "/mail/cancellation",
  reminder: "/mail/remind",
  "no-show": "/mail/no-show",
  general: "/mail/general"
};

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendReservationEmail(
  booking: Reservation,
  category: EmailCategory,
  options: EmailOptions = {}
): Promise<EmailResult> {
  const to = (options.to ?? booking.email).trim();
  if (!isValidEmail(to)) {
    return { ok: false, category, reason: "invalid-email", failureMessage: "The guest email address is missing or invalid." };
  }

  if (category === "general" && (!options.subject?.trim() || !options.message?.trim())) {
    return { ok: false, category, reason: "delivery", failureMessage: "General email subject and message are required." };
  }

  try {
    await api.post(endpoints[category], buildPayload(booking, category, { ...options, to }));
    return { ok: true, category, sentAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, category, reason: "delivery", failureMessage: getApiErrorMessage(error) };
  }
}

function buildPayload(booking: Reservation, category: EmailCategory, options: EmailOptions) {
  const hotel = readPropertyDetails(booking.propertyId || "demo");
  const to = options.to ?? booking.email;
  const name = [booking.guestTitle, booking.guest].filter(Boolean).join(" ");
  const nights = booking.isDayRoom ? "Day use" : Math.max(daysBetween(booking.checkIn, booking.checkOut), 1);
  const rooms = roomSummary(booking);
  const currency = booking.currency || hotel.homeCurrency;
  const remaining = Math.max(booking.total - booking.paid, 0);
  const payment = remaining === 0 ? "Paid" : `Balance due: ${currency} ${remaining.toFixed(2)}`;
  const specialRequest = booking.guestRemarks?.trim() || "None";

  const payloads: Record<EmailCategory, Record<string, string | number>> = {
    confirmation: {
      mail: to,
      name,
      checkin: booking.checkIn,
      checkout: booking.checkOut,
      duration: nights,
      rooms,
      payment,
      total: booking.total.toFixed(2),
      sperequest: specialRequest
    },
    "check-in": {
      mail: to,
      name,
      reservation: booking.resNo,
      checkin: booking.checkIn,
      checkout: booking.checkOut,
      nights,
      rooms,
      sperequest: specialRequest,
      timelocation: `${hotel.checkInTime || "Check-in time unavailable"} - ${hotel.address}`,
      wifiname: "Contact Front Desk",
      wifipwd: "Provided at check-in"
    },
    "check-out": {
      mail: to,
      name,
      reservation: booking.resNo,
      checkin: booking.checkIn,
      checkout: booking.checkOut,
      duration: nights,
      finaltotal: `${currency} ${booking.total.toFixed(2)}`,
      payment
    },
    cancellation: {
      mail: to,
      name,
      reservation: booking.resNo,
      originalcheckin: booking.checkIn,
      originalcheckout: booking.checkOut,
      rooms,
      bookingsource: booking.bookingSource || booking.source || "Direct",
      payment
    },
    reminder: {
      mail: to,
      name,
      reservation: booking.resNo,
      checkin: booking.checkIn,
      checkout: booking.checkOut,
      nights,
      rooms,
      balance: `${currency} ${remaining.toFixed(2)}`,
      spereq: specialRequest
    },
    "no-show": {
      mail: to,
      name,
      reservation: booking.resNo,
      checkin: booking.checkIn,
      checkout: booking.checkOut,
      rooms,
      total: booking.total.toFixed(2),
      payment
    },
    general: {
      mail: to,
      name,
      subject: options.subject?.trim() || "General Information",
      message: options.message?.trim() || ""
    }
  };

  return payloads[category];
}

function roomSummary(booking: Reservation) {
  if (booking.reservationRooms?.length) {
    return booking.reservationRooms
      .map((room) => `${room.roomType} - Room ${room.roomNumber || "Unassigned"}`)
      .join(", ");
  }
  return `${booking.roomType} - Room ${booking.room}`;
}

function daysBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}
