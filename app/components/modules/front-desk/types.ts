import { Dispatch, SetStateAction } from "react";
import { Reservation, ReservationRoom, ReservationStatus, Room } from "@/app/data/pms-data";

export type FrontDeskProps = {
  propertyId: string;
  reservations: Reservation[];
  setReservations: Dispatch<SetStateAction<Reservation[]>>;
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  setToast: (message: string) => void;
};

export const deskTabs = ["Front Desk", "Arrival", "Departure", "In House", "All"] as const;

export type DeskTab = (typeof deskTabs)[number];

export type DeskColumn = {
  key: string;
  date: string;
  label: string;
  subLabel: string;
  weekend: boolean;
  active: boolean;
};

export type ReservationForm = {
  id?: string;
  businessBlockId?: string;
  businessBlockAllocationId?: string;
  title: string;
  bookingSource: string;
  bookingReference: string;
  tourNumber: string;
  groupName: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  isDayRoom: boolean;
  ratePlanId: string;
  currency: string;
  mealPlan: string;
  refundable: boolean;
  cancellationPolicy: string;
  roomLines: ReservationRoomDraft[];
  guest: string;
  phone: string;
  email: string;
  country: string;
  reservationRemarks: string;
  guestRemarks: string;
  internalRemarks: string;
  checkInNow: boolean;
  sendEmail: boolean;
};

export type ReservationRoomDraft = Omit<ReservationRoom, "propertyId" | "reservationId" | "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

export type RatePlan = {
  id: string;
  propertyId: string;
  name: string;
  currency: string;
  mealPlan: string;
  baseRate: number;
  roomTypeRates: Record<string, number>;
  refundable: boolean;
  cancellationPolicy: string;
  active: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
};
