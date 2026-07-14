import type { BusinessBlock } from "../components/modules/reservation/types";

export const businessBlockStorageKey = (propertyId: string) => `staypilot:${propertyId}:reservation:bookings:business-blocks`;

export function isBusinessBlockArray(value: unknown): value is BusinessBlock[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object"
    && typeof (item as BusinessBlock).id === "string"
    && typeof (item as BusinessBlock).blockNo === "string"
    && typeof (item as BusinessBlock).company === "string");
}

export function listBusinessBlocks(records: BusinessBlock[]) {
  return [...records];
}

export function getBusinessBlock(records: BusinessBlock[], blockId: string) {
  return records.find((record) => record.id === blockId) ?? null;
}

export function createBusinessBlock(records: BusinessBlock[], block: BusinessBlock) {
  if (records.some((record) => record.id === block.id || record.blockNo === block.blockNo)) {
    throw new Error("A business block with this ID or block number already exists.");
  }
  return [block, ...records];
}

export function updateBusinessBlock(records: BusinessBlock[], block: BusinessBlock) {
  if (!records.some((record) => record.id === block.id)) throw new Error("Business block not found.");
  return records.map((record) => record.id === block.id ? block : record);
}

export function deleteBusinessBlock(records: BusinessBlock[], blockId: string) {
  return records.filter((record) => record.id !== blockId);
}
