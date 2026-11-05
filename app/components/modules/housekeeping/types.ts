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
export type HousekeepingBoardTab = "All" | "Requests" | "Clean" | "Dirty" | "Occupied" | "WIP" | "Available" | "Activity";
export type HousekeepingTask = {
  status: "requested" | "assigned" | "in_progress" | "completed" | "inspected";
  priority?: string; notes?: string; requestedAt?: string; requestedBy?: string;
};
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
  available?: boolean;
  busyRooms?: string[];
  queuedRooms?: string[];
};

export type HousekeepingAction = "room_marked_dirty" | "requested" | "assigned" | "claimed" | "cleaning_started" | "cleaning_completed" | "inspection_completed";
export type HousekeepingActivity = {
  id: string;
  physicalRoomId?: string;
  roomCode: string;
  roomType: string;
  attendant: string;
  status: HousekeepingStatus;
  state: "Started" | "Completed" | "Assigned" | "Requested" | "Claimed" | "Inspected" | "Marked dirty";
  action?: HousekeepingAction;
  actorName?: string;
  actorRole?: string;
  previousStatus?: string;
  resultStatus?: string;
  notes?: string;
  createdAt: string;
  finishedAt?: string;
  completionNotes?: string;
};

export type HousekeepingReservation = {
  id: string;
  bookingId: string;
  guest: string;
  room: string;
  roomType: string;
  status: "confirmed" | "checked-in" | "checked-out" | "tentative" | "cancelled" | "no-show" | "blocked";
  stayFrom: string;
  stayTo: string;
  nights: number;
  guests: number;
  country: string;
  group: "arrival" | "departure" | "in-house" | "other";
};
