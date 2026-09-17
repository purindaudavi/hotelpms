import { api, getApiErrorMessage } from "@/app/lib/api";

export type FinancialTarget = {
  _id: string;
  property_id: string;
  month: string;
  metric: "net_profit";
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export async function listFinancialTargets(propertyId: string, currency = "LKR") {
  const response = await api.get<{ targets: FinancialTarget[] }>("/financial-targets", {
    params: { property_id: propertyId, currency }
  });
  return response.data.targets;
}

export async function saveFinancialTarget(propertyId: string, month: string, amount: number, currency = "LKR") {
  const response = await api.put<{ message: string; target: FinancialTarget }>(
    `/financial-targets/${encodeURIComponent(month)}`,
    { property_id: propertyId, amount, currency }
  );
  return response.data;
}

export async function removeFinancialTarget(propertyId: string, month: string, currency = "LKR") {
  const response = await api.delete<{ message: string }>(`/financial-targets/${encodeURIComponent(month)}`, {
    params: { property_id: propertyId, currency }
  });
  return response.data;
}

export function getFinancialTargetsApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Financial targets could not be loaded or saved.");
}
