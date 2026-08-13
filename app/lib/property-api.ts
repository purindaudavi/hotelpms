import axios from "axios";
import type {
  PropertyDetails,
  PropertyImageRecord,
  MealAllocation
} from "@/app/components/modules/settings/property/property-types";
import { api, getApiErrorMessage } from "./api";

export const propertyBrandChangedEvent = "staypilot:property-brand-changed";

type ApiActor = {
  user_id?: string;
  name?: string;
  email?: string;
};

type ApiPropertyInfo = {
  hotel_name: string;
  hotel_type: string;
  hotel_guid: string;
  star_category: number;
  on_trial: boolean;
  plan: string;
  description: string;
  address: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone: string;
  email: string;
  website: string;
  check_in_time: string;
  check_out_time: string;
  home_currency: string;
  language_code: string;
  timezone: string;
  invoice_footer: string;
  invoice_notes: string;
  cm_property_id: string;
  cm_active: boolean;
  latitude: number | null;
  longitude: number | null;
  ibe_logo_width: number;
  ibe_logo_height: number;
};

type ApiProperty = {
  _id: string;
  property_id: string;
  info: ApiPropertyInfo;
  status: "active" | "inactive";
  created_by?: ApiActor;
  updated_by?: ApiActor;
  created_at: string;
  updated_at: string;
  version: number;
  statistics: {
    physical_room_count: number;
    room_type_count: number;
  };
};

type PropertyResponse = {
  property: ApiProperty;
};

type ApiPropertyImage = {
  _id: string;
  image_type: "logo" | "gallery";
  filename: string;
  alt_text: string;
  description: string;
  is_primary: boolean;
  sort_order: number;
  url: string;
};

type PropertyImagesResponse = {
  images: ApiPropertyImage[];
};

type PropertyImageResponse = {
  image: ApiPropertyImage;
};

type ApiMealAllocation = {
  _id: string;
  name: string;
  meal_plan: MealAllocation["mealPlan"];
  currency: string;
  adult_amounts: { breakfast: number; lunch: number; dinner: number };
  child_amounts: { breakfast: number; lunch: number; dinner: number };
  valid_from: string;
  valid_to: string;
  active: boolean;
  notes: string;
  version: number;
};

type MealAllocationsResponse = { meal_allocations: ApiMealAllocation[] };
type MealAllocationResponse = { meal_allocation: ApiMealAllocation };

export type PropertyRecord = {
  details: PropertyDetails;
  version: number;
};

export async function getPropertyRecord(
  propertyId: string,
  fallback: PropertyDetails
): Promise<PropertyRecord> {
  const response = await api.get<PropertyResponse>(`/properties/${propertyId}`);
  return mapProperty(response.data.property, fallback);
}

export async function createPropertyRecord(
  propertyId: string,
  details: PropertyDetails
): Promise<PropertyRecord> {
  const response = await api.post<PropertyResponse>("/properties", {
    property_id: propertyId,
    info: propertyInfoPayload(details)
  });
  const record = mapProperty(response.data.property, details);
  notifyPropertyBrandChanged(propertyId);
  return record;
}

export async function updatePropertyInfoRecord(
  propertyId: string,
  details: PropertyDetails,
  version: number
): Promise<PropertyRecord> {
  const response = await api.patch<PropertyResponse>(
    `/properties/${propertyId}/info`,
    {
      version,
      info: propertyInfoPayload(details)
    }
  );
  const record = mapProperty(response.data.property, details);
  notifyPropertyBrandChanged(propertyId);
  return record;
}

export function isPropertyNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function getPropertyApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Property information could not be loaded or saved.");
}

export async function getPropertyImages(propertyId: string) {
  const response = await api.get<PropertyImagesResponse>(
    `/properties/${encodeURIComponent(propertyId)}/images`
  );
  return response.data.images.map(mapPropertyImage);
}

export async function uploadPropertyImage(
  propertyId: string,
  file: File,
  options: {
    imageType: "logo" | "gallery";
    description?: string;
    isPrimary?: boolean;
  }
) {
  const response = await api.post<PropertyImageResponse>(
    `/properties/${encodeURIComponent(propertyId)}/images`,
    file,
    {
      headers: {
        "Content-Type": file.type,
        "x-file-name": encodeURIComponent(file.name),
        "x-image-type": options.imageType,
        "x-alt-text": encodeURIComponent(options.description || file.name),
        "x-description": encodeURIComponent(options.description || ""),
        "x-primary-image": String(options.isPrimary === true)
      }
    }
  );
  const image = mapPropertyImage(response.data.image);
  notifyPropertyBrandChanged(propertyId);
  return image;
}

export async function setPrimaryPropertyImage(propertyId: string, imageId: string) {
  const response = await api.patch<PropertyImageResponse>(
    `/properties/${encodeURIComponent(propertyId)}/images/${imageId}`,
    { is_primary: true }
  );
  return mapPropertyImage(response.data.image);
}

export async function deletePropertyImage(propertyId: string, imageId: string) {
  await api.delete(
    `/properties/${encodeURIComponent(propertyId)}/images/${imageId}`
  );
  notifyPropertyBrandChanged(propertyId);
}

