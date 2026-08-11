"use client";

import { useCallback, useEffect, useState } from "react";
import { property } from "@/app/data/pms-data";
import {
  assignHousekeepingAttendant,
  completeHousekeepingCleaning,
  createHousekeepingAttendant,
  getHousekeepingApiErrorMessage,
  getHousekeepingBoard,
  startHousekeepingCleaning
} from "@/app/lib/housekeeping-api";
import { HousekeepingBoardPage } from "./board/housekeeping-board-page";
import { HousekeepingInformationPage } from "./information/housekeeping-information-page";
import type { HousekeepingActivity, HousekeepingAttendant, HousekeepingStatus } from "./types";
import type { HousekeepingModuleProps } from "./types";

export function HousekeepingPage(props: HousekeepingModuleProps) {
  const [roomStatuses, setRoomStatuses] = useState<Record<string, HousekeepingStatus>>({});
  const [attendantByRoom, setAttendantByRoom] = useState<Record<string, string>>({});
  const [attendants, setAttendants] = useState<HousekeepingAttendant[]>([]);
  const [activities, setActivities] = useState<HousekeepingActivity[]>([]);
  const [showDayEnd, setShowDayEnd] = useState(
    () => property.systemDate !== localDateKey(new Date())
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshHousekeeping = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHousekeepingBoard(props.propertyId);
      props.setRoomList(data.rooms);
      setRoomStatuses(data.roomStatuses);
      setAttendantByRoom(data.attendantByRoom);
      setAttendants(data.attendants);
      setActivities(data.activities);
    } catch (loadError) {
      const message = getHousekeepingApiErrorMessage(loadError);
      setError(message);
      props.setToast(message);
    } finally {
      setLoading(false);
    }
  }, [props.propertyId, props.setRoomList, props.setToast]);

  useEffect(() => {
    void refreshHousekeeping();
  }, [refreshHousekeeping]);

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setError("");
    try {
      await action();
      await refreshHousekeeping();
      props.setToast(successMessage);
      return true;
    } catch (actionError) {
      const message = getHousekeepingApiErrorMessage(actionError);
      setError(message);
      props.setToast(message);
      return false;
    }
  }

  const shared = {
    ...props,
    roomStatuses,
    attendantByRoom,
    attendants,
    activities,
    showDayEnd,
    setShowDayEnd,
    loading,
    error,
    refreshHousekeeping,
    startCleaning: (roomId: string, roomCode: string) =>
      runAction(() => startHousekeepingCleaning(props.propertyId, roomId), `Cleaning started for room ${roomCode}`),
    completeCleaning: (roomId: string, roomCode: string) =>
      runAction(() => completeHousekeepingCleaning(props.propertyId, roomId), `Room ${roomCode} marked clean`),
    assignAttendant: (roomId: string, roomCode: string, attendantId: string) =>
      runAction(() => assignHousekeepingAttendant(props.propertyId, roomId, attendantId), `Room ${roomCode} assigned successfully`),
    createAttendant: async (attendant: Omit<HousekeepingAttendant, "id">) => {
      await createHousekeepingAttendant(props.propertyId, attendant);
      await refreshHousekeeping();
      props.setToast(`${attendant.name} saved to MongoDB`);
    }
  };

  if (props.activePath.endsWith("information")) return <HousekeepingInformationPage {...shared} />;
  return <HousekeepingBoardPage {...shared} />;
}

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
