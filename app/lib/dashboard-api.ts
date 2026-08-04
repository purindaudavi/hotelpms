import { api, getApiErrorMessage } from "./api";

export type DashboardSeriesPoint = {
  month: string;
  revenue: number;
  room_nights: number;
  occupancy: number;
  adr: number;
  revpar: number;
};

export type DashboardSummary = {
  property_id: string;
  as_of: string;
  period: { date_from: string; date_to: string };
  currency: string;
  generated_at: string;
  overview: {
    arrivals: number;
    arrival_guests: number;
    departures: number;
    departure_rooms: number;
    occupied_rooms: number;
    total_rooms: number;
    sellable_rooms: number;
    occupancy: number;
    revenue: number;
    revenue_label: string;
  };
  occupancy_trend: Array<{ date: string; occupied_rooms: number; total_rooms: number; occupancy: number }>;
  monthly_occupancy: Array<{ month: string; occupied_room_nights: number; available_room_nights: number; occupancy: number }>;
  booking_sources: Array<{ label: string; room_nights: number }>;
  monthly_room_nights: Array<{ month: string; room_nights: number; cancelled: number; no_show: number }>;
  countries: Array<{ label: string; room_nights: number }>;
  analytics: {
    monthly_performance: DashboardSeriesPoint[];
    revenue_breakdown: Array<{ label: string; value: number }>;
    guest_demographics: Array<{ label: string; value: number }>;
  };
  travel_agents: {
    summary: { room_nights: number; cancelled: number; no_show: number; new_bookings: number };
    agents: Array<{ label: string; room_nights: number; cancelled: number; no_show: number; new_bookings: number }>;
    meal_plans: Array<{ label: string; room_nights: number }>;
  };
};

type DashboardResponse = { dashboard: DashboardSummary };

export async function getDashboardSummary(propertyId: string, asOf: string, currency: string) {
  const response = await api.get<DashboardResponse>("/reports/dashboard", {
    params: { property_id: propertyId, as_of: asOf, currency }
  });
  return response.data.dashboard;
}

export function getDashboardApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Dashboard data could not be loaded from MongoDB.");
}
