import { BedDouble, CalendarDays, Users, X } from "lucide-react";
import { DateRangePill } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";
import { AgentBookingStatusChart, AgentRoomNightDistribution, MealPlanDistributionChart } from "./travel-agent-charts";

export function DashboardTravelAgents() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reservation Status Summary</h2>
          <p className="mt-1 text-sm text-slate-500">Overview of room nights, cancellations, no-shows, and new agent bookings</p>
        </div>
        <DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <TravelAgentStatusCard title="Room Nights" value="24" change="85.7%" tone="blue" icon={<BedDouble className="h-5 w-5" />} />
        <TravelAgentStatusCard title="Cancelled" value="4" change="14.3%" tone="red" icon={<X className="h-5 w-5" />} />
        <TravelAgentStatusCard title="No Show" value="0" change="0.0%" tone="purple" icon={<Users className="h-5 w-5" />} />
        <TravelAgentStatusCard title="New Bookings" value="36" change="100.0%" tone="green" icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Agent Booking Status"
          subtitle="Room nights, cancellations, and no-shows by agent (Top 10)"
          action={<DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />}
        >
          <AgentBookingStatusChart />
        </DashboardPanel>
        <DashboardPanel title="Room Night Distribution" subtitle="Room night share by agent" action={<DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />}>
          <AgentRoomNightDistribution />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Meal Plan Distribution" subtitle="Room nights by meal plan type" action={<DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />}>
          <MealPlanDistributionChart />
        </DashboardPanel>
      </div>
    </div>
  );
}

function TravelAgentStatusCard({
  title,
  value,
  change,
  tone,
  icon
}: {
  title: string;
  value: string;
  change: string;
  tone: "blue" | "red" | "purple" | "green";
  icon: React.ReactElement;
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    red: "border-red-200 bg-red-50 text-red-600",
    purple: "border-purple-200 bg-purple-50 text-purple-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };
  const iconBg = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    green: "bg-emerald-500"
  };

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-lg text-white ${iconBg[tone]}`}>{icon}</div>
          <p className="font-semibold">{title}</p>
        </div>
        <p className="text-3xl font-semibold">{value}</p>
      </div>
      <p className={`mt-5 text-right text-sm font-semibold ${tone === "red" || tone === "purple" ? "text-red-500" : "text-emerald-600"}`}>
        {tone === "red" || tone === "purple" ? "down" : "up"} {change}
      </p>
    </section>
  );
}
