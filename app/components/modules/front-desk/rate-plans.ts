import { createUuid } from "@/app/lib/record-ids";
import type { RatePlan } from "./types";

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

export function isRatePlanArray(value: unknown): value is RatePlan[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && typeof (item as RatePlan).id === "string" && typeof (item as RatePlan).name === "string");
}

