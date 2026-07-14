"use client";

import { property } from "@/app/data/pms-data";

export type ChannelLogEntry = {
  id: string;
  time: string;
  channel: string;
  event: string;
  status: "Success" | "Warning" | "Error" | "Info";
  direction: "Inbound" | "Outbound";
  message: string;
  payload: string;
};

export type ChannelBookingSessionRecord = {
  id: string;
  status: "New" | "Modified" | "Cancelled";
  uniqueId: string;
  propertyName: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    language: string;
    country: string;
    city: string;
    address: string;
    postalCode: string;
  };
  source: string;
  channel: string;
  reservationId: string;
  bookingId: string;
  revisionId: string;
  otaReservationId: string;
  bookedAt: string;
  checkIn: string;
  checkOut: string;
  arrivalTime: string;
  nights: number;
  roomsCount: number;
  occupancy: string;
  roomName: string;
  total: number;
  acked: boolean;
  guarantee: string;
  notes: string[];
  benefits: string;
  requests: string;
  paymentCollect: string;
  paymentMethod: string;
  deposits: string;
};

export type ChannelRoomPhoto = {
  id: string;
  name: string;
  url: string;
};

export type ChannelRoomRecord = {
  id: string;
  propertyName: string;
  title: string;
  roomType: string;
  countOfRooms: number;
  adultSpaces: number;
  childrenSpaces: number;
  cotSpaces: number;
  description: string;
  facilities: string[];
  photos: ChannelRoomPhoto[];
};

export type ChannelInventoryRowType = "availability" | "rate";
export type ChannelInventoryOperation = "set" | "increase" | "decrease";
export type ChannelInventoryUnit = "USD" | "percent";

export type ChannelRatePlan = {
  id: string;
  code: string;
  occupancy: string;
  linkedOccupancy?: string;
  baseRate: number;
  muted?: boolean;
};

export type ChannelInventoryRoom = {
  id: string;
  name: string;
  baseAvailability: number;
  availabilityByDate?: Record<string, number>;
  ratePlans: ChannelRatePlan[];
};

export type ChannelInventoryOverride = {
  id: string;
  roomId: string;
  ratePlanId: string;
  rowType: ChannelInventoryRowType | "both";
  startDate: string;
  endDate: string;
  restriction: string;
  operation: ChannelInventoryOperation;
  unit: ChannelInventoryUnit;
  value: number;
};

export type ChannelAvailabilityRules = {
  weekendStopSell: boolean;
  minStay: string;
  maxStay: string;
  closedToArrival: boolean;
  closedToDeparture: boolean;
};

export type ChannelInventorySettings = {
  defaultChannel: string;
  currency: string;
  autoSync: boolean;
  protectManualOverrides: boolean;
};

export type ChannelInventoryState = {
  overrides: ChannelInventoryOverride[];
  rules: ChannelAvailabilityRules;
  settings: ChannelInventorySettings;
};

export type ChannelInventorySyncRow = {
  roomId: string;
  roomName: string;
  date: string;
  availability: number;
  rates: Array<{
    ratePlanId: string;
    code: string;
    occupancy: string;
    rate: number;
  }>;
  restrictions: string[];
};

export type ChannelInventorySyncSummary = {
  rooms: number;
  dates: number;
  availabilityCells: number;
  rateCells: number;
  overrides: number;
  activeRules: string[];
  sampleRows: ChannelInventorySyncRow[];
};

export const initialChannelRooms: ChannelRoomRecord[] = [
  {
    id: "deluxe-family",
    propertyName: property.name,
    title: "Deluxe Family Room",
    roomType: "Room",
    countOfRooms: 1,
    adultSpaces: 4,
    childrenSpaces: 1,
    cotSpaces: 0,
    description: "Family room mapped for channel distribution with flexible bed spaces.",
    facilities: ["Air Conditioner", "Mini Fridge", "Balcony", "Hot Water"],
    photos: []
  },
  {
    id: "deluxe-triple",
    propertyName: property.name,
    title: "Deluxe Triple Room",
    roomType: "Room",
    countOfRooms: 3,
    adultSpaces: 3,
    childrenSpaces: 1,
    cotSpaces: 0,
    description: "Triple room with standard PMS inventory and rate mapping.",
    facilities: ["Air Conditioner", "Shower", "Hot Water"],
    photos: []
  },
  {
    id: "deluxe-twin",
    propertyName: property.name,
    title: "Deluxe Twin Room",
    roomType: "Room",
    countOfRooms: 2,
    adultSpaces: 2,
    childrenSpaces: 0,
    cotSpaces: 0,
    description: "Twin room for two guests with channel-ready content.",
    facilities: ["Air Conditioner", "Twin Bed", "City View"],
    photos: []
  },
  {
    id: "deluxe-double",
    propertyName: property.name,
    title: "Deluxe Double Room",
    roomType: "Room",
    countOfRooms: 6,
    adultSpaces: 2,
    childrenSpaces: 1,
    cotSpaces: 1,
    description: "Double room with one main adult bed and one child space.",
    facilities: ["Air Conditioner", "King Bed", "Wardrobe", "Hot Water"],
    photos: []
  },
  {
    id: "deluxe-single",
    propertyName: property.name,
    title: "Deluxe Single Room",
    roomType: "Room",
    countOfRooms: 2,
    adultSpaces: 1,
    childrenSpaces: 1,
    cotSpaces: 0,
    description: "Single room for compact channel inventory.",
    facilities: ["Fan", "Wardrobe", "Shower"],
    photos: []
  }
];

