"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";

type ChartOfAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  detailType: string;
  description: string;
  balance: number;
};

type AccountType =
  | "Cash and Cash Equivalents"
  | "Current Asset"
  | "Current Liability"
  | "Equity"
  | "Income"
  | "Cost of Goods Sold"
  | "Expenses";

type ChartOfAccountantsPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

const accountDetailTypes: Record<AccountType, string[]> = {
  "Cash and Cash Equivalents": ["Bank", "Cash on Hand", "Payment Gateway"],
  "Current Asset": ["Accounts Receivable (A/R)", "Inventory", "Prepayments"],
  "Current Liability": ["Accounts Payable (A/P)", "Tax Payable", "Unearned Revenue"],
  Equity: ["Opening Balance Equity", "Owner Equity", "Retained Earnings"],
  Income: ["Room Revenue", "POS Revenue", "Other Income"],
  "Cost of Goods Sold": ["Food Cost", "Room Supplies", "Laundry Cost"],
  Expenses: ["Utilities", "Repairs and Maintenance", "OTA Commission", "Staff Cost"]
};

const accountCodePrefixes: Record<AccountType, string> = {
  "Cash and Cash Equivalents": "01",
  "Current Asset": "02",
  "Current Liability": "03",
  Equity: "09",
  Income: "10",
  "Cost of Goods Sold": "40",
  Expenses: "50"
};

const initialAccounts: ChartOfAccount[] = [
  { id: "coa-01001", code: "01001", name: "Cash in Hand", type: "Cash and Cash Equivalents", detailType: "Bank", description: "Hotel: 1052", balance: 34001.04 },
  { id: "coa-01140", code: "01140", name: "HNB US", type: "Cash and Cash Equivalents", detailType: "Bank", description: "Hotel: 1052", balance: 15019.95 },
  { id: "coa-02001", code: "02001", name: "Account Receivables", type: "Current Asset", detailType: "Accounts Receivable (A/R)", description: "Hotel: 1052", balance: 5188.91 },
  { id: "coa-02002", code: "02002", name: "Guest In-house Ledger", type: "Current Asset", detailType: "Accounts Receivable (A/R)", description: "Hotel: 1052", balance: -39917.09 },
  { id: "coa-09100", code: "09100", name: "OPENING BALANCE EQUITY", type: "Equity", detailType: "Opening Balance Equity", description: "Hotel: 1052", balance: 0 },
  { id: "coa-10300", code: "10300", name: "Deluxe Double Room - Revenue", type: "Income", detailType: "Room Revenue", description: "Hotel: 1052", balance: -4773.1 },
  { id: "coa-10301", code: "10301", name: "Deluxe Twin Room - Revenue", type: "Income", detailType: "Room Revenue", description: "Hotel: 1052", balance: -8221.26 },
  { id: "coa-10302", code: "10302", name: "Deluxe Twin Room - Revenue", type: "Income", detailType: "Room Revenue", description: "Hotel: 1052", balance: 0 },
  { id: "coa-10303", code: "10303", name: "Deluxe Triple Room - Revenue", type: "Income", detailType: "Room Revenue", description: "Hotel: 1052", balance: 0 },
  { id: "coa-10304", code: "10304", name: "Deluxe Triple Room - Revenue", type: "Income", detailType: "Room Revenue", description: "Hotel: 1052", balance: 0 },
  { id: "coa-50100", code: "50100", name: "Electricity Expense", type: "Expenses", detailType: "Utilities", description: "Hotel: 1052", balance: 0 },
  { id: "coa-50200", code: "50200", name: "Food Purchases", type: "Cost of Goods Sold", detailType: "Food Cost", description: "Hotel: 1052", balance: 0 }
];

