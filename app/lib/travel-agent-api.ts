import type { TravelAgent } from "@/app/components/modules/reservation/types";
import type { TravelAgentPerformance } from "./travel-agent-repository";
import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

type ApiTravelAgent = {
  _id: string;
  name: string;
  code: string;
  contact_person?: string;
  agent_type: string;
  email?: string;
  phone?: string;
  commission_percentage: number;
  address?: string;
  vat_number?: string;
  status: "active" | "inactive";
  version?: number;
};

type AgentResponse = { travel_agent: ApiTravelAgent };
type AgentListResponse = { travel_agents: ApiTravelAgent[] };
type PerformanceResponse = {
  reservation_count: number;
  room_nights: number;
  totals_by_currency: Array<{
    currency: string;
    gross_revenue: number;
    commission: number;
    net_revenue: number;
  }>;
};

export async function getTravelAgents(
  propertyId: string,
  options: { activeOnly?: boolean; search?: string } = {}
) {
  const response = await api.get<AgentListResponse>("/travel-agents", {
    params: {
      property_id: propertyId,
      ...(options.activeOnly ? { active: true } : {}),
      ...(options.search ? { search: options.search } : {})
    }
  });
  return response.data.travel_agents.map(mapTravelAgent);
}

export async function createTravelAgent(propertyId: string, agent: TravelAgent) {
  const response = await api.post<AgentResponse>(
    "/travel-agents",
    { property_id: propertyId, ...agentPayload(agent) },
    { headers: actorHeaders() }
  );
  return mapTravelAgent(response.data.travel_agent);
}

export async function updateTravelAgent(propertyId: string, agent: TravelAgent) {
  const response = await api.patch<AgentResponse>(
    `/travel-agents/${agent.id}`,
    { ...agentPayload(agent), version: agent.version },
    { params: { property_id: propertyId }, headers: actorHeaders() }
  );
  return mapTravelAgent(response.data.travel_agent);
}

export async function getTravelAgentPerformance(
  propertyId: string,
  agent: TravelAgent
): Promise<TravelAgentPerformance> {
  const response = await api.get<PerformanceResponse>(
    `/travel-agents/${agent.id}/performance`,
    { params: { property_id: propertyId } }
  );
  const totals = response.data.totals_by_currency;
  const primary = totals.reduce<(typeof totals)[number] | undefined>(
    (largest, current) => !largest || current.gross_revenue > largest.gross_revenue ? current : largest,
    undefined
  );
  const revenue = Number(primary?.gross_revenue ?? 0);
  const roomNights = Number(response.data.room_nights ?? 0);
  return {
    ...agent,
    currency: primary?.currency ?? agent.currency,
    revenue,
    reservations: Number(response.data.reservation_count ?? 0),
    roomNights,
    averageDailyRate: roomNights > 0 ? revenue / roomNights : 0,
    commissionAmount: Number(primary?.commission ?? 0),
    netRevenue: Number(primary?.net_revenue ?? revenue)
  };
}

export function getTravelAgentApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The travel-agent request could not be completed.");
}

function mapTravelAgent(value: ApiTravelAgent): TravelAgent {
  return {
    id: value._id,
    name: value.name,
    contactPerson: value.contact_person || "",
    agentType: agentTypeFromApi(value.agent_type),
    nameType: "Customer",
    email: value.email || "",
    phone: value.phone || "",
    code: value.code,
    status: value.status === "inactive" ? "Inactive" : "Active",
    commission: Number(value.commission_percentage || 0),
    address: value.address || "",
    vatNo: value.vat_number || "",
    currency: "LKR",
    revenue: 0,
    reservations: 0,
    roomNights: 0,
    averageDailyRate: 0,
    version: value.version
  };
}

function agentPayload(agent: TravelAgent) {
  return {
    name: agent.name,
    code: agent.code,
    contact_person: agent.contactPerson,
    agent_type: agentTypeToApi(agent.agentType),
    email: agent.email,
    phone: agent.phone,
    commission_percentage: agent.commission,
    address: agent.address,
    vat_number: agent.vatNo,
    status: agent.status.toLowerCase()
  };
}

function agentTypeFromApi(value: string) {
  const labels: Record<string, string> = {
    online_travel_agent: "Online Travel Agent",
    traditional_agent: "Traditional Agent",
    corporate: "Corporate",
    tour_operator: "Tour Operator"
  };
  return labels[value] ?? value;
}

function agentTypeToApi(value: string) {
  const values: Record<string, string> = {
    "Online Travel Agent": "online_travel_agent",
    "Traditional Agent": "traditional_agent",
    Corporate: "corporate",
    "Tour Operator": "tour_operator"
  };
  return values[value] ?? value.toLowerCase().replace(/[\s-]+/g, "_");
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
