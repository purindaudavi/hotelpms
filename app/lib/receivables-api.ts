import { api, getApiErrorMessage } from "@/app/lib/api";

export type ReceivableStatus = "to_be_paid" | "paid";

export type BackendReceivable = {
  _id: string;
  invoice_id: string;
  invoice_no: string;
  reservation_no: string;
  name: string;
  email: string;
  invoice_date: string;
  due_date: string;
  invoice_value: number;
  credited_amount: number;
  paid_amount: number;
  balance_due: number;
  currency: string;
  age: number;
  status: ReceivableStatus;
};

export type ReceivableListResponse = {
  count: number;
  total: number;
  page: number;
  pages: number;
  receivables: BackendReceivable[];
};

export async function listReceivables(propertyId: string, filters: {
  status?: ReceivableStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}) {
  const response = await api.get<ReceivableListResponse>("/receivables", {
    params: {
      property_id: propertyId,
      status: filters.status || "all",
      search: filters.search || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      page: filters.page,
      limit: filters.limit || 100
    }
  });
  return response.data;
}

export function getReceivablesApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Receivables could not be loaded.");
}
