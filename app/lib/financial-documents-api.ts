import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "credited"
  | "voided";

export type CreditNoteStatus = "draft" | "issued" | "voided";
export type RefundStatus = "pending" | "completed" | "voided";
export type RefundMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "online" | "other";

export type InvoiceLine = {
  _id: string;
  source_type: string;
  source_id?: string;
  service_date: string;
  description: string;
  room_number?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
};

export type CreditLine = {
  _id: string;
  invoice_line_id?: string;
  category: string;
  description: string;
  room_number?: string;
  quantity: number;
  unit_amount: number;
  tax_amount: number;
  net_amount: number;
  total_amount: number;
};

export type BillingSnapshot = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  tax_number?: string;
};

export type FinancialActor = {
  user_id?: string;
  name?: string;
  email?: string;
};

export type Invoice = {
  _id: string;
  property_id: string;
  invoice_no: string;
  reference_number?: string;
  reservation_id: string;
  reservation_no: string;
  guest_id: string;
  billing_type: "guest" | "company" | "travel_agent";
  billing_snapshot: BillingSnapshot;
  stay_snapshot: {
    check_in: string;
    check_out: string;
    nights: number;
    is_day_room: boolean;
    room_numbers: string[];
  };
  invoice_date: string;
  due_date: string;
  currency: string;
  line_items: InvoiceLine[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  credited_amount: number;
  balance_due: number;
  refund_due: number;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  created_by?: FinancialActor;
  created_at: string;
  updated_at: string;
  version?: number;
};

export type CreditNote = {
  _id: string;
  property_id: string;
  credit_note_no: string;
  invoice_id: string;
  invoice_no: string;
  reservation_id: string;
  reservation_no: string;
  guest_id: string;
  guest_snapshot: BillingSnapshot;
  credit_date: string;
  currency: string;
  reason_code: string;
  reason: string;
  line_items: CreditLine[];
  subtotal: number;
  tax_total: number;
  total_credit: number;
  status: CreditNoteStatus;
  notes?: string;
  created_by?: FinancialActor;
  created_at: string;
  updated_at: string;
  version?: number;
};

export type InvoicePayment = {
  _id: string;
  invoice_id?: string;
  invoice_no?: string;
  reservation_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference?: string;
  status: "posted" | "voided" | "refunded";
  posted_at: string;
  posted_by?: FinancialActor;
  notes?: string;
};

export type Refund = {
  _id: string;
  property_id: string;
  refund_no: string;
  invoice_id: string;
  invoice_no: string;
  payment_id: string;
  reservation_id: string;
  reservation_no: string;
  guest_id: string;
  amount: number;
  currency: string;
  refund_method: RefundMethod;
  reference_number?: string;
  reason: string;
  status: RefundStatus;
  notes?: string;
  requested_at: string;
  requested_by?: FinancialActor;
  completed_at?: string;
  completed_by?: FinancialActor;
  voided_at?: string;
  voided_by?: FinancialActor;
  void_reason?: string;
  created_at: string;
  updated_at: string;
  version?: number;
};

export type FinancialLog = {
  _id: string;
  action: string;
  description: string;
  actor?: FinancialActor;
  created_at: string;
};

type InvoiceListResponse = {
  invoices: Invoice[];
  count: number;
  total: number;
  page: number;
  pages: number;
};

type CreditListResponse = {
  credits: CreditNote[];
  count: number;
  total: number;
  page: number;
  pages: number;
};

type RefundListResponse = {
  refunds: Refund[];
  count: number;
  total: number;
  page: number;
  pages: number;
};

export type InvoiceDetails = {
  invoice: Invoice;
  payments: InvoicePayment[];
  credits: CreditNote[];
  refunds: Refund[];
  logs: FinancialLog[];
};

export type CreditNoteDetails = {
  credit: CreditNote;
  invoice: Invoice | null;
  logs: FinancialLog[];
};

export type RefundDetails = {
  refund: Refund;
  invoice: Invoice | null;
  payment: InvoicePayment | null;
  logs: FinancialLog[];
};

export type InvoiceFilters = {
  status?: InvoiceStatus | "all";
  search?: string;
  reservationId?: string;
  page?: number;
  limit?: number;
};

export type CreditFilters = {
  status?: CreditNoteStatus | "all";
  search?: string;
  invoiceId?: string;
  page?: number;
  limit?: number;
};

export type RefundFilters = {
  status?: RefundStatus | "all";
  search?: string;
  invoiceId?: string;
  reservationId?: string;
  page?: number;
  limit?: number;
};

export async function listInvoices(propertyId: string, filters: InvoiceFilters = {}) {
  const response = await api.get<InvoiceListResponse>("/invoices", {
    params: {
      property_id: propertyId,
      status: filters.status,
      search: filters.search,
      reservation_id: filters.reservationId,
      page: filters.page,
      limit: filters.limit
    }
  });
  return response.data;
}

export async function getInvoice(propertyId: string, invoiceId: string) {
  const response = await api.get<InvoiceDetails>(`/invoices/${invoiceId}`, {
    params: { property_id: propertyId }
  });
  return response.data;
}

export async function createInvoice(
  propertyId: string,
  reservationId: string,
  options: { dueDate?: string; notes?: string; terms?: string } = {}
) {
  const response = await api.post<{ invoice: Invoice }>(
    "/invoices",
    {
      property_id: propertyId,
      reservation_id: reservationId,
      ...(options.dueDate ? { due_date: options.dueDate } : {}),
      ...(options.notes ? { notes: options.notes } : {}),
      ...(options.terms ? { terms: options.terms } : {})
    },
    { headers: actorHeaders() }
  );
  return response.data.invoice;
}

export async function issueInvoice(propertyId: string, invoiceId: string) {
  const response = await api.post<{ invoice: Invoice }>(
    `/invoices/${invoiceId}/issue`,
    { property_id: propertyId },
    { headers: actorHeaders() }
  );
  return response.data.invoice;
}

export async function voidInvoice(propertyId: string, invoiceId: string, reason: string) {
  const response = await api.post<{ invoice: Invoice }>(
    `/invoices/${invoiceId}/void`,
    { property_id: propertyId, reason },
    { headers: actorHeaders() }
  );
  return response.data.invoice;
}

export async function postInvoicePayment(
  propertyId: string,
  invoiceId: string,
  payment: { amount: number; paymentMethod: string; paymentReference?: string; notes?: string }
) {
  const response = await api.post<{ invoice: Invoice; payment: InvoicePayment }>(
    `/invoices/${invoiceId}/payments`,
    {
      property_id: propertyId,
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      payment_reference: payment.paymentReference,
      notes: payment.notes
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function voidInvoicePayment(
  propertyId: string,
  invoiceId: string,
  paymentId: string,
  reason: string
) {
  const response = await api.post<{ invoice: Invoice; payment: InvoicePayment }>(
    `/invoices/${invoiceId}/payments/${paymentId}/void`,
    { property_id: propertyId, reason },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function listCreditNotes(propertyId: string, filters: CreditFilters = {}) {
  const response = await api.get<CreditListResponse>("/credits", {
    params: {
      property_id: propertyId,
      status: filters.status,
      search: filters.search,
      invoice_id: filters.invoiceId,
      page: filters.page,
      limit: filters.limit
    }
  });
  return response.data;
}

export async function getCreditNote(propertyId: string, creditId: string) {
  const response = await api.get<CreditNoteDetails>(`/credits/${creditId}`, {
    params: { property_id: propertyId }
  });
  return response.data;
}

export async function createCreditNote(
  propertyId: string,
  input: {
    invoiceId: string;
    reasonCode: string;
    reason: string;
    invoiceLineId?: string;
    category: string;
    description: string;
    quantity: number;
    unitAmount: number;
    taxAmount?: number;
  }
) {
  const response = await api.post<{ credit: CreditNote; invoice: Invoice }>(
    "/credits",
    {
      property_id: propertyId,
      invoice_id: input.invoiceId,
      reason_code: input.reasonCode,
      reason: input.reason,
      line_items: [{
        ...(input.invoiceLineId ? { invoice_line_id: input.invoiceLineId } : {}),
        category: input.category,
        description: input.description,
        quantity: input.quantity,
        unit_amount: input.unitAmount,
        tax_amount: input.taxAmount ?? 0
      }]
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function issueCreditNote(propertyId: string, creditId: string) {
  const response = await api.post<{ credit: CreditNote; invoice: Invoice }>(
    `/credits/${creditId}/issue`,
    { property_id: propertyId },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function voidCreditNote(propertyId: string, creditId: string, reason: string) {
  const response = await api.post<{ credit: CreditNote; invoice: Invoice }>(
    `/credits/${creditId}/void`,
    { property_id: propertyId, reason },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function listRefunds(propertyId: string, filters: RefundFilters = {}) {
  const response = await api.get<RefundListResponse>("/refunds", {
    params: {
      property_id: propertyId,
      status: filters.status,
      search: filters.search,
      invoice_id: filters.invoiceId,
      reservation_id: filters.reservationId,
      page: filters.page,
      limit: filters.limit
    }
  });
  return response.data;
}

export async function getRefund(propertyId: string, refundId: string) {
  const response = await api.get<RefundDetails>(`/refunds/${refundId}`, {
    params: { property_id: propertyId }
  });
  return response.data;
}

export async function createRefund(
  propertyId: string,
  input: {
    invoiceId: string;
    paymentId: string;
    amount: number;
    refundMethod: RefundMethod;
    referenceNumber?: string;
    reason: string;
    notes?: string;
  }
) {
  const response = await api.post<{ refund: Refund; invoice: Invoice; payment: InvoicePayment }>(
    "/refunds",
    {
      property_id: propertyId,
      invoice_id: input.invoiceId,
      payment_id: input.paymentId,
      amount: input.amount,
      refund_method: input.refundMethod,
      reference_number: input.referenceNumber,
      reason: input.reason,
      notes: input.notes
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function completeRefund(
  propertyId: string,
  refundId: string,
  options: { referenceNumber?: string; notes?: string } = {}
) {
  const response = await api.post<{ refund: Refund; invoice: Invoice; payment: InvoicePayment }>(
    `/refunds/${refundId}/complete`,
    {
      property_id: propertyId,
      ...(options.referenceNumber ? { reference_number: options.referenceNumber } : {}),
      ...(options.notes ? { notes: options.notes } : {})
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function voidRefund(propertyId: string, refundId: string, reason: string) {
  const response = await api.post<{ refund: Refund; invoice: Invoice }>(
    `/refunds/${refundId}/void`,
    { property_id: propertyId, reason },
    { headers: actorHeaders() }
  );
  return response.data;
}

export function getFinancialApiErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error, "");
  if (message) return message;
  if (error instanceof Error && error.message) return error.message;
  return "The financial request could not be completed.";
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
