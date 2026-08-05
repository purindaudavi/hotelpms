import type { RatePlan } from "@/app/components/modules/front-desk/types";
import { api, getApiErrorMessage } from "./api";

export type DailyRate = {
  id: string;
  propertyId: string;
  ratePlanId: string;
  roomTypeId: string;
  date: string;
  amount: number;
  stopSell: boolean;
  minimumStay: number;
  maximumStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  notes: string;
};

export type RateQuote = {
  propertyId: string;
  ratePlanId: string;
  ratePlanName: string;
  ratePlanCode: string;
  roomTypeId: string;
  roomTypeName: string;
  currency: string;
  mealPlan: string;
  refundable: boolean;
  cancellationPolicy: string;
  checkIn: string;
  checkOut: string;
  dayRoom: boolean;
  nights: number;
  nightlyRates: Array<{ date: string; amount: number; source: "rate_plan" | "daily_rate" }>;
  averageNightlyRate: number;
  total: number;
};

type ApiRatePlan = {
  _id: string;
  property_id: string;
  name: string;
  code: string;
  currency: string;
  meal_plan: string;
  valid_from: string;
  valid_to: string;
  refundable: boolean;
  cancellation_policy: string;
  resident: boolean;
  sell_mode: "per_room" | "per_person";
  rate_mode: "manual" | "derived";
  room_type_rates: Array<{ room_type_id: string; amount: number }>;
  active: boolean;
  locked: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
};

type ApiDailyRate = {
  _id: string;
  property_id: string;
  rate_plan_id: string;
  room_type_id: string;
  date: string;
  amount: number;
  stop_sell: boolean;
  minimum_stay: number;
  maximum_stay: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  notes: string;
};

type ApiQuote = {
  property_id: string;
  rate_plan_id: string;
  rate_plan_name: string;
  rate_plan_code: string;
  room_type_id: string;
  room_type_name: string;
  currency: string;
  meal_plan: string;
  refundable: boolean;
  cancellation_policy: string;
  check_in: string;
  check_out: string;
  day_room: boolean;
  nights: number;
  nightly_rates: Array<{ date: string; amount: number; source: "rate_plan" | "daily_rate" }>;
  average_nightly_rate: number;
  total: number;
};

export async function getRatePlans(propertyId: string): Promise<RatePlan[]> {
  const response = await api.get<{ rate_plans: ApiRatePlan[] }>("/rates", {
    params: { property_id: propertyId }
  });
  return response.data.rate_plans.map(mapRatePlan);
}

export async function createRatePlanRecord(propertyId: string, plan: RatePlan): Promise<RatePlan> {
  const response = await api.post<{ rate_plan: ApiRatePlan }>("/rates", {
    property_id: propertyId,
    ...ratePlanPayload(plan)
  });
  return mapRatePlan(response.data.rate_plan);
}

export async function updateRatePlanRecord(
  propertyId: string,
  ratePlanId: string,
  changes: Partial<RatePlan>
): Promise<RatePlan> {
  const response = await api.patch<{ rate_plan: ApiRatePlan }>(
    `/rates/${ratePlanId}`,
    partialRatePlanPayload(changes),
    { params: { property_id: propertyId } }
  );
  return mapRatePlan(response.data.rate_plan);
}

export async function getDailyRates(
  propertyId: string,
  ratePlanId: string,
  dateFrom: string,
  dateTo: string
): Promise<DailyRate[]> {
  const response = await api.get<{ daily_rates: ApiDailyRate[] }>(
    `/rates/${ratePlanId}/daily-rates`,
    { params: { property_id: propertyId, date_from: dateFrom, date_to: dateTo } }
  );
  return response.data.daily_rates.map(mapDailyRate);
}

export async function saveDailyRates(
  propertyId: string,
  ratePlanId: string,
  dailyRates: Array<Omit<DailyRate, "id" | "propertyId" | "ratePlanId">>
): Promise<DailyRate[]> {
  const response = await api.put<{ daily_rates: ApiDailyRate[] }>(
    `/rates/${ratePlanId}/daily-rates`,
    {
      daily_rates: dailyRates.map((rate) => ({
        room_type_id: rate.roomTypeId,
        date: rate.date,
        amount: rate.amount,
        stop_sell: rate.stopSell,
        minimum_stay: rate.minimumStay,
        maximum_stay: rate.maximumStay,
        closed_to_arrival: rate.closedToArrival,
        closed_to_departure: rate.closedToDeparture,
        notes: rate.notes
      }))
    },
    { params: { property_id: propertyId } }
  );
  return response.data.daily_rates.map(mapDailyRate);
}

export async function getRateQuote(input: {
  propertyId: string;
  ratePlanId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  dayRoom: boolean;
}): Promise<RateQuote> {
  const response = await api.post<{ quote: ApiQuote }>("/rates/quote", {
    property_id: input.propertyId,
    rate_plan_id: input.ratePlanId,
    room_type_id: input.roomTypeId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    day_room: input.dayRoom
  });
  return mapQuote(response.data.quote);
}

