import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BedDouble,
  Boxes,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Sparkles,
  WalletCards,
} from "lucide-react";

const navigation: Array<{ label: string; icon: LucideIcon; active?: boolean }> = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Reservations", icon: CalendarDays },
  { label: "Room & Rates", icon: BedDouble },
  { label: "Inventory", icon: Boxes },
  { label: "Housekeeping", icon: Sparkles },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

function MetricCard({
  icon: Icon,
  value,
  title,
  detail,
  accent,
}: {
  icon: LucideIcon;
  value: string;
  title: string;
  detail: string;
  accent: "green" | "purple" | "white";
}) {
  const accentClasses = {
    green: "text-[#45e184]",
    purple: "text-[#9c75ff]",
    white: "text-white",
  }[accent];

  return (
    <div className="rounded-[12px] border border-white/10 bg-[#06111b]/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-[10px] border border-white/10 bg-[#07131f] ${accentClasses}`}>
          <Icon size={21} strokeWidth={2} />
        </span>
        <strong className={`text-[clamp(18px,2vw,31px)] font-bold tracking-tight ${accentClasses}`}>
          {value}
        </strong>
      </div>
      <p className="mt-3 text-[13px] font-semibold text-white">{title}</p>
      <p className={`mt-1 text-[11px] ${accent === "green" ? "text-[#45e184]" : "text-slate-400"}`}>
        {detail}
      </p>
    </div>
  );
}

function OccupancyChart() {
  const bars = [112, 76, 62, 51, 22, 8, 4];
  const points = [58, 92, 125, 143, 196, 218, 232];
  const labels = ["May 12", "May 13", "May 14", "May 15", "May 16", "May 17", "May 18"];

  return (
    <div className="mt-4 rounded-[12px] border border-white/10 bg-[#06111b]/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-white">Occupancy Trend</h3>
          <p className="mt-0.5 text-[10px] text-slate-400">Daily room demand for the last 7 days</p>
        </div>
        <div className="flex gap-4 text-[9px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-cyan-400" /> Occupancy (%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-orange-500" /> Rooms Sold
          </span>
        </div>
      </div>

      <svg className="mt-3 block h-auto w-full" viewBox="0 0 700 245" role="img" aria-label="Seven day occupancy preview">
        <defs>
          <linearGradient id="login-chart-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#54ddf0" />
            <stop offset="100%" stopColor="#16c9df" />
          </linearGradient>
        </defs>
        {[45, 95, 145, 195].map((y) => (
          <line key={y} x1="50" y1={y} x2="680" y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
        ))}
        <line x1="50" y1="20" x2="50" y2="205" stroke="#8b98aa" strokeWidth="1.2" />
        <line x1="50" y1="205" x2="680" y2="205" stroke="#8b98aa" strokeWidth="1.2" />
        {[100, 75, 50, 25, 0].map((value, index) => (
          <text key={value} x="38" y={28 + index * 44.2} fill="#8793a5" fontSize="10" textAnchor="end">
            {value}
          </text>
        ))}
        {bars.map((height, index) => {
          const x = 75 + index * 88;
          return <rect key={labels[index]} x={x} y={205 - height} width="29" height={height} rx="3" fill="url(#login-chart-bar)" />;
        })}
        <polyline
          points={points.map((y, index) => `${89 + index * 88},${y}`).join(" ")}
          fill="none"
          stroke="#ff7a1a"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((y, index) => (
          <circle key={labels[index]} cx={89 + index * 88} cy={y} r="5" fill="#f8fafc" stroke="#ff7a1a" strokeWidth="2" />
        ))}
        {labels.map((label, index) => (
          <text key={label} x={89 + index * 88} y="228" fill="#9aa6b6" fontSize="10" textAnchor="middle">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function LoginShowcase() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/15 bg-[#030b13]/80 shadow-[0_25px_70px_rgba(0,75,170,0.18)]">
      <div className="grid grid-cols-[23%_77%]">
        <aside className="border-r border-white/10 bg-[#06111b]/80 p-3">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-white">
            <span className="grid size-7 place-items-center rounded-md bg-[#061b2c] text-[#1d8cff]">
              <BedDouble size={16} />
            </span>
            StayPilot
          </div>
          <nav className="space-y-1.5" aria-label="Dashboard preview navigation">
            {navigation.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[10px] ${
                  active ? "bg-gradient-to-r from-[#0875ff] to-[#0b5fff] text-white" : "text-slate-300"
                }`}
              >
                <Icon size={13} strokeWidth={1.8} />
                <span>{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon={BedDouble} value="24" title="Arrivals" detail="Today" accent="green" />
            <MetricCard icon={BarChart3} value="62.5%" title="Occupancy" detail="18 / 29 rooms" accent="purple" />
            <MetricCard icon={WalletCards} value="LKR 320,800" title="Revenue" detail="Today" accent="white" />
          </div>
          <OccupancyChart />
        </div>
      </div>
    </div>
  );
}
