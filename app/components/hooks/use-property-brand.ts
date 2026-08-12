"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPropertyImages,
  getPropertyRecord,
  propertyBrandChangedEvent
} from "@/app/lib/property-api";
import { readPropertyDetails } from "@/app/lib/property-repository";

export type PropertyBrand = {
  hotelName: string;
  logoUrl: string;
};

export function usePropertyBrand(propertyId: string, fallbackName: string) {
  const [brand, setBrand] = useState<PropertyBrand>(() => ({
    hotelName: fallbackName,
    logoUrl: ""
  }));

  const refresh = useCallback(async () => {
    const cached = readPropertyDetails(propertyId);
    const [propertyResult, imagesResult] = await Promise.allSettled([
      getPropertyRecord(propertyId, cached),
      getPropertyImages(propertyId)
    ]);

    const hotelName = propertyResult.status === "fulfilled"
      ? propertyResult.value.details.hotelName
      : cached.hotelName || fallbackName;
    const logoUrl = imagesResult.status === "fulfilled"
      ? imagesResult.value.find((image) => image.imageType === "logo")?.url || ""
      : "";

    setBrand({ hotelName, logoUrl });
  }, [fallbackName, propertyId]);

  useEffect(() => {
    void refresh();

    function handleBrandChange(event: Event) {
      const detail = (event as CustomEvent<{ propertyId?: string }>).detail;
      if (detail?.propertyId !== propertyId) return;
      void refresh();
    }

    window.addEventListener(propertyBrandChangedEvent, handleBrandChange);
    return () => window.removeEventListener(propertyBrandChangedEvent, handleBrandChange);
  }, [propertyId, refresh]);

  return brand;
}
