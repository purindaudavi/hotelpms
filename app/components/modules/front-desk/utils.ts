import { Reservation, Room, roomTypes } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import { DeskColumn, DeskTab, RatePlan, ReservationForm, ReservationRoomDraft } from "./types";

const inactiveStatuses = new Set(["Cancelled", "No Show", "Blocked"]);

export function buildDeskColumns({ dayUse, dayUseDate, gridDays, gridStartDate, businessDate }: {
  dayUse: boolean; dayUseDate: string; gridDays: number; gridStartDate: string; businessDate: string;
}): DeskColumn[] {
  if (dayUse) return Array.from({ length: 24 }, (_, hour) => ({
    key: `${dayUseDate}-${hour}`, date: dayUseDate, label: `${String(hour).padStart(2, "0")}:00`,
    subLabel: shortMonthDay(dayUseDate), weekend: false, active: dayUseDate === businessDate
  }));
  return Array.from({ length: gridDays }, (_, index) => {
    const date = addDays(gridStartDate, index);
    const weekday = parseDate(date).getDay();
    return { key: date, date, label: weekdayLabel(date), subLabel: shortMonthDay(date), weekend: weekday === 0 || weekday === 6, active: date === businessDate };
  });
}

export function groupRooms(roomList: Room[]) {
  const groups = roomList.reduce<Record<string, Room[]>>((acc, room) => ({ ...acc, [room.type]: [...(acc[room.type] ?? []), room] }), {});
  return Object.keys(groups).sort().map((type) => ({ type, rooms: groups[type].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })) }));
}

export function reservationRoomNumbers(booking: Reservation) {
  return booking.reservationRooms?.length ? booking.reservationRooms.map((line) => line.roomNumber) : [booking.room];
}

export function occupiedOnDate(roomList: Room[], reservations: Reservation[], date: string, dayUse: boolean) {
  const roomNumbers = new Set(roomList.map((room) => room.code));
  const occupied = new Set<string>();
  reservations.forEach((booking) => {
    if (!inactiveStatuses.has(booking.status) && bookingCoversDate(booking, date, dayUse)) {
      reservationRoomNumbers(booking).forEach((number) => { if (roomNumbers.has(number)) occupied.add(number); });
    }
  });
  return occupied.size;
}

export function bookingMatchesCell(booking: Reservation, date: string, tab: DeskTab, dayUse: boolean) {
  if (inactiveStatuses.has(booking.status) || !bookingCoversDate(booking, date, dayUse)) return false;
  if (tab === "Arrival") return booking.checkIn === date;
  if (tab === "Departure") return booking.checkOut === date;
  if (tab === "In House") return booking.status === "Checked-in";
  return true;
}

export function bookingCoversDate(booking: Reservation, date: string, dayUse: boolean) {
  if (dayUse || booking.isDayRoom || booking.checkIn === booking.checkOut) return booking.checkIn === date;
  return date >= booking.checkIn && date < booking.checkOut;
}

export function roomHasOverlap(reservations: Reservation[], roomNumber: string, checkIn: string, checkOut: string, editingId?: string) {
  return reservations.some((booking) => booking.id !== editingId && !inactiveStatuses.has(booking.status)
    && reservationRoomNumbers(booking).includes(roomNumber)
    && checkIn < booking.checkOut && checkOut > booking.checkIn);
}

export function cellClass(column: DeskColumn, dayUse: boolean, base: string) {
  return `${base}${dayUse ? " bg-emerald-50/75" : column.active ? " bg-teal-100/70" : ""}`;
}

