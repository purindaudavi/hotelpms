import type { Reservation, ReservationRoom } from "../data/pms-data";
import { createStableUuid } from "./record-ids";

export const reservationStorageKey = (propertyId: string) => `staypilot:${propertyId}:reservations`;

function legacyTimestamp(reservationDate: string | undefined) {
  const candidate = reservationDate ? new Date(`${reservationDate}T00:00:00.000Z`) : new Date(0);
  return Number.isNaN(candidate.getTime()) ? new Date(0).toISOString() : candidate.toISOString();
}

function migrateRoom(
  room: Partial<ReservationRoom>,
  reservation: Reservation,
  propertyId: string,
  currency: string,
  index: number,
  timestamp: string
): ReservationRoom {
  const roomNumber = room.roomNumber ?? reservation.room ?? "";
  return {
    id: room.id ?? createStableUuid(`${reservation.id}:room:${roomNumber}:${index}`),
    propertyId,
    reservationId: reservation.id,
    roomTypeId: room.roomTypeId ?? createStableUuid(`room-type:${room.roomType ?? reservation.roomType}`),
    roomType: room.roomType ?? reservation.roomType ?? "Unassigned room type",
    roomId: room.roomId ?? roomNumber,
    roomNumber,
    occupancy: room.occupancy ?? "Unspecified",
    bedType: room.bedType ?? "Unspecified",
    adults: Number(room.adults ?? reservation.adults) || 1,
    children: Number(room.children ?? reservation.children) || 0,
    ratePlanId: room.ratePlanId ?? reservation.ratePlanId ?? "",
    ratePlanName: room.ratePlanName ?? reservation.ratePlanName ?? "",
    mealPlan: room.mealPlan ?? reservation.mealPlan ?? "",
    currency: room.currency?.trim() || currency,
    originalNightlyRate: Number(room.originalNightlyRate ?? reservation.total) || 0,
    effectiveNightlyRate: Number(room.effectiveNightlyRate ?? reservation.total) || 0,
    isFoc: Boolean(room.isFoc),
    focReason: room.focReason ?? "",
    focSelectedBy: room.focSelectedBy,
    focSelectedAt: room.focSelectedAt,
    requiresManagerApproval: Boolean(room.requiresManagerApproval),
    createdAt: room.createdAt ?? timestamp,
    updatedAt: room.updatedAt ?? timestamp
  };
}

export function migrateReservationRecord(record: Reservation, propertyId: string, homeCurrency: string): Reservation {
  const id = record.id || createStableUuid(`${propertyId}:${record.resNo || record.bookingRef || record.guest}`);
  const timestamp = record.createdAt ?? legacyTimestamp(record.reservationDate);
  const currencyWasMissing = !record.currency?.trim();
  const currency = record.currency?.trim() || homeCurrency;
  const reservation = {
    ...record,
    id,
    propertyId,
    bookingSource: record.bookingSource ?? record.source ?? "",
    bookingReference: record.bookingReference ?? record.bookingRef ?? "",
    source: record.bookingSource ?? record.source ?? "",
    bookingRef: record.bookingReference ?? record.bookingRef ?? "",
    tourNumber: record.tourNumber ?? "",
    groupName: record.groupName ?? "",
    reservationRemarks: record.reservationRemarks ?? "",
    guestRemarks: record.guestRemarks ?? "",
    internalRemarks: record.internalRemarks ?? "",
    currency,
    currencyMigratedFromProperty: record.currencyMigratedFromProperty ?? currencyWasMissing,
    createdBy: record.createdBy ?? "",
    createdAt: timestamp,
    updatedAt: record.updatedAt ?? timestamp
  } satisfies Reservation;

  const legacyRooms: Array<Partial<ReservationRoom>> = record.reservationRooms?.length
    ? record.reservationRooms
    : [{}];
  const reservationRooms = legacyRooms.map((room, index) => migrateRoom(room, reservation, propertyId, currency, index, timestamp));

  return {
    ...reservation,
    rooms: reservationRooms.length,
    roomType: reservationRooms[0]?.roomType ?? reservation.roomType,
    room: reservationRooms[0]?.roomNumber ?? reservation.room,
    reservationRooms
  };
}

export function migrateReservationRecords(records: Reservation[], propertyId: string, homeCurrency: string) {
  const deduplicated = new Map<string, Reservation>();
  records.forEach((record) => {
    const migrated = migrateReservationRecord(record, propertyId, homeCurrency);
    const identity = migrated.id || migrated.resNo;
    const current = deduplicated.get(identity);
    if (!current || (migrated.updatedAt ?? "") >= (current.updatedAt ?? "")) deduplicated.set(identity, migrated);
  });
  return [...deduplicated.values()];
}

export function listReservations(records: Reservation[]) {
  return [...records];
}

export function getReservation(records: Reservation[], reservationId: string) {
  return records.find((record) => record.id === reservationId) ?? null;
}

export function createReservation(records: Reservation[], reservation: Reservation) {
  if (records.some((record) => record.id === reservation.id || record.resNo === reservation.resNo)) {
    throw new Error("A reservation with this ID or reservation number already exists.");
  }
  return [reservation, ...records];
}

export function updateReservation(records: Reservation[], reservation: Reservation) {
  const index = records.findIndex((record) => record.id === reservation.id);
  if (index < 0) throw new Error("Reservation not found.");
  return records.map((record) => (record.id === reservation.id ? reservation : record));
}

export function deleteReservation(records: Reservation[], reservationId: string) {
  return records.filter((record) => record.id !== reservationId);
}

export function saveReservationRecord(records: Reservation[], reservation: Reservation) {
  return records.some((record) => record.id === reservation.id)
    ? updateReservation(records, reservation)
    : createReservation(records, reservation);
}
