import { api, getApiErrorMessage } from "@/app/lib/api";

export type BackendTransactionDirection = "in" | "out" | "non_cash" | "transfer";
export type BackendTransactionStatus = "posted" | "voided";

export type BackendFinancialTransaction = {
  _id: string;
  property_id: string;
  transaction_no: string;
  transaction_date: string;
  source_type: "invoice" | "payment" | "credit_note" | "refund" | "withdrawal" | "purchase" | "supplier_payment" | "expense";
  source_id: string;
  source_number: string;
  direction: BackendTransactionDirection;
  accounting_effect: "increase" | "decrease" | "neutral";
  amount: number;
  currency: string;
  reservation_id?: string;
  reservation_no: string;
  room_numbers: string[];
  description: string;
  status: BackendTransactionStatus;
  created_by?: { user_id?: string; name?: string; email?: string };
  voided_at?: string;
  void_reason?: string;
};

export type TransactionListResponse = {
  count: number;
  total: number;
  page: number;
  pages: number;
  transactions: BackendFinancialTransaction[];
};

export async function listFinancialTransactions(
  propertyId: string,
  params: { page?: number; limit?: number; status?: BackendTransactionStatus | "all" } = {}
) {
  const response = await api.get<TransactionListResponse>("/transactions", {
    params: { property_id: propertyId, status: "all", limit: 100, ...params }
  });
  return response.data;
}

export async function listAllFinancialTransactions(propertyId: string) {
  const first = await listFinancialTransactions(propertyId, { page: 1, limit: 100, status: "all" });
  if (first.pages <= 1) return first.transactions;

  const remaining = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      listFinancialTransactions(propertyId, { page: index + 2, limit: 100, status: "all" })
    )
  );
  return [first.transactions, ...remaining.map((page) => page.transactions)].flat();
}

export function getTransactionsApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Financial transactions could not be loaded.");
}
