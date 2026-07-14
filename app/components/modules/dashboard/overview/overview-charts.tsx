"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type TooltipPayload = Array<{
  dataKey?: string;
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
}>;

export function TrendChart({ values }: { values: number[] }) {
  const labels = ["May 28", "May 29", "May 30", "May 31", "Jun 1", "Jun 2", "Jun 3"];
  const data = values.map((occupancy, index) => ({ label: labels[index] ?? `Day ${index + 1}`, occupancy }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 18, left: 4, bottom: 8 }}>
        <CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#94a3b8" }} tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickLine={false}
          axisLine={{ stroke: "#94a3b8" }}
          tick={{ fill: "#64748b", fontSize: 11 }}
        />
        <Tooltip cursor={{ stroke: "#94a3b8", opacity: 0.45 }} content={<OccupancyTooltip />} />
        <Bar dataKey="occupancy" fill="#67c9e8" radius={[4, 4, 0, 0]} barSize={46} />
        <Line
          type="monotone"
          dataKey="occupancy"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#fff", stroke: "#f97316", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#fff", stroke: "#f97316", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function OccupancyTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload; label?: string }) {
  if (!active || !payload?.length) return null;
  const occupancy = Number(payload[0]?.value ?? 0);
  const roomCount = Math.max(1, Math.round((occupancy / 100) * 14));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
      <p className="mb-3 font-semibold text-ink">{label}</p>
      <p className="flex items-center justify-between gap-8 text-slate-600">
        <span>No Of Rooms:</span>
        <b className="text-blue-600">14</b>
      </p>
      <p className="mt-2 flex items-center justify-between gap-8 text-slate-600">
        <span>Room Count:</span>
        <b className="text-emerald-600">{roomCount}</b>
      </p>
      <p className="mt-2 flex items-center justify-between gap-8 text-slate-600">
        <span>Occupancy Rate:</span>
        <b className="text-purple-500">{occupancy.toFixed(1)}%</b>
      </p>
    </div>
  );
}

export function Gauge({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  const rotation = -90 + clamped * 1.8;

  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-500 shadow-sm">Needs Attention</span>
      </div>
      <div className="relative mx-auto h-28 w-56 overflow-hidden">
        <div className="absolute inset-x-4 top-8 h-24 rounded-t-full border-[10px] border-b-0 border-slate-200" />
        <div
          className="absolute left-1/2 top-[104px] h-1 w-24 origin-left rounded-full bg-red-500"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <div className="absolute inset-x-0 top-14 text-center">
          <p className="text-3xl font-semibold text-red-500">{value.toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Occupancy Rate</p>
        </div>
      </div>
    </div>
  );
}

export function PlatformBookingsDonut() {
  const data = [
    { label: "Agoda", value: 79, roomNights: 19, color: "#8980df" },
    { label: "Expedia", value: 21, roomNights: 5, color: "#7acb93" }
  ];

  return (
    <DonutChart
      data={data}
      total={24}
      totalLabel="Total Room Nights"
      footer="Showing platform bookings from Jun 01, 2026 to Jun 30, 2026"
      height={300}
      centerX="48%"
    />
  );
}

export function MonthlyRoomNightChart() {
  const data = [
    { month: "May 2026", roomNights: 11, cancelled: 0, noShow: 0 },
    { month: "Jun 2026", roomNights: 23, cancelled: 0, noShow: 0 }
  ];

  return (
    <div className="min-h-[310px]">
      <div className="mb-4 flex justify-center gap-4 text-sm">
        <LegendSwatch color="#67c9e8" label="Room Nights" />
        <LegendSwatch color="#ff6269" label="Cancelled" />
        <LegendSwatch color="#ffb84c" label="No Show" />
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="roomNightSummaryFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#67c9e8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#67c9e8" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8edf4" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "#94a3b8" }} tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis domain={[0, 25]} tickLine={false} axisLine={{ stroke: "#94a3b8" }} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip content={<RoomNightTooltip />} />
            <Area type="monotone" dataKey="roomNights" stroke="#67c9e8" strokeWidth={2.5} fill="url(#roomNightSummaryFill)" activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="cancelled" stroke="#ff6269" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="noShow" stroke="#ffb84c" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RoomNightTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload; label?: string }) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((item) => [item.dataKey, Number(item.value ?? 0)]));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="mb-2 font-semibold text-ink">{label}</p>
      <p className="text-cyan-500">Room Nights: {values.roomNights ?? 0}</p>
      <p className="mt-1 text-red-500">Cancelled: {values.cancelled ?? 0}</p>
      <p className="mt-1 text-amber-500">No Show: {values.noShow ?? 0}</p>
    </div>
  );
}

