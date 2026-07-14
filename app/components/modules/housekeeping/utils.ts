import type { Room } from "@/app/data/pms-data";
import type { HousekeepingActivity, HousekeepingReservation, HousekeepingStatus } from "./types";

export function initialRoomStatuses(rooms: Room[]) {
  return rooms.reduce<Record<string, HousekeepingStatus>>((acc, room) => {
    acc[room.id] = room.status === "Occupied" ? "Occupied" : "Clean";
    return acc;
  }, {});
}

export function statusClass(status: HousekeepingStatus) {
  if (status === "Clean") return "border-emerald-500 text-emerald-700";
  if (status === "Occupied") return "border-amber-500 text-amber-700";
  if (status === "Dirty") return "border-rose-500 text-rose-700";
  return "border-indigo-500 text-indigo-700";
}

export function statusPillClass(status: HousekeepingStatus) {
  if (status === "Clean") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "Occupied") return "border-amber-300 bg-amber-50 text-amber-700";
  if (status === "Dirty") return "border-rose-300 bg-rose-50 text-rose-700";
  return "border-blue-300 bg-blue-50 text-blue-700";
}

export function reservationPillClass(status: HousekeepingReservation["status"]) {
  if (status === "checked-in") return "bg-emerald-400 text-white";
  if (status === "checked-out") return "bg-pink-300 text-white";
  if (status === "tentative") return "bg-yellow-300 text-white";
  return "bg-slate-300 text-slate-700";
}

export function statusLabel(status: HousekeepingReservation["status"]) {
  return status.toUpperCase();
}

export function groupActivities(activities: HousekeepingActivity[]) {
  return activities.reduce<Record<string, HousekeepingActivity[]>>((acc, activity) => {
    if (!acc[activity.attendant]) acc[activity.attendant] = [];
    acc[activity.attendant].push(activity);
    return acc;
  }, {});
}

export function nowLabel() {
  return "Jun 16, 9:41 PM";
}
