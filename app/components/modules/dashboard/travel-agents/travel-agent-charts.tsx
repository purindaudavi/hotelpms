"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TooltipPayload = Array<{
  dataKey?: string;
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
}>;

export function AgentBookingStatusChart() {
  const agents = [
    { agent: "Agoda", roomNights: 18, cancelled: 0, noShow: 0 },
    { agent: "Expedia", roomNights: 5, cancelled: 0, noShow: 0 }
  ];

  return (
    <div className="min-h-[420px]">
      <div className="mb-3 flex justify-center gap-4 text-base">
        <span className="inline-flex items-center gap-1.5 text-cyan-500"><span className="h-3.5 w-3.5 bg-cyan-400" />Room Nights</span>
        <span className="inline-flex items-center gap-1.5 text-red-500"><span className="h-3.5 w-3.5 bg-red-400" />Cancelled</span>
        <span className="inline-flex items-center gap-1.5 text-amber-500"><span className="h-3.5 w-3.5 bg-amber-400" />No Show</span>
      </div>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={agents} margin={{ top: 14, right: 28, left: 12, bottom: 50 }}>
            <CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" vertical />
            <XAxis dataKey="agent" tickLine={false} axisLine={{ stroke: "#8b8b8b" }} tick={{ fill: "#64748b", fontSize: 12 }} angle={-45} textAnchor="end" />
            <YAxis
              domain={[0, 20]}
              ticks={[0, 5, 10, 15, 20]}
              tickLine={false}
              axisLine={{ stroke: "#8b8b8b" }}
              tick={{ fill: "#64748b", fontSize: 14 }}
              label={{ value: "Count", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 13 }}
            />
            <Tooltip cursor={{ fill: "#bdbdbd", opacity: 0.7 }} content={<AgentStatusTooltip />} />
            <Bar dataKey="roomNights" fill="#5ec4e0" radius={[4, 4, 0, 0]} barSize={168} />
            <Bar dataKey="cancelled" fill="#ff6269" radius={[4, 4, 0, 0]} barSize={168} />
            <Bar dataKey="noShow" fill="#ffb84c" radius={[4, 4, 0, 0]} barSize={168} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-sm text-slate-500">Showing data from Jun 01, 2026 to Jun 30, 2026</p>
    </div>
  );
}

function AgentStatusTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload; label?: string }) {
  if (!active || !payload?.length) return null;
  const values = Object.fromEntries(payload.map((item) => [item.dataKey, Number(item.value ?? 0)]));
  const total = Number(values.roomNights ?? 0) + Number(values.cancelled ?? 0) + Number(values.noShow ?? 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
      <p className="mb-3 font-semibold text-ink">{label}</p>
      <p className="flex items-center justify-between gap-8 text-slate-600"><span><span className="mr-2 inline-block h-3 w-3 rounded-full bg-cyan-400" />roomNights:</span><b className="text-cyan-500">{values.roomNights ?? 0}</b></p>
      <p className="mt-3 flex items-center justify-between gap-8 text-slate-600"><span><span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-400" />cancelled:</span><b className="text-red-500">{values.cancelled ?? 0}</b></p>
      <p className="mt-3 flex items-center justify-between gap-8 text-slate-600"><span><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-400" />noShow:</span><b className="text-amber-500">{values.noShow ?? 0}</b></p>
      <div className="mt-3 border-t border-line pt-3 font-semibold"><span>Total:</span><span className="float-right">{total}</span></div>
    </div>
  );
}

export function AgentRoomNightDistribution() {
  return (
    <AgentDonutCard
      total={23}
      data={[
        { label: "Agoda", value: 78.3, displayPercent: "78", roomNights: 18, color: "#5ec4e0" },
        { label: "Expedia", value: 21.7, displayPercent: "22", roomNights: 5, color: "#ff6269" }
      ]}
      footer="Showing data from Jun 01, 2026 to Jun 30, 2026"
    />
  );
}

export function MealPlanDistributionChart() {
  return (
    <AgentDonutCard
      total={24}
      data={[{ label: "Bed & Breakfast", value: 100, displayPercent: "100", roomNights: 24, color: "#5ec4e0" }]}
      footer="Showing data from Jun 01, 2026 to Jun 30, 2026"
    />
  );
}

function AgentDonutCard({
  total,
  data,
  footer
}: {
  total: number;
  data: Array<{ label: string; value: number; displayPercent: string; roomNights: number; color: string }>;
  footer: string;
}) {
  return (
    <div className="min-h-[420px]">
      <div className="text-center">
        <p className="text-sm text-slate-500">Total Room Nights</p>
        <p className="text-4xl font-semibold text-purple-500">{total}</p>
      </div>
      <div className="mt-4 grid min-h-[285px] grid-cols-[minmax(0,1fr)_150px] items-center gap-4">
        <div className="h-[285px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={92}
                paddingAngle={data.length > 1 ? 1 : 0}
                stroke="#fff"
                strokeWidth={2}
                labelLine
                label={({ cx, cy, midAngle, outerRadius, payload, fill }) => {
                  const radius = Number(outerRadius) + 34;
                  const radians = (-Number(midAngle) * Math.PI) / 180;
                  const x = Number(cx) + radius * Math.cos(radians);
                  const y = Number(cy) + radius * Math.sin(radians);
                  const anchor = x > Number(cx) ? "start" : "end";
                  const item = payload as { displayPercent?: string; label?: string };

                  return (
                    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill={String(fill)} className="text-[15px] font-semibold">
                      {String(item.label ?? "")} ({item.displayPercent}%)
                    </text>
                  );
                }}
              >
                {data.map((item) => (
                  <Cell key={item.label} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={<AgentDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3 text-sm">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <b className="text-slate-700">{item.value.toFixed(1)}%</b>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-slate-500">{footer}</p>
    </div>
  );
}

function AgentDonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload ?? {};

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-ink">{String(item.label ?? "")}</p>
      <p className="mt-1 text-slate-600">Room Nights: <b className="text-blue-600">{Number(item.roomNights ?? 0)}</b></p>
      <p className="text-slate-600">Share: <b className="text-purple-500">{Number(item.value ?? 0).toFixed(1)}%</b></p>
    </div>
  );
}
