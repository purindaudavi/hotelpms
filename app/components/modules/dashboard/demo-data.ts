import type { DashboardDateRange, DashboardSummary } from "@/app/lib/dashboard-api";

export function createDemoDashboardSummary(asOf: string, selectedPeriod?: DashboardDateRange): DashboardSummary {
  const currentMonth = asOf.slice(0, 7);
  const period = selectedPeriod ?? { date_from: `${currentMonth}-01`, date_to: endOfMonth(currentMonth) };
  const selectedDays = daysInclusive(period.date_from, period.date_to);
  const monthDays = daysInclusive(`${currentMonth}-01`, endOfMonth(currentMonth));
  const scale = selectedPeriod ? selectedDays / monthDays : 1;
  const sourceData = scaleRoomNights([
    { label: "Direct", room_nights: 18 },
    { label: "Agoda", room_nights: 14 },
    { label: "Expedia", room_nights: 7 }
  ], scale);
  const countryData = scaleRoomNights([
    { label: "Sri Lanka", room_nights: 24 },
    { label: "India", room_nights: 8 },
    { label: "United Kingdom", room_nights: 4 },
    { label: "Australia", room_nights: 3 }
  ], scale);
  return {
    property_id: "demo",
    as_of: asOf,
    period,
    currency: "LKR",
    generated_at: new Date().toISOString(),
    room_statuses: [
      { status: "available", count: 5 },
      { status: "occupied", count: 9 },
      { status: "out_of_order", count: 0 },
      { status: "maintenance", count: 0 }
    ],
    overview: {
      arrivals: 4,
      arrival_guests: 7,
      departures: 3,
      departure_rooms: 3,
      occupied_rooms: 9,
      total_rooms: 14,
      sellable_rooms: 14,
      occupancy: 64.3,
      revenue: 186500,
      revenue_label: "Demo monthly revenue"
    },
    occupancy_trend: selectedPeriod
      ? Array.from({ length: selectedDays }, (_, index) => {
        const occupancy = [38, 42, 31, 47, 56, 61, 64.3][index % 7];
        return { date: shiftDate(period.date_from, index), occupancy, occupied_rooms: Math.round(occupancy * 14 / 100), total_rooms: 14 };
      })
      : [38, 42, 31, 47, 56, 61, 64.3].map((occupancy, index) => ({
        date: shiftDate(asOf, index - 6), occupancy, occupied_rooms: Math.round(occupancy * 14 / 100), total_rooms: 14
      })),
    monthly_occupancy: [
      { month: currentMonth, occupied_room_nights: 270, available_room_nights: 434, occupancy: 62.2 },
      { month: nextMonth(currentMonth), occupied_room_nights: 198, available_room_nights: 420, occupancy: 47.1 }
    ],
    booking_sources: sourceData,
    monthly_room_nights: [
      { month: previousMonth(currentMonth), room_nights: 23, cancelled: 2, no_show: 1 },
      { month: currentMonth, room_nights: 39, cancelled: 1, no_show: 0 }
    ].filter((item) => !selectedPeriod || (item.month >= period.date_from.slice(0, 7) && item.month <= period.date_to.slice(0, 7))),
    countries: countryData,
    analytics: {
      monthly_performance: [52000, 68000, 74000, 92000, 131000, 186500].map((revenue, index) => ({
        month: monthOffset(currentMonth, index - 5), revenue, room_nights: 20 + index * 4,
        occupancy: 35 + index * 5.8, adr: 6500 + index * 250, revpar: 2600 + index * 410
      })),
      revenue_breakdown: [
        { label: "room_revenue", value: 160000 },
        { label: "tax", value: 16500 },
        { label: "extras", value: 10000 },
        { label: "discounts", value: 0 }
      ],
      guest_demographics: [
        { label: "Direct", value: 12 },
        { label: "Travel Agent", value: 8 },
        { label: "Group", value: 4 }
      ]
    },
    travel_agents: {
      summary: { room_nights: 21, cancelled: 1, no_show: 0, new_bookings: 12 },
      agents: [
        { label: "Agoda", room_nights: 14, cancelled: 1, no_show: 0, new_bookings: 8 },
        { label: "Expedia", room_nights: 7, cancelled: 0, no_show: 0, new_bookings: 4 }
      ],
      meal_plans: [
        { label: "Room Only", room_nights: 12 },
        { label: "Bed & Breakfast", room_nights: 9 }
      ]
    }
  };
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextMonth(value: string) { return monthOffset(value, 1); }
function previousMonth(value: string) { return monthOffset(value, -1); }
function endOfMonth(value: string) {
  const next = new Date(`${nextMonth(value)}-01T00:00:00Z`);
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}
function monthOffset(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function daysInclusive(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function scaleRoomNights(items: Array<{ label: string; room_nights: number }>, scale: number) {
  return items
    .map((item) => ({ ...item, room_nights: Math.round(item.room_nights * scale) }))
    .filter((item) => item.room_nights > 0);
}