export function bookingToForm(booking: Reservation | null, defaultDate: string, propertyId: string, ratePlans: RatePlan[], homeCurrency: string): ReservationForm {
  const plan = ratePlans.find((item) => item.id === booking?.ratePlanId) ?? ratePlans[0];
  const checkIn = booking?.checkIn ?? defaultDate;
  const checkOut = booking?.checkOut ?? addDays(defaultDate, 1);
  const isDayRoom = booking?.isDayRoom ?? checkIn === checkOut;
  const now = new Date().toISOString();
  const legacyType = roomTypes.find((item) => item.name === booking?.roomType) ?? roomTypes[0];
  const roomLines: ReservationRoomDraft[] = booking?.reservationRooms?.map(({ propertyId: _propertyId, reservationId: _reservationId, ...line }) => line) ?? [{
    id: createUuid(), roomTypeId: legacyType.id, roomType: booking?.roomType ?? legacyType.name,
    roomId: booking?.room ?? legacyType.rooms[0], roomNumber: booking?.room ?? legacyType.rooms[0],
    occupancy: "Double", bedType: "Bed Type", adults: booking?.adults ?? 2, children: booking?.children ?? 0,
    ratePlanId: plan?.id ?? "", ratePlanName: booking?.ratePlanName ?? plan?.name ?? "",
    mealPlan: booking?.mealPlan ?? plan?.mealPlan ?? "Room Only", currency: booking?.currency ?? plan?.currency ?? homeCurrency,
    originalNightlyRate: booking?.total ?? plan?.baseRate ?? legacyType.baseRate,
    effectiveNightlyRate: booking?.total ?? plan?.baseRate ?? legacyType.baseRate,
    isFoc: false, focReason: "", requiresManagerApproval: false, createdAt: now, updatedAt: now
  }];
  return {
    id: booking?.id, businessBlockId: booking?.businessBlockId, businessBlockAllocationId: booking?.businessBlockAllocationId,
    title: booking?.guestTitle ?? "Select", bookingSource: booking?.bookingSource ?? booking?.source ?? "Direct",
    bookingReference: booking?.bookingReference ?? booking?.bookingRef ?? "", tourNumber: booking?.tourNumber ?? "", groupName: booking?.groupName ?? "",
    status: booking?.status ?? "Confirmed", checkIn, checkOut, nights: isDayRoom ? 0 : Math.max(daysBetween(checkIn, checkOut), 1), isDayRoom,
    ratePlanId: booking?.ratePlanId ?? plan?.id ?? "", currency: booking?.currency ?? plan?.currency ?? homeCurrency,
    mealPlan: booking?.mealPlan ?? plan?.mealPlan ?? "Room Only", refundable: booking?.refundable ?? plan?.refundable ?? true,
    cancellationPolicy: booking?.cancellationPolicy ?? plan?.cancellationPolicy ?? "", roomLines,
    guest: booking?.guest ?? "", phone: booking?.phone === "-" ? "" : booking?.phone ?? "", email: booking?.email === "-" ? "" : booking?.email ?? "",
    country: booking?.country ?? "Select Country", reservationRemarks: booking?.reservationRemarks ?? "",
    guestRemarks: booking?.guestRemarks ?? "", internalRemarks: booking?.internalRemarks ?? "",
    checkInNow: booking?.status === "Checked-in", sendEmail: booking?.emailStatus === "pending" || booking?.emailStatus === "sent"
  };
}

