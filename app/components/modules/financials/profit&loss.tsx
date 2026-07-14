"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { type FinancialTransaction } from "@/app/data/pms-data";

type ProfitLossPeriod = "Monthly" | "Year" | "Today";
type ProfitLossView = "Chart" | "Table";
type ChartMode = "Area" | "Bar";

type PurchaseLike = {
  purchaseDate: string;
  referenceAmount: number;
  status: "Unpaid" | "Paid";
};

type ExpenseLike = {
  date: string;
  amount: number;
};

type ProfitLossPageProps = {
  transactions: FinancialTransaction[];
  purchases: PurchaseLike[];
  expenses: ExpenseLike[];
  setToast: (message: string) => void;
};

type ProfitLossRow = {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  target: number;
};

const monthlyBaseRows: ProfitLossRow[] = [
  { period: "Jul", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Aug", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Sep", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Oct", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Nov", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Dec", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Jan", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Feb", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Mar", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "Apr", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "May", revenue: 8884, expenses: 0, profit: 8884, target: 9772 },
  { period: "Jun", revenue: 4110, expenses: 0, profit: 4110, target: 4521 }
];

const yearBaseRows: ProfitLossRow[] = [
  { period: "2022", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "2023", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "2024", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "2025", revenue: 0, expenses: 0, profit: 0, target: 0 },
  { period: "2026", revenue: 12994, expenses: 0, profit: 12994, target: 14293 }
];

export function ProfitLossPage({ transactions, purchases, expenses, setToast }: ProfitLossPageProps) {
  const [period, setPeriod] = useState<ProfitLossPeriod>("Monthly");
  const [view, setView] = useState<ProfitLossView>("Chart");
  const [chartMode, setChartMode] = useState<ChartMode>("Area");
  const [filterOpen, setFilterOpen] = useState(false);
  const [includePurchases, setIncludePurchases] = useState(true);

  const rows = useMemo(
    () => buildRows(period, transactions, purchases, expenses, includePurchases),
    [period, transactions, purchases, expenses, includePurchases]
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          revenue: sum.revenue + row.revenue,
          expenses: sum.expenses + row.expenses,
          profit: sum.profit + row.profit
        }),
        { revenue: 0, expenses: 0, profit: 0 }
      ),
    [rows]
  );

  function exportRows() {
    const csv = [
      ["Period", "Revenue", "Expenses", "Profit"],
      ...rows.map((row) => [row.period, row.revenue, row.expenses, row.profit]),
      ["Total", totals.revenue, totals.expenses, totals.profit]
    ]
      .map((row) => row.map((cell) => JSON.stringify(String(cell))).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "profit-and-loss.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Profit & Loss exported");
  }

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Profit & Loss</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setFilterOpen((value) => !value)}>
            <CalendarDays className="h-4 w-4" />
            Filter
          </Button>
          <Button onClick={exportRows}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {filterOpen ? (
        <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={(event: FormEvent) => event.preventDefault()}>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={includePurchases} onChange={(event) => setIncludePurchases(event.target.checked)} />
            Include purchases as expenses
          </label>
        </form>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard title="Revenue" value={totals.revenue} />
        <SummaryCard title="Expenses" value={totals.expenses} />
        <SummaryCard title="Profit" value={totals.profit} />
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold">Profit & Loss</h3>
            <p className="text-sm text-slate-500">Financial overview</p>
          </div>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ProfitLossPeriod)}
            className="focus-ring h-12 min-w-[210px] rounded-md border border-line bg-white px-4 text-sm"
          >
            <option>Monthly</option>
            <option>Year</option>
            <option>Today</option>
          </select>
        </div>

        <Segmented
          value={view}
          options={["Chart", "Table"]}
          onChange={(value) => setView(value as ProfitLossView)}
          className="mt-7"
        />

        {view === "Chart" ? (
          <div className="mt-5 rounded-lg border border-line p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold">Profit & Loss</h3>
                <p className="text-sm text-slate-500">Financial performance overview</p>
              </div>
              <Segmented value={chartMode} options={["Area", "Bar"]} onChange={(value) => setChartMode(value as ChartMode)} compact />
            </div>
            <ProfitLossChart rows={rows} mode={chartMode} />
          </div>
        ) : (
          <ProfitLossTable rows={rows} totals={totals} />
        )}
      </section>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-4 text-3xl font-bold">{moneyWhole(value)}</p>
    </section>
  );
}

