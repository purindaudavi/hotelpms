import { createUuid } from "@/app/lib/record-ids";
import type { RatePlan } from "./types";
import type { RoomTypeRecord } from "../rooms-rates/types";

export function ratePlansStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:front-desk:rate-plans`;
}

export function createInitialRatePlans(propertyId: string, homeCurrency: string): RatePlan[] {
  const timestamp = "2026-06-18T00:00:00.000Z";
  const makePlan = (
    id: string,
    name: string,
    mealPlan: string,
    baseRate: number,
    refundable = true,
    cancellationPolicy = "Free cancellation until 24 hours before check-in."
  ): RatePlan => ({
    id,
    propertyId,
    name,
    currency: homeCurrency,
    mealPlan,
    baseRate,
    roomTypeRates: {},
    refundable,
    cancellationPolicy,
    code: name.includes("Corporate") ? "TA" : name.includes("Non-refundable") ? "OTA" : name.includes("B&B") ? "IBE" : "FIT",
    resident: false,
    validFrom: "2026-06-18",
    validTo: "2027-06-18",
    sellMode: "Per Room",
    rateMode: "Manual",
    locked: false,
    active: true,
    isCustom: name === "Custom Rate",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return [
    makePlan("standard-room-only", "Standard Room Only", "Room Only", 14500),
    makePlan("standard-bb", "Standard B&B", "Bed & Breakfast", 16000),
    makePlan(
      "non-refundable-bb",
      "Non-refundable B&B",
      "Bed & Breakfast",
      14000,
      false,
      "Non-refundable. Changes and cancellation are not permitted."
    ),
    makePlan("half-board-package", "Half Board Package", "Half Board", 20000),
    makePlan("corporate-rate", "Corporate Rate", "Room Only", 12500),
    makePlan("custom-rate", "Custom Rate", "Room Only", 0, true, "Custom cancellation terms.")
  ];
}

export function createRatePlan(
  propertyId: string,
  input: Omit<RatePlan, "id" | "propertyId" | "createdAt" | "updatedAt">
): RatePlan {
  const now = new Date().toISOString();
  return {
    ...input,
    id: createUuid(),
    propertyId,
    createdAt: now,
    updatedAt: now
  };
}

export function getPlanRate(plan: RatePlan, roomTypeId: string) {
  return plan.roomTypeRates[roomTypeId] ?? plan.baseRate;
}

export function migrateRatePlans(records: RatePlan[], propertyId: string, homeCurrency: string): RatePlan[] {
  const now = new Date().toISOString();
  return records.map((record) => ({
    ...record,
    propertyId,
    currency: record.currency || homeCurrency,
    roomTypeRates: record.roomTypeRates && typeof record.roomTypeRates === "object" ? record.roomTypeRates : {},
    refundable: record.refundable !== false,
    cancellationPolicy: record.cancellationPolicy || "Free cancellation until 24 hours before check-in.",
    code: record.code || "FIT",
    resident: Boolean(record.resident),
    validFrom: record.validFrom || "2026-06-18",
    validTo: record.validTo || "2027-06-18",
    sellMode: record.sellMode || "Per Room",
    rateMode: record.rateMode === "Auto" ? "Auto" : "Manual",
    locked: Boolean(record.locked),
    active: record.active !== false,
    isCustom: Boolean(record.isCustom),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now
  }));
}

export function synchronizeRatePlansWithRoomTypes(ratePlans: RatePlan[], roomTypes: RoomTypeRecord[]) {
  return ratePlans.map((plan) => {
    let changed = false;
    const roomTypeRates = { ...plan.roomTypeRates };
    roomTypes.filter((type) => type.active).forEach((type) => {
      if (!Number.isFinite(roomTypeRates[type.id])) {
        roomTypeRates[type.id] = Number(type.baseRate) || Number(plan.baseRate) || 0;
        changed = true;
      }
    });
    return changed ? { ...plan, roomTypeRates, updatedAt: new Date().toISOString() } : plan;
  });
}

export function isRatePlanArray(value: unknown): value is RatePlan[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && typeof (item as RatePlan).id === "string" && typeof (item as RatePlan).name === "string");
}