export async function getMealAllocations(propertyId: string) {
  const response = await api.get<MealAllocationsResponse>(
    `/properties/${encodeURIComponent(propertyId)}/meal-allocations`,
    { params: { include_inactive: true } }
  );
  return response.data.meal_allocations.map(mapMealAllocation);
}

export async function createMealAllocation(propertyId: string, allocation: MealAllocation) {
  const response = await api.post<MealAllocationResponse>(
    `/properties/${encodeURIComponent(propertyId)}/meal-allocations`,
    mealAllocationPayload(allocation)
  );
  return mapMealAllocation(response.data.meal_allocation);
}

export async function updateMealAllocation(propertyId: string, allocation: MealAllocation) {
  const response = await api.patch<MealAllocationResponse>(
    `/properties/${encodeURIComponent(propertyId)}/meal-allocations/${allocation.id}`,
    { ...mealAllocationPayload(allocation), version: allocation.version }
  );
  return mapMealAllocation(response.data.meal_allocation);
}

export async function retireMealAllocation(propertyId: string, allocationId: string) {
  const response = await api.delete<MealAllocationResponse>(
    `/properties/${encodeURIComponent(propertyId)}/meal-allocations/${allocationId}`
  );
  return mapMealAllocation(response.data.meal_allocation);
}

export function notifyPropertyBrandChanged(propertyId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(propertyBrandChangedEvent, {
    detail: { propertyId }
  }));
}

function propertyInfoPayload(details: PropertyDetails) {
  return {
    hotel_name: details.hotelName,
    hotel_type: details.hotelType,
    hotel_guid: details.hotelGuid,
    star_category: numberOrZero(details.starCategory),
    on_trial: details.onTrial,
    plan: details.plan,
    description: details.description,
    address: details.address,
    city: details.city,
    postal_code: details.zipCode,
    country_code: details.country,
    phone: details.phone,
    email: details.email,
    website: details.website,
    check_in_time: details.checkInTime,
    check_out_time: details.checkOutTime,
    home_currency: details.homeCurrency,
    language_code: details.languageCode,
    timezone: details.timezone,
    invoice_footer: details.invoiceFooter,
    invoice_notes: details.invoiceNotes,
    cm_property_id: details.cmPropertyId,
    cm_active: details.cmActive,
    latitude: optionalNumber(details.latitude),
    longitude: optionalNumber(details.longitude),
    ibe_logo_width: positiveNumber(details.ibeLogoWidth, 400),
    ibe_logo_height: positiveNumber(details.ibeLogoHeight, 200)
  };
}

function mapProperty(property: ApiProperty, fallback: PropertyDetails): PropertyRecord {
  const info = property.info;
  const updatedBy = property.updated_by?.name || property.updated_by?.email || "System";
  return {
    version: property.version,
    details: {
      ...fallback,
      hotelName: info.hotel_name,
      hotelType: info.hotel_type,
      hotelGuid: info.hotel_guid,
      starCategory: String(info.star_category),
      numberOfRooms: String(property.statistics.physical_room_count),
      onTrial: info.on_trial,
      plan: info.plan,
      description: info.description,
      address: info.address,
      city: info.city,
      zipCode: info.postal_code,
      country: info.country_code,
      phone: info.phone,
      email: info.email,
      website: info.website,
      checkInTime: info.check_in_time,
      checkOutTime: info.check_out_time,
      homeCurrency: info.home_currency,
      languageCode: info.language_code,
      timezone: info.timezone,
      ibeLogoWidth: String(info.ibe_logo_width),
      ibeLogoHeight: String(info.ibe_logo_height),
      invoiceFooter: info.invoice_footer,
      invoiceNotes: info.invoice_notes,
      createdOn: property.created_at,
      createdTimestamp: property.created_at,
      lastUpdatedOn: property.updated_at,
      lastUpdatedTimestamp: property.updated_at,
      lastUpdatedBy: updatedBy,
      cmPropertyId: info.cm_property_id,
      cmActive: info.cm_active,
      latitude: info.latitude === null ? "" : String(info.latitude),
      longitude: info.longitude === null ? "" : String(info.longitude)
    }
  };
}

function mapPropertyImage(image: ApiPropertyImage): PropertyImageRecord {
  return {
    id: image._id,
    url: image.url,
    description: image.description,
    fileName: image.filename,
    altText: image.alt_text,
    imageType: image.image_type,
    isPrimary: image.is_primary,
    sortOrder: image.sort_order
  };
}

function mealAllocationPayload(allocation: MealAllocation) {
  return {
    name: allocation.name,
    meal_plan: allocation.mealPlan,
    currency: allocation.currency,
    adult_amounts: allocation.adultAmounts,
    child_amounts: allocation.childAmounts,
    valid_from: allocation.validFrom,
    valid_to: allocation.validTo,
    active: allocation.active,
    notes: allocation.notes
  };
}

function mapMealAllocation(value: ApiMealAllocation): MealAllocation {
  return {
    id: value._id,
    name: value.name,
    mealPlan: value.meal_plan,
    currency: value.currency,
    adultAmounts: value.adult_amounts,
    childAmounts: value.child_amounts,
    validFrom: value.valid_from,
    validTo: value.valid_to,
    active: value.active,
    notes: value.notes,
    version: value.version
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