export function ChartOfAccountantsPage({ propertyId, setToast }: ChartOfAccountantsPageProps) {
  const [accounts, setAccounts] = useSessionState<ChartOfAccount[]>(`staypilot:${propertyId}:financials:chart-of-accounts`, initialAccounts);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) => [account.code, account.name, account.type, account.detailType, account.description].join(" ").toLowerCase().includes(needle));
  }, [accounts, search]);

  const rowsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const firstVisible = filtered.length ? (safePage - 1) * rowsPerPage + 1 : 0;
  const lastVisible = Math.min(filtered.length, safePage * rowsPerPage);

  function saveAccount(account: ChartOfAccount) {
    setAccounts((current) => [account, ...current]);
    setDrawerOpen(false);
    setPage(1);
    setToast(`${account.name} added`);
  }

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Accounts</h2>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by code, name, type or detail type..."
          className="focus-ring h-12 w-full rounded-md border border-line bg-white pl-11 pr-3 text-base"
        />
      </label>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <h3 className="text-2xl font-semibold">Chart of Accounts</h3>
          <p className="text-sm text-slate-500">Showing {firstVisible}-{lastVisible} of {filtered.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-700">
                {["Code", "Account Name", "Account Type", "Detail Type", "Balance"].map((heading, index) => (
                  <th key={heading} className={`px-5 py-3 font-semibold ${index === 4 ? "text-right" : ""}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((account) => (
                <tr key={account.id} className="border-b border-line hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-slate-600">{account.code}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{account.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{account.description || "Hotel: 1052"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{account.type}</td>
                  <td className="px-5 py-4 text-slate-600">{account.detailType}</td>
                  <td className="px-5 py-4 text-right text-base font-bold">{formatBalance(account.balance)}</td>
                </tr>
              ))}
              {!visibleRows.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-500">No accounts found</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-3 px-5 py-4 text-sm text-slate-600">
          <span>Page {safePage} of {totalPages}</span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="h-10 rounded-md border border-line bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            className="h-10 rounded-md border border-line bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {drawerOpen ? <AddAccountDrawer accounts={accounts} onClose={() => setDrawerOpen(false)} onSave={saveAccount} /> : null}
    </main>
  );
}

function AddAccountDrawer({
  accounts,
  onClose,
  onSave
}: {
  accounts: ChartOfAccount[];
  onClose: () => void;
  onSave: (account: ChartOfAccount) => void;
}) {
  const [form, setForm] = useState({
    type: "" as AccountType | "",
    detailType: "",
    name: "",
    description: "",
    code: ""
  });

  const details = form.type ? accountDetailTypes[form.type] : [];

  function changeType(type: AccountType | "") {
    setForm({
      ...form,
      type,
      detailType: "",
      code: type ? nextAccountCode(type, accounts) : ""
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.type) return;
    onSave({
      id: `coa-${form.code || Date.now()}`,
      code: form.code || nextAccountCode(form.type, accounts),
      name: form.name || "Unnamed Account",
      type: form.type,
      detailType: form.detailType || accountDetailTypes[form.type][0],
      description: form.description || "Hotel: 1052",
      balance: 0
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="h-full w-full max-w-[760px] overflow-y-auto rounded-l-2xl bg-white shadow-panel">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white px-7 py-6">
          <div>
            <h2 className="text-2xl font-semibold">Add Account</h2>
            <p className="mt-3 text-sm text-slate-500">Enter the details to create a new account</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-7 py-6">
          <Field label="Account Type">
            <select
              value={form.type}
              onChange={(event) => changeType(event.target.value as AccountType | "")}
              required
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
            >
              <option value="">Select account type</option>
              {(Object.keys(accountDetailTypes) as AccountType[]).map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>

          <Field label="Account Detail Type">
            <select
              value={form.detailType}
              onChange={(event) => setForm({ ...form, detailType: event.target.value })}
              disabled={!form.type}
              required
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{form.type ? "Select account detail type" : "Select account type first"}</option>
              {details.map((detail) => (
                <option key={detail}>{detail}</option>
              ))}
            </select>
          </Field>

          <Field label="Account Name">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
            />
          </Field>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
            />
          </Field>

          <Field label="Account Code">
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="Auto-generated after selecting Account Type"
              className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="h-11 rounded-md border border-line bg-white px-5 text-sm font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800">
              Save
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function nextAccountCode(type: AccountType, accounts: ChartOfAccount[]) {
  const prefix = accountCodePrefixes[type];
  const existing = accounts
    .map((account) => account.code)
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.slice(prefix.length)))
    .filter((value) => Number.isFinite(value));
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function formatBalance(value: number) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
