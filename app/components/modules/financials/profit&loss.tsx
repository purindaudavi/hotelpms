"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Target as TargetIcon, Trash2, X } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getTransactionsApiErrorMessage,
  listAllFinancialTransactions,
  type BackendFinancialTransaction
} from "@/app/lib/transactions-api";
import {
  getFinancialTargetsApiErrorMessage,
  listFinancialTargets,
  removeFinancialTarget,
  saveFinancialTarget,
  type FinancialTarget
} from "@/app/lib/financial-targets-api";

type ProfitLossPeriod = "Monthly" | "Year" | "Today";
type ProfitLossView = "Chart" | "Table";
type ChartMode = "Area" | "Bar";

type ProfitLossPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type ProfitLossRow = {
  period: string;
  period_key: string;
  revenue: number;
  expenses: number;
  profit: number;
  target?: number;
};

export function ProfitLossPage({ propertyId, setToast }: ProfitLossPageProps) {
  const [period, setPeriod] = useState<ProfitLossPeriod>("Monthly");
  const [view, setView] = useState<ProfitLossView>("Chart");
  const [chartMode, setChartMode] = useState<ChartMode>("Area");
  const [filterOpen, setFilterOpen] = useState(false);
  const [transactions, setTransactions] = useState<BackendFinancialTransaction[]>([]);
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState(currentMonth());
  const [targetAmount, setTargetAmount] = useState("");
  const [targetSaving, setTargetSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listAllFinancialTransactions(propertyId)
      .then((savedTransactions) => {
        if (active) setTransactions(savedTransactions);
      })
      .catch((error) => {
        if (active) setToast(getTransactionsApiErrorMessage(error));
      });
    return () => { active = false; };
  }, [propertyId, setToast]);

  useEffect(() => {
    let active = true;
    listFinancialTargets(propertyId)
      .then((savedTargets) => { if (active) setTargets(savedTargets); })
      .catch((error) => { if (active) setToast(getFinancialTargetsApiErrorMessage(error)); });
    return () => { active = false; };
  }, [propertyId, setToast]);

  const rows = useMemo(
    () => buildRows(period, transactions, targets),
    [period, transactions, targets]
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
  const targetTotal = rows.reduce((sum, row) => sum + (row.target ?? 0), 0);
  const hasTarget = rows.some((row) => row.target !== undefined);
  const targetedProfit = rows.reduce((sum, row) => sum + (row.target === undefined ? 0 : row.profit), 0);

  function openTargetDialog(month = currentMonth()) {
    const saved = targets.find((target) => target.month === month);
    setTargetMonth(month);
    setTargetAmount(saved ? String(saved.amount) : "");
    setTargetOpen(true);
  }

  function changeTargetMonth(month: string) {
    const saved = targets.find((target) => target.month === month);
    setTargetMonth(month);
    setTargetAmount(saved ? String(saved.amount) : "");
  }

  async function submitTarget(event: FormEvent) {
    event.preventDefault();
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setToast("Enter a valid target amount of zero or greater.");
      return;
    }
    setTargetSaving(true);
    try {
      const result = await saveFinancialTarget(propertyId, targetMonth, amount);
      setTargets((current) => [...current.filter((target) => target._id !== result.target._id && target.month !== result.target.month), result.target].sort((left, right) => left.month.localeCompare(right.month)));
      setToast(result.message);
      setTargetOpen(false);
    } catch (error) {
      setToast(getFinancialTargetsApiErrorMessage(error));
    } finally {
      setTargetSaving(false);
    }
  }

  async function deleteTarget() {
    setTargetSaving(true);
    try {
      const result = await removeFinancialTarget(propertyId, targetMonth);
      setTargets((current) => current.filter((target) => target.month !== targetMonth));
      setToast(result.message);
      setTargetOpen(false);
    } catch (error) {
      setToast(getFinancialTargetsApiErrorMessage(error));
    } finally {
      setTargetSaving(false);
    }
  }

  function exportRows() {
    const csv = [
      ["Period", "Revenue", "Expenses", "Profit", "Net Profit Target", "Variance", "Achievement"],
      ...rows.map((row) => [row.period, row.revenue, row.expenses, row.profit, row.target ?? "", row.target === undefined ? "" : row.profit - row.target, row.target === undefined ? "" : percentage(row.profit, row.target)]),
      ["Total", totals.revenue, totals.expenses, totals.profit, hasTarget ? targetTotal : "", hasTarget ? totals.profit - targetTotal : "", hasTarget ? percentage(totals.profit, targetTotal) : ""]
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
          <Button onClick={() => openTargetDialog()}>
            <TargetIcon className="h-4 w-4" />
            Set Target
          </Button>
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
        <form className="rounded-lg border border-line bg-white p-4 text-sm text-slate-500 shadow-sm" onSubmit={(event: FormEvent) => event.preventDefault()}>
          Profit &amp; Loss uses posted MongoDB ledger entries. Voided entries and cash-settlement entries are excluded.
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Revenue" value={totals.revenue} />
        <SummaryCard title="Expenses" value={totals.expenses} />
        <SummaryCard title="Profit" value={totals.profit} />
        <SummaryCard
          title="Net Profit Target"
          value={hasTarget ? targetTotal : "Not set"}
          detail={hasTarget ? targetResult(targetedProfit, targetTotal) : "Set monthly targets to track performance"}
        />
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

      {targetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTargetOpen(false); }}>
          <form onSubmit={submitTarget} role="dialog" aria-modal="true" aria-labelledby="target-dialog-title" className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="target-dialog-title" className="text-xl font-semibold">Set Net Profit Target</h3>
                <p className="mt-1 text-sm text-slate-500">Save the expected net profit for one month.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setTargetOpen(false)} className="grid h-9 w-9 place-items-center rounded-md border border-line text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">Month<input type="month" required value={targetMonth} onChange={(event) => changeTargetMonth(event.target.value)} className="focus-ring h-11 rounded-md border border-line bg-white px-3 font-normal" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">Net profit target (LKR)<input type="number" required min="0" step="0.01" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="Example: 60000" className="focus-ring h-11 rounded-md border border-line bg-white px-3 font-normal" /></label>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>{targets.some((target) => target.month === targetMonth) ? <button type="button" disabled={targetSaving} onClick={() => void deleteTarget()} className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove target</button> : null}</div>
              <div className="flex gap-2">
                <button type="button" disabled={targetSaving} onClick={() => setTargetOpen(false)} className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={targetSaving} className="dashboard-date-apply h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">{targetSaving ? "Saving..." : "Save Target"}</button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function SummaryCard({ title, value, detail }: { title: string; value: number | string; detail?: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-4 text-3xl font-bold">{typeof value === "number" ? moneyWhole(value) : value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </section>
  );
}