export function getRatesApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Rates could not be loaded or saved.");
}

function ratePlanPayload(plan: RatePlan) {
  return {
    name: plan.name.trim(),
    code: plan.code.trim().toUpperCase(),
    currency: plan.currency,
    meal_plan: plan.mealPlan,
    valid_from: plan.validFrom,
    valid_to: plan.validTo,
    refundable: plan.refundable,
    cancellation_policy: plan.cancellationPolicy,
    resident: plan.resident,
    sell_mode: plan.sellMode === "Per Person" ? "per_person" : "per_room",
    rate_mode: plan.rateMode === "Auto" ? "derived" : "manual",
    room_type_rates: Object.entries(plan.roomTypeRates).map(([roomTypeId, amount]) => ({
      room_type_id: roomTypeId,
      amount
    })),
    active: plan.active,
    locked: plan.locked,
    is_custom: plan.isCustom
  };
}

function partialRatePlanPayload(changes: Partial<RatePlan>) {
  if (isFullRatePlan(changes)) return ratePlanPayload(changes);
  const payload: Record<string, unknown> = {};
  const map: Array<[keyof RatePlan, string]> = [
    ["name", "name"], ["code", "code"], ["currency", "currency"],
    ["mealPlan", "meal_plan"], ["validFrom", "valid_from"], ["validTo", "valid_to"],
    ["refundable", "refundable"], ["cancellationPolicy", "cancellation_policy"],
    ["resident", "resident"], ["active", "active"], ["locked", "locked"],
    ["isCustom", "is_custom"]
  ];
  map.forEach(([frontend, backend]) => {
    if (Object.prototype.hasOwnProperty.call(changes, frontend)) payload[backend] = changes[frontend];
  });
  if (changes.sellMode) payload.sell_mode = changes.sellMode === "Per Person" ? "per_person" : "per_room";
  if (changes.rateMode) payload.rate_mode = changes.rateMode === "Auto" ? "derived" : "manual";
  if (changes.roomTypeRates) {
    payload.room_type_rates = Object.entries(changes.roomTypeRates).map(([roomTypeId, amount]) => ({
      room_type_id: roomTypeId,
      amount
    }));
  }
  return payload;
}

function isFullRatePlan(value: Partial<RatePlan>): value is RatePlan {
  return typeof value.name === "string" && Boolean(value.roomTypeRates);
}

function mapRatePlan(plan: ApiRatePlan): RatePlan {
  const roomTypeRates = Object.fromEntries(
    plan.room_type_rates.map((rate) => [String(rate.room_type_id), rate.amount])
  );
  return {
    id: plan._id,
    propertyId: plan.property_id,
    name: plan.name,
    code: plan.code,
    currency: plan.currency,
    mealPlan: plan.meal_plan,
    baseRate: Object.values(roomTypeRates)[0] ?? 0,
    roomTypeRates,
    refundable: plan.refundable,
    cancellationPolicy: plan.cancellation_policy,
    resident: plan.resident,
    validFrom: plan.valid_from,
    validTo: plan.valid_to,
    sellMode: plan.sell_mode === "per_person" ? "Per Person" : "Per Room",
    rateMode: plan.rate_mode === "derived" ? "Auto" : "Manual",
    locked: plan.locked,
    active: plan.active,
    isCustom: plan.is_custom,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  };
}

function mapDailyRate(rate: ApiDailyRate): DailyRate {
  return {
    id: rate._id,
    propertyId: rate.property_id,
    ratePlanId: String(rate.rate_plan_id),
    roomTypeId: String(rate.room_type_id),
    date: rate.date,
    amount: rate.amount,
    stopSell: rate.stop_sell,
    minimumStay: rate.minimum_stay,
    maximumStay: rate.maximum_stay,
    closedToArrival: rate.closed_to_arrival,
    closedToDeparture: rate.closed_to_departure,
    notes: rate.notes
  };
}

function mapQuote(quote: ApiQuote): RateQuote {
  return {
    propertyId: quote.property_id,
    ratePlanId: String(quote.rate_plan_id),
    ratePlanName: quote.rate_plan_name,
    ratePlanCode: quote.rate_plan_code,
    roomTypeId: String(quote.room_type_id),
    roomTypeName: quote.room_type_name,
    currency: quote.currency,
    mealPlan: quote.meal_plan,
    refundable: quote.refundable,
    cancellationPolicy: quote.cancellation_policy,
    checkIn: quote.check_in,
    checkOut: quote.check_out,
    dayRoom: quote.day_room,
    nights: quote.nights,
    nightlyRates: quote.nightly_rates,
    averageNightlyRate: quote.average_nightly_rate,
    total: quote.total
  };
}
