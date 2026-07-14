import type { Dispatch, SetStateAction } from "react";
import type { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";

export type HousekeepingModuleProps = {
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

export type HousekeepingStatus = "Clean" | "Dirty" | "Occupied" | "WIP";
export type HousekeepingBoardTab = "All" | "Clean" | "Dirty" | "Occupied" | "WIP" | "Available" | "Activity";
export type HousekeepingInfoTab = "Arrival" | "Departure" | "In House" | "All" | "Other";

export type HousekeepingAttendant = {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  status: "active" | "inactive";
  phone: string;
  email: string;
  joinedIso: string;
};

export type HousekeepingActivity = {
  id: string;
  roomCode: string;
  roomType: string;
  attendant: string;
  status: HousekeepingStatus;
  state: "Started" | "Completed" | "Assigned";
  createdAt: string;
  finishedAt?: string;
};

export type HousekeepingReservation = {
  id: string;
  bookingId: string;
  guest: string;
  room: string;
  roomType: string;
  status: "checked-in" | "checked-out" | "tentative" | "cancelled" | "no-show" | "blocked";
  stayFrom: string;
  stayTo: string;
  nights: number;
  guests: number;
  country: string;
  group: "arrival" | "departure" | "in-house" | "other";
};
