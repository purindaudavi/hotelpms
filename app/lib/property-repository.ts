import { readLocalStorageValue } from "@/app/components/hooks/use-local-storage-state";
import { initialProperty } from "@/app/components/modules/settings/property/property-page";
import { blankPropertyDetails } from "./property-defaults";

export const propertyDetailsStorageKey = (propertyId: string) => `staypilot:${propertyId}:property:details`;

export function readPropertyDetails(propertyId: string) {
  if (propertyId !== "demo") {
    const fallback = blankPropertyDetails();
    return { ...fallback, ...readLocalStorageValue(propertyDetailsStorageKey(propertyId), fallback) };
  }
  const legacy = { ...initialProperty, ...readLocalStorageValue("staypilot.property.details", initialProperty) };
  return { ...initialProperty, ...readLocalStorageValue(propertyDetailsStorageKey(propertyId), legacy) };
}

export function readPropertyHomeCurrency(propertyId: string) {
  return readPropertyDetails(propertyId).homeCurrency || initialProperty.homeCurrency;
}
