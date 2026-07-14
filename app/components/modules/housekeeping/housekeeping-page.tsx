"use client";

import { useMemo } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { initialActivities, initialAttendantByRoom, initialAttendants } from "./constants";
import { HousekeepingBoardPage } from "./board/housekeeping-board-page";
import { HousekeepingInformationPage } from "./information/housekeeping-information-page";
import type { HousekeepingActivity, HousekeepingAttendant, HousekeepingStatus } from "./types";
import type { HousekeepingModuleProps } from "./types";
import { initialRoomStatuses } from "./utils";

const housekeepingStatuses = new Set(["Clean", "Dirty", "Occupied", "WIP"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRoomStatuses(value: unknown, fallback: Record<string, HousekeepingStatus>) {
  if (!isRecord(value)) return fallback;

  return Object.entries(value).reduce<Record<string, HousekeepingStatus>>(
    (statuses, [roomId, status]) => ({
      ...statuses,
      ...(typeof status === "string" && housekeepingStatuses.has(status) ? { [roomId]: status as HousekeepingStatus } : {})
    }),
    { ...fallback }
  );
}

function normalizeStringRecord(value: unknown, fallback: Record<string, string>) {
  if (!isRecord(value)) return fallback;

  return Object.entries(value).reduce<Record<string, string>>(
    (items, [key, item]) => ({
      ...items,
      ...(typeof item === "string" ? { [key]: item } : {})
    }),
    { ...fallback }
  );
}

export function HousekeepingPage(props: HousekeepingModuleProps) {
  const keyPrefix = `staypilot:${props.propertyId}:housekeeping`;
  const normalizedStatuses = useMemo(() => initialRoomStatuses(props.roomList), [props.roomList]);
  const [roomStatuses, setRoomStatuses] = useSessionState(`${keyPrefix}:room-statuses`, normalizedStatuses);
  const [attendantByRoom, setAttendantByRoom] = useSessionState<Record<string, string>>(`${keyPrefix}:attendant-by-room`, initialAttendantByRoom);
  const [attendants, setAttendants] = useSessionState<HousekeepingAttendant[]>(`${keyPrefix}:attendants`, initialAttendants);
  const [activities, setActivities] = useSessionState<HousekeepingActivity[]>(`${keyPrefix}:activities`, initialActivities);
  const [showDayEnd, setShowDayEnd] = useSessionState(`${keyPrefix}:day-end-required`, true);

  const shared = {
    ...props,
    roomStatuses: normalizeRoomStatuses(roomStatuses, normalizedStatuses),
    setRoomStatuses,
    attendantByRoom: normalizeStringRecord(attendantByRoom, initialAttendantByRoom),
    setAttendantByRoom,
    attendants: Array.isArray(attendants) ? attendants : initialAttendants,
    setAttendants,
    activities: Array.isArray(activities) ? activities : initialActivities,
    setActivities,
    showDayEnd: typeof showDayEnd === "boolean" ? showDayEnd : true,
    setShowDayEnd
  };

  if (props.activePath.endsWith("information")) return <HousekeepingInformationPage {...shared} />;
  return <HousekeepingBoardPage {...shared} />;
}
