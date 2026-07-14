"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { type FinancialTransaction, property } from "@/app/data/pms-data";

type TransferFundsPageProps = {
  propertyId: string;
  setTransactions: Dispatch<SetStateAction<FinancialTransaction[]>>;
  setToast: (message: string) => void;
};

type AccountBalance = {
  id: string;
  name: string;
  balance: number;
};

type TransferRecord = {
  id: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  memo: string;
};

const initialBalances: AccountBalance[] = [
  { id: "cash-in-hand", name: "Cash in Hand", balance: 34001.04 },
  { id: "hnb-us", name: "HNB US", balance: 15019.95 },
  { id: "account-receivables", name: "Account Receivables", balance: 5188.91 },
  { id: "guest-ledger", name: "Guest In-house Ledger", balance: -39917.09 }
];

export function TransferFundsPage({ propertyId, setTransactions, setToast }: TransferFundsPageProps) {
  const keyPrefix = `staypilot:${propertyId}:financials:transfer-funds`;
  const [balances, setBalances] = useSessionState<AccountBalance[]>(`${keyPrefix}:balances`, initialBalances);
  const [transfers, setTransfers] = useSessionState<TransferRecord[]>(`${keyPrefix}:records`, []);
  const [showFromBalance, setShowFromBalance] = useState(false);
  const [form, setForm] = useState({
    date: "2026-06-16",
    fromAccount: "",
    toAccount: "",
    amount: "",
    memo: ""
  });

  const fromAccount = useMemo(() => balances.find((account) => account.id === form.fromAccount), [balances, form.fromAccount]);
  const toAccount = useMemo(() => balances.find((account) => account.id === form.toAccount), [balances, form.toAccount]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!fromAccount || !toAccount) {
      setToast("Select both accounts");
      return;
    }
    if (fromAccount.id === toAccount.id) {
      setToast("From and To accounts must be different");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast("Enter a valid transfer amount");
      return;
    }

    setBalances((current) =>
      current.map((account) => {
        if (account.id === fromAccount.id) return { ...account, balance: account.balance - amount };
        if (account.id === toAccount.id) return { ...account, balance: account.balance + amount };
        return account;
      })
    );

    const transfer: TransferRecord = {
      id: `transfer-${Date.now()}`,
      date: form.date,
      fromAccount: fromAccount.name,
      toAccount: toAccount.name,
      amount,
      memo: form.memo
    };
    setTransfers((current) => [transfer, ...current]);
    setTransactions((current) => [
      {
        id: `transfer-tran-${Date.now()}`,
        date: form.date,
        type: "Transfer Funds",
        documentNo: `TRF-${Date.now().toString().slice(-6)}`,
        value: amount,
        reservationNo: "-",
        roomNo: "-",
        createdBy: "ASIRI PERERA",
        status: "Active"
      },
      ...current
    ]);
    setForm((current) => ({ ...current, amount: "", memo: "" }));
    setToast("Funds transferred");
  }

  return (
    <main className="p-4 lg:p-6">
      <section className="mx-auto max-w-6xl rounded-lg border border-line bg-white p-7 shadow-sm">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">Transfer Funds</h2>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-cyan-50 text-slate-700">
            <PlayCircle className="h-5 w-5" />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Property">
              <input value={property.name} disabled className="h-12 w-full rounded-md border border-line bg-slate-50 px-4 text-sm text-slate-500" />
            </Field>

            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  From Account
                  <label className="inline-flex items-center gap-2 text-sm font-normal">
                    <input type="checkbox" checked={showFromBalance} onChange={(event) => setShowFromBalance(event.target.checked)} />
                    Show Balance
                  </label>
                </span>
              }
            >
              <select value={form.fromAccount} onChange={(event) => setForm({ ...form, fromAccount: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm">
                <option value="">Name</option>
                {balances.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Balance">
              <input value={showFromBalance && fromAccount ? formatBalance(fromAccount.balance) : "-"} disabled className="h-12 w-full rounded-md border border-line bg-slate-50 px-4 text-sm text-slate-500" />
            </Field>

            <Field label="To Account">
              <select value={form.toAccount} onChange={(event) => setForm({ ...form, toAccount: event.target.value })} className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm">
                <option value="">Name</option>
                {balances.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Balance">
              <input value={toAccount ? formatBalance(toAccount.balance) : "-"} disabled className="h-12 w-full rounded-md border border-line bg-slate-50 px-4 text-sm text-slate-500" />
            </Field>
          </div>

          <Field label="Amount Transfer">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="0.00"
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
            />
          </Field>

          <Field label="Memo">
            <textarea
              value={form.memo}
              onChange={(event) => setForm({ ...form, memo: event.target.value })}
              placeholder="Enter memo or notes..."
              className="focus-ring min-h-28 w-full rounded-md border border-line bg-white px-4 py-3 text-sm"
            />
          </Field>

          <button type="submit" className="h-12 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
            Transfer Funds
          </button>
        </form>

        {transfers.length ? (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["Date", "From", "To", "Amount", "Memo"].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 5).map((transfer) => (
                  <tr key={transfer.id} className="border-b border-line">
                    <td className="px-3 py-3">{transfer.date}</td>
                    <td className="px-3 py-3">{transfer.fromAccount}</td>
                    <td className="px-3 py-3">{transfer.toAccount}</td>
                    <td className="px-3 py-3 font-semibold">{formatBalance(transfer.amount)}</td>
                    <td className="px-3 py-3">{transfer.memo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function formatBalance(value: number) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
