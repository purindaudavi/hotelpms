import type { PropertyDetails } from "@/app/components/modules/settings/property/property-types";
import { PRODUCT_NAME } from "./product-brand";

export function blankPropertyDetails(): PropertyDetails {
  return {
    hotelName: "", pmsName: PRODUCT_NAME, hotelType: "Hotel", hotelGuid: "", starCategory: "0",
    numberOfRooms: "0", onTrial: false, plan: "", description: "", address: "", city: "", zipCode: "",
    country: "LK", phone: "", email: "", website: "", checkInTime: "14:00", checkOutTime: "11:00",
    homeCurrency: "LKR", languageCode: "EN", timezone: "Asia/Colombo", logoWidth: "", logoHeight: "",
    ibeLogoWidth: "400", ibeLogoHeight: "200", supportPin: "", invoiceFooter: "", invoiceNotes: "",
    createdOn: "", createdTimestamp: "", lastUpdatedOn: "", lastUpdatedTimestamp: "", lastUpdatedBy: "",
    cmPropertyId: "", cmActive: false, latitude: "", longitude: "", logoUrl: ""
  };
}

// Only the original workspace receives the original sample records. Persisted
// records always take precedence; configuration defaults are not sample records.
export function propertyStorageFallback<T>(key: string, fallback: T): T {
  const match = /^staypilot:([^:]+):(.+)$/.exec(key);
  if (match && match[1] !== "demo" && Array.isArray(fallback) && !match[2].endsWith("currencies")) {
    return [] as T;
  }
  return fallback;
}
