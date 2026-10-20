import { api } from "./api";
import { loadCurrentSessionUser } from "./current-user";

export type PropertySummary = {
  property_id: string; hotel_name: string; city: string; country_code: string;
  home_currency: string; role: "owner" | "member";
};
export type PropertyMember = { id: string; name: string; email: string; role: "owner" | "member" };

export async function listProperties() {
  return (await api.get<{ properties: PropertySummary[] }>("/properties")).data.properties;
}

export function rememberProperty(propertyId: string) {
  const user = loadCurrentSessionUser();
  if (user.mode !== "demo") localStorage.setItem(`staypilot:last-property:${user.id}`, propertyId);
}

export async function workspaceDestination() {
  const user = loadCurrentSessionUser();
  if (user.mode === "demo") return "/properties/demo/dashboard";
  const properties = await listProperties();
  const last = localStorage.getItem(`staypilot:last-property:${user.id}`);
  const selected = properties.find((property) => property.property_id === last) || properties[0];
  return selected ? `/properties/${encodeURIComponent(selected.property_id)}/dashboard` : "/properties";
}

export async function getPropertyMembers(propertyId: string) {
  return (await api.get<{ members: PropertyMember[] }>(`/properties/${encodeURIComponent(propertyId)}/access`)).data.members;
}

export async function addPropertyMember(propertyId: string, email: string) {
  await api.post(`/properties/${encodeURIComponent(propertyId)}/access`, { email });
}

export async function removePropertyMember(propertyId: string, userId: string) {
  await api.delete(`/properties/${encodeURIComponent(propertyId)}/access/${encodeURIComponent(userId)}`);
}
