import { ReservationStatus } from "@/app/data/pms-data";

export const statusDotClass: Record<ReservationStatus | "No-Show (Surcharge)" | "OUT OF ORDER" | "InvalidCC", string> = {
  Confirmed: "bg-cyan-400",
  Tentative: "bg-yellow-400",
  "Checked-out": "bg-pink-400",
  "Checked-in": "bg-green-400",
  Cancelled: "bg-slate-400",
  "No Show": "bg-stone-500",
  "No-Show (Surcharge)": "bg-stone-500",
  Blocked: "bg-purple-400",
  "OUT OF ORDER": "bg-slate-800",
  InvalidCC: "bg-fuchsia-700"
};

export const statusPillClass: Record<ReservationStatus, string> = {
  Confirmed: "bg-cyan-400",
  Tentative: "bg-yellow-400",
  "Checked-in": "bg-green-400",
  "Checked-out": "bg-pink-400",
  Cancelled: "bg-slate-400",
  "No Show": "bg-stone-500",
  Blocked: "bg-purple-400"
};
