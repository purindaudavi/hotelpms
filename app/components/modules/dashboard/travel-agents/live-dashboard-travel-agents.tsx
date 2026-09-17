"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BedDouble, CalendarDays, Users, X } from "lucide-react";
import type { DashboardSummary } from "@/app/lib/dashboard-api";
import { DateRangePill } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";

type TravelAgents = DashboardSummary["travel_agents"];

export function DashboardTravelAgents({ data: initialData, period: initialPeriod, loadRangeData }: { data: TravelAgents; period: DashboardSummary["period"]; loadRangeData: (period: DashboardSummary["period"]) => Promise<DashboardSummary> }) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState(initialPeriod);
  useEffect(() => { setData(initialData); setPeriod(initialPeriod); }, [initialData, initialPeriod]);
  const applyPeriod = async (range: DashboardSummary["period"]) => {
    const result = await loadRangeData(range);
    setData(result.travel_agents);
    setPeriod(result.period);
  };
  const periodLabel = `${formatDate(period.date_from)} - ${formatDate(period.date_to)}`;
  const calendar = (label: string) => <DateRangePill label={periodLabel} value={period} onApply={applyPeriod} ariaLabel={label} align="left" />;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Travel Agent Reservation Summary</h2><p className="mt-1 text-sm text-slate-500">Room nights, cancellations, no-shows and bookings. Date selection applies to all charts.</p></div>{calendar("Select Travel Agent Summary dates")}</div>
    <div className="grid gap-4 xl:grid-cols-4">
      <StatusCard title="Room Nights" value={data.summary.room_nights} icon={<BedDouble className="h-5 w-5" />} tone="blue" />
      <StatusCard title="Cancelled" value={data.summary.cancelled} icon={<X className="h-5 w-5" />} tone="red" />
      <StatusCard title="No Show" value={data.summary.no_show} icon={<Users className="h-5 w-5" />} tone="purple" />
      <StatusCard title="New Bookings" value={data.summary.new_bookings} icon={<CalendarDays className="h-5 w-5" />} tone="green" />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <DashboardPanel title="Agent Booking Status" subtitle="Room nights, cancellations and no-shows by agent" action={calendar("Select Agent Booking Status dates")}><AgentBars data={data.agents} /></DashboardPanel>
      <DashboardPanel title="Room Night Distribution" subtitle="Room-night share by agent" action={calendar("Select Room Night Distribution dates")}><Distribution period={periodLabel} data={data.agents.map((item) => ({ label: item.label, value: item.room_nights }))} /></DashboardPanel>
      <DashboardPanel title="Meal Plan Distribution" subtitle="Room nights by meal plan" action={calendar("Select Meal Plan Distribution dates")}><Distribution period={periodLabel} data={data.meal_plans.map((item) => ({ label: item.label, value: item.room_nights }))} /></DashboardPanel>
    </div>
  </div>;
}

function AgentBars({ data }: { data: TravelAgents["agents"] }) {
  if (!data.length) return <Empty label="No travel-agent reservations for this period" />;
  return <div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 14, right: 28, left: 12, bottom: 45 }}><CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" /><XAxis dataKey="label" angle={-30} textAnchor="end" /><YAxis allowDecimals={false} label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#94a3b8" }} /><Legend verticalAlign="top" height={40} /><Tooltip /><Bar dataKey="room_nights" name="Room Nights" fill="#5ec4e0" radius={[3, 3, 0, 0]} /><Bar dataKey="cancelled" name="Cancelled" fill="#ff6269" /><Bar dataKey="no_show" name="No Show" fill="#ffb84c" /></BarChart></ResponsiveContainer></div>;
}

function Distribution({ data, period }: { data: Array<{ label: string; value: number }>; period: string }) {
  const visible = data.filter((item) => item.value > 0);
  const colors = ["#5ec4e0", "#ff6269", "#8980df", "#ffb84c", "#7acb93"];
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  if (!visible.length) return <Empty label="No room-night distribution for this period" />;
  return <div className="min-h-[380px]">
    <div className="text-center"><p className="text-sm text-slate-500">Total Room Nights</p><p className="text-3xl font-semibold text-purple-500">{total.toLocaleString()}</p></div>
    <div className="flex flex-wrap items-center justify-center">
      <div className="h-[280px] min-w-0 flex-1 basis-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={visible} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="40%" outerRadius="60%" stroke="var(--theme-panel)" label={({ name, percent }) => `${String(name).length > 16 ? `${String(name).slice(0, 14)}…` : name} (${Math.round(Number(percent ?? 0) * 100)}%)`} fontSize={11}>{visible.map((item, index) => <Cell key={item.label} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => [`${Number(value)} room nights (${(Number(value) / total * 100).toFixed(1)}%)`, "Share"]} contentStyle={{ backgroundColor: "var(--theme-panel)", borderColor: "rgb(var(--theme-line-rgb))", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div>
      <div className="space-y-2 px-3 text-xs">{visible.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.label}</span><span>{(item.value / total * 100).toFixed(1)}%</span></div>)}</div>
    </div>
    <p className="mt-3 text-center text-xs text-slate-500">Showing data for {period}</p>
  </div>;
}

function StatusCard({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactElement; tone: "blue" | "red" | "purple" | "green" }) { const tones = { blue: "border-blue-200 bg-blue-50 text-blue-700", red: "border-red-200 bg-red-50 text-red-600", purple: "border-purple-200 bg-purple-50 text-purple-600", green: "border-emerald-200 bg-emerald-50 text-emerald-700" }; return <section className={`travel-agent-summary-card travel-agent-summary-card-${tone} rounded-lg border p-5 shadow-sm ${tones[tone]}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3 font-semibold">{icon}{title}</span><b className="text-3xl">{value}</b></div></section>; }
function Empty({ label }: { label: string }) { return <div className="grid min-h-[380px] place-items-center text-slate-500">{label}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
