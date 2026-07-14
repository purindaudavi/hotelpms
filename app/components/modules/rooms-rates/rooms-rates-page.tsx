"use client";

import { useSessionState } from "@/app/components/hooks/use-session-state";
import { initialRatePlans, initialRoomTypes } from "./constants";
import { InventoryPage } from "./inventory/inventory-page";
import { RateHunterPage } from "./rate-hunter/rate-hunter-page";
import { RatesPage } from "./rates/rates-page";
import { RoomsPage } from "./rooms/rooms-page";
import type { RoomsRatesModuleProps } from "./types";

export function RoomsRatesPage(props: RoomsRatesModuleProps) {
  const keyPrefix = `staypilot:${props.propertyId}:rooms-rates`;
  const [roomTypes, setRoomTypes] = useSessionState(`${keyPrefix}:room-types`, initialRoomTypes);
  const [ratePlans, setRatePlans] = useSessionState(`${keyPrefix}:rate-plans`, initialRatePlans);
  const path = props.activePath;

  if (path.endsWith("rates")) {
    return <RatesPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} />;
  }

  if (path.endsWith("inventory")) {
    return <InventoryPage {...props} roomTypes={roomTypes} ratePlans={ratePlans} setRatePlans={setRatePlans} />;
  }

  if (path.endsWith("rate-hunter")) {
    return <RateHunterPage {...props} />;
  }

  return <RoomsPage {...props} roomTypes={roomTypes} setRoomTypes={setRoomTypes} />;
}
