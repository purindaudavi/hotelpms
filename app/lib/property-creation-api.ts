import { api } from "./api";
export type PropertyCreationRequest = {
  _id: string; request_code: string; requester_id: string; account_name: string; account_email: string;
  contact_name: string; contact_phone: string; business_name: string; requested_limit: number; reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled"; approved_limit?: number; previous_limit?: number;
  review_note: string; reviewed_at?: string | null; reviewed_by?: {name?: string}; created_at: string;
  access?: PropertyCreationAccess | null;
};
export type PropertyCreationAccess = { approved_limit: number; owned_count: number; remaining: number; can_create: boolean; can_review: boolean };
export type PropertyCreationOverview = PropertyCreationAccess & { account: {name:string;email:string;mobile:string};requests:PropertyCreationRequest[] };
export async function getPropertyCreationAccess() { return (await api.get<PropertyCreationOverview>("/property-creation")).data; }
export async function submitPropertyCreationRequest(input: {contact_name:string;contact_phone:string;business_name:string;requested_limit:number;reason:string}) { return (await api.post<{request:PropertyCreationRequest}>("/property-creation/requests",input)).data.request; }
export async function cancelPropertyCreationRequest(id:string) { await api.post(`/property-creation/requests/${encodeURIComponent(id)}/cancel`); }
export async function getPropertyRequestQueue(status:string) { return (await api.get<{requests:PropertyCreationRequest[]}>("/property-creation/review",{params:{status}})).data.requests; }
export async function decidePropertyRequest(id:string,input:{decision:"approve"|"reject";approved_limit?:number;note:string}) { await api.post(`/property-creation/review/${encodeURIComponent(id)}/decision`,input); }
