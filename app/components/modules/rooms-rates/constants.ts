import { roomTypes } from "@/app/data/pms-data";
import type { RateHunterHotel, RatePlan, RoomTypeRecord } from "./types";

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
  imageNames: [`${type.name.toLowerCase().replaceAll(" ", "-")}.jpg`],
  active: true
}));

const rateCodes = ["FIT", "IBE", "TA", "OTA"] as const;
const currencies = ["LKR", "USD"] as const;

export const initialRatePlans: RatePlan[] = initialRoomTypes.flatMap((roomType) =>
  currencies.flatMap((currency) =>
    rateCodes.map((code, index) => {
      const resident = code === "IBE" && currency === "LKR" && index % 2 === 1;
      const defaultRate =
        currency === "USD"
          ? code === "OTA"
            ? 31
            : 20
          : code === "TA"
            ? Math.round(roomType.baseRate * 0.92)
            : Math.round(roomType.baseRate * (roomType.name.includes("Twin") ? 0.57 : 0.45));
      const title = `${code} - ${roomType.name} - Room Only - ${currency}${resident ? " - Resident" : ""}`;
      return {
        id: `${roomType.id}-${code.toLowerCase()}-${currency.toLowerCase()}-${resident ? "resident" : "standard"}`,
        code,
        roomType: roomType.name,
        mealPlan: "Room Only",
        currency,
        resident,
        title,
        validFrom: "2026-05-21",
        validTo: "2026-11-16",
        sellMode: "Per Room",
        rateMode: "N/A",
        defaultRate,
        status: "Active",
        locked: false
      };
    })
  )
);

export const initialRateHunterHotels: RateHunterHotel[] = [
  {
    id: "olinia",
    name: "Olinia Airport Hotel",
    score: 8.4,
    distance: "2.1 km",
    myRate: 19.5,
    competitorRate: 51,
    roomType: "Deluxe Double Room",
    mealPlan: "Room Only",
    rateCode: "FIT",
    originalCurrency: "LKR (6,500.00)",
    favorite: false
  },
  {
    id: "sera86",
    name: "Sera 86 Airport Transit Stay",
    score: 8.8,
    distance: "1.4 km",
    myRate: 21.25,
    competitorRate: 43,
    roomType: "Deluxe Twin Room",
    mealPlan: "Room Only",
    rateCode: "OTA",
    originalCurrency: "LKR (7,500.00)",
    favorite: false
  },
  {
    id: "lagoon",
    name: "Lagoon Airport Residence",
    score: 7.9,
    distance: "4.8 km",
    myRate: 31,
    competitorRate: 62,
    roomType: "Deluxe Family Room",
    mealPlan: "Room Only",
    rateCode: "IBE",
    originalCurrency: "USD",
    favorite: false
  }
];

export const currencyOptions = ["All Currencies", "LKR", "USD"];
export const rateCodeOptions = ["All Rate Codes", "FIT", "IBE", "TA", "OTA"];
export const mealPlanOptions = ["Room Only", "Bed & Breakfast", "Half Board", "Full Board"];
export const countryOptions = ["Sri Lanka", "India", "Maldives", "United Arab Emirates", "Singapore"];
