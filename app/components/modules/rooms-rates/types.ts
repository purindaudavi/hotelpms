import type { Dispatch, SetStateAction } from "react";
import type { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";

export type RoomsRatesModuleProps = {
  activePath: string;
  propertyId: string;
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  transactions: FinancialTransaction[];
  setTransactions: Dispatch<SetStateAction<FinancialTransaction[]>>;
  setToast: (message: string) => void;
};

export type RoomTypeRecord = {
  id: string;
  name: string;
  rooms: string[];
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  description: string;
  baseRate: number;
  imageGradient: string;
  imageNames: string[];
  active: boolean;
};

export type RatePlan = {
  id: string;
  code: "FIT" | "IBE" | "TA" | "OTA" | string;
  roomType: string;
  mealPlan: string;
  currency: "LKR" | "USD" | string;
  resident: boolean;
  title: string;
  validFrom: string;
  validTo: string;
  sellMode: "Per Room" | "Per Person";
  rateMode: "Manual" | "Auto" | "N/A";
  defaultRate: number;
  status: "Active" | "Disabled";
  locked: boolean;
};

export type InventoryCellMap = Record<string, number>;

export type RateHunterHotel = {
  id: string;
  name: string;
  score: number;
  distance: string;
  myRate: number;
  competitorRate: number;
  roomType: string;
  mealPlan: string;
  rateCode: string;
  originalCurrency: string;
  favorite: boolean;
};