export const defaultChannelInventoryState: ChannelInventoryState = {
  overrides: [],
  rules: {
    weekendStopSell: false,
    minStay: "1",
    maxStay: "14",
    closedToArrival: false,
    closedToDeparture: false
  },
  settings: {
    defaultChannel: "All channels",
    currency: "USD",
    autoSync: true,
    protectManualOverrides: true
  }
};

export function channelLogsKey(propertyId: string) {
  return `staypilot:${propertyId}:channel-manager:logs`;
}

export function channelRoomRatesKey(propertyId: string) {
  return `staypilot:${propertyId}:channel-manager:room-and-rates`;
}

export function channelInventoryKey(propertyId: string) {
  return `staypilot:${propertyId}:channel-manager:inventory`;
}

export function channelBookingsKey(propertyId: string) {
  return `staypilot:${propertyId}:channel-manager:bookings`;
}

export function channelMessagesKey(propertyId: string) {
  return `staypilot:${propertyId}:channel-manager:messages`;
}

export function nowStamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function makeLogEntry(input: Omit<ChannelLogEntry, "id" | "time">): ChannelLogEntry {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    time: nowStamp(),
    ...input
  };
}

export function buildChannelInventoryRooms(rooms: ChannelRoomRecord[]): ChannelInventoryRoom[] {
  return rooms.map((room) => {
    const adultSpaces = Math.max(1, room.adultSpaces || 1);
    const baseRate = getDefaultRoomRate(room.title);

    return {
      id: room.id,
      name: room.title,
      baseAvailability: Math.max(0, room.countOfRooms || 0),
      ratePlans: Array.from({ length: adultSpaces }, (_, index) => {
        const occupancy = String(index + 1);
        return {
          id: `${room.id}-ro-${occupancy}`,
          code: "RO",
          occupancy,
          linkedOccupancy: index === adultSpaces - 1 && adultSpaces > 1 ? String(Math.max(adultSpaces, adultSpaces + room.childrenSpaces)) : undefined,
          baseRate,
          muted: adultSpaces > 1 && index < adultSpaces - 1
        };
      })
    };
  });
}

export function getChannelInventoryCellValue(
  room: ChannelInventoryRoom | undefined,
  plan: ChannelRatePlan | null | undefined,
  rowType: ChannelInventoryRowType,
  date: string,
  state: ChannelInventoryState
) {
  if (!room) return 0;
  const baseValue = rowType === "availability" ? room.availabilityByDate?.[date] ?? room.baseAvailability : plan?.baseRate ?? 0;

  return state.overrides.reduce((value, override) => {
    const matchesRoom = override.roomId === "all" || override.roomId === room.id;
    const matchesPlan = rowType === "availability" || override.ratePlanId === "all" || override.ratePlanId === plan?.id;
    const matchesRow = override.rowType === "both" || override.rowType === rowType;
    if (!matchesRoom || !matchesPlan || !matchesRow || !isoDateInRange(date, override.startDate, override.endDate)) return value;
    return applyChannelInventoryOverrideValue(value, override);
  }, baseValue);
}

export function buildChannelInventorySyncSummary(
  rooms: ChannelInventoryRoom[],
  state: ChannelInventoryState,
  fromDate: string,
  toDate: string
): ChannelInventorySyncSummary {
  const dates = buildIsoDateRange(fromDate, toDate);
  const sampleRows: ChannelInventorySyncRow[] = [];

  for (const room of rooms) {
    for (const date of dates) {
      if (sampleRows.length >= 12) break;
      sampleRows.push({
        roomId: room.id,
        roomName: room.name,
        date,
        availability: getChannelInventoryCellValue(room, null, "availability", date, state),
        rates: room.ratePlans.map((plan) => ({
          ratePlanId: plan.id,
          code: plan.code,
          occupancy: plan.occupancy,
          rate: getChannelInventoryCellValue(room, plan, "rate", date, state)
        })),
        restrictions: getInventoryRestrictionsForDate(date, state)
      });
    }
  }

  return {
    rooms: rooms.length,
    dates: dates.length,
    availabilityCells: rooms.length * dates.length,
    rateCells: rooms.reduce((total, room) => total + room.ratePlans.length, 0) * dates.length,
    overrides: state.overrides.length,
    activeRules: getActiveInventoryRules(state.rules),
    sampleRows
  };
}

