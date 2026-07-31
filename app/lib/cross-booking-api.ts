import type { CrossBookLink } from "@/app/components/modules/reservation/types";
import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

export type CrossBookingRecord = {
  _id: string;
  property_id: string;
  room_a_id: string;
  room_b_id: string;
  room_a_number: string;
  room_b_number: string;
  room_a_type_id: string;
  room_b_type_id: string;
  room_a_type_name: string;
  room_b_type_name: string;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};

type CrossBookingListResponse = {
  count: number;
  cross_bookings: CrossBookingRecord[];
};

type CrossBookingResponse = {
  message: string;
  cross_booking: CrossBookingRecord;
};

export async function listCrossBookings(
  propertyId: string,
  active: boolean | undefined = true
) {
  const response = await api.get<CrossBookingListResponse>("/cross-bookings", {
    params: { property_id: propertyId, active }
  });
  return response.data.cross_bookings;
}

export async function createCrossBooking(
  propertyId: string,
  firstRoomId: string,
  secondRoomId: string
) {
  const response = await api.post<CrossBookingResponse>(
    "/cross-bookings",
    {
      property_id: propertyId,
      room_a_id: firstRoomId,
      room_b_id: secondRoomId
    },
    { headers: actorHeaders() }
  );
  return response.data.cross_booking;
}

export async function deleteCrossBooking(
  propertyId: string,
  crossBookingId: string
) {
  await api.delete(`/cross-bookings/${crossBookingId}`, {
    params: { property_id: propertyId },
    headers: actorHeaders()
  });
}

export function crossBookingRecordsToLinks(
  records: CrossBookingRecord[]
): CrossBookLink[] {
  return records
    .filter((record) => record.active)
    .map((record) => ({
      primaryRoom: record.room_a_number,
      blockedRooms: [record.room_b_number]
    }));
}

export function findCrossBookingRecord(
  records: CrossBookingRecord[],
  firstRoomId: string,
  secondRoomId: string
) {
  return records.find((record) =>
    (record.room_a_id === firstRoomId && record.room_b_id === secondRoomId) ||
    (record.room_a_id === secondRoomId && record.room_b_id === firstRoomId)
  );
}

export function getCrossBookingApiErrorMessage(error: unknown) {
  return getApiErrorMessage(
    error,
    "Cross-booking relationships could not be loaded."
  );
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
