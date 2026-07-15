import type { Reservation } from "../data/pms-data";
import type { BusinessBlock, BusinessBlockAllocation, BusinessBlockLogEntry, BusinessBlockStatus } from "../components/modules/reservation/types";
import { createStableUuid, createUuid } from "./record-ids";

export const businessBlockStorageKey = (propertyId: string) => `staypilot:${propertyId}:reservation:bookings:business-blocks`;
export const businessBlockLogStorageKey = (propertyId: string) => `staypilot:${propertyId}:business-block-logs`;

export function isBusinessBlockArray(value: unknown): value is BusinessBlock[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && typeof (item as { id?: unknown }).id === "string");
}

export function isBusinessBlockLogArray(value: unknown): value is BusinessBlockLogEntry[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object"
    && typeof (item as BusinessBlockLogEntry).id === "string" && typeof (item as BusinessBlockLogEntry).businessBlockId === "string");
}

export function migrateBusinessBlockRecords(records: BusinessBlock[], propertyId: string, homeCurrency: string, businessDate: string) {
  return records.map((record) => migrateBusinessBlock(record as BusinessBlock & Record<string, unknown>, propertyId, homeCurrency, businessDate));
}

function migrateBusinessBlock(record: BusinessBlock & Record<string, unknown>, propertyId: string, homeCurrency: string, businessDate: string): BusinessBlock {
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : `${businessDate}T00:00:00.000Z`;
  const blockNumber = record.blockNumber || String(record.blockNo || `BB-${record.id.slice(0, 8).toUpperCase()}`);
  const checkIn = record.checkIn || String(record.from || businessDate);
  const checkOut = record.checkOut || String(record.to || checkIn);
  const allocations = Array.isArray(record.allocations) && record.allocations.length ? record.allocations : [{
    id: createStableUuid(`${propertyId}:${record.id}:legacy-allocation`), propertyId, businessBlockId: record.id,
    roomTypeId: "deluxe-double", roomTypeName: "Deluxe Double Room", quantity: Number(record.rooms || 1),
    ratePlanId: "", ratePlanName: "", mealPlan: "Room Only", currency: homeCurrency,
    negotiatedRate: Number(record.rate || 0), taxInclusive: false, isComplimentary: Number(record.rate || 0) === 0,
    complimentaryReason: Number(record.rate || 0) === 0 ? "Migrated zero-rate legacy block" : "", releasedQuantity: 0
  } satisfies BusinessBlockAllocation];
  return {
    id: record.id, propertyId, blockNumber, blockName: record.blockName || String(record.company || blockNumber),
    companyName: record.companyName || String(record.company || ""), contactName: record.contactName || String(record.contact || ""),
    contactEmail: record.contactEmail || "", contactPhone: record.contactPhone || "", checkIn, checkOut,
    cutoffDate: record.cutoffDate || checkIn, status: normalizeStatus(record.status), paymentMethod: record.paymentMethod || "",
    billingParty: record.billingParty || "Company", depositRequired: Number(record.depositRequired || 0), depositPaid: Number(record.depositPaid || 0),
    paymentDueDate: record.paymentDueDate || "", billingRemarks: record.billingRemarks || "", cancellationPolicy: record.cancellationPolicy || "",
    blockRemarks: record.blockRemarks || "", internalRemarks: record.internalRemarks || "", specialRequirements: record.specialRequirements || "",
    allocations: allocations.map((allocation) => ({ ...allocation, propertyId, businessBlockId: record.id, releasedQuantity: Number(allocation.releasedQuantity || 0) })),
    createdBy: record.createdBy || "Unknown creator", createdAt, updatedAt: record.updatedAt || createdAt
  };
}

function normalizeStatus(status: unknown): BusinessBlockStatus {
  return status === "Active" || status === "Released" || status === "Cancelled" || status === "Completed" ? status : "Tentative";
}

export function listBusinessBlocks(records: BusinessBlock[]) { return [...records]; }
export function getBusinessBlock(records: BusinessBlock[], blockId: string) { return records.find((record) => record.id === blockId) ?? null; }
export function createBusinessBlock(records: BusinessBlock[], block: BusinessBlock) {
  if (records.some((record) => record.id === block.id || record.blockNumber === block.blockNumber)) throw new Error("A business block with this ID or block number already exists.");
  return [block, ...records];
}
export function updateBusinessBlock(records: BusinessBlock[], block: BusinessBlock) {
  if (!records.some((record) => record.id === block.id)) throw new Error("Business block not found.");
  return records.map((record) => record.id === block.id ? block : record);
}
export function deleteBusinessBlock(records: BusinessBlock[], blockId: string) { return records.filter((record) => record.id !== blockId); }

