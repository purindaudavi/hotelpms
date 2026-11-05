import { api } from "./api";
import { loadCurrentSessionUser } from "./current-user";

export type PropertyRole = "owner" | "administrator" | "member" | "front_desk" | "housekeeping" | "finance";
export type StaffRole = Exclude<PropertyRole, "owner">;
export function propertyRoleLabel(role: PropertyRole | "demo" | null) {
  return role === "owner" ? "Owner" : role === "administrator" ? "Administrator" : role === "front_desk" ? "Front Desk" : role === "housekeeping" ? "Housekeeping" : role === "finance" ? "Finance" : role === "member" ? "General member" : role === "demo" ? "Demo viewer" : "";
}

export type PropertySummary = {
  property_id: string; hotel_name: string; city: string; country_code: string;
  home_currency: string; role: PropertyRole; permissions: string[];
};
export type PropertyMember = { id: string; name: string; email: string; role: PropertyRole; attendant_id?: string; run_night_audit?: boolean };
export type AttendantOption = { _id: string; name: string; employee_number: string; status: "active" | "inactive" };
export async function listAttendantsForAccess(propertyId: string) {
  return (await api.get<{ attendants: AttendantOption[] }>("/housekeeping/attendants", { params: { property_id: propertyId } })).data.attendants;
}

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

export async function addPropertyMember(propertyId: string, email: string, role: StaffRole = "member", attendantId?: string) {
  await api.post(`/properties/${encodeURIComponent(propertyId)}/access`, { email, role, ...(attendantId ? { attendant_id: attendantId } : {}) });
}

export async function updatePropertyMemberRole(propertyId: string, userId: string, role: StaffRole, attendantId?: string) {
  await api.patch(`/properties/${encodeURIComponent(propertyId)}/access/${encodeURIComponent(userId)}`, { role, ...(attendantId ? { attendant_id: attendantId } : {}) });
}

export async function removePropertyMember(propertyId: string, userId: string) {
  await api.delete(`/properties/${encodeURIComponent(propertyId)}/access/${encodeURIComponent(userId)}`);
}

export async function updateNightAuditPermission(propertyId: string, userId: string, enabled: boolean) {
  await api.patch(`/properties/${encodeURIComponent(propertyId)}/access/${encodeURIComponent(userId)}/night-audit`, { enabled });
}
