"use client";

import { useEffect } from "react";
import { useLocalStorageState } from "@/app/components/hooks/use-local-storage-state";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { property } from "@/app/data/pms-data";
import { propertyDetailsStorageKey, readPropertyDetails } from "@/app/lib/property-repository";
import { getRoomCatalog } from "@/app/lib/rooms-api";
import { useRatePlans } from "../rooms-rates/use-rate-plans";
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
  const [roomTypes, setRoomTypes] = useSessionState<RoomTypeRecord[]>(
    roomTypeStorageKey(propertyId),
    initialRoomTypes,
    isRoomTypeRecordArray,
    normalizeRoomTypeRecords
  );
  const { ratePlans, setRatePlans, loading: ratesLoading, error: ratesError, refreshRatePlans } = useRatePlans(propertyId);

  useEffect(() => {
    let cancelled = false;
    void getRoomCatalog(propertyId).then((catalog) => {
      if (!cancelled) setRoomTypes(catalog.roomTypes);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [propertyId, setRoomTypes]);

  return {
    businessDate: property.systemDate,
    homeCurrency,
    roomTypes,
    ratePlans,
    setRatePlans,
    ratesLoading,
    ratesError,
    refreshRatePlans
  };
}
