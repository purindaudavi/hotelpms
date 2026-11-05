import type { Room } from "@/app/data/pms-data";
import type {
  HousekeepingActivity,
  HousekeepingAction,
  HousekeepingAttendant,
  HousekeepingTask,
  HousekeepingStatus
} from "@/app/components/modules/housekeeping/types";
import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

type ApiAttendantSnapshot = {
  attendant_id?: string;
  employee_number?: string;
  name?: string;
};

type ApiTask = {
  _id: string;
  status: HousekeepingTask["status"];
  priority?: string; notes?: string; requested_at?: string;
  requested_by?: { name?: string };
  attendant?: ApiAttendantSnapshot;
};

type ApiRoom = {
  physical_room_id: string;
  room_number: string;
  room_type_name: string;
  floor?: string;
  operational_status: string;
  housekeeping_status: string;
  task?: ApiTask | null;
};

type ApiAttendant = {
  _id: string;
  employee_number: string;
  name: string;
  department: string;
  status: "active" | "inactive";
  phone?: string;
  email?: string;
  joined_at: string;
  version?: number;
  available?: boolean; busy_rooms?: string[]; queued_rooms?: string[];
};

type ApiActivity = {
  _id: string;
  physical_room_id?: string;
  notes?: string;
  room_number: string;
  room_type_name: string;
  action: HousekeepingAction;
  from_status?: string;
  actor?: { user_id?: string; name?: string };
  actor_role?: string;
  to_status: string;
  attendant?: ApiAttendantSnapshot;
  created_at: string;
};

type BoardResponse = {
  rooms: ApiRoom[];
  attendants: ApiAttendant[];
  activities: ApiActivity[];
};

export type HousekeepingBoardData = {
  rooms: Room[];
  roomStatuses: Record<string, HousekeepingStatus>;
  attendantByRoom: Record<string, string>;
  attendants: HousekeepingAttendant[];
  activities: HousekeepingActivity[];
  tasksByRoom: Record<string, HousekeepingTask>;
};

export async function getHousekeepingBoard(propertyId: string, signal?: AbortSignal): Promise<HousekeepingBoardData> {
  const response = await api.get<BoardResponse>("/housekeeping", {
    params: { property_id: propertyId }, signal
  });
  const rooms = response.data.rooms.map(mapRoom);
  return {
    rooms,
    tasksByRoom: Object.fromEntries(response.data.rooms.filter(room => room.task).map(room => [room.physical_room_id, {
      status: room.task!.status, priority: room.task!.priority, notes: room.task!.notes,
      requestedAt: room.task!.requested_at, requestedBy: room.task!.requested_by?.name
    }])),
    roomStatuses: Object.fromEntries(rooms.map((room) => [room.id, room.housekeeping])),
    attendantByRoom: Object.fromEntries(response.data.rooms
      .filter((room) => room.task?.attendant?.name)
      .map((room) => [room.physical_room_id, room.task!.attendant!.name!])),
    attendants: response.data.attendants.map(mapAttendant),
    activities: response.data.activities.map(mapActivity)
  };
}

export async function assignHousekeepingAttendant(propertyId: string, physicalRoomId: string, attendantId: string) {
  await api.post(
    `/housekeeping/rooms/${physicalRoomId}/assign`,
    { property_id: propertyId, attendant_id: attendantId },
    { headers: actorHeaders() }
  );
}

export async function requestHousekeeping(propertyId: string, physicalRoomId: string, details: { priority: string; notes: string }) {
  await api.post(`/housekeeping/rooms/${physicalRoomId}/request`, { property_id: propertyId, ...details }, { headers: actorHeaders() });
}

export async function startHousekeepingCleaning(propertyId: string, physicalRoomId: string) {
  await api.post(
    `/housekeeping/rooms/${physicalRoomId}/start`,
    { property_id: propertyId },
    { headers: actorHeaders() }
  );
}

export async function completeHousekeepingCleaning(propertyId: string, physicalRoomId: string) {
  await api.post(
    `/housekeeping/rooms/${physicalRoomId}/complete`,
    { property_id: propertyId },
    { headers: actorHeaders() }
  );
}

export async function createHousekeepingAttendant(
  propertyId: string,
  attendant: Omit<HousekeepingAttendant, "id">
) {
  const response = await api.post<{ attendant: ApiAttendant }>(
    "/housekeeping/attendants",
    {
      property_id: propertyId,
      employee_number: attendant.employeeNo,
      name: attendant.name,
      department: attendant.department,
      status: attendant.status,
      phone: attendant.phone,
      email: attendant.email,
      joined_at: attendant.joinedIso
    },
    { headers: actorHeaders() }
  );
  return mapAttendant(response.data.attendant);
}

export function getHousekeepingApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The housekeeping request could not be completed.");
}

function mapRoom(room: ApiRoom): Room {
  const operational = fromOperationalStatus(room.operational_status);
  return {
    id: room.physical_room_id,
    code: room.room_number,
    type: room.room_type_name,
    floor: room.floor || "Unassigned",
    status: operational,
    housekeeping: operational === "Occupied" ? "Occupied" : fromHousekeepingStatus(room.housekeeping_status),
    attendant: room.task?.attendant?.name || ""
  };
}

function mapAttendant(attendant: ApiAttendant): HousekeepingAttendant {
  return {
    id: attendant._id,
    employeeNo: attendant.employee_number,
    name: attendant.name,
    department: attendant.department,
    status: attendant.status,
    phone: attendant.phone || "",
    email: attendant.email || "",
    joinedIso: attendant.joined_at,
    available: attendant.available ?? attendant.status === "active",
    busyRooms: attendant.busy_rooms || [], queuedRooms: attendant.queued_rooms || []
  };
}

function mapActivity(activity: ApiActivity): HousekeepingActivity {
  const completed = activity.action === "cleaning_completed" || activity.action === "inspection_completed";
  const actorName = activity.actor?.name?.trim();
  return {
    id: activity._id,
    physicalRoomId: activity.physical_room_id,
    roomCode: activity.room_number,
    roomType: activity.room_type_name,
    attendant: activity.attendant?.name || "Unassigned",
    action: activity.action,
    actorName: actorName === "System" && !activity.actor?.user_id && !activity.actor_role ? "System / not recorded" : actorName || (activity.actor?.user_id ? "Recorded user" : "Not recorded"),
    actorRole: activity.actor_role || "",
    previousStatus: activity.from_status,
    resultStatus: activity.to_status,
    notes: activity.notes,
    status: activity.action === "requested" ? "Dirty" : fromHousekeepingStatus(activity.to_status),
    state: activity.action === "requested" ? "Requested" : activity.action === "assigned" ? "Assigned" : activity.action === "claimed" ? "Claimed" : activity.action === "inspection_completed" ? "Inspected" : activity.action === "room_marked_dirty" ? "Marked dirty" : completed ? "Completed" : "Started",
    createdAt: activity.created_at,
    finishedAt: completed ? activity.created_at : undefined,
    completionNotes: activity.action === "cleaning_completed" ? activity.notes : undefined
  };
}

function fromOperationalStatus(value: string): Room["status"] {
  if (value === "occupied") return "Occupied";
  if (value === "out_of_order") return "Out of Order";
  if (value === "maintenance") return "Maintenance";
  return "Available";
}

function fromHousekeepingStatus(value: string): HousekeepingStatus {
  if (value === "dirty") return "Dirty";
  if (value === "in_progress") return "WIP";
  if (value === "occupied") return "Occupied";
  return "Clean";
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