function ProfitLossChart({ rows, mode }: { rows: ProfitLossRow[]; mode: ChartMode }) {
  const targets = rows.flatMap((row) => row.target === undefined ? [] : [row.target]);
  const hasTarget = targets.length > 0;
  const maxValue = Math.max(10000, ...rows.flatMap((row) => [row.revenue, row.profit]), ...targets);
  const domainMax = Math.ceil(maxValue / 1000) * 1000;
  const chartMargin = { top: 12, right: 24, left: 24, bottom: 8 };

  if (mode === "Bar") {
    return (
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={chartMargin}>
            <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 14 }} />
            <YAxis domain={[0, domainMax]} tickFormatter={formatTick} tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 13 }} />
            <Tooltip cursor={{ fill: "#e5e7eb", opacity: 0.65 }} content={<ProfitLossTooltip />} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
            {hasTarget ? <Line type="monotone" dataKey="target" name="Net profit target" stroke="#f43f5e" strokeWidth={2} connectNulls dot={{ r: 4, fill: "#f43f5e" }} /> : null}
          </ComposedChart>
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
          <Legend />
          <Area type="monotone" dataKey="profit" name="Profit" stroke="#6366f1" strokeWidth={2} fill="#706b8d" fillOpacity={0.28} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          {hasTarget ? <Line type="monotone" dataKey="target" name="Net profit target" stroke="#f43f5e" strokeWidth={2} connectNulls dot={{ r: 4, fill: "#f43f5e" }} /> : null}
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
      {values.target !== undefined ? <p className="mt-2 text-sm text-rose-500">net profit target : {moneyWhole(values.target)}</p> : null}
    </div>
  );
}

