import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

export type NightAuditSeverity = "blocker" | "warning";
export type NightAuditStepStatus = "ready" | "disabled" | "blocked" | "warning" | "reviewed_with_warnings" | "done";

export type NightAuditException = {
  id: string;
  label: string;
  detail: string;
  severity: NightAuditSeverity;
  resolved: boolean;
};

export type NightAuditStep = {
  id: string;
  title: string;
  description: string;
  metric: string;
  required: boolean;
  disabled: boolean;
  exceptions: NightAuditException[];
  status: NightAuditStepStatus;
};

export type NightAuditReservationReference = {
  reservation_id: string;
  reservation_no: string;
  guest_name: string;
  status: string;
  check_in: string;
  check_out: string;
};

export type NightAuditOpenBalance = {
  reservation_id: string;
  reservation_no: string;
  guest_name: string;
  currency: string;
  balance: number;
};

export type NightAuditRoomReference = {
  id: string;
  room_number: string;
  room_type: string;
  operational_status: string;
  housekeeping_status: string;
};

export type NightAuditSnapshot = {
  business_date: string;
  currency: string;
  occupied_rooms: number;
  available_rooms: number;
  total_active_rooms: number;
  due_arrivals: NightAuditReservationReference[];
  overdue_arrivals: NightAuditReservationReference[];
  due_departures: NightAuditReservationReference[];
  in_house: NightAuditReservationReference[];
  estimated_room_revenue: number;
  revenue_posted: boolean;
  revenue_posted_amount: number;
  revenue_transaction_id: string;
  transaction_count: number;
  transaction_total: number;
  deposit_total: number;
  open_balance_total: number;
  open_balances: NightAuditOpenBalance[];
  dirty_rooms: NightAuditRoomReference[];
  out_of_order_rooms: NightAuditRoomReference[];
  channel_manager: {
    connected: boolean;
    requested_active: boolean;
    configured_property_id: string;
  };
};

export type NightAuditReportReference = {
  report_type: string;
  title: string;
  report_run_id: string;
  generated_at: string;
};

export type NightAuditActor = {
  user_id?: string;
  name?: string;
  email?: string;
};

export type FinanceAuditReview = {
  version: number;
  finance_review_status: "pending_review" | "reviewed" | "flagged";
  finance_review_note: string;
  finance_reviewed_by?: NightAuditActor;
  finance_reviewed_at?: string;
  finance_review_history: Array<{ status: "reviewed" | "flagged"; note: string; actor: NightAuditActor; at: string }>;
};
export type NightAudit = FinanceAuditReview & {
  _id: string;
  property_id: string;
  business_date: string;
  status: "open" | "closed";
  currency: string;
  reviewed_step_ids: string[];
  overrides: Array<{
    _id: string;
    step_id: string;
    exception_id: string;
    reason: string;
    approved_by: NightAuditActor;
    approved_at: string;
  }>;
  revenue_posted_at?: string;
  revenue_posted_amount: number;
  revenue_transaction_id: string;
  reports_generated_at?: string;
  reports: NightAuditReportReference[];
  close_note: string;
  close_summary?: NightAuditSnapshot;
  closed_at?: string;
  closed_by?: NightAuditActor;
  next_business_date: string;
  snapshot: NightAuditSnapshot;
  steps: NightAuditStep[];
  can_complete: boolean;
  blockers: Array<NightAuditException & { step_id: string }>;
};

export type NightAuditHistoryRecord = FinanceAuditReview & {
  _id: string;
  property_id: string;
  business_date: string;
  status: "closed";
  currency: string;
  revenue_posted_amount: number;
  reports: NightAuditReportReference[];
  close_note: string;
  close_summary?: NightAuditSnapshot;
  closed_at?: string;
  closed_by?: NightAuditActor;
  next_business_date: string;
};

type CurrentResponse = { night_audit: NightAudit };
type HistoryResponse = { count: number; night_audits: NightAuditHistoryRecord[] };

export async function getCurrentNightAudit(propertyId: string) {
  const response = await api.get<CurrentResponse>("/night-audit/current", {
    params: { property_id: propertyId }
  });
  return response.data.night_audit;
}

export async function getNightAuditHistory(propertyId: string, limit = 100) {
  const response = await api.get<HistoryResponse>("/night-audit/history", {
    params: { property_id: propertyId, limit }
  });
  return response.data.night_audits;
}

export async function reviewNightAuditStep(propertyId: string, stepId: string, auditId: string) {
  return currentFromPost("/night-audit/current/review", propertyId, auditId, { step_id: stepId });
}

export async function overrideNightAuditExceptions(
  propertyId: string,
  stepId: string,
  exceptionIds: string[],
  reason: string,
  auditId: string
) {
  return currentFromPost("/night-audit/current/override", propertyId, auditId, {
    step_id: stepId,
    exception_ids: exceptionIds,
    reason
  });
}

export async function postNightAuditRoomRevenue(propertyId: string, auditId: string) {
  return currentFromPost("/night-audit/current/post-room-revenue", propertyId, auditId);
}

export async function reviewNightAuditHousekeeping(propertyId: string, auditId: string) {
  return currentFromPost("/night-audit/current/review-housekeeping", propertyId, auditId);
}

export async function reviewNightAuditChannels(propertyId: string, auditId: string) {
  return currentFromPost("/night-audit/current/review-channels", propertyId, auditId);
}

export async function generateNightAuditReports(propertyId: string, auditId: string) {
  return currentFromPost("/night-audit/current/generate-reports", propertyId, auditId);
}

export async function saveNightAuditNote(propertyId: string, closeNote: string, auditId: string) {
  const response = await api.patch<CurrentResponse>(
    "/night-audit/current/notes",
    { property_id: propertyId, close_note: closeNote, audit_id: auditId },
    { headers: actorHeaders() }
  );
  return response.data.night_audit;
}

export async function completeNightAudit(propertyId: string, closeNote: string, auditId: string) {
  const response = await api.post<{
    message: string;
    night_audit: NightAuditHistoryRecord;
    next_business_date: string;
  }>(
    "/night-audit/current/complete",
    { property_id: propertyId, close_note: closeNote, audit_id: auditId },
    { headers: actorHeaders() }
  );
  return response.data;
}

export function getNightAuditApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The Night Audit request could not be completed.");
}

async function currentFromPost(path: string, propertyId: string, auditId: string, body: Record<string, unknown> = {}) {
  const response = await api.post<CurrentResponse>(
    path,
    { property_id: propertyId, audit_id: auditId, ...body },
    { headers: actorHeaders() }
  );
  return response.data.night_audit;
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}

export async function getNightAudit(propertyId: string, auditId: string) {
  return (await api.get<CurrentResponse>(`/night-audit/${encodeURIComponent(auditId)}`, { params: { property_id: propertyId } })).data.night_audit;
}
export async function reviewClosedNightAudit(propertyId: string, auditId: string, status: "reviewed" | "flagged", note: string, version: number) {
  return (await api.post<CurrentResponse>(`/night-audit/${encodeURIComponent(auditId)}/finance-review`, { property_id: propertyId, status, note, version })).data.night_audit;
}
