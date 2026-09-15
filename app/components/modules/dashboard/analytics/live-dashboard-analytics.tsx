"use client";

import { useState } from "react";
import { Area, Bar, ComposedChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SegmentedControl } from "../components/dashboard-controls";
import type { DashboardSummary } from "@/app/lib/dashboard-api";
import { AnalyticsCard } from "../components/dashboard-panel";

type Analytics = DashboardSummary["analytics"];
const colors = ["#10b981", "#6366f1", "#f43f5e", "#f59e0b", "#06b6d4", "#64748b"];

export function DashboardAnalytics({ data, currency }: { data: Analytics; currency: string }) {
  const [revenueView, setRevenueView] = useState("Bar");
  const performance = data.monthly_performance.map((item) => ({ ...item, label: formatMonth(item.month) }));
  const latest = performance.at(-1);
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-4">
      <Kpi label="Monthly revenue" value={money(latest?.revenue ?? 0, currency)} />
      <Kpi label="Occupancy" value={`${(latest?.occupancy ?? 0).toFixed(1)}%`} />
      <Kpi label="ADR" value={money(latest?.adr ?? 0, currency)} />
      <Kpi label="RevPAR" value={money(latest?.revpar ?? 0, currency)} />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <AnalyticsCard title="Reservation Revenue" subtitle="Monthly reservation totals" action={<SegmentedControl options={["Area", "Bar"]} value={revenueView} onChange={setRevenueView} />}><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={performance} margin={{ top: 16, right: 24, left: 22, bottom: 8 }}><CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" tickLine={false} /><YAxis tickLine={false} tickFormatter={(value) => Number(value).toLocaleString()} /><Tooltip formatter={(value) => money(Number(value), currency)} />{revenueView === "Bar" ? <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} /> : <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />}</ComposedChart></ResponsiveContainer></div></AnalyticsCard>
      <AnalyticsCard title="Revenue Breakdown" subtitle="Saved reservation financial components"><MetricPie data={data.revenue_breakdown.map((item) => ({ label: readable(item.label), value: item.value }))} currency={currency} /></AnalyticsCard>
      <AnalyticsCard title="Booking Segments" subtitle="Current-month reservation mix"><MetricPie data={data.guest_demographics} /></AnalyticsCard>
      <AnalyticsCard title="Occupancy Performance" subtitle="Monthly occupied-room-night percentage"><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={performance} margin={{ top: 16, right: 24, left: 10, bottom: 8 }}><CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} /><Line type="monotone" dataKey="occupancy" name="Occupancy" stroke="#6366f1" strokeWidth={3} /></LineChart></ResponsiveContainer></div></AnalyticsCard>
    </div>
    <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">True profit is not shown because expense and general-ledger modules are not connected. Live mode reports reservation revenue, ADR, RevPAR and occupancy only.</p>
  </div>;
}

function MetricPie({ data, currency }: { data: Array<{ label: string; value: number }>; currency?: string }) {
  const visible = data.map((item, index) => ({ ...item, color: colors[index % colors.length] })).filter((item) => item.value > 0);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  if (!visible.length) return <div className="grid min-h-[330px] place-items-center text-slate-500">No saved data for this period</div>;
  return <div className="min-h-[330px]">
    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart>
      <Pie data={visible} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="58%" stroke="var(--theme-panel)" strokeWidth={1} label={({ percent }) => `${Math.round(Number(percent ?? 0) * 100)}%`} labelLine={false}>
        {visible.map((item) => <Cell key={item.label} fill={item.color} />)}
      </Pie>
      <Tooltip formatter={(value) => `${currency ? money(Number(value), currency) : `${Number(value).toLocaleString()} reservations`} (${(Number(value) / total * 100).toFixed(1)}%)`} contentStyle={{ backgroundColor: "var(--theme-panel)", borderColor: "rgb(var(--theme-line-rgb))", borderRadius: 8 }} />
    </PieChart></ResponsiveContainer></div>
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
      {visible.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5" style={{ color: item.color }}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label} {Math.round(item.value / total * 100)}%</span>)}
    </div>
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <section className="rounded-lg border border-line bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></section>; }
function money(value: number, currency: string) { return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; }
function formatMonth(value: string) { return new Intl.DateTimeFormat("en-LK", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`)); }
function readable(value: string) { return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
