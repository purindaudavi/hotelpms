import { api, getApiErrorMessage } from "@/app/lib/api";
import { currentSessionUser } from "@/app/lib/current-user";

export type WithdrawalStatus = "completed" | "voided";
export type WithdrawalSourceAccount =
  | "cash_on_hand"
  | "petty_cash"
  | "main_bank_account"
  | "other";
export type WithdrawalPaymentMethod = "cash" | "bank_transfer" | "cheque" | "other";

export type WithdrawalActor = {
  user_id: string;
  name: string;
  email: string;
};

export type Withdrawal = {
  _id: string;
  withdrawal_no: string;
  property_id: string;
  paid_to: string;
  amount: number;
  effective_amount: number;
  currency: string;
  source_account: WithdrawalSourceAccount;
  payment_method: WithdrawalPaymentMethod;
  reason: string;
  money_received_at: string;
  reference_number: string;
  notes: string;
  status: WithdrawalStatus;
  recorded_by: WithdrawalActor;
  created_at: string;
  updated_at: string;
  voided_at?: string;
  voided_by?: WithdrawalActor;
  void_reason?: string;
};

export type WithdrawalAuditLog = {
  _id: string;
  action: string;
  description: string;
  actor: WithdrawalActor;
  created_at: string;
};

export type WithdrawalListResponse = {
  count: number;
  total: number;
  page: number;
  pages: number;
  totals: Array<{ currency: string; amount: number; count: number }>;
  withdrawals: Withdrawal[];
};

export type CreateWithdrawalInput = {
  paidTo?: string;
  amount: number;
  currency: string;
  sourceAccount: WithdrawalSourceAccount;
  paymentMethod: WithdrawalPaymentMethod;
  reason: string;
  moneyReceivedAt: string;
  referenceNumber?: string;
  notes?: string;
};

export async function listWithdrawals(
  propertyId: string,
  options: { status?: WithdrawalStatus | "all"; search?: string; limit?: number } = {}
) {
  const response = await api.get<WithdrawalListResponse>("/withdrawals", {
    params: {
      property_id: propertyId,
      status: options.status ?? "all",
      search: options.search || undefined,
      limit: options.limit ?? 100
    }
  });
  return response.data;
}

export async function createWithdrawal(propertyId: string, input: CreateWithdrawalInput) {
  const response = await api.post<{ message: string; withdrawal: Withdrawal }>(
    "/withdrawals",
    {
      property_id: propertyId,
      paid_to: input.paidTo || currentSessionUser.name,
      amount: input.amount,
      currency: input.currency,
      source_account: input.sourceAccount,
      payment_method: input.paymentMethod,
      reason: input.reason,
      money_received_at: input.moneyReceivedAt,
      reference_number: input.referenceNumber,
      notes: input.notes
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function getWithdrawal(propertyId: string, withdrawalId: string) {
  const response = await api.get<{ withdrawal: Withdrawal; logs: WithdrawalAuditLog[] }>(
    `/withdrawals/${withdrawalId}`,
    { params: { property_id: propertyId } }
  );
  return response.data;
}

export async function voidWithdrawal(propertyId: string, withdrawalId: string, reason: string) {
  const response = await api.post<{ message: string; withdrawal: Withdrawal }>(
    `/withdrawals/${withdrawalId}/void`,
    { property_id: propertyId, reason },
    { headers: actorHeaders() }
  );
  return response.data;
}

export function getWithdrawalApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The withdrawal request could not be completed.");
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
