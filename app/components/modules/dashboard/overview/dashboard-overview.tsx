"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BedDouble, CreditCard } from "lucide-react";
import type { DashboardDateRange, DashboardSummary } from "@/app/lib/dashboard-api";
import { DateRangePill, DashboardMetricCard } from "../components/dashboard-controls";
import { DashboardPanel } from "../components/dashboard-panel";
import { Gauge, MonthlyRoomNightChart, PlatformBookingsDonut, RoomNightsByCountryMap, RoomStatusChart, TrendChart } from "./live-overview-charts";

export function DashboardOverview({
  data,
  loadRangeData
}: {
  data: DashboardSummary;
  loadRangeData: (period: DashboardDateRange) => Promise<DashboardSummary>;
}) {
  const { overview } = data;
  const [trendData, setTrendData] = useState(data.occupancy_trend);
  const [sourceData, setSourceData] = useState(data.booking_sources);
  const [countryData, setCountryData] = useState(data.countries);
  const [trendPeriod, setTrendPeriod] = useState(() => periodForTrend(data));
  const [sourcePeriod, setSourcePeriod] = useState(data.period);
  const [countryPeriod, setCountryPeriod] = useState(data.period);
  const [monthlyData, setMonthlyData] = useState(data.monthly_room_nights);
  const [monthlyPeriod, setMonthlyPeriod] = useState(() => periodForMonths(data));

  useEffect(() => {
    setTrendData(data.occupancy_trend);
    setSourceData(data.booking_sources);
    setCountryData(data.countries);
    setTrendPeriod(periodForTrend(data));
    setSourcePeriod(data.period);
    setCountryPeriod(data.period);
    setMonthlyData(data.monthly_room_nights);
    setMonthlyPeriod(periodForMonths(data));
  }, [data]);

  const updateTrend = async (period: DashboardDateRange) => {
    const filtered = await loadRangeData(period);
    setTrendData(filtered.occupancy_trend);
    setTrendPeriod(filtered.period);
  };
  const updateSources = async (period: DashboardDateRange) => {
    const filtered = await loadRangeData(period);
    setSourceData(filtered.booking_sources);
    setSourcePeriod(filtered.period);
  };
  const updateCountries = async (period: DashboardDateRange) => {
    const filtered = await loadRangeData(period);
    setCountryData(filtered.countries);
    setCountryPeriod(filtered.period);
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardMetricCard title="Arrivals" value={overview.arrivals} detail={`${overview.arrival_guests} guests`} tone="emerald" icon={<BedDouble />} />
        <DashboardMetricCard title="Departures" value={overview.departures} detail={`${overview.departure_rooms} rooms`} tone="orange" icon={<ArrowRight />} />
        <DashboardMetricCard title="Occupancy" value={`${overview.occupancy.toFixed(1)}%`} detail={`${overview.occupied_rooms}/${overview.sellable_rooms} sellable rooms`} tone="blue" icon={<BarChart3 />} />
        <DashboardMetricCard title="Revenue" value={money(overview.revenue, data.currency)} detail={overview.revenue_label} tone="violet" icon={<CreditCard />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <DashboardPanel
          className="flex min-w-0 flex-col"
          bodyClassName="flex flex-1 flex-col"
          title="Occupancy Trends"
          subtitle="Daily room demand for the selected date range"
          action={<DateRangePill label={formatPeriod(trendPeriod)} value={trendPeriod} onApply={updateTrend} ariaLabel="Select Occupancy Trends date range" />}
        >
          <div className="relative min-h-72 flex-1">
            <div className="absolute inset-0">
            <TrendChart data={trendData} />
            </div>
          </div>
        </DashboardPanel>
        <DashboardPanel title="Monthly Occupancy" subtitle="Projected occupancy rates for current and next month">
          <div className="grid gap-4">
            {data.monthly_occupancy.map((item) => <Gauge key={item.month} label={formatMonth(item.month)} value={item.occupancy} />)}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="Bookings by Source" subtitle="Room-night distribution by booking source" action={<DateRangePill label={formatPeriod(sourcePeriod)} value={sourcePeriod} onApply={updateSources} ariaLabel="Select Bookings by Source date range" align="left" />}>
          <PlatformBookingsDonut data={sourceData} />
        </DashboardPanel>
        <DashboardPanel title="Monthly Room Night Summary" subtitle="Room nights and reservation counts by stay month" action={<DateRangePill monthOnly align="left" label={`${formatMonth(monthlyPeriod.date_from.slice(0, 7))} - ${formatMonth(monthlyPeriod.date_to.slice(0, 7))}`} value={monthlyPeriod} ariaLabel="Select summary month range" onApply={async (period) => {
          const filtered = await loadRangeData(period);
          setMonthlyData(filtered.monthly_room_nights);
          setMonthlyPeriod(period);
        }} />}>
          <MonthlyRoomNightChart data={monthlyData} />
        </DashboardPanel>
        <DashboardPanel title="Room Status Breakdown" subtitle="Current operational status of active rooms">
          <RoomStatusChart data={data.room_statuses} />
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Room Nights by Country"
        subtitle="Geographic distribution - marker size and color intensity represent volume"
        action={<DateRangePill label={formatPeriod(countryPeriod)} value={countryPeriod} onApply={updateCountries} ariaLabel="Select Room Nights by Country date range" />}
      >
        <RoomNightsByCountryMap data={countryData} />
      </DashboardPanel>
    </>
  );
}

function money(value: number, currency: string) { return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; }
function periodForMonths(data: DashboardSummary): DashboardDateRange {
  const months = data.monthly_room_nights;
  if (!months.length) return data.period;
  const last = months[months.length - 1].month;
  return { date_from: `${months[0].month}-01`, date_to: new Date(Date.UTC(Number(last.slice(0, 4)), Number(last.slice(5, 7)), 0)).toISOString().slice(0, 10) };
}
function formatPeriod(period: DashboardDateRange) { return `${formatDate(period.date_from)} - ${formatDate(period.date_to)}`; }
function periodForTrend(data: DashboardSummary): DashboardDateRange {
  return data.occupancy_trend.length
    ? { date_from: data.occupancy_trend[0].date, date_to: data.occupancy_trend[data.occupancy_trend.length - 1].date }
    : data.period;
}
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatMonth(value: string) { return new Intl.DateTimeFormat("en-LK", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`)); }
