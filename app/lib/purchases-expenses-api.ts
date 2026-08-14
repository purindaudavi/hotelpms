import { api, getApiErrorMessage } from "@/app/lib/api";
import { currentSessionUser } from "@/app/lib/current-user";

const actorHeaders = {
  "x-user-name": currentSessionUser.name,
  "x-user-email": currentSessionUser.email
};

export type BackendPurchase = {
  _id: string;
  purchase_no: string;
  supplier_name: string;
  supplier_invoice_no: string;
  purchase_date: string;
  due_date: string;
  amount: number;
  currency: string;
  narration: string;
  attachments: string[];
  gl_lines: Array<{ _id?: string; account: string; amount: number; memo: string }>;
  status: "to_be_paid" | "paid" | "voided";
  created_at: string;
};

export type BackendExpense = {
  _id: string;
  expense_no: string;
  expense_date: string;
  expense_type: string;
  paid_using: string;
  description: string;
  amount: number;
  currency: string;
  attachments: string[];
  remark: string;
  status: "posted" | "voided";
  created_at: string;
};

export async function listPurchases(propertyId: string) {
  const response = await api.get<{ purchases: BackendPurchase[] }>("/purchases", { params: { property_id: propertyId } });
  return response.data.purchases;
}

export async function createPurchase(propertyId: string, input: {
  supplierName: string; supplierInvoiceNo: string; purchaseDate: string; dueDate: string;
  amount: number; narration: string; attachments: string[];
  glLines: Array<{ account: string; amount: number; memo: string }>;
}) {
  const response = await api.post<{ purchase: BackendPurchase }>("/purchases", {
    property_id: propertyId,
    supplier_name: input.supplierName,
    supplier_invoice_no: input.supplierInvoiceNo,
    purchase_date: input.purchaseDate,
    due_date: input.dueDate,
    amount: input.amount,
    currency: "LKR",
    narration: input.narration,
    attachments: input.attachments,
    gl_lines: input.glLines
  }, { headers: actorHeaders });
  return response.data.purchase;
}

export async function payPurchase(propertyId: string, purchaseId: string, paidAt: string) {
  const response = await api.post<{ purchase: BackendPurchase }>(`/purchases/${purchaseId}/pay`, {
    property_id: propertyId,
    paid_at: paidAt,
    payment_method: "other"
  }, { headers: actorHeaders });
  return response.data.purchase;
}

export async function listExpenses(propertyId: string) {
  const response = await api.get<{ expenses: BackendExpense[] }>("/expenses", { params: { property_id: propertyId } });
  return response.data.expenses;
}

export async function createExpense(propertyId: string, input: {
  date: string; expenseType: string; paidUsing: string; description: string;
  amount: number; attachments: string[]; remark: string;
}) {
  const response = await api.post<{ expense: BackendExpense }>("/expenses", {
    property_id: propertyId,
    expense_date: input.date,
    expense_type: input.expenseType,
    paid_using: input.paidUsing,
    description: input.description,
    amount: input.amount,
    currency: "LKR",
    attachments: input.attachments,
    remark: input.remark
  }, { headers: actorHeaders });
  return response.data.expense;
}

export function getPurchasesExpensesApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Financial record could not be saved.");
}
