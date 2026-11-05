import { api } from "./api";
export type MyCleaningTask = { id: string; room_id: string; room_number: string; room_type: string; floor: string; status: string; priority: string; notes: string; blocked_reason: string; requested_at?: string; assigned_at?: string; started_at?: string };
export type MyCompletedCleaning = { id: string; room_number: string; room_type: string; completed_at: string; notes: string };
export type TeamCleaningAssignment = { id: string; room_number: string; room_type: string; status: "assigned" | "in_progress"; attendant_name: string; assigned_at?: string | null; started_at?: string | null };
export type MyHousekeepingWork = { attendant: { id: string; name: string; employee_number: string }; date: string; timezone: string;
  requests: MyCleaningTask[]; assigned: MyCleaningTask[]; in_progress: MyCleaningTask[]; completed_today: MyCompletedCleaning[]; recent_completed: MyCompletedCleaning[]; team_assignments: TeamCleaningAssignment[] };
export async function getMyHousekeepingWork(propertyId: string, signal?: AbortSignal) {
  return (await api.get<MyHousekeepingWork>("/housekeeping/my-work", { params: { property_id: propertyId }, signal })).data;
}
export async function updateMyCleaningTask(propertyId: string, roomId: string, action: "claim" | "start" | "complete", notes?: string) {
  await api.post(`/housekeeping/rooms/${encodeURIComponent(roomId)}/${action}`, { property_id: propertyId, ...(notes !== undefined ? { notes } : {}) });
}
