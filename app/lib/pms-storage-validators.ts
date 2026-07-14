import type { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isReservationArray(value: unknown): value is Reservation[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.id === "string" && typeof item.resNo === "string"
    && typeof item.checkIn === "string" && typeof item.checkOut === "string"
    && typeof item.status === "string" && typeof item.guest === "string");
}

export function isRoomArray(value: unknown): value is Room[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.id === "string" && typeof item.code === "string"
    && typeof item.type === "string" && typeof item.status === "string");
}

export function isTransactionArray(value: unknown): value is FinancialTransaction[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.id === "string" && typeof item.date === "string"
    && typeof item.type === "string" && typeof item.value === "number");
}