function ProfitLossTable({ rows, totals }: { rows: ProfitLossRow[]; totals: { revenue: number; expenses: number; profit: number } }) {
  const targetTotal = rows.reduce((sum, row) => sum + (row.target ?? 0), 0);
  const hasTarget = rows.some((row) => row.target !== undefined);
  const targetedProfit = rows.reduce((sum, row) => sum + (row.target === undefined ? 0 : row.profit), 0);
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[840px] w-full border border-line text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {["Period", "Revenue", "Expenses", "Profit", "Target", "Variance", "Achievement"].map((heading, index) => (
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
              <td className="px-4 py-3 text-right text-base">{row.target === undefined ? "—" : moneyWhole(row.target)}</td>
              <td className="px-4 py-3 text-right text-base">{row.target === undefined ? "—" : moneyWhole(row.profit - row.target)}</td>
              <td className="px-4 py-3 text-right text-base">{row.target === undefined ? "—" : percentage(row.profit, row.target)}</td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3 text-base font-bold">Total</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.revenue)}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.expenses)}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{moneyWhole(totals.profit)}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{hasTarget ? moneyWhole(targetTotal) : "—"}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{hasTarget ? moneyWhole(targetedProfit - targetTotal) : "—"}</td>
            <td className="px-4 py-3 text-right text-base font-bold">{hasTarget ? percentage(targetedProfit, targetTotal) : "—"}</td>
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

function buildRows(period: ProfitLossPeriod, transactions: BackendFinancialTransaction[], targets: FinancialTarget[]) {
  const rows = baseRows(period);

  for (const transaction of transactions) {
    if (transaction.status !== "posted") continue;
    if (transaction.source_type === "invoice") {
      addAmount(rows, period, transaction.transaction_date, "revenue", transaction.amount);
    } else if (transaction.source_type === "credit_note") {
      addAmount(rows, period, transaction.transaction_date, "revenue", -transaction.amount);
    } else if (transaction.source_type === "purchase" || transaction.source_type === "expense") {
      addAmount(rows, period, transaction.transaction_date, "expenses", transaction.amount);
    }
  }

  for (const target of targets) {
    const key = period === "Monthly" ? target.month : period === "Year" ? target.month.slice(0, 4) : "";
    const row = rows.find((item) => item.period_key === key);
    if (row) row.target = (row.target ?? 0) + target.amount;
  }

  return rows.map((row) => {
    const profit = row.revenue - row.expenses;
    return { ...row, profit };
  });
}

function addAmount(rows: ProfitLossRow[], period: ProfitLossPeriod, date: string, key: "revenue" | "expenses", amount: number) {
  const rowKey = periodKey(period, date);
  if (!rowKey) return;
  const row = rows.find((item) => item.period_key === rowKey);
  if (row) row[key] += amount;
}

function periodKey(period: ProfitLossPeriod, date: string) {
  const dateOnly = date.split("T")[0];
  if (period === "Year") return dateOnly.slice(0, 4);
  if (period === "Today") return dateOnly === currentDate() ? dateOnly : "";
  return dateOnly.slice(0, 7);
}

function baseRows(period: ProfitLossPeriod): ProfitLossRow[] {
  const today = new Date(`${currentDate()}T00:00:00Z`);
  if (period === "Today") return [{ period: "Today", period_key: currentDate(), revenue: 0, expenses: 0, profit: 0 }];
  if (period === "Year") {
    const year = today.getUTCFullYear();
    return Array.from({ length: 5 }, (_, index) => {
      const value = String(year - 4 + index);
      return { period: value, period_key: value, revenue: 0, expenses: 0, profit: 0 };
    });
  }
  const currentYear = today.getUTCFullYear();
  const fiscalStartYear = today.getUTCMonth() >= 6 ? currentYear : currentYear - 1;
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(fiscalStartYear, 6 + index, 1));
    return {
      period: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      period_key: date.toISOString().slice(0, 7),
      revenue: 0,
      expenses: 0,
      profit: 0
    };
  });
}

function moneyWhole(value: number) {
  return `LKR ${Math.round(value || 0).toLocaleString("en-US")}`;
}

function formatTick(value: number) {
  return value === 0 ? "LKR 0" : value.toLocaleString("en-US");
}

function currentDate() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return currentDate().slice(0, 7); }
function percentage(value: number, target: number) { return target > 0 ? `${(value / target * 100).toFixed(1)}%` : value >= 0 ? "100.0%" : "0.0%"; }
function targetResult(profit: number, target: number) {
  const difference = profit - target;
  return `${percentage(profit, target)} achieved · ${moneyWhole(Math.abs(difference))} ${difference >= 0 ? "above" : "below"} target`;
}
