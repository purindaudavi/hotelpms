import type { HousekeepingActivity } from "@/app/components/modules/housekeeping/types";

export type HousekeepingJob = { id: string; events: HousekeepingActivity[] };

// A room's task row is reused. Group by workflow boundaries, not task_id alone.
// Older history may start mid-job; keep the missing steps missing.
export function groupHousekeepingJobs(activities: HousekeepingActivity[]): HousekeepingJob[] {
  const ordered = [...activities].reverse().sort((a, b) => a.createdAt.localeCompare(b.createdAt) ||
    (/^[a-f0-9]{24}$/i.test(a.id) && /^[a-f0-9]{24}$/i.test(b.id) ? a.id.localeCompare(b.id) : 0));
  const currentByRoom = new Map<string, HousekeepingJob>();
  const jobs: HousekeepingJob[] = [];
  for (const event of ordered) {
    const room = event.physicalRoomId || event.roomCode;
    let current = currentByRoom.get(room);
    const events = current?.events || [];
    const finished = events.some(item => item.action === "cleaning_completed" || item.action === "inspection_completed");
    const newRequest = event.action === "requested" && events.some(item => item.action !== "room_marked_dirty");
    const afterFinish = finished && event.action !== "inspection_completed";
    if (!current || newRequest || afterFinish || event.action === "room_marked_dirty") {
      current = { id: event.id, events: [] };
      currentByRoom.set(room, current);
      jobs.push(current);
    }
    current.events.push(event);
  }
  return jobs.sort((a, b) => b.events[b.events.length - 1].createdAt.localeCompare(a.events[a.events.length - 1].createdAt));
}
