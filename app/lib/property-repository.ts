import { readLocalStorageValue } from "@/app/components/hooks/use-local-storage-state";
import { initialProperty } from "@/app/components/modules/settings/property/property-page";

export const propertyDetailsStorageKey = (propertyId: string) => `staypilot:${propertyId}:property:details`;

export function readPropertyDetails(propertyId: string) {
  const legacy = readLocalStorageValue("staypilot.property.details", initialProperty);
  return readLocalStorageValue(propertyDetailsStorageKey(propertyId), legacy);
}

export function readPropertyHomeCurrency(propertyId: string) {
  return readPropertyDetails(propertyId).homeCurrency || initialProperty.homeCurrency;
}
