import type { Dispatch, SetStateAction } from "react";
import type { FinancialTransaction, Reservation, ReservationStatus, Room } from "@/app/data/pms-data";

export type ReservationModuleProps = {
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

export type BookingTab = "reservations" | "business-blocks";

export type BusinessBlockStatus = "Tentative" | "Active" | "Released" | "Cancelled" | "Completed";

export type BusinessBlockAllocation = {
  id: string;
  propertyId: string;
  businessBlockId: string;
  roomTypeId: string;
  roomTypeName: string;
  quantity: number;
  ratePlanId?: string;
  ratePlanName?: string;
  mealPlan: string;
  currency: string;
  negotiatedRate: number;
  taxInclusive: boolean;
  isComplimentary: boolean;
  complimentaryReason?: string;
  releasedQuantity: number;
};

export type BusinessBlock = {
  id: string;
  propertyId: string;
  blockNumber: string;
  blockName: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  checkIn: string;
  checkOut: string;
  cutoffDate: string;
  status: BusinessBlockStatus;
  paymentMethod?: string;
  billingParty: "Company" | "Guest" | "Travel Agent" | "Split";
  depositRequired: number;
  depositPaid: number;
  paymentDueDate?: string;
  billingRemarks?: string;
  cancellationPolicy?: string;
  blockRemarks?: string;
  internalRemarks?: string;
  specialRequirements?: string;
  allocations: BusinessBlockAllocation[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessBlockLogEntry = {
  id: string;
  propertyId: string;
  businessBlockId: string;
  action: string;
  description: string;
  createdBy: string;
  createdAt: string;
};

export type EventBooking = {
  id: string;
  title: string;
  venue: string;
  date: string;
  start: string;
  end: string;
  owner: string;
  status: "Confirmed" | "Tentative" | "Blocked";
};

export type CrossBookLink = {
  primaryRoom: string;
  blockedRooms: string[];
};

export type MovementKind = "arrivals" | "departures" | "in-house";

export type TravelAgent = {
  id: string;
  name: string;
  contactPerson: string;
  agentType: string;
  nameType: string;
  email: string;
  phone: string;
  code: string;
  status: "Active" | "Inactive";
  commission: number;
  address: string;
  vatNo: string;
  currency: string;
  revenue: number;
  reservations: number;
  roomNights: number;
  averageDailyRate: number;
};

export type TravelAgentMetric = "revenue" | "roomNights";

export type GuestProfile = {
  id: string;
  passport: string;
  name: string;
  phone: string;
  country: string;
  email: string;
  linkedReservationIds: string[];
};

export type ReservationFormState = {
  id?: string;
  resNo: string;
  bookingRef: string;
  reservationDate: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  source: string;
  status: ReservationStatus;
  guest: string;
  phone: string;
  email: string;
  country: string;
  roomType: string;
  room: string;
  adults: number;
  children: number;
  total: number;
  paid: number;
};
