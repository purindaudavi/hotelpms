import assert from "node:assert/strict";
import type { Reservation } from "../app/data/pms-data";
import {
  allocationMetrics,
  appendBusinessBlockLog,
  createBusinessBlockLog,
  releaseRemainingAllocations,
  roomTypeAvailability,
  validateBlockActivation
} from "../app/lib/business-block-repository";
import { appendReservationLog, createReservationLogEntry, reservationChanges } from "../app/lib/reservation-activity-repository";
import { migrateReservationRecord, saveReservationRecord } from "../app/lib/reservation-repository";
import type { BusinessBlock } from "../app/components/modules/reservation/types";

const propertyId = "test-property";
const legacy = migrateReservationRecord({
  id: "legacy-1", resNo: "RES-1", bookingRef: "", reservationDate: "2026-06-18", checkIn: "2026-07-15", checkOut: "2026-07-16",
  rooms: 1, source: "Direct", status: "Confirmed", guest: "Sabapathio", phone: "", email: "", country: "LK",
  roomType: "Deluxe Double Room", room: "05", adults: 2, children: 0, total: 14500, paid: 0,
  reservationRemarks: "Company billing arrangement", guestRemarks: "Late check-in", internalRemarks: "Verify authorization letter"
}, propertyId, "LKR");

assert.equal(legacy.currency, "LKR");
assert.equal(legacy.currencyMigratedFromProperty, true);
assert.equal(legacy.reservationRemarks, "Company billing arrangement");
assert.equal(legacy.guestRemarks, "Late check-in");
assert.equal(legacy.internalRemarks, "Verify authorization letter");
assert.equal(legacy.occupants?.[0]?.name, "Sabapathio");

const block: BusinessBlock = {
  id: "block-1", propertyId, blockNumber: "BB-1", blockName: "Crew", companyName: "Airline", contactName: "Contact", contactEmail: "", contactPhone: "",
  checkIn: "2026-07-15", checkOut: "2026-07-17", cutoffDate: "2026-07-14", status: "Tentative", billingParty: "Company", depositRequired: 0,
  depositPaid: 0, allocations: [{ id: "allocation-1", propertyId, businessBlockId: "block-1", roomTypeId: "deluxe-double", roomTypeName: "Deluxe Double Room",
    quantity: 2, mealPlan: "Room Only", currency: "LKR", negotiatedRate: 12000, taxInclusive: true, isComplimentary: false, releasedQuantity: 0 }],
  createdBy: "Tester", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z"
};

assert.equal(roomTypeAvailability("Deluxe Double Room", "2026-07-15", 7, [], [block]), 7, "Tentative blocks are soft holds");
const activeBlock = { ...block, status: "Active" as const };
assert.equal(roomTypeAvailability("Deluxe Double Room", "2026-07-15", 7, [], [activeBlock]), 5, "Active block holds reduce availability");
assert.match(validateBlockActivation({ ...activeBlock, allocations: [{ ...activeBlock.allocations[0], quantity: 8 }] }, [], [], { "Deluxe Double Room": 7 }), /only 7 room/);

const linked: Reservation = {
  ...legacy, id: "linked-1", resNo: "RES-LINKED", businessBlockId: activeBlock.id, businessBlockAllocationId: activeBlock.allocations[0].id,
  reservationRooms: [{ ...legacy.reservationRooms![0], id: "linked-room", reservationId: "linked-1", businessBlockAllocationId: activeBlock.allocations[0].id }]
};
assert.deepEqual(allocationMetrics(activeBlock.allocations[0], [linked]), { blocked: 2, pickedUp: 1, released: 0, remaining: 1 });
assert.equal(roomTypeAvailability("Deluxe Double Room", "2026-07-15", 7, [linked], [activeBlock]), 5, "Picked rooms and remaining hold are not double-subtracted");
assert.equal(allocationMetrics(activeBlock.allocations[0], [{ ...linked, status: "Cancelled" }]).remaining, 2, "Cancelling a linked reservation returns it to Remaining");

const released = releaseRemainingAllocations(activeBlock, [linked]);
assert.equal(released.status, "Released");
assert.equal(released.allocations[0].releasedQuantity, 1);
assert.equal(roomTypeAvailability("Deluxe Double Room", "2026-07-15", 7, [linked], [released]), 6, "Release returns unpicked inventory while linked reservation remains occupied");

const updated = { ...legacy, guestRemarks: "Late arrival and airport transfer", updatedAt: new Date().toISOString() };
assert.equal(saveReservationRecord([legacy], updated).length, 1, "Updating the shared reservation must not duplicate it");
assert.ok(reservationChanges(legacy, updated)["Guest remarks"]);

const reservationLog = createReservationLogEntry({ propertyId, reservationId: legacy.id, action: "Reservation updated", description: "Remarks changed", createdBy: "Tester" });
assert.equal(appendReservationLog(appendReservationLog([], reservationLog), reservationLog).length, 1, "Repeated renders cannot duplicate the same log entry");
const blockLog = createBusinessBlockLog(propertyId, block.id, "Block created", "Created", "Tester");
assert.equal(appendBusinessBlockLog(appendBusinessBlockLog([], blockLog), blockLog).length, 1);

console.log("Phase 6 reservation and Business Block regression assertions passed.");
