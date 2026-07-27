import type { Dispatch, SetStateAction } from "react";
import type { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";
export type { RatePlan } from "../front-desk/types";

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

export type RoomTypeImage = {
  id: string;
  name: string;
  dataUrl: string;
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
  images: RoomTypeImage[];
  active: boolean;
};

export type InventoryCellMap = Record<string, number>;
