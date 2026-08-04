"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BedDouble, CalendarDays, Users, X } from "lucide-react";
import type { DashboardSummary } from "@/app/lib/dashboard-api";
import { DateRangePill } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";

type TravelAgents = DashboardSummary["travel_agents"];

export function DashboardTravelAgents({ data, period }: { data: TravelAgents; period: DashboardSummary["period"] }) {
  const periodLabel = `${formatDate(period.date_from)} - ${formatDate(period.date_to)}`;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Travel Agent Reservation Summary</h2><p className="mt-1 text-sm text-slate-500">MongoDB room nights, cancellations, no-shows and bookings</p></div><DateRangePill label={periodLabel} /></div>
    <div className="grid gap-4 xl:grid-cols-4">
      <StatusCard title="Room Nights" value={data.summary.room_nights} icon={<BedDouble className="h-5 w-5" />} tone="blue" />
      <StatusCard title="Cancelled" value={data.summary.cancelled} icon={<X className="h-5 w-5" />} tone="red" />
      <StatusCard title="No Show" value={data.summary.no_show} icon={<Users className="h-5 w-5" />} tone="purple" />
      <StatusCard title="New Bookings" value={data.summary.new_bookings} icon={<CalendarDays className="h-5 w-5" />} tone="green" />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <DashboardPanel title="Agent Booking Status" subtitle="Performance by saved travel agent" action={<DateRangePill label={periodLabel} />}><AgentBars data={data.agents} /></DashboardPanel>
      <DashboardPanel title="Room Night Distribution" subtitle="Room-night share by agent" action={<DateRangePill label={periodLabel} />}><Distribution data={data.agents.map((item) => ({ label: item.label, value: item.room_nights }))} /></DashboardPanel>
      <DashboardPanel title="Meal Plan Distribution" subtitle="Travel-related room nights by meal plan" action={<DateRangePill label={periodLabel} />}><Distribution data={data.meal_plans.map((item) => ({ label: item.label, value: item.room_nights }))} /></DashboardPanel>
    </div>
  </div>;
}

function AgentBars({ data }: { data: TravelAgents["agents"] }) {
  if (!data.length) return <Empty label="No travel-agent reservations for this period" />;
  return <div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 14, right: 28, left: 12, bottom: 45 }}><CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" /><XAxis dataKey="label" angle={-30} textAnchor="end" /><YAxis /><Tooltip /><Bar dataKey="room_nights" name="Room nights" fill="#5ec4e0" /><Bar dataKey="cancelled" name="Cancelled" fill="#ff6269" /><Bar dataKey="no_show" name="No show" fill="#ffb84c" /></BarChart></ResponsiveContainer></div>;
}

function Distribution({ data }: { data: Array<{ label: string; value: number }> }) {
  const visible = data.filter((item) => item.value > 0);
  const colors = ["#5ec4e0", "#8980df", "#7acb93", "#ffb84c", "#ff6269"];
  if (!visible.length) return <Empty label="No room-night distribution for this period" />;
  return <div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={visible} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={105} label>{visible.map((item, index) => <Cell key={item.label} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>;
}

function StatusCard({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactElement; tone: "blue" | "red" | "purple" | "green" }) { const tones = { blue: "border-blue-200 bg-blue-50 text-blue-700", red: "border-red-200 bg-red-50 text-red-600", purple: "border-purple-200 bg-purple-50 text-purple-600", green: "border-emerald-200 bg-emerald-50 text-emerald-700" }; return <section className={`rounded-lg border p-5 shadow-sm ${tones[tone]}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3 font-semibold">{icon}{title}</span><b className="text-3xl">{value}</b></div></section>; }
function Empty({ label }: { label: string }) { return <div className="grid min-h-[380px] place-items-center text-slate-500">{label}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
