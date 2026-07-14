"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AnalyticsCard } from "../components/dashboard-panel";
import { SegmentedControl } from "../components/dashboard-controls";
import { chartCurrency } from "../utils";

type FinancialDatum = {
  month: string;
  revenue: number;
  profit: number;
  target: number;
};

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export function ProfitLossAnalyticsCard() {
  const [mode, setMode] = useState<"Area" | "Bar">("Area");

  return (
    <AnalyticsCard
      title="Profit & Loss"
      subtitle="Financial performance overview"
      action={<SegmentedControl options={["Area", "Bar"]} value={mode} onChange={(value) => setMode(value as "Area" | "Bar")} />}
    >
      <ProfitLossChart mode={mode} />
    </AnalyticsCard>
  );
}

function ProfitLossChart({ mode }: { mode: "Area" | "Bar" }) {
  return (
    <FinancialChart
      data={[
        { month: "Jul", revenue: 0, profit: 0, target: 0 },
        { month: "Aug", revenue: 0, profit: 0, target: 0 },
        { month: "Sep", revenue: 0, profit: 0, target: 0 },
        { month: "Oct", revenue: 0, profit: 0, target: 0 },
        { month: "Nov", revenue: 0, profit: 0, target: 0 },
        { month: "Dec", revenue: 0, profit: 0, target: 0 },
        { month: "Jan", revenue: 0, profit: 0, target: 0 },
        { month: "Feb", revenue: 0, profit: 0, target: 0 },
        { month: "Mar", revenue: 0, profit: 0, target: 0 },
        { month: "Apr", revenue: 250, profit: 180, target: 400 },
        { month: "May", revenue: 8884, profit: 8884, target: 9772 },
        { month: "Jun", revenue: 4100, profit: 4050, target: 4500 }
      ]}
      mode={mode}
    />
  );
}

export function PerformanceMetricsChart() {
  return (
    <FinancialChart
      data={[
        { month: "Jan", revenue: 0, profit: 0, target: 0 },
        { month: "Feb", revenue: 0, profit: 0, target: 0 },
        { month: "Mar", revenue: 0, profit: 0, target: 0 },
        { month: "Apr", revenue: 120, profit: 80, target: 180 },
        { month: "May", revenue: 8884, profit: 8884, target: 9772 },
        { month: "Jun", revenue: 4100, profit: 4050, target: 4500 }
      ]}
      mode="Area"
    />
  );
}

function FinancialChart({ data, mode }: { data: FinancialDatum[]; mode: "Area" | "Bar" }) {
  const chartMargin = { top: 16, right: 24, left: 22, bottom: 8 };
  const yTicks = [0, 2500, 5000, 7500, 10000];

  if (mode === "Bar") {
    return (
      <div className="h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 16 }} />
            <YAxis
              domain={[0, 10000]}
              ticks={yTicks}
              tickFormatter={formatLkrTick}
              tickLine={false}
              axisLine={{ stroke: "#8b8b8b" }}
              tick={{ fill: "#64748b", fontSize: 15 }}
            />
            <Tooltip cursor={{ fill: "#e5e7eb", opacity: 0.6 }} content={<FinancialTooltip />} />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="profit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="target" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 16 }} />
          <YAxis
            domain={[0, 10000]}
            ticks={yTicks}
            tickFormatter={formatLkrTick}
            tickLine={false}
            axisLine={{ stroke: "#8b8b8b" }}
            tick={{ fill: "#64748b", fontSize: 15 }}
          />
          <Tooltip cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }} content={<FinancialTooltip />} />
          <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2} fill="#706b8d" fillOpacity={0.28} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="target" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={0} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FinancialTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((item) => [item.dataKey, Number(item.value ?? 0)]));

  return (
    <div className="border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-base font-medium">{label}</p>
      <p className="text-sm text-emerald-600">revenue : {chartCurrency(values.revenue ?? 0)}</p>
      <p className="mt-2 text-sm text-indigo-500">profit : {chartCurrency(values.profit ?? 0)}</p>
      <p className="mt-2 text-sm text-rose-500">target : {chartCurrency(values.target ?? 0)}</p>
    </div>
  );
}

export function PieMetricChart({ slices }: { slices: PieSlice[] }) {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={86}
            stroke="#fff"
            strokeWidth={2}
            labelLine
            label={({ payload, value }) => `${(payload as PieSlice | undefined)?.label ?? ""} ${Number(value ?? 0)}%`}
          >
            {slices.map((slice) => (
              <Cell key={slice.label} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-4 text-base">
        {slices.map((slice) => (
          <span key={slice.label} className="inline-flex items-center gap-1.5" style={{ color: slice.color }}>
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="border border-slate-200 bg-white px-3 py-2 text-base shadow-sm">
      {item.name} : {item.value}%
    </div>
  );
}

function formatLkrTick(value: number) {
  return value === 0 ? "LKR 0" : value.toLocaleString("en-US");
}
