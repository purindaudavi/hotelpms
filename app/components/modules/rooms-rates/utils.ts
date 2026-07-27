import type { Reservation, Room } from "@/app/data/pms-data";
import type { InventoryCellMap, RatePlan, RoomTypeRecord } from "./types";
import type { BusinessBlock } from "../reservation/types";
import { roomTypeAvailability } from "@/app/lib/business-block-repository";

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(value: string, days: number) {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

export function dateLabel(value: string) {
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function weekdayLabel(value: string) {
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function makeInventoryKey(rateId: string, roomTypeId: string, date: string) {
  return `${rateId}::${roomTypeId}::${date}`;
}

export function buildInventoryCells(ratePlans: RatePlan[], roomTypes: RoomTypeRecord[], dates: string[]) {
  return ratePlans.reduce<InventoryCellMap>((acc, plan) => {
    roomTypes.forEach((roomType) => dates.forEach((date) => {
      acc[makeInventoryKey(plan.id, roomType.id, date)] = plan.roomTypeRates[roomType.id] ?? plan.baseRate;
    }));
    return acc;
  }, {});
}

export function availabilityFor(roomType: RoomTypeRecord, date: string, reservations: Reservation[], blocks: BusinessBlock[] = []) {
  return roomTypeAvailability(roomType.name, date, roomType.rooms.length, reservations, blocks);
}

export function roomTypeSearch(roomType: RoomTypeRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [roomType.name, roomType.rooms.join(" "), roomType.amenities.join(" "), roomType.description].join(" ").toLowerCase().includes(needle);
}

export function ratePlanSearch(plan: RatePlan, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [plan.code, plan.name, plan.mealPlan, plan.currency, plan.active ? "Active" : "Disabled"].join(" ").toLowerCase().includes(needle);
}

export function roomTypeToRooms(roomType: RoomTypeRecord, roomList: Room[]) {
  return roomList.filter((room) => room.type === roomType.name).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}
