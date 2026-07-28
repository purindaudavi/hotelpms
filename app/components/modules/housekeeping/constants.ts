import type { HousekeepingActivity, HousekeepingAttendant } from "./types";

export const initialAttendants: HousekeepingAttendant[] = [
  {
    id: "hk-aa",
    employeeNo: "HK-001",
    name: "aa",
    department: "Housekeeping",
    status: "active",
    phone: "",
    email: "",
    joinedIso: "2026-06-16T09:41:52.453Z"
  }
];

export const initialAttendantByRoom: Record<string, string> = {};
export const initialActivities: HousekeepingActivity[] = [];
