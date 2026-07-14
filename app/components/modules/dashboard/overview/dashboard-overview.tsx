import { ArrowRight, BarChart3, BedDouble, CreditCard } from "lucide-react";
import { currency, Reservation, Room } from "@/app/data/pms-data";
import { DateRangePill, DashboardMetricCard } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";
import { sumGuests } from "../utils";
import { Gauge, MonthlyRoomNightChart, PlatformBookingsDonut, RoomNightsByCountryMap, TrendChart } from "./overview-charts";

type DashboardOverviewProps = {
  arrivals: Reservation[];
  departures: Reservation[];
  occupiedRooms: number;
  occupancy: number;
  roomList: Room[];
  revenue: number;
};

export function DashboardOverview({ arrivals, departures, occupiedRooms, occupancy, roomList, revenue }: DashboardOverviewProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardMetricCard title="Arrivals" value={arrivals.length} detail={`${sumGuests(arrivals)} guests`} tone="emerald" icon={<BedDouble />} />
        <DashboardMetricCard title="Departures" value={departures.length} detail={`${departures.length} rooms`} tone="orange" icon={<ArrowRight />} />
        <DashboardMetricCard title="Occupancy" value={`${occupancy}%`} detail={`${occupiedRooms}/${roomList.length} rooms`} tone="blue" icon={<BarChart3 />} />
        <DashboardMetricCard title="Revenue" value={currency(revenue)} detail="Posted transactions" tone="violet" icon={<CreditCard />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <DashboardPanel title="Occupancy Trends" subtitle="Daily room demand for the active system date range">
          <div className="h-72">
            <TrendChart values={[26, 38, 42, 31, 47, occupancy, 53]} />
          </div>
        </DashboardPanel>
        <DashboardPanel title="Monthly Occupancy" subtitle="Current and next month projection">
          <div className="grid gap-4">
            <Gauge label="June 2026" value={occupancy} />
            <Gauge label="July 2026" value={18} />
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="Bookings by Platform" subtitle="Room night distribution across booking platforms" action={<DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />}>
          <PlatformBookingsDonut />
        </DashboardPanel>
        <DashboardPanel title="Monthly Room Night Summary" subtitle="Room nights, cancellations, and no-shows by month">
          <MonthlyRoomNightChart />
        </DashboardPanel>
        <DashboardPanel title="Guest Rating Breakdown" subtitle="Rating breakdown by category">
          <div className="grid min-h-[310px] place-items-center text-center text-base text-slate-500">No rating data available</div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Room Nights by Country"
        subtitle="Geographic distribution - marker size and color intensity represent volume"
        action={<DateRangePill label="Jun 01, 2026 - Jun 30, 2026" />}
      >
        <RoomNightsByCountryMap />
      </DashboardPanel>
    </>
  );
}
