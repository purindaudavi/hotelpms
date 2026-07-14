import type { Dispatch, SetStateAction } from "react";
import type { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";

export type PosModuleProps = {
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

export type PosOutlet = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
};

export type PosCategory = {
  id: string;
  name: string;
};

export type PosMenuItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  active: boolean;
};

export type PosCartLine = {
  item: PosMenuItem;
  qty: number;
};

export type PosTicketType = "KOT" | "BOT";
export type PosTicketStatus = "toAccept" | "cooking" | "toBeDelivered" | "delivered";

export type PosOrder = {
  id: string;
  orderNo: string;
  ticketNo: string;
  type: PosTicketType;
  status: PosTicketStatus;
  outletId: string;
  outletName: string;
  lines: PosCartLine[];
  subtotal: number;
  total: number;
  settled: boolean;
  createdDate: string;
  createdTime: string;
};
