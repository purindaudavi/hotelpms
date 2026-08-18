import type { ReservationStatus } from "@/app/data/pms-data";
import { reservationStatusClass } from "@/app/lib/property-theme";

export const statusDotClass: Record<ReservationStatus | "No-Show (Surcharge)" | "OUT OF ORDER" | "InvalidCC", string> = {
  Confirmed: reservationStatusClass("Confirmed", "dot"),
  Tentative: reservationStatusClass("Tentative", "dot"),
  "Checked-out": reservationStatusClass("Checked-out", "dot"),
  "Checked-in": reservationStatusClass("Checked-in", "dot"),
  Cancelled: reservationStatusClass("Cancelled", "dot"),
  "No Show": reservationStatusClass("No Show", "dot"),
  "No-Show (Surcharge)": reservationStatusClass("No-Show (Surcharge)", "dot"),
  Blocked: reservationStatusClass("Blocked", "dot"),
  "OUT OF ORDER": reservationStatusClass("OUT OF ORDER", "dot"),
  InvalidCC: reservationStatusClass("InvalidCC", "dot")
};

export const statusPillClass: Record<ReservationStatus, string> = {
  Confirmed: reservationStatusClass("Confirmed"),
  Tentative: reservationStatusClass("Tentative"),
  "Checked-in": reservationStatusClass("Checked-in"),
  "Checked-out": reservationStatusClass("Checked-out"),
  Cancelled: reservationStatusClass("Cancelled"),
  "No Show": reservationStatusClass("No Show"),
  Blocked: reservationStatusClass("Blocked")
};
