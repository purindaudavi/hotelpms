"use client";

import { useEffect, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { initialRoomTypes, isRoomTypeRecordArray, normalizeRoomTypeRecords, roomTypeStorageKey } from "./constants";
import { getRoomCatalog, getRoomsApiErrorMessage } from "@/app/lib/rooms-api";
import { InventoryPage } from "./inventory/inventory-page";
import { RateHunterPage } from "./rate-hunter/rate-hunter-page";
import { RatesPage } from "./rates/rates-page";
import { RoomsPage } from "./rooms/rooms-page";
import type { RoomsRatesModuleProps } from "./types";
import type { RoomTypeRecord } from "./types";
import { useRatePlans } from "./use-rate-plans";

export function RoomsRatesPage(props: RoomsRatesModuleProps) {
  const [roomTypes, setRoomTypes] = useSessionState<RoomTypeRecord[]>(
    roomTypeStorageKey(props.propertyId),
    initialRoomTypes,
    isRoomTypeRecordArray,
    normalizeRoomTypeRecords
  );
  const { ratePlans, setRatePlans, loading: ratesLoading, error: ratesError, refreshRatePlans } = useRatePlans(props.propertyId);
  const [roomsError, setRoomsError] = useState("");
  const path = props.activePath;

  useEffect(() => {
    let cancelled = false;
    void getRoomCatalog(props.propertyId)
      .then((catalog) => {
        if (cancelled) return;
        setRoomTypes(catalog.roomTypes);
        props.setRoomList(catalog.rooms);
        setRoomsError("");
      })
      .catch((error) => {
        if (!cancelled) setRoomsError(getRoomsApiErrorMessage(error));
      });
    return () => { cancelled = true; };
  }, [props.propertyId, props.setRoomList, setRoomTypes]);

  if (path.endsWith("rates")) {
    return <RatesPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} loading={ratesLoading} error={ratesError || roomsError} refreshRatePlans={refreshRatePlans} />;
  }

  if (path.endsWith("inventory")) {
    return <InventoryPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} ratesLoading={ratesLoading} ratesError={ratesError || roomsError} refreshRatePlans={refreshRatePlans} />;
  }

  if (path.endsWith("rate-hunter")) {
    return <RateHunterPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} />;
  }

  return <RoomsPage {...props} roomTypes={roomTypes} setRoomTypes={setRoomTypes} />;
}
