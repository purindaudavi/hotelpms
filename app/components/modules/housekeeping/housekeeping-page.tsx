"use client";

import { useCallback, useRef, useState } from "react";
import { getReservations } from "@/app/lib/bookings-api";
import { useHousekeepingAutoRefresh } from "@/app/lib/use-housekeeping-auto-refresh";
import { property } from "@/app/data/pms-data";
import {
  assignHousekeepingAttendant,
  completeHousekeepingCleaning,
  createHousekeepingAttendant,
  getHousekeepingApiErrorMessage,
  getHousekeepingBoard,
  requestHousekeeping,
  startHousekeepingCleaning
} from "@/app/lib/housekeeping-api";
import { HousekeepingBoardPage } from "./board/housekeeping-board-page";
import { HousekeepingInformationPage } from "./information/housekeeping-information-page";
import type { HousekeepingActivity, HousekeepingAttendant, HousekeepingStatus, HousekeepingTask } from "./types";
import type { HousekeepingModuleProps } from "./types";

export function HousekeepingPage(props: HousekeepingModuleProps) {
  const [roomStatuses, setRoomStatuses] = useState<Record<string, HousekeepingStatus>>({});
  const [attendantByRoom, setAttendantByRoom] = useState<Record<string, string>>({});
  const [attendants, setAttendants] = useState<HousekeepingAttendant[]>([]);
  const [activities, setActivities] = useState<HousekeepingActivity[]>([]);
  const [tasksByRoom, setTasksByRoom] = useState<Record<string, HousekeepingTask>>({});
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const information = props.activePath.endsWith("information");
  const [showDayEnd, setShowDayEnd] = useState(
    () => property.systemDate !== localDateKey(new Date())
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHousekeeping = useCallback(async (quiet: boolean, signal: AbortSignal) => {
    if (!quiet) setLoading(true);
    try {
      const [board, bookings] = await Promise.allSettled([
        getHousekeepingBoard(props.propertyId, signal),
        information ? getReservations(props.propertyId, signal) : Promise.resolve(null)
      ]);
      if (signal.aborted) return false;
      if (board.status === "rejected") throw board.reason;
      if (bookings.status === "rejected") throw bookings.reason;
      const data = board.value;
      if (bookings.value) props.setReservations(bookings.value);
      props.setRoomList(data.rooms);
      setRoomStatuses(data.roomStatuses);
      setAttendantByRoom(data.attendantByRoom);
      setAttendants(data.attendants);
      setActivities(data.activities);
      setTasksByRoom(data.tasksByRoom);
      setError("");
      return true;
    } catch (loadError) {
      if (signal.aborted) return false;
      const message = getHousekeepingApiErrorMessage(loadError);
      setError(message);
      if (!quiet) props.setToast(message);
      return false;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [information, props.propertyId, props.setReservations, props.setRoomList, props.setToast]);
  const { refresh: refreshHousekeeping, waitForRefresh } = useHousekeepingAutoRefresh(loadHousekeeping, actionLock);

  async function runAction(action: () => Promise<void>, successMessage: string, rethrow = false) {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true);
    setError("");
    try {
      await waitForRefresh();
      await action();
      const refreshed = await refreshHousekeeping();
      props.setToast(refreshed ? successMessage : "The change was saved, but the board could not refresh. Press Refresh before another action.");
      return true;
    } catch (actionError) {
      const message = getHousekeepingApiErrorMessage(actionError);
      await refreshHousekeeping();
      setError(message);
      props.setToast(message);
      if (rethrow) throw actionError;
      return false;
    } finally {
      actionLock.current = false; setBusy(false);
    }
  }

  const shared = {
    ...props,
    roomStatuses,
    attendantByRoom,
    attendants,
    activities,
    tasksByRoom,
    busy,
    showDayEnd,
    setShowDayEnd,
    loading,
    error,
    refreshHousekeeping: async () => { if (!actionLock.current) await refreshHousekeeping(); },
    requestCleaning: (roomId: string, roomCode: string, details: { priority: string; notes: string }) =>
      runAction(() => requestHousekeeping(props.propertyId, roomId, details), `Housekeeping requested for room ${roomCode}`),
    startCleaning: (roomId: string, roomCode: string) =>
      runAction(() => startHousekeepingCleaning(props.propertyId, roomId), `Cleaning started for room ${roomCode}`),
    completeCleaning: (roomId: string, roomCode: string) =>
      runAction(() => completeHousekeepingCleaning(props.propertyId, roomId), `Room ${roomCode} marked clean`),
    assignAttendant: (roomId: string, roomCode: string, attendantId: string) =>
      runAction(() => assignHousekeepingAttendant(props.propertyId, roomId, attendantId), `Room ${roomCode} assigned successfully`),
    createAttendant: async (attendant: Omit<HousekeepingAttendant, "id">) => {
      if (!await runAction(() => createHousekeepingAttendant(props.propertyId, attendant).then(() => {}), `${attendant.name} saved to MongoDB`, true)) throw new Error("Another housekeeping action is being saved. Try again shortly.");
    }
  };

  if (props.activePath.endsWith("information")) return <HousekeepingInformationPage {...shared} />;
  return <HousekeepingBoardPage {...shared} />;
}

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
