import { ArrowRight, BarChart3, BedDouble, CreditCard } from "lucide-react";
import type { DashboardSummary } from "@/app/lib/dashboard-api";
import { DateRangePill, DashboardMetricCard } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";
import { Gauge, MonthlyRoomNightChart, PlatformBookingsDonut, RoomNightsByCountryMap, TrendChart } from "./live-overview-charts";

export function DashboardOverview({ data }: { data: DashboardSummary }) {
  const { overview } = data;
  const period = `${formatDate(data.period.date_from)} - ${formatDate(data.period.date_to)}`;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardMetricCard title="Arrivals" value={overview.arrivals} detail={`${overview.arrival_guests} guests`} tone="emerald" icon={<BedDouble />} />
        <DashboardMetricCard title="Departures" value={overview.departures} detail={`${overview.departure_rooms} rooms`} tone="orange" icon={<ArrowRight />} />
        <DashboardMetricCard title="Occupancy" value={`${overview.occupancy.toFixed(1)}%`} detail={`${overview.occupied_rooms}/${overview.sellable_rooms} sellable rooms`} tone="blue" icon={<BarChart3 />} />
        <DashboardMetricCard title="Revenue" value={money(overview.revenue, data.currency)} detail={overview.revenue_label} tone="violet" icon={<CreditCard />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <DashboardPanel title="Occupancy Trends" subtitle="Daily room demand for the active system date range">
          <div className="h-72">
            <TrendChart data={data.occupancy_trend} />
          </div>
        </DashboardPanel>
        <DashboardPanel title="Monthly Occupancy" subtitle="Current and next month projection">
          <div className="grid gap-4">
            {data.monthly_occupancy.map((item) => <Gauge key={item.month} label={formatMonth(item.month)} value={item.occupancy} />)}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="Bookings by Source" subtitle="Room-night distribution by booking source" action={<DateRangePill label={period} />}>
          <PlatformBookingsDonut data={data.booking_sources} />
        </DashboardPanel>
        <DashboardPanel title="Monthly Room Night Summary" subtitle="Room nights, cancellations, and no-shows by month">
          <MonthlyRoomNightChart data={data.monthly_room_nights} />
        </DashboardPanel>
        <DashboardPanel title="Guest Rating Breakdown" subtitle="Rating breakdown by category">
          <div className="grid min-h-[310px] place-items-center text-center text-base text-slate-500">No rating data available</div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Room Nights by Country"
        subtitle="Geographic distribution - marker size and color intensity represent volume"
        action={<DateRangePill label={period} />}
      >
        <RoomNightsByCountryMap data={data.countries} />
      </DashboardPanel>
    </>
  );
}

function money(value: number, currency: string) { return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatMonth(value: string) { return new Intl.DateTimeFormat("en-LK", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`)); }