function DonutChart({
  data,
  total,
  totalLabel,
  footer,
  height,
  centerX
}: {
  data: Array<{ label: string; value: number; roomNights: number; color: string }>;
  total: number;
  totalLabel: string;
  footer: string;
  height: number;
  centerX: string;
}) {
  return (
    <div className="min-h-[310px]">
      <div className="text-center">
        <p className="text-sm text-slate-500">{totalLabel}</p>
        <p className="text-3xl font-semibold text-purple-500">{total}</p>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx={centerX}
              cy="52%"
              innerRadius={54}
              outerRadius={90}
              paddingAngle={1}
              stroke="#fff"
              strokeWidth={2}
              labelLine
              label={({ cx, cy, midAngle, outerRadius, payload, value, fill }) => {
                const radius = Number(outerRadius) + 30;
                const radians = (-Number(midAngle) * Math.PI) / 180;
                const x = Number(cx) + radius * Math.cos(radians);
                const y = Number(cy) + radius * Math.sin(radians);
                const anchor = x > Number(cx) ? "start" : "end";
                const item = payload as { label?: string } | undefined;

                return (
                  <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill={String(fill)} className="text-sm font-semibold">
                    {item?.label ?? ""} ({Number(value).toFixed(0)}%)
                  </text>
                );
              }}
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-4 flex flex-wrap justify-center gap-4 text-sm">
        {data.map((item) => (
          <LegendSwatch key={item.label} color={item.color} label={item.label} />
        ))}
      </div>
      <p className="text-center text-sm text-slate-500">{footer}</p>
    </div>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload ?? {};

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-ink">{String(item.label ?? "")}</p>
      <p className="mt-1 text-slate-600">
        Room Nights: <b className="text-blue-600">{Number(item.roomNights ?? 0)}</b>
      </p>
      <p className="text-slate-600">
        Share: <b className="text-purple-500">{Number(item.value ?? 0).toFixed(1)}%</b>
      </p>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function RoomNightsByCountryMap() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const markers = [
    { code: "GB", label: "United Kingdom", x: 431, y: 160, radius: 8, roomNights: 2 },
    { code: "IN", label: "India", x: 620, y: 300, radius: 13, roomNights: 6 },
    { code: "BD", label: "Bangladesh", x: 662, y: 287, radius: 14, roomNights: 7 },
    { code: "LK", label: "Sri Lanka", x: 625, y: 342, radius: 28, roomNights: 24 },
    { code: "AU", label: "Australia", x: 790, y: 456, radius: 10, roomNights: 3 }
  ];
  const hovered = markers.find((marker) => marker.code === hoveredCountry);

  return (
    <div className="relative min-h-[510px] overflow-hidden rounded-md bg-white" onMouseLeave={() => setHoveredCountry(null)}>
      <svg viewBox="0 0 980 560" className="h-[510px] w-full">
        <g fill="#e5e9ef" stroke="#d0d7df" strokeWidth="1">
          <path d="M80 172l66-36 98 6 60 48-16 62-78 22-94-28z" />
          <path d="M198 258l74 12 44 72-36 78-62 24-64-64 16-78z" />
          <path d="M340 132l82-20 116 38 56 70-18 76-92 18-116-38-54-74z" />
          <path d="M544 190l128-20 130 32 72 74-48 54-126-4-108-48z" />
          <path d="M456 304l88-28 100 32 48 88-60 58-118-34-76-64z" />
          <path d="M724 390l82 18 54 70-58 44-94-24-24-64z" />
          <path d="M270 94l62-36 76 26-10 44-84 10z" />
          <path d="M668 124l174-20 78 54-72 38-166-16z" />
        </g>
        <g stroke="#d7dde5" strokeWidth="1.2">
          <path d="M332 90c44 52 74 104 92 164" fill="none" />
          <path d="M484 178c22 48 36 96 44 144" fill="none" />
          <path d="M620 202c-24 42-42 90-50 144" fill="none" />
          <path d="M700 248c32 50 50 102 54 156" fill="none" />
          <path d="M136 252c64 10 124 18 180 24" fill="none" />
          <path d="M406 300c86 6 182 8 286 6" fill="none" />
        </g>
        <path d="M555 212c20-10 54-15 83-8 20 5 35 16 45 32-32 8-74 10-118 3z" fill="#9aa3ad" opacity="0.8" />

        {markers.map((marker) => (
          <g
            key={marker.code}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredCountry(marker.code)}
            onMouseMove={() => setHoveredCountry(marker.code)}
          >
            <circle cx={marker.x} cy={marker.y} r={marker.radius + 5} fill="#fff" opacity="0.95" />
            <circle cx={marker.x} cy={marker.y} r={marker.radius} fill="#5ec4e0" opacity={marker.code === "LK" ? "0.95" : "0.65"} />
            <text x={marker.x} y={marker.y + marker.radius + 18} textAnchor="middle" className="fill-slate-700 text-[16px] font-semibold">
              {marker.code}
            </text>
          </g>
        ))}
      </svg>
      {hovered ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
          <p className="font-semibold text-ink">{hovered.label}</p>
          <p className="mt-1 text-slate-600">Room Nights: <b className="text-cyan-500">{hovered.roomNights}</b></p>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-4 text-xs text-slate-500">
        <LegendSwatch color="#c7edf6" label="Low Volume" />
        <LegendSwatch color="#91dced" label="Medium Volume" />
        <LegendSwatch color="#5ec4e0" label="High Volume" />
        <LegendSwatch color="#5ec4e0" label="Marker size = Room night volume" />
      </div>
    </div>
  );
}
