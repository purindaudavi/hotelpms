import type { Reservation } from "../data/pms-data";
import { createUuid } from "./record-ids";
import { readLocalStorageValue } from "../components/hooks/use-local-storage-state";

export type ReservationLogEntry = {
  id: string;
  propertyId: string;
  reservationId: string;
  action: string;
  description: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  createdBy: string;
  createdAt: string;
};

export type ReservationAttachmentMetadata = {
  id: string;
  propertyId: string;
  reservationId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentCategory: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
};

export const reservationLogStorageKey = (propertyId: string) => `staypilot:${propertyId}:reservation-logs`;
export const reservationAttachmentStorageKey = (propertyId: string) => `staypilot:${propertyId}:reservation-attachment-metadata`;

export function isReservationLogArray(value: unknown): value is ReservationLogEntry[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object"
    && typeof (item as ReservationLogEntry).id === "string"
    && typeof (item as ReservationLogEntry).reservationId === "string"
    && typeof (item as ReservationLogEntry).createdAt === "string");
}

export function isReservationAttachmentArray(value: unknown): value is ReservationAttachmentMetadata[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object"
    && typeof (item as ReservationAttachmentMetadata).id === "string"
    && typeof (item as ReservationAttachmentMetadata).reservationId === "string"
    && typeof (item as ReservationAttachmentMetadata).fileName === "string");
}

export function readReservationAttachmentMetadata(propertyId: string, reservationId: string) {
  const current = readLocalStorageValue<ReservationAttachmentMetadata[]>(reservationAttachmentStorageKey(propertyId), [], isReservationAttachmentArray);
  if (current.length) return current;
  type LegacyAttachment = { id: string; name: string; type: string; size: number; uploadedAt: string };
  const legacy = readLocalStorageValue<LegacyAttachment[]>(`staypilot:${propertyId}:reservations:${reservationId}:attachment-metadata`, []);
  return legacy.map((item) => ({ id: item.id, propertyId, reservationId, fileName: item.name, fileType: item.type,
    fileSize: item.size, documentCategory: "Other", description: "", uploadedBy: "Unknown uploader", uploadedAt: item.uploadedAt }));
}

export function createReservationLogEntry(input: Omit<ReservationLogEntry, "id" | "createdAt">): ReservationLogEntry {
  return { ...input, id: createUuid(), createdAt: new Date().toISOString() };
}

export function appendReservationLog(records: ReservationLogEntry[], entry: ReservationLogEntry) {
  return records.some((record) => record.id === entry.id) ? records : [...records, entry];
}

export function logsForReservation(records: ReservationLogEntry[], reservationId: string) {
  return records.filter((entry) => entry.reservationId === reservationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const trackedFields: Array<[keyof Reservation, string]> = [
  ["checkIn", "Check-in"], ["checkOut", "Check-out"], ["status", "Status"], ["guest", "Guest name"],
  ["phone", "Phone"], ["email", "Email"], ["ratePlanName", "Rate plan"], ["currency", "Currency"],
  ["mealPlan", "Meal plan"], ["total", "Total"], ["paid", "Paid"], ["reservationRemarks", "Reservation remarks"],
  ["guestRemarks", "Guest remarks"], ["internalRemarks", "Internal remarks"], ["groupName", "Group name"],
  ["tourNumber", "Tour number"]
];

export function reservationChanges(previous: Reservation, next: Reservation) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, label] of trackedFields) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(next[field])) changes[label] = { from: previous[field] ?? "", to: next[field] ?? "" };
  }
  if (JSON.stringify(previous.reservationRooms ?? []) !== JSON.stringify(next.reservationRooms ?? [])) {
    changes["Room assignments and rates"] = { from: previous.reservationRooms ?? [], to: next.reservationRooms ?? [] };
  }
  return changes;
}
