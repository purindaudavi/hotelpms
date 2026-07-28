"use client";

import { useEffect, useMemo } from "react";
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
  const effectiveRoomStatuses = useMemo(() => {
    const stored = normalizeRoomStatuses(roomStatuses, normalizedStatuses);
    return props.roomList.reduce<Record<string, HousekeepingStatus>>((statuses, room) => {
      const roomStatus = normalizedStatuses[room.id];
      const storedStatus = stored[room.id];
      statuses[room.id] =
        room.status === "Occupied"
          ? "Occupied"
          : roomStatus === "Dirty" || roomStatus === "WIP"
            ? roomStatus
            : storedStatus && storedStatus !== "Occupied"
              ? storedStatus
              : "Clean";
      return statuses;
    }, {});
  }, [normalizedStatuses, props.roomList, roomStatuses]);

  useEffect(() => {
    setRoomStatuses((current) =>
      recordsEqual(current, effectiveRoomStatuses) ? current : effectiveRoomStatuses
    );
    props.setRoomList((current) => {
      let changed = false;
      const next = current.map((room) => {
        const housekeeping = effectiveRoomStatuses[room.id] ?? "Clean";
        if (room.housekeeping === housekeeping) return room;
        changed = true;
        return { ...room, housekeeping };
      });
      return changed ? next : current;
    });
  }, [effectiveRoomStatuses, props.setRoomList, setRoomStatuses]);

  const shared = {
    ...props,
    roomStatuses: effectiveRoomStatuses,
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

function recordsEqual(
  left: Record<string, HousekeepingStatus>,
  right: Record<string, HousekeepingStatus>
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length &&
    rightKeys.every((key) => left[key] === right[key]);
}