export function formToReservation(
  form: ReservationForm,
  propertyId: string,
  ratePlans: RatePlan[],
  existing?: Reservation,
  businessDate?: string,
  createdBy = ""
): Reservation {
  const now = new Date().toISOString();
  const id = existing?.id ?? form.id ?? createUuid();
  const plan = ratePlans.find((item) => item.id === form.ratePlanId);
  const nights = form.isDayRoom ? 1 : Math.max(form.nights, 1);
  const lines = form.roomLines.map((line) => ({ ...line, propertyId, reservationId: id, ratePlanId: form.ratePlanId,
    ratePlanName: plan?.name ?? line.ratePlanName, mealPlan: form.mealPlan, currency: form.currency,
    businessBlockAllocationId: line.businessBlockAllocationId ?? form.businessBlockAllocationId,
    effectiveNightlyRate: line.isFoc ? 0 : Number(line.effectiveNightlyRate), createdAt: line.createdAt ?? now, updatedAt: now }));
  const first = lines[0];
  const total = lines.reduce((sum, line) => sum + line.effectiveNightlyRate * nights, 0);
  const bookingReference = form.bookingSource === "Direct" ? "" : form.bookingReference.trim();
  const savedOccupants = existing?.occupants ?? [];
  const mainBooker = savedOccupants.find((guest) => guest.isMainBooker);
  const occupants = mainBooker
    ? savedOccupants.map((guest) => guest.id === mainBooker.id ? { ...guest, roomLineId: lines.some((line) => line.id === guest.roomLineId) ? guest.roomLineId : first.id, name: form.guest.trim(), title: form.title, email: form.email.trim(), phone: form.phone.trim(), country: form.country === "Select Country" ? "" : form.country, updatedAt: now } : guest)
    : [{ id: createUuid(), propertyId, reservationId: id, roomLineId: first.id, name: form.guest.trim(), title: form.title,
      guestType: "Adult" as const, isPrimary: true, isMainBooker: true, email: form.email.trim(), phone: form.phone.trim(),
      country: form.country === "Select Country" ? "" : form.country, createdAt: now, updatedAt: now }];
  return {
    ...existing, id, propertyId, resNo: existing?.resNo ?? `RES-${id.slice(0, 8).toUpperCase()}`,
    bookingRef: bookingReference, bookingReference, bookingSource: form.bookingSource, source: form.bookingSource,
    tourNumber: form.bookingSource === "Direct" ? "" : form.tourNumber.trim(), groupName: form.bookingSource === "Direct" ? "" : form.groupName.trim(),
    reservationDate: existing?.reservationDate ?? businessDate ?? now.slice(0, 10), checkIn: form.checkIn, checkOut: form.isDayRoom ? form.checkIn : form.checkOut,
    rooms: lines.length, status: form.checkInNow ? "Checked-in" : form.status, guestTitle: form.title, guest: form.guest.trim(),
    phone: form.phone.trim() || "-", email: form.email.trim() || "-", country: form.country === "Select Country" ? "" : form.country,
    roomType: first.roomType, room: first.roomNumber, adults: lines.reduce((sum, line) => sum + line.adults, 0), children: lines.reduce((sum, line) => sum + line.children, 0),
    total, paid: existing?.paid ?? 0, reservationRemarks: form.reservationRemarks,
    guestRemarks: form.guestRemarks, internalRemarks: form.internalRemarks, isDayRoom: form.isDayRoom,
    ratePlanId: form.ratePlanId, ratePlanName: plan?.name ?? first.ratePlanName, mealPlan: form.mealPlan, currency: form.currency,
    refundable: form.refundable, cancellationPolicy: form.cancellationPolicy, reservationRooms: lines,
    emailStatus: existing?.emailStatus ?? (form.sendEmail ? "pending" : "not_requested"),
    emailFailureMessage: existing?.emailFailureMessage,
    businessBlockId: form.businessBlockId ?? existing?.businessBlockId,
    businessBlockAllocationId: form.businessBlockAllocationId ?? existing?.businessBlockAllocationId,
    occupants,
    createdBy: existing?.createdBy ?? createdBy, currencyMigratedFromProperty: false,
    createdAt: existing?.createdAt ?? now, updatedAt: now
  };
}

export function parseDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
export function toISODate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function addDays(value: string, days: number) { const date = parseDate(value); date.setDate(date.getDate() + days); return toISODate(date); }
export function daysBetween(start: string, end: string) { return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000); }
export function longDate(value: string) { const date = parseDate(value); return `${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })} ${date.getFullYear()}`; }
export function shortMonthDay(value: string) { return parseDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
export function weekdayLabel(value: string) { return parseDate(value).toLocaleDateString("en-US", { weekday: "short" }); }
