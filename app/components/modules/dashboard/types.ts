import { FinancialTransaction, Reservation, Room } from "@/app/data/pms-data";

export type DashboardProps = {
  reservations: Reservation[];
  roomList: Room[];
  transactions: FinancialTransaction[];
  setToast: (message: string) => void;
};

export const dashboardTabs = ["Overview", "Analytics", "Travel Agents"] as const;

export type DashboardTab = (typeof dashboardTabs)[number];
