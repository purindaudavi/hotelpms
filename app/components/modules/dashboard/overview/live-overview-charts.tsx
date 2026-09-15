"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import {
  Area,
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

type OccupancyPoint = {
  date: string;
  occupied_rooms: number;
  total_rooms: number;
  occupancy: number;
};

type RoomNightPoint = {
  month: string;
  room_nights: number;
  cancelled: number;
  no_show: number;
};

type RoomNightGroup = {
  label: string;
  room_nights: number;
};

const colors = ["#5ec4e0", "#8980df", "#7acb93", "#ffb84c", "#ff6269", "#64748b"];

export function TrendChart({ data }: { data: OccupancyPoint[] }) {
  const chartData = data.map((item) => ({ ...item, label: formatDay(item.date) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 18, left: 4, bottom: 8 }}
      >
        <CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={28}
          tickLine={false}
          axisLine={{ stroke: "#94a3b8" }}
          tick={{ fill: "#64748b", fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={{ stroke: "#94a3b8" }}
          tick={{ fill: "#64748b", fontSize: 11 }}
        />
        <Tooltip
          formatter={(value, name) =>
            name === "occupancy"
              ? [`${Number(value).toFixed(1)}%`, "Occupancy"]
              : [value, name]
          }
        />
        <Bar
          dataKey="occupancy"
          fill="#67c9e8"
          radius={[4, 4, 0, 0]}
          barSize={46}
        />
        <Line
          type="monotone"
          dataKey="occupancy"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#fff", stroke: "#f97316", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Gauge({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  const status = clamped < 50
    ? { label: "Needs Attention", color: "#ff5141", Icon: TrendingDown }
    : clamped < 80
      ? { label: "On Track", color: "#0ea5a5", Icon: TrendingUp }
      : { label: "High Occupancy", color: "#4db08b", Icon: TrendingUp };

  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm" title="Below 50%: Needs Attention; 50–79.9%: On Track; 80% and above: High Occupancy. Based on existing bookings.">
          <status.Icon className="h-3.5 w-3.5" style={{ color: status.color }} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-60 text-center">
        <svg
          viewBox="0 0 240 120"
          className="block h-auto w-full"
          role="img"
          aria-label={`${value.toFixed(1)} percent occupancy`}
        >
          <path
            d="M 25 110 A 95 95 0 0 1 215 110"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="butt"
            className="text-slate-200"
          />
          <path
            d="M 25 110 A 95 95 0 0 1 215 110"
            fill="none"
            pathLength="100"
            strokeDasharray={`${clamped} 100`}
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="butt"
            style={{ color: status.color }}
          />
        </svg>

        <div className="absolute inset-x-0 bottom-2">
        <p
          className="text-3xl font-semibold tabular-nums"
          style={{ color: status.color }}
        >
          {value.toFixed(1)}%
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Occupancy Rate
        </p>
        </div>
      </div>
    </div>
  );
}

export function PlatformBookingsDonut({ data }: { data: RoomNightGroup[] }) {
  const total = data.reduce((sum, item) => sum + item.room_nights, 0);
  const chartData = data.map((item, index) => ({
    ...item,
    value: total ? (item.room_nights / total) * 100 : 0,
    color: colors[index % colors.length]
  }));

  if (!data.length || total <= 0) {
    return <Empty label="No booking-source room nights for this period" />;
  }

  return (
    <div className="min-h-[310px]">
      <div className="text-center">
        <p className="text-sm text-slate-500">Total Room Nights</p>
        <p className="text-3xl font-semibold text-purple-500">{total}</p>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="room_nights"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="68%"
              paddingAngle={data.length > 1 ? 2 : 0}
              label={({ percent }) => `${Math.round(Number(percent ?? 0) * 100)}%`}
              labelLine={{ stroke: "#94a3b8" }}
              stroke="var(--theme-panel)"
              strokeWidth={2}
            >
              {chartData.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const nights = Number(value);
                return [`${nights.toLocaleString()} room ${nights === 1 ? "night" : "nights"} (${(nights / total * 100).toFixed(1)}%)`, name];
              }}
              contentStyle={{ backgroundColor: "var(--theme-panel)", borderColor: "rgb(var(--theme-line-rgb))", borderRadius: 8, whiteSpace: "normal" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <Legend data={chartData.map((item) => ({ ...item, label: `${item.label} (${Math.round(item.value)}%)` }))} />
    </div>
  );
}

export function MonthlyRoomNightChart({ data }: { data: RoomNightPoint[] }) {
  const chartData = data.map((item) => ({ ...item, label: formatMonth(item.month) }));

  if (!data.length) {
    return <Empty label="No monthly room-night data" />;
  }

  return (
    <div className="min-h-[310px]">
      <div className="h-[285px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 18, left: 12, bottom: 24 }}
          >
            <CartesianGrid stroke="#e8edf4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              label={{ value: "Stay month", position: "insideBottom", offset: -14, fill: "#94a3b8" }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
            <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()} ${name === "Room nights" ? "room nights" : "reservations"}`, name]} />
            <Area
              type="monotone"
              dataKey="room_nights"
              name="Room nights"
              stroke="#67c9e8"
              fill="#67c9e8"
              fillOpacity={0.2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="cancelled"
              name="Cancelled"
              stroke="#ff6269"
            />
            <Line
              type="monotone"
              dataKey="no_show"
              name="No show"
              stroke="#ffb84c"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600">
        {[
          { label: "Room nights", color: "#67c9e8" },
          { label: "Cancelled reservations", color: "#ff6269" },
          { label: "No-show reservations", color: "#ffb84c" }
        ].map((item) => <span key={item.label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
      </div>
      <p className="mt-3 text-xs text-slate-500">Room nights count rooms × nights stayed or booked. Cancellations and no-shows count reservations overlapping each month.</p>
    </div>
  );
}

export function RoomStatusChart({ data }: { data?: Array<{ status: string; count: number }> }) {
  if (!data) return <Empty label="Room status data is unavailable. Refresh after updating the server." />;
  const styles: Record<string, { label: string; color: string }> = {
    available: { label: "Available", color: "#51b18c" },
    occupied: { label: "Occupied", color: "#5ec4e0" },
    out_of_order: { label: "Out of order", color: "#ff6269" },
    maintenance: { label: "Maintenance", color: "#ffb84c" }
  };
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <Empty label="No active rooms configured" />;
  const chartData = data.map((item) => ({ ...item, ...(styles[item.status] ?? { label: item.status, color: "#94a3b8" }) }));
  return (
    <div className="min-h-[310px]">
      <div className="text-center"><p className="text-sm text-slate-500">Total active rooms</p><p className="text-3xl font-semibold">{total}</p></div>
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData.filter((item) => item.count > 0)} dataKey="count" nameKey="label" innerRadius="48%" outerRadius="68%" stroke="var(--theme-panel)" strokeWidth={2} label={({ percent }) => `${Math.round(Number(percent ?? 0) * 100)}%`}>
              {chartData.filter((item) => item.count > 0).map((item) => <Cell key={item.status} fill={item.color} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${Number(value)} ${Number(value) === 1 ? "room" : "rooms"} (${(Number(value) / total * 100).toFixed(1)}%)`, name]} contentStyle={{ backgroundColor: "var(--theme-panel)", borderColor: "rgb(var(--theme-line-rgb))", borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2 text-sm">
        {chartData.map((item) => <div key={item.status} className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><span className="text-slate-500">{item.count} rooms · {(item.count / total * 100).toFixed(1)}%</span></div>)}
      </div>
      <p className="mt-3 text-xs text-slate-500">Current room records. Available rooms may still need housekeeping.</p>
    </div>
  );
}

export function RoomNightsByCountryMap({ data }: { data: RoomNightGroup[] }) {
  const maximum = Math.max(...data.map((item) => item.room_nights), 1);

  if (!data.length) {
    return <Empty label="No guest-country room nights for this period" />;
  }

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-line bg-slate-50 p-4"
        >
          <div className="flex justify-between gap-3">
            <b>{item.label}</b>
            <span>{item.room_nights} nights</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-cyan-500"
              style={{ width: `${(item.room_nights / maximum) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Legend({ data }: { data: Array<RoomNightGroup & { color: string }> }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 text-sm">
      {data.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-slate-600"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid min-h-[310px] place-items-center text-center text-slate-500">
      {label}
    </div>
  );
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC"
  }).format(new Date(`${value}-01T00:00:00Z`));
}