export function parseDisplayDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isBookingInRange(booking: Pick<ChannelBookingSessionRecord, "checkIn" | "checkOut">, fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59`);
  const checkIn = parseDisplayDate(booking.checkIn);
  const checkOut = parseDisplayDate(booking.checkOut);

  if (!checkIn || !checkOut || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  return checkIn <= to && checkOut >= from;
}

export function makePulledBooking(index: number, channel: "Agoda" | "Expedia" | "Booking.com" = "Agoda"): ChannelBookingSessionRecord {
  const sourceCode = channel === "Expedia" ? "EXP" : channel === "Booking.com" ? "BCOM" : "AGO";
  const uniqueId = `${sourceCode}-PULL-${20260600 + index}`;
  const checkIn = new Date(2027, 0, 20 + index);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);

  return {
    id: uniqueId.toLowerCase(),
    status: "New",
    uniqueId,
    propertyName: property.name,
    customer: {
      name: ["Future Guest", "OTA Walk-in", "Channel Traveller"][index % 3],
      email: "N/A",
      phone: "N/A",
      language: "N/A",
      country: ["Sri Lanka", "India", "Australia"][index % 3],
      city: "N/A",
      address: "N/A",
      postalCode: "N/A"
    },
    source: channel,
    channel: `${channel} - Ronaka Airport Hotel`,
    reservationId: uniqueId,
    bookingId: `pulled-booking-${index}`,
    revisionId: `pulled-revision-${index}`,
    otaReservationId: `${20260600 + index}`,
    bookedAt: nowStamp(),
    checkIn: checkIn.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    checkOut: checkOut.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    arrivalTime: "N/A",
    nights: 1,
    roomsCount: 1,
    occupancy: "A: 2 C: 0 I: 0",
    roomName: "Deluxe Twin Room",
    total: 18.5 + index,
    acked: false,
    guarantee: "No credit card is supplied with this booking",
    notes: ["Pulled as an unacknowledged future reservation"],
    benefits: "Free WiFi",
    requests: "N/A",
    paymentCollect: "OTA collect",
    paymentMethod: "Bank Transfer",
    deposits: ""
  };
}

export const initialChannelBookings: ChannelBookingSessionRecord[] = [
  makeSeedBooking("AGO-2022816467", "Daniel Wijekoon", "Agoda", "Jan 25, 2027", "Jan 26, 2027", 13.21, "Australia", "61 416115110"),
  makeSeedBooking("EXP-2485088937", "Siva Kailasam", "Expedia", "Dec 17, 2026", "Dec 18, 2026", 29.17, "Malaysia", "+94 76 540 1111"),
  makeSeedBooking("EXP-2484252152", "AMIR KHAN", "Expedia", "Jun 14, 2026", "Jun 15, 2026", 17.74, "India", "+91 98 5555 5512"),
  makeSeedBooking("AGO-2022006013", "Kanavathipillai Sureshkumar", "Agoda", "Jun 13, 2026", "Jun 14, 2026", 15.85, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-668343359", "Kanavathipillai Sureshkumar", "Agoda", "Jun 12, 2026", "Jun 13, 2026", 13.65, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-667949019", "Kajeevan Jeganathan", "Agoda", "Jul 08, 2026", "Jul 09, 2026", 17.89, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-2021227812", "kommula nani", "Agoda", "Aug 12, 2026", "Aug 13, 2026", 13.21, "India", "N/A"),
  makeSeedBooking("AGO-2021079924", "Kandasamy Muraleetharan", "Agoda", "Jun 10, 2026", "Jun 11, 2026", 15.85, "Sri Lanka", "N/A"),
  makeSeedBooking("EXP-2480277744", "FNU HASSAM UR RIAZ", "Expedia", "Jun 11, 2026", "Jun 12, 2026", 17.74, "Pakistan", "N/A"),
  makeSeedBooking("AGO-1735588455", "Shahzaib Baloch", "Agoda", "Jul 01, 2026", "Jul 02, 2026", 13.21, "Pakistan", "N/A"),
  makeSeedBooking("EXP-2479394252", "Ragunathan Nirojan", "Expedia", "Jun 12, 2026", "Jun 13, 2026", 17.74, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-2020452841", "Thishanthan Rajendra", "Agoda", "Jun 08, 2026", "Jun 09, 2026", 15.85, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-2020336493", "Lokeesan Mahenthiran", "Agoda", "Jun 07, 2026", "Jun 08, 2026", 15.85, "Sri Lanka", "N/A"),
  makeSeedBooking("AGO-1735047435", "Urara Magosaki", "Agoda", "Jun 09, 2026", "Jun 10, 2026", 13.65, "Japan", "N/A"),
  makeSeedBooking("AGO-2020153204", "thishanthan rajendra", "Agoda", "Jun 07, 2026", "Jun 08, 2026", 15.85, "Sri Lanka", "N/A")
];

function getDefaultRoomRate(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("single")) return 27;
  if (normalized.includes("triple")) return 36;
  if (normalized.includes("family")) return 42;
  return 31;
}

function applyChannelInventoryOverrideValue(currentValue: number, override: Pick<ChannelInventoryOverride, "operation" | "unit" | "value">) {
  if (override.operation === "set") return normalizeChannelInventoryValue(override.value);
  const adjustment = override.unit === "percent" ? currentValue * (override.value / 100) : override.value;
  if (override.operation === "increase") return normalizeChannelInventoryValue(currentValue + adjustment);
  return normalizeChannelInventoryValue(Math.max(0, currentValue - adjustment));
}

function normalizeChannelInventoryValue(value: number) {
  return Math.round(value * 100) / 100;
}

function isoDateInRange(date: string, start: string, end: string) {
  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  return date >= normalizedStart && date <= normalizedEnd;
}

function buildIsoDateRange(start: string, end: string) {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to || from > to) return [];

  const dates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to && dates.length < 366) {
    dates.push(formatIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function parseIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isIsoWeekend(date: string) {
  const parsed = parseIsoDate(date);
  if (!parsed) return false;
  const day = parsed.getDay();
  return day === 0 || day === 6;
}

function getActiveInventoryRules(rules: ChannelAvailabilityRules) {
  const activeRules: string[] = [];
  if (rules.weekendStopSell) activeRules.push("Weekend stop sell");
  if (rules.closedToArrival) activeRules.push("Closed to arrival");
  if (rules.closedToDeparture) activeRules.push("Closed to departure");
  if (rules.minStay) activeRules.push(`Min stay ${rules.minStay}`);
  if (rules.maxStay) activeRules.push(`Max stay ${rules.maxStay}`);
  return activeRules;
}

function getInventoryRestrictionsForDate(date: string, state: ChannelInventoryState) {
  const restrictions: string[] = [];
  if (state.rules.weekendStopSell && isIsoWeekend(date)) restrictions.push("Stop Sell");
  if (state.rules.closedToArrival) restrictions.push("Closed To Arrival");
  if (state.rules.closedToDeparture) restrictions.push("Closed To Departure");
  if (state.rules.minStay) restrictions.push(`Min Stay ${state.rules.minStay}`);
  if (state.rules.maxStay) restrictions.push(`Max Stay ${state.rules.maxStay}`);

  for (const override of state.overrides) {
    if (!isoDateInRange(date, override.startDate, override.endDate)) continue;
    if (!["Only Availability", "Rate", "Rate And Availability"].includes(override.restriction)) {
      restrictions.push(override.restriction);
    }
  }

  return Array.from(new Set(restrictions));
}

function makeSeedBooking(uniqueId: string, customerName: string, source: "Agoda" | "Expedia" | "Booking.com", checkIn: string, checkOut: string, total: number, country: string, phone: string): ChannelBookingSessionRecord {
  const reservationNumber = uniqueId.split("-")[1] ?? uniqueId;
  return {
    id: uniqueId.toLowerCase(),
    status: "New",
    uniqueId,
    propertyName: property.name,
    customer: {
      name: customerName,
      email: "N/A",
      phone,
      language: "N/A",
      country,
      city: "N/A",
      address: "N/A",
      postalCode: "N/A"
    },
    source,
    channel: `${source} - Ronaka Airport Hotel`,
    reservationId: uniqueId,
    bookingId: "c8feb66c-99e-4ab6-9177-2cae11b84b2a",
    revisionId: "3a41925f-f6be-4e4f-816a-23de4c0073e2",
    otaReservationId: reservationNumber,
    bookedAt: "Mon, Jun 15, 2026",
    checkIn,
    checkOut,
    arrivalTime: "N/A",
    nights: 1,
    roomsCount: 1,
    occupancy: "A: 2 C: 0 I: 0",
    roomName: "Deluxe Twin Room",
    total,
    acked: true,
    guarantee: "No credit card is supplied with this booking",
    notes: ["Early Booking Saver. Price includes 10% discount!"],
    benefits: "Parking,Free WiFi",
    requests: "NonSmoke,LargeBed",
    paymentCollect: "OTA collect",
    paymentMethod: "Bank Transfer",
    deposits: ""
  };
}
