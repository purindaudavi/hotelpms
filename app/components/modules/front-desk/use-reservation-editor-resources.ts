"use client";

import { useEffect } from "react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { property } from "@/app/data/pms-data";
import { propertyDetailsStorageKey, readPropertyDetails } from "@/app/lib/property-repository";
import { createInitialRatePlans, isRatePlanArray, migrateRatePlans, ratePlansStorageKey, synchronizeRatePlansWithRoomTypes } from "./rate-plans";
import {
  initialRoomTypes,
  isRoomTypeRecordArray,
  normalizeRoomTypeRecords,
  roomTypeStorageKey
} from "../rooms-rates/constants";
import type { RoomTypeRecord } from "../rooms-rates/types";

export function useReservationEditorResources(propertyId: string) {
  const [propertyDetails] = useLocalStorageState(propertyDetailsStorageKey(propertyId), () => readPropertyDetails(propertyId));
  const homeCurrency = propertyDetails.homeCurrency || property.currency;
  const [roomTypes] = useLocalStorageState<RoomTypeRecord[]>(
    roomTypeStorageKey(propertyId),
    initialRoomTypes,
    isRoomTypeRecordArray,
    normalizeRoomTypeRecords
  );
  const [ratePlans, setRatePlans] = useLocalStorageState(
    ratePlansStorageKey(propertyId),
    () => synchronizeRatePlansWithRoomTypes(createInitialRatePlans(propertyId, homeCurrency), roomTypes),
    isRatePlanArray,
    (records) => synchronizeRatePlansWithRoomTypes(migrateRatePlans(records, propertyId, homeCurrency), roomTypes)
  );

  useEffect(() => {
    setRatePlans((current) => {
      const next = synchronizeRatePlansWithRoomTypes(current, roomTypes);
      return next.every((plan, index) => plan === current[index]) ? current : next;
    });
  }, [roomTypes, setRatePlans]);

  return {
    businessDate: property.systemDate,
    homeCurrency,
    roomTypes,
    ratePlans,
    setRatePlans
  };
}
