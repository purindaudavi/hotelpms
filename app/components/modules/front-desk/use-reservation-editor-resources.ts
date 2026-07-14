"use client";

import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { property } from "@/app/data/pms-data";
import { propertyDetailsStorageKey, readPropertyDetails } from "@/app/lib/property-repository";
import { createInitialRatePlans, isRatePlanArray, ratePlansStorageKey } from "./rate-plans";

export function useReservationEditorResources(propertyId: string) {
  const [propertyDetails] = useLocalStorageState(propertyDetailsStorageKey(propertyId), () => readPropertyDetails(propertyId));
  const homeCurrency = propertyDetails.homeCurrency || property.currency;
  const [ratePlans, setRatePlans] = useLocalStorageState(
    ratePlansStorageKey(propertyId),
    () => createInitialRatePlans(propertyId, readPropertyDetails(propertyId).homeCurrency || property.currency),
    isRatePlanArray
  );

  return {
    businessDate: property.systemDate,
    homeCurrency,
    ratePlans,
    setRatePlans
  };
}
