import type { Reservation, Room } from "@/app/data/pms-data";
import type { InventoryCellMap, RatePlan, RoomTypeRecord } from "./types";

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function weekdayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function buildRateTitle(plan: Pick<RatePlan, "code" | "roomType" | "mealPlan" | "currency" | "resident">) {
  return `${plan.code}${plan.resident ? " Resident" : ""} - ${plan.roomType} - ${plan.mealPlan} - ${plan.currency}`;
}

export function makeInventoryKey(rateId: string, date: string) {
  return `${rateId}::${date}`;
}

export function buildInventoryCells(ratePlans: RatePlan[], dates: string[]) {
  return ratePlans.reduce<InventoryCellMap>((acc, plan) => {
    dates.forEach((date) => {
      acc[makeInventoryKey(plan.id, date)] = plan.defaultRate;
    });
    return acc;
  }, {});
}

export function availabilityFor(roomType: RoomTypeRecord, date: string, reservations: Reservation[]) {
  const occupied = reservations.filter((booking) => booking.roomType === roomType.name && date >= booking.checkIn && date < booking.checkOut).length;
  return Math.max(roomType.rooms.length - occupied, 0);
}

export function roomTypeSearch(roomType: RoomTypeRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [roomType.name, roomType.rooms.join(" "), roomType.amenities.join(" "), roomType.description].join(" ").toLowerCase().includes(needle);
}

export function ratePlanSearch(plan: RatePlan, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [plan.code, plan.roomType, plan.mealPlan, plan.currency, plan.title, plan.status].join(" ").toLowerCase().includes(needle);
}

export function roomTypeToRooms(roomType: RoomTypeRecord, roomList: Room[]) {
  return roomList.filter((room) => room.type === roomType.name).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}