function ProfitLossChart({ rows, mode }: { rows: ProfitLossRow[]; mode: ChartMode }) {
  const maxValue = Math.max(10000, ...rows.flatMap((row) => [row.revenue, row.profit, row.target]));
  const domainMax = Math.ceil(maxValue / 1000) * 1000;
  const chartMargin = { top: 12, right: 24, left: 24, bottom: 8 };

  if (mode === "Bar") {
    return (
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={chartMargin}>
            <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 14 }} />
            <YAxis domain={[0, domainMax]} tickFormatter={formatTick} tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 13 }} />
            <Tooltip cursor={{ fill: "#e5e7eb", opacity: 0.65 }} content={<ProfitLossTooltip />} />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="profit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="target" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={chartMargin}>
          <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 14 }} />
          <YAxis domain={[0, domainMax]} tickFormatter={formatTick} tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 13 }} />
          <Tooltip cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }} content={<ProfitLossTooltip />} />
          <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2} fill="#706b8d" fillOpacity={0.28} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="target" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={0} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProfitLossTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((item) => [item.dataKey, Number(item.value ?? 0)]));

  return (
    <div className="border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-base font-medium">{label}</p>
      <p className="text-sm text-emerald-600">revenue : {moneyWhole(values.revenue ?? 0)}</p>
      <p className="mt-2 text-sm text-indigo-500">profit : {moneyWhole(values.profit ?? 0)}</p>
      <p className="mt-2 text-sm text-rose-500">target : {moneyWhole(values.target ?? 0)}</p>
    </div>
  );
}

function ProfitLossTable({ rows, totals }: { rows: ProfitLossRow[]; totals: { revenue: number; expenses: number; profit: number } }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[840px] w-full border border-line text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {["Period", "Revenue", "Expenses", "Profit"].map((heading, index) => (
              <th key={heading} className={`px-4 py-3 text-lg font-semibold ${index ? "text-right" : ""}`}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-b border-line">
              <td className="px-4 py-3 text-base">{row.period}</td>
              <td className="px-4 py-3 text-right text-base">{moneyWhole(row.revenue)}</td>
              <td className="px-4 py-3 text-right text-base">{moneyWhole(row.expenses)}</td>
              <td className="px-4 py-3 text-right text-base">{moneyWhole(row.profit)}</td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3 text-base font-bold">Total</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.revenue)}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.expenses)}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.profit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
  compact = false,
  className = ""
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex rounded-lg bg-slate-100 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex-1 rounded-md font-semibold transition ${
            compact ? "px-5 py-2 text-sm" : "px-5 py-3 text-base"
          } ${value === option ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
      {children}
    </button>
  );
}

function buildRows(period: ProfitLossPeriod, transactions: FinancialTransaction[], purchases: PurchaseLike[], expenses: ExpenseLike[], includePurchases: boolean) {
  const baseRows = period === "Monthly" ? monthlyBaseRows : period === "Year" ? yearBaseRows : [{ period: "Today", revenue: 0, expenses: 0, profit: 0, target: 0 }];
  const rows = baseRows.map((row) => ({ ...row }));

  for (const expense of expenses) {
    addAmount(rows, period, expense.date, "expenses", expense.amount);
  }

  if (includePurchases) {
    for (const purchase of purchases) {
      addAmount(rows, period, purchase.purchaseDate, "expenses", purchase.referenceAmount);
    }
  }

  for (const transaction of transactions) {
    if (!isSessionRevenue(transaction)) continue;
    addAmount(rows, period, transaction.date, "revenue", transaction.value);
  }

  return rows.map((row) => {
    const profit = row.revenue - row.expenses;
    return {
      ...row,
      profit,
      target: row.target || Math.round(row.revenue * 1.1)
    };
  });
}

function addAmount(rows: ProfitLossRow[], period: ProfitLossPeriod, date: string, key: "revenue" | "expenses", amount: number) {
  const label = periodLabel(period, date);
  if (!label) return;
  const row = rows.find((item) => item.period === label);
  if (row) row[key] += amount;
}

function isSessionRevenue(transaction: FinancialTransaction) {
  const type = transaction.type.toLowerCase();
  return !/^tran-\d+$/.test(transaction.id) && (type.includes("invoice") || type.includes("receive payment"));
}

function periodLabel(period: ProfitLossPeriod, date: string) {
  const dateOnly = date.split("T")[0];
  const parsed = new Date(`${dateOnly}T00:00:00`);
  if (period === "Year") return String(parsed.getFullYear());
  if (period === "Today") return dateOnly === new Date().toISOString().slice(0, 10) ? "Today" : "";
  return parsed.toLocaleDateString("en-US", { month: "short" });
}

function moneyWhole(value: number) {
  return `LKR ${Math.round(value || 0).toLocaleString("en-US")}`;
}

function formatTick(value: number) {
  return value === 0 ? "LKR 0" : value.toLocaleString("en-US");
}
