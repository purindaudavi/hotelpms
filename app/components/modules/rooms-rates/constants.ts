import { roomTypes } from "@/app/data/pms-data";
import type { RoomTypeRecord } from "./types";

export const roomRatesSystemDate = "2026-06-03";
export const inventoryStartDate = "2026-06-16";

export const amenityGroups = [
  {
    title: "Amenities",
    items: ["Air Conditioner", "Fan", "Mini Bar", "Wardrobe", "Sofa", "Table", "Coffee Table", "Table Lamp", "Towel Rack", "Iron", "Iron Table"]
  },
  {
    title: "Bedding",
    items: ["Single Bed", "Double Bed", "King Size Bed", "Twin Bed"]
  },
  {
    title: "View",
    items: ["Ocean View", "Pool View", "River View", "Garden View", "City View", "Sea View", "Lake View", "Mountain", "Rock"]
  },
  {
    title: "Washroom",
    items: ["Shower", "Bath Tub", "Wash Basin", "Bath Amenities", "Hot Water", "Towel", "Hair Dryer"]
  },
  {
    title: "Property",
    items: ["Outdoor Pool", "24x7 Security", "24x7 Front Desk", "Housekeeping"]
  }
];

export const roomTypeImageGradients = [
  "linear-gradient(135deg, #faf7f2 0%, #f7e6c8 30%, #7a4b2b 31%, #3b2418 50%, #8bc34a 51%, #f8fafc 100%)",
  "linear-gradient(135deg, #fff7ed 0%, #fef3c7 28%, #7c2d12 29%, #4c1d95 55%, #f8fafc 100%)",
  "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 28%, #6b3f22 29%, #4f46e5 52%, #ffffff 100%)",
  "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 25%, #7c2d12 26%, #a855f7 48%, #f8fafc 100%)"
];

export const initialRoomTypes: RoomTypeRecord[] = roomTypes.map((type, index) => ({
  id: type.id,
  name: type.name,
  rooms: type.rooms,
  maxAdults: type.maxAdults,
  maxChildren: type.maxChildren,
  amenities: type.amenities,
  description: `${type.name} configured for transit stays with private bathroom and front-desk managed availability.`,
  baseRate: type.baseRate,
  imageGradient: roomTypeImageGradients[index % roomTypeImageGradients.length] ?? type.imageGradient,
  images: [],
  active: true
}));

export function roomTypeStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:rooms-rates:room-types`;
}

export function isRoomTypeRecordArray(value: unknown): value is RoomTypeRecord[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<RoomTypeRecord>;
    return typeof record.id === "string" && typeof record.name === "string" && Array.isArray(record.rooms);
  });
}

export function normalizeRoomTypeRecords(records: RoomTypeRecord[]) {
  return records.map((record) => ({
    ...record,
    rooms: Array.isArray(record.rooms) ? record.rooms : [],
    amenities: Array.isArray(record.amenities) ? record.amenities : [],
    images: Array.isArray(record.images) ? record.images.filter((image) =>
      Boolean(image && typeof image.id === "string" && typeof image.name === "string" && typeof image.dataUrl === "string")
    ) : []
  }));
}

export const currencyOptions = ["All Currencies", "LKR", "USD"];
export const rateCodeOptions = ["All Rate Codes", "FIT", "IBE", "TA", "OTA"];
export const mealPlanOptions = ["Room Only", "Bed & Breakfast", "Half Board", "Full Board"];
export const countryOptions = ["Sri Lanka", "India", "Maldives", "United Arab Emirates", "Singapore"];
