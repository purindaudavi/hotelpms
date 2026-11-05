import { api } from "./api";

export type DeletionProperty = { property_id: string; hotel_name: string; status: "active" | "inactive"; version: number };
export type PropertyDeletionRequest = {
  _id: string; request_code: string; property_id: string; property_name: string;
  requester_id: string; requested_by: { name: string; email: string }; requester_role: "owner" | "administrator";
  contact_phone: string; reason: string; status: "pending" | "approved" | "rejected" | "cancelled";
  version: number; created_at: string; reviewed_at?: string | null; review_note: string;
  reviewed_by?: { name?: string }; current_property?: DeletionProperty | null;
};
export type DeletionContext = {
  property: DeletionProperty; role: "owner" | "administrator";
  account: { name: string; email: string; mobile: string };
  pending: { request_code: string; requested_by: string; created_at: string } | null;
};
export async function getDeletionContext(propertyId: string) {
  return (await api.get<DeletionContext>(`/property-deletion/properties/${encodeURIComponent(propertyId)}`)).data;
}
export async function submitPropertyDeletion(propertyId: string, input: { version: number; confirm_name: string; contact_phone: string; reason: string }) {
  return (await api.post<{ message: string; request: PropertyDeletionRequest }>(`/property-deletion/properties/${encodeURIComponent(propertyId)}/requests`, input)).data;
}
export async function listPropertyDeletions(review: boolean, status: string) {
  return (await api.get<{ requests: PropertyDeletionRequest[] }>(review ? "/property-deletion/review" : "/property-deletion", { params: review ? { status } : {} })).data.requests;
}
export async function cancelPropertyDeletion(request: PropertyDeletionRequest) {
  return (await api.post<{ message: string }>(`/property-deletion/requests/${encodeURIComponent(request._id)}/cancel`, { version: request.version })).data;
}
export async function reviewPropertyDeletion(request: PropertyDeletionRequest, input: { decision: "approve" | "reject"; note: string; confirm_name: string }) {
  return (await api.post<{ message: string }>(`/property-deletion/review/${encodeURIComponent(request._id)}/decision`, {
    ...input, version: request.version, property_version: request.current_property?.version
  })).data;
}
