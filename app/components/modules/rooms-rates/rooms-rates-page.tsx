"use client";

import { useEffect } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { initialRoomTypes, isRoomTypeRecordArray, normalizeRoomTypeRecords, roomTypeStorageKey } from "./constants";
import { property } from "@/app/data/pms-data";
import { createInitialRatePlans, isRatePlanArray, migrateRatePlans, ratePlansStorageKey, synchronizeRatePlansWithRoomTypes } from "../front-desk/rate-plans";
import { InventoryPage } from "./inventory/inventory-page";
import { RateHunterPage } from "./rate-hunter/rate-hunter-page";
import { RatesPage } from "./rates/rates-page";
import { RoomsPage } from "./rooms/rooms-page";
import type { RoomsRatesModuleProps } from "./types";
import type { RoomTypeRecord } from "./types";
import type { RatePlan } from "./types";

export function RoomsRatesPage(props: RoomsRatesModuleProps) {
  const [roomTypes, setRoomTypes] = useSessionState<RoomTypeRecord[]>(
    roomTypeStorageKey(props.propertyId),
    initialRoomTypes,
    isRoomTypeRecordArray,
    normalizeRoomTypeRecords
  );
  const [ratePlans, setRatePlans] = useSessionState<RatePlan[]>(
    ratePlansStorageKey(props.propertyId),
    () => synchronizeRatePlansWithRoomTypes(createInitialRatePlans(props.propertyId, property.currency), roomTypes),
    isRatePlanArray,
    (records) => synchronizeRatePlansWithRoomTypes(migrateRatePlans(records, props.propertyId, property.currency), roomTypes)
  );
  const path = props.activePath;

  useEffect(() => {
    setRatePlans((current) => {
      const next = synchronizeRatePlansWithRoomTypes(current, roomTypes);
      return next.every((plan, index) => plan === current[index]) ? current : next;
    });
  }, [roomTypes, setRatePlans]);

  if (path.endsWith("rates")) {
    return <RatesPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} />;
  }

  if (path.endsWith("inventory")) {
    return <InventoryPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} />;
  }

  if (path.endsWith("rate-hunter")) {
    return <RateHunterPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} />;
  }

  return <RoomsPage {...props} roomTypes={roomTypes} setRoomTypes={setRoomTypes} />;
}