export function createBusinessBlockLog(propertyId: string, businessBlockId: string, action: string, description: string, createdBy: string): BusinessBlockLogEntry {
  return { id: createUuid(), propertyId, businessBlockId, action, description, createdBy, createdAt: new Date().toISOString() };
}
export function appendBusinessBlockLog(records: BusinessBlockLogEntry[], entry: BusinessBlockLogEntry) { return records.some((item) => item.id === entry.id) ? records : [...records, entry]; }

const pickedStatuses = new Set(["Confirmed", "Tentative", "Checked-in", "Checked-out", "Blocked"]);
export function pickedUpForAllocation(allocation: BusinessBlockAllocation, reservations: Reservation[]) {
  return reservations.filter((reservation) => reservation.businessBlockId === allocation.businessBlockId && pickedStatuses.has(reservation.status))
    .flatMap((reservation) => reservation.reservationRooms ?? [])
    .filter((room) => (room.businessBlockAllocationId || reservations.find((item) => item.id === room.reservationId)?.businessBlockAllocationId) === allocation.id).length;
}

export function allocationMetrics(allocation: BusinessBlockAllocation, reservations: Reservation[]) {
  const pickedUp = Math.min(pickedUpForAllocation(allocation, reservations), allocation.quantity);
  const released = Math.min(allocation.releasedQuantity || 0, Math.max(allocation.quantity - pickedUp, 0));
  return { blocked: allocation.quantity, pickedUp, released, remaining: Math.max(allocation.quantity - pickedUp - released, 0) };
}

export function businessBlockMetrics(block: BusinessBlock, reservations: Reservation[]) {
  const allocationRows = block.allocations.map((allocation) => ({ allocation, ...allocationMetrics(allocation, reservations) }));
  const totals = allocationRows.reduce((sum, row) => ({ blocked: sum.blocked + row.blocked, pickedUp: sum.pickedUp + row.pickedUp, released: sum.released + row.released, remaining: sum.remaining + row.remaining }), { blocked: 0, pickedUp: 0, released: 0, remaining: 0 });
  const nights = Math.max(daysBetween(block.checkIn, block.checkOut), 1);
  const estimatedValue = block.allocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.negotiatedRate * nights, 0);
  return { allocationRows, ...totals, estimatedValue, balance: Math.max(estimatedValue - block.depositPaid, 0) };
}

export function roomTypeAvailability(roomTypeName: string, date: string, capacity: number, reservations: Reservation[], blocks: BusinessBlock[], excludedBlockId?: string) {
  const occupied = reservations.filter((reservation) => pickedStatuses.has(reservation.status) && date >= reservation.checkIn && (reservation.isDayRoom ? date === reservation.checkIn : date < reservation.checkOut))
    .reduce((count, reservation) => count + (reservation.reservationRooms?.filter((room) => room.roomType === roomTypeName).length ?? (reservation.roomType === roomTypeName ? reservation.rooms : 0)), 0);
  const held = blocks.filter((block) => block.status === "Active" && block.id !== excludedBlockId && date >= block.checkIn && date < block.checkOut)
    .reduce((sum, block) => sum + block.allocations.filter((allocation) => allocation.roomTypeName === roomTypeName).reduce((allocationSum, allocation) => allocationSum + allocationMetrics(allocation, reservations).remaining, 0), 0);
  return Math.max(capacity - occupied - held, 0);
}

export function validateBlockActivation(block: BusinessBlock, blocks: BusinessBlock[], reservations: Reservation[], roomCapacities: Record<string, number>) {
  for (const allocation of block.allocations) {
    for (const date of datesBetween(block.checkIn, block.checkOut)) {
      const available = roomTypeAvailability(allocation.roomTypeName, date, roomCapacities[allocation.roomTypeName] || 0, reservations, blocks, block.id);
      if (allocation.quantity > available) return `${allocation.roomTypeName} has only ${available} room(s) available on ${date}; ${allocation.quantity} requested.`;
    }
  }
  return "";
}

export function releaseRemainingAllocations(block: BusinessBlock, reservations: Reservation[]) {
  return { ...block, status: "Released" as const, allocations: block.allocations.map((allocation) => ({ ...allocation, releasedQuantity: allocationMetrics(allocation, reservations).remaining })), updatedAt: new Date().toISOString() };
}

function daysBetween(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000); }
function datesBetween(start: string, end: string) { const dates: string[] = []; const date = new Date(`${start}T00:00:00`); const last = new Date(`${end}T00:00:00`); while (date < last) { dates.push(date.toISOString().slice(0, 10)); date.setDate(date.getDate() + 1); } return dates; }
