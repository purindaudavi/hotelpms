"use client";

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
  const angle = Math.PI - (clamped / 100) * Math.PI;
  const needleX = 120 + 76 * Math.cos(angle);
  const needleY = 110 - 76 * Math.sin(angle);

  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          Projection
        </span>
      </div>

      <div className="relative mx-auto h-36 w-full max-w-60 overflow-hidden">
        <svg
          viewBox="0 0 240 144"
          className="h-full w-full"
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
          <line
            x1="120"
            y1="110"
            x2={needleX}
            y2={needleY}
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-cyan-500"
          />
          <circle
            cx="120"
            cy="110"
            r="6"
            fill="currentColor"
            className="text-cyan-500"
          />
        </svg>

        <p
          className="pointer-events-none absolute inset-x-0 top-[58px] text-center text-3xl font-semibold text-cyan-600"
        >
          {value.toFixed(1)}%
        </p>
        <p className="pointer-events-none absolute inset-x-0 top-[122px] text-center text-xs text-slate-500">
          Occupancy Rate
        </p>
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

  if (!data.length) {
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
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={90}
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <Legend data={chartData} />
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
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 18, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="#e8edf4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="room_nights"
              name="Room nights"
              stroke="#67c9e8"
              fill="#67c9e8"
              fillOpacity={0.2}
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
