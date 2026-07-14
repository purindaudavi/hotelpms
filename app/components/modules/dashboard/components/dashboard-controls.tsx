import { CalendarDays } from "lucide-react";

export function DateRangePill({ label }: { label: string }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-700">
      <CalendarDays className="h-4 w-4" />
      <span className="max-w-[190px] truncate">{label}</span>
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`h-10 min-w-24 rounded-md px-4 text-sm font-semibold ${value === option ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function DashboardMetricCard({
  title,
  value,
  detail,
  tone,
  icon
}: {
  title: string;
  value: number | string;
  detail: string;
  tone: "emerald" | "orange" | "blue" | "violet";
  icon: React.ReactElement;
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700"
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/80">{icon}</div>
        <span className="text-4xl font-semibold">{value}</span>
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-75">{detail}</p>
    </div>
  );
}
