import type { Reservation } from "@/app/data/pms-data";
import type { TravelAgent } from "@/app/components/modules/reservation/types";

export type TravelAgentPerformance = TravelAgent & {
  commissionAmount: number;
  netRevenue: number;
};

const performanceStatuses = new Set(["Confirmed", "Checked-in", "Checked-out"]);

export function travelAgentStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:reservation:travel-agents`;
}

export function isTravelAgentArray(value: unknown): value is TravelAgent[] {
  return Array.isArray(value) && value.every((agent) =>
    Boolean(agent) &&
    typeof agent === "object" &&
    typeof (agent as TravelAgent).id === "string" &&
    typeof (agent as TravelAgent).name === "string" &&
    typeof (agent as TravelAgent).code === "string" &&
    typeof (agent as TravelAgent).commission === "number"
  );
}

function normalizedName(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function reservationBelongsToAgent(reservation: Reservation, agent: TravelAgent) {
  if (reservation.travelAgentId) return reservation.travelAgentId === agent.id;

  const agentName = normalizedName(agent.name);
  return normalizedName(reservation.travelAgentName) === agentName ||
    normalizedName(reservation.bookingSource ?? reservation.source) === agentName;
}

function reservationRoomNights(reservation: Reservation) {
  if (reservation.isDayRoom || reservation.checkOut <= reservation.checkIn) return 0;
  const checkIn = new Date(`${reservation.checkIn}T00:00:00Z`).getTime();
  const checkOut = new Date(`${reservation.checkOut}T00:00:00Z`).getTime();
  const nights = Math.max(Math.round((checkOut - checkIn) / 86_400_000), 0);
  const rooms = reservation.reservationRooms?.length || reservation.rooms || 0;
  return rooms * nights;
}

export function calculateTravelAgentPerformance(agent: TravelAgent, reservations: Reservation[]): TravelAgentPerformance {
  const qualifyingReservations = reservations.filter((reservation) =>
    performanceStatuses.has(reservation.status) && reservationBelongsToAgent(reservation, agent)
  );

  const revenue = qualifyingReservations.reduce((sum, reservation) => sum + Number(reservation.total || 0), 0);
  const roomNights = qualifyingReservations.reduce((sum, reservation) => sum + reservationRoomNights(reservation), 0);
  const commissionAmount = qualifyingReservations.reduce((sum, reservation) => {
    const commissionRate = reservation.travelAgentId
      ? Number(reservation.travelAgentCommission ?? agent.commission)
      : agent.commission;
    return sum + Number(reservation.total || 0) * commissionRate / 100;
  }, 0);

  return {
    ...agent,
    revenue,
    reservations: qualifyingReservations.length,
    roomNights,
    averageDailyRate: roomNights > 0 ? revenue / roomNights : 0,
    commissionAmount,
    netRevenue: revenue - commissionAmount
  };
}
