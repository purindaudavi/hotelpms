"use client";

import { type Dispatch, type SetStateAction, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Inbox,
  Link2,
  Radio,
  RefreshCw,
  ServerOff,
  Tags,
  Webhook
} from "lucide-react";
import { createPortal } from "react-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Reservation, Room } from "@/app/data/pms-data";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { type ChannelLogEntry, channelLogsKey } from "@/app/components/modules/channelmanager/session";
import { readPropertyHomeCurrency } from "@/app/lib/property-repository";

type ChannelManagerDashboardPageProps = {
  propertyId: string;
  reservations: Reservation[];
  roomList: Room[];
  setToast: (message: string) => void;
};

type DateRange = {
  label: string;
  start: string;
  end: string;
  days: number;
};

type ReportMode = "booked" | "check-in";

type ChannelReportRow = {
  channel: string;
  revenue: number;
  reservations: number;
  roomNights: number;
  avgLengthOfStay: number;
  avgLeadTime: number;
  avgDailyRate: number;
  cancellations: number;
};

type SourceRow = {
  channel: string;
  bookings: number;
  revenue: number;
  share: number;
  color: string;
};

type CalendarCell = {
  date: Date;
  label: string;
  currentMonth: boolean;
};

const eventFilters = ["Reservations", "Integration activity", "Bookings", "Inventory", "Rates", "Errors"];
const connectionChannels = ["Booking.com", "Expedia", "Agoda"];
const channelColors = ["#38bdf8", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#6366f1"];

export function ChannelManagerDashboardPage({ propertyId, reservations, roomList, setToast }: ChannelManagerDashboardPageProps) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>(() => makeQuickRange("Last 30 days", 30));
  const [eventFilter, setEventFilter] = useState("Reservations");
  const [syncStartDate, setSyncStartDate] = useState(() => formatDateInput(new Date()));
  const [view, setView] = useState<"dashboard" | "report">("dashboard");
  const [demoMode, setDemoMode] = useState(false);
  const [logs] = useSessionState<ChannelLogEntry[]>(channelLogsKey(propertyId), []);
  const [currency, setCurrency] = useState("LKR");
  const demoReservations = useMemo(() => createDemoChannelReservations(currency), [currency]);
  const demoLogs = useMemo(() => createDemoChannelLogs(), []);
  const activeReservations = demoMode ? demoReservations : reservations;
  const activeLogs = demoMode ? demoLogs : logs;
  const reportRows = useMemo(() => buildReportRows(activeReservations, "booked", range, currency), [activeReservations, range, currency]);
  const sourceRows = useMemo(() => buildSourceRows(reportRows), [reportRows]);
  const visibleLogs = useMemo(() => filterChannelLogs(activeLogs, eventFilter), [activeLogs, eventFilter]);

  useEffect(() => {
    setCurrency(readPropertyHomeCurrency(propertyId));
  }, [propertyId]);

  if (view === "report") {
    return <ChannelsReport reservations={activeReservations} currency={currency} demoMode={demoMode} range={range} setRange={setRange} setToast={setToast} onBack={() => setView("dashboard")} />;
  }

  const totalBookings = sourceRows.reduce((sum, source) => sum + source.bookings, 0);
  const totalRevenue = sourceRows.reduce((sum, source) => sum + source.revenue, 0);
  const errorCount = activeLogs.filter((log) => log.status === "Error").length;
  const lastSuccessfulActivity = activeLogs.find((log) => log.status === "Success")?.time || "No provider sync yet";
  const today = formatDateInput(new Date());
  const currentMonth = today.slice(0, 7);
  const reservationsToday = activeReservations.filter((reservation) => toDateOnly(reservation.reservationDate) === today).length;
  const monthlyRevenue = activeReservations.reduce((sum, reservation) => {
    const eligibleStatus = !["Cancelled", "No Show", "Blocked"].includes(reservation.status);
    const matchingCurrency = !reservation.currency || reservation.currency.toUpperCase() === currency.toUpperCase();
    return eligibleStatus && matchingCurrency && toDateOnly(reservation.reservationDate).startsWith(currentMonth)
      ? sum + (Number(reservation.total) || 0)
      : sum;
  }, 0);
  const recentReservations = [...activeReservations]
    .filter((reservation) => normalizeChannelName(reservation.bookingSource || reservation.source))
    .sort((left, right) => String(right.reservationDate).localeCompare(String(left.reservationDate)))
    .slice(0, 6);
  const syncDates = buildSyncDates(syncStartDate, 7);
  const occupancyTrend = buildOccupancyTrend(activeReservations, demoMode ? 20 : Math.max(1, roomList.length), 14);

  return (
    <main className="space-y-5 bg-slate-100 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Channel Manager Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor booking sources, integration health and channel activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className={`inline-flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-semibold ${demoMode ? "border-amber-300 bg-amber-50 text-amber-800" : "border-line bg-white text-slate-700"}`}>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => {
                setDemoMode(event.target.checked);
                setToast(event.target.checked ? "Channel Manager demo data enabled" : "Channel Manager returned to PMS data");
              }}
              className="h-4 w-4 accent-amber-500"
            />
            Demo data
          </label>
          <button type="button" onClick={() => setToast(demoMode ? "Demo data refreshed" : "Channel dashboard recalculated from current PMS data")} className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {demoMode ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-900">Demo data is ON</p>
              <p className="mt-1 text-sm text-amber-800">These channel connections, reservations, revenues and events are examples. They are not from MongoDB and nothing is sent to an OTA.</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800">Example data</span>
        </section>
      ) : (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <ServerOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold text-amber-900">No live channel provider is connected</p>
            <p className="mt-1 text-sm text-amber-800">
              Reservation figures come from the PMS database. Sync activity comes from the local test simulator and is not an Agoda, Expedia, or Booking.com transmission.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800">Integration required</span>
      </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthMetric icon={Link2} label="Active channels" value={demoMode ? "3" : "0"} detail={demoMode ? "All demo channels connected" : "Provider API required"} tone="blue" />
        <HealthMetric icon={CalendarDays} label="Reservations today" value={String(reservationsToday)} detail={demoMode ? "Example bookings" : "From PMS reservations"} tone="emerald" />
        <HealthMetric icon={Database} label="Monthly revenue" value={`${currency} ${formatCompactNumber(monthlyRevenue)}`} detail={currentMonth} tone="violet" />
        <HealthMetric icon={errorCount ? AlertCircle : CheckCircle2} label="Integration errors" value={String(errorCount)} detail={lastSuccessfulActivity} tone={errorCount ? "rose" : "slate"} />
      </section>

      <ChannelConnections demoMode={demoMode} onManage={() => router.push(`/properties/${propertyId}/channel-manager/channels`)} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-5">
          <BookingSourcesPanel rows={sourceRows} totalBookings={totalBookings} totalRevenue={totalRevenue}
            currency={currency} demoMode={demoMode} range={range} setRange={setRange} onOpenReport={() => setView("report")} />
          <AvailabilityRateSync currency={currency} dates={syncDates} demoMode={demoMode} startDate={syncStartDate} onStartDateChange={setSyncStartDate} />
          <OccupancyTrendPanel points={occupancyTrend} demoMode={demoMode} />
        </div>
        <div className="min-w-0 space-y-5">
          <RecentReservationsActivity reservations={recentReservations} logs={visibleLogs}
            eventFilter={eventFilter} onEventFilterChange={setEventFilter} demoMode={demoMode} />
          <ApiIntegrationStatus demoMode={demoMode} errorCount={errorCount} />
        </div>
      </div>
    </main>
  );
}

function ChannelsReport({
  reservations,
  currency,
  demoMode,
  range,
  setRange,
  setToast,
  onBack
}: {
  reservations: Reservation[];
  currency: string;
  demoMode: boolean;
  range: DateRange;
  setRange: Dispatch<SetStateAction<DateRange>>;
  setToast: (message: string) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<ReportMode>("booked");
  const rows = useMemo(() => buildReportRows(reservations, mode, range, currency), [reservations, mode, range, currency]);
  const totals = useMemo(
    () => ({
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      reservations: rows.reduce((sum, row) => sum + row.reservations, 0),
      roomNights: rows.reduce((sum, row) => sum + row.roomNights, 0),
      cancellations: rows.reduce((sum, row) => sum + row.cancellations, 0),
      avgDailyRate: weightedAverage(rows, "avgDailyRate", "roomNights"),
      avgLengthOfStay: weightedAverage(rows, "avgLengthOfStay", "reservations"),
      avgLeadTime: weightedAverage(rows, "avgLeadTime", "reservations")
    }),
    [rows]
  );

  function downloadCsv() {
    const headers = ["Channel", `Revenue (${currency})`, "Reservations", "Room Nights", "Avg Length Of Stay", "Avg Lead Time", `Avg Daily Rate (${currency})`, "Cancellations"];
    const csvRows = rows.map((row) => [
      row.channel,
      row.revenue.toFixed(2),
      row.reservations,
      row.roomNights,
      row.avgLengthOfStay.toFixed(2),
      row.avgLeadTime.toFixed(2),
      row.avgDailyRate.toFixed(2),
      row.cancellations
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `channels-report-${mode}-${range.start}-${range.end}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Channels report CSV downloaded");
  }

  return (
    <main className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Channels Report</h2>
          <p className="mt-1 text-sm text-slate-500">{demoMode ? "Source: Demo data" : "Source: PMS reservations"}</p>
        </div>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-500 hover:text-blue-700">
          Back to Dashboard
        </button>
      </div>

      {demoMode ? <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Demo data is ON. This report contains examples and is not from MongoDB.</div> : null}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-slate-50 p-4">
        <div className="inline-flex rounded border border-line bg-white">
          <button
            type="button"
            onClick={() => setMode("booked")}
            className={`h-11 px-5 text-sm font-semibold ${mode === "booked" ? "border border-blue-500 text-blue-500" : "text-slate-700"}`}
          >
            Booked-on date
          </button>
          <button
            type="button"
            onClick={() => setMode("check-in")}
            className={`h-11 px-5 text-sm font-semibold ${mode === "check-in" ? "border border-blue-500 text-blue-500" : "text-slate-700"}`}
          >
            Check-in date
          </button>
        </div>
        <DateRangePicker range={range} setRange={setRange} />
        <button type="button" onClick={() => setToast("Report recalculated from the current PMS reservations")} className="inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-blue-500 hover:text-blue-700">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="grid gap-x-12 gap-y-8 rounded-xl border border-line bg-white px-10 py-7 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={`Revenue (${currency})`} value={`${currency} ${formatNumber(totals.revenue)}`} />
        <Metric label="Reservations" value={String(totals.reservations)} />
        <Metric label="Room Nights" value={String(totals.roomNights)} />
        <Metric label="Cancellations" value={String(totals.cancellations)} />
        <Metric label={`Avg Daily Rate (${currency})`} value={`${currency} ${totals.avgDailyRate.toFixed(2)}`} />
        <Metric label="Avg Length Of Stay" value={totals.avgLengthOfStay.toFixed(2)} />
        <Metric label="Avg Lead Time" value={totals.avgLeadTime.toFixed(2)} />
      </section>

      <section className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-slate-50">
              {["Channel", `Revenue (${currency})`, "Reservations", "Room Nights", "Avg Length Of Stay", "Avg Lead Time", `Avg Daily Rate (${currency})`, "Cancellations"].map((heading) => (
                <th key={heading} className="px-5 py-4 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.channel} className="border-b border-line">
                <td className="px-5 py-5">{row.channel}</td>
                <td className="px-5 py-5">{currency} {row.revenue.toFixed(2)}</td>
                <td className="px-5 py-5">{row.reservations}</td>
                <td className="px-5 py-5">{row.roomNights}</td>
                <td className="px-5 py-5">{row.avgLengthOfStay.toFixed(2)}</td>
                <td className="px-5 py-5">{row.avgLeadTime.toFixed(2)}</td>
                <td className="px-5 py-5">{currency} {row.avgDailyRate.toFixed(2)}</td>
                <td className="px-5 py-5">{row.cancellations}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-500">No OTA reservations were found for this date range.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-700">
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>
    </main>
  );
}

function DateRangePicker({ range, setRange }: { range: DateRange; setRange: Dispatch<SetStateAction<DateRange>> }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 700 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDate(range.start)));
  const [draftStart, setDraftStart] = useState(() => parseDate(range.start));
  const [draftEnd, setDraftEnd] = useState<Date | null>(() => parseDate(range.end));

  useEffect(() => {
    if (!open) return;
    setDraftStart(parseDate(range.start));
    setDraftEnd(parseDate(range.end));
    setVisibleMonth(startOfMonth(parseDate(range.start)));
    function reposition() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(700, window.innerWidth - 24);
      const height = Math.min(panel.current?.offsetHeight || 440, window.innerHeight - 24);
      const below = rect.bottom + 8;
      setPosition({ width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        top: below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8) });
    }
    function dismiss(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    reposition();
    const frame = requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keydown);
    };
  }, [open, range.start, range.end]);

  function selectDate(date: Date) {
    const selected = stripTime(date);
    if (draftEnd) { setDraftStart(selected); setDraftEnd(null); return; }
    const start = selected < draftStart ? selected : draftStart;
    const end = selected < draftStart ? draftStart : selected;
    setRange(buildDateRange(start, end));
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex h-10 max-w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span>{parseDate(range.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {parseDate(range.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div ref={panel} role="dialog" aria-label="Choose booking source date range"
          style={{ position: "fixed", ...position, zIndex: 1000, maxHeight: "calc(100dvh - 24px)" }}
          className="overflow-auto rounded-2xl border border-line bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div><p className="text-sm font-semibold">Booking dates</p><p className="text-xs text-slate-500">{draftEnd ? "Choose a start date, then an end date." : "Now choose the end date."}</p></div>
            <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Close</button>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
            {buildQuickRanges().map((item) => <button key={item.label} type="button" onClick={() => { setRange(item); setOpen(false); trigger.current?.focus(); }}
              className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-blue-50">{item.label}</button>)}
          </div>
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <CalendarMonth month={visibleMonth} rangeStart={draftStart} rangeEnd={draftEnd}
              onPrevious={() => setVisibleMonth((current) => addMonths(current, -1))}
              onNext={() => setVisibleMonth((current) => addMonths(current, 1))} onSelectDate={selectDate} />
            <div className="hidden sm:block"><CalendarMonth month={addMonths(visibleMonth, 1)} rangeStart={draftStart} rangeEnd={draftEnd}
              onPrevious={() => setVisibleMonth((current) => addMonths(current, -1))}
              onNext={() => setVisibleMonth((current) => addMonths(current, 1))} onSelectDate={selectDate} /></div>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}

function CalendarMonth({
  month,
  rangeStart,
  rangeEnd,
  onPrevious,
  onNext,
  onSelectDate
}: {
  month: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onPrevious: () => void;
  onNext: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const days = buildMonthDays(month);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onPrevious} className="rounded p-1 hover:bg-slate-100" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </button>
        <p className="font-semibold">{month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
        <button type="button" onClick={onNext} className="rounded p-1 hover:bg-slate-100" aria-label="Next month">
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="py-2 font-medium text-slate-600">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const selected = isDateInRange(day.date, rangeStart, rangeEnd);
          const endpoint = isSameDate(day.date, rangeStart) || isSameDate(day.date, rangeEnd);
          return (
            <button
              key={`${day.label}-${index}`}
              type="button"
              aria-label={day.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              onClick={() => onSelectDate(day.date)}
              className={`rounded-md py-1 ${selected ? "bg-blue-50" : ""} ${day.currentMonth ? "text-slate-700" : "text-slate-400"} hover:bg-blue-50`}
            >
              <span className={`inline-grid h-7 w-7 place-items-center rounded ${endpoint ? "bg-blue-500 text-white" : ""}`}>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChannelLogo({ channel }: { channel: string }) {
  const icons: Record<string, string> = {
    "Booking.com": "/assets/booking-channel.png",
    Expedia: "/assets/expedia-channel.ico",
    Agoda: "/assets/agoda-channel.ico"
  };
  return <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line" style={{ background: "#fff" }}>
    {icons[channel] ? <img src={icons[channel]} alt={channel + " logo"} width={24} height={24} className="h-6 w-6 object-contain" /> : <Database className="h-4 w-4 text-slate-500" />}
  </span>;
}

function ChannelConnections({ demoMode, onManage }: { demoMode: boolean; onManage: () => void }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Channel Connections</h2><p className="mt-1 text-xs text-slate-500">Connection status, credentials and room mappings.</p></div>
        <button type="button" onClick={onManage} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50">
          Manage channels <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {connectionChannels.map((channel, index) => (
          <article key={channel} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><ChannelLogo channel={channel} /><p className="text-sm font-semibold">{channel}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${demoMode ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{demoMode ? "Connected · demo" : "Not connected"}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
              <div><p className="text-[11px] text-slate-500">Last sync</p><p className="mt-1 text-sm font-semibold">{demoMode ? `${index + 2} min ago` : "Never"}</p></div>
              <div className="space-y-1.5 text-[11px] text-slate-500">
                <p className="flex items-center gap-1.5"><CheckCircle2 className={`h-3 w-3 ${demoMode ? "text-emerald-500" : "text-slate-400"}`} />{demoMode ? "Credentials verified" : "Credentials unverified"}</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className={`h-3 w-3 ${demoMode ? "text-emerald-500" : "text-slate-400"}`} />{demoMode ? "Rooms mapped" : "Rooms not mapped"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AvailabilityRateSync({
  currency,
  dates,
  demoMode,
  startDate,
  onStartDateChange
}: {
  currency: string;
  dates: Date[];
  demoMode: boolean;
  startDate: string;
  onStartDateChange: (value: string) => void;
}) {
  const rows = ["Our PMS (Base)", ...connectionChannels];
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 className="text-xl font-semibold">Availability & Rate Sync</h2>
          <p className="mt-1 text-sm text-slate-500">Seven-day availability and rate comparison across channels.</p>
        </div>
        <label className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="bg-transparent outline-none" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[780px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Channel</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {dates.map((date) => (
                <th key={date.toISOString()} className="px-3 py-3 text-center font-semibold">
                  <span className="block">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="mt-1 block font-normal text-slate-400">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((channel, rowIndex) => (
              <tr key={channel} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-semibold"><span className="flex items-center gap-2"><ChannelLogo channel={channel} />{channel}</span></td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-full px-2 py-1 font-semibold ${rowIndex === 0 || demoMode ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {rowIndex === 0 ? "Base" : demoMode ? "Synced" : "Not connected"}
                  </span>
                </td>
                {dates.map((date, dateIndex) => {
                  const dayIndex = Math.floor(date.getTime() / 86_400_000);
                  const availability = 5 + (dayIndex % 4);
                  const rate = 11_500 + (dayIndex % 7) * 500;
                  const showValue = demoMode;
                  return (
                    <td key={`${channel}-${date.toISOString()}`} className="px-3 py-3 text-center">
                      {showValue ? <><strong className="block text-sm">{availability}</strong><span className="mt-0.5 block text-[11px] text-slate-500">{currency} {rate.toLocaleString()}</span></> : <span className="text-slate-300">--</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-6 py-3 text-xs text-slate-500">{demoMode ? "Example availability and rates. No values were sent to an OTA." : "Availability and rates are unavailable until this table is connected to inventory and channel data."}</p>
    </section>
  );
}

function RecentReservationsActivity({
  reservations,
  logs,
  eventFilter,
  onEventFilterChange,
  demoMode
}: {
  reservations: Reservation[];
  logs: ChannelLogEntry[];
  eventFilter: string;
  onEventFilterChange: (value: string) => void;
  demoMode: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="border-b border-line px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent Reservations & Activity</h2>
            <p className="mt-1 text-sm text-slate-500">{demoMode ? "Example channel traffic" : "PMS reservations and locally recorded events"}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Filter
            <select aria-label="Recent reservations and activity filter" value={eventFilter} onChange={(event) => onEventFilterChange(event.target.value)} className="focus-ring h-9 rounded-lg border border-line bg-white px-3 text-xs text-slate-700">
              {eventFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
          </label>
        </div>
      </div>
      {eventFilter === "Reservations" ? (
        reservations.length ? (
          <div className="max-h-[500px] divide-y divide-line overflow-y-auto">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="px-5 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{reservation.guest}</p>
                    <p className="mt-1 text-xs text-slate-500">{normalizeChannelName(reservation.bookingSource || reservation.source)} / {reservation.resNo}</p>
                  </div>
                  <ReservationStatusPill status={reservation.status} />
                </div>
                <p className="mt-3 text-xs text-slate-500">{reservation.checkIn} to {reservation.checkOut} / {reservation.rooms} room(s)</p>
              </article>
            ))}
          </div>
        ) : <EmptyPanel message="No recent OTA reservations found." />
      ) : logs.length ? (
        <div className="max-h-[500px] divide-y divide-line overflow-y-auto">
          {logs.map((log) => (
            <article key={log.id} className="px-5 py-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3"><p className="font-semibold">{log.event}</p><StatusPill status={log.status} /></div>
              <p className="mt-1 text-xs text-slate-500">{log.channel} / {log.direction}</p>
              <p className="mt-3 text-sm text-slate-600">{log.message}</p>
              <p className="mt-2 text-xs text-slate-400">{log.time}</p>
            </article>
          ))}
        </div>
      ) : <EmptyPanel message="No integration activity matches this filter." />}
    </section>
  );
}

function OccupancyTrendPanel({ points, demoMode }: { points: Array<{ label: string; value: number }>; demoMode: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  const average = points.length ? Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length) : 0;
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Occupancy Trend</h2><p className="mt-1 text-xs text-slate-500">Last 14 days · {demoMode ? "Demo stays" : "PMS stays"}</p></div>
        <div className="text-right"><p className="text-2xl font-semibold tracking-tight text-blue-600">{average}%</p><p className="mt-1 text-[11px] text-slate-500">Average occupancy</p></div>
      </div>
      <div className="mt-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 12, bottom: 4, left: -12 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.24} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="rgb(var(--theme-line-rgb))" strokeDasharray="3 5" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={35} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={10} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value}%`, "Occupancy"]} contentStyle={{ background: "var(--theme-panel)", border: "1px solid rgb(var(--theme-line-rgb))", borderRadius: 12, color: "var(--foreground)", fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--theme-panel)" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function BookingSourcesPanel({
  rows,
  totalBookings,
  totalRevenue,
  currency,
  demoMode,
  range,
  setRange,
  onOpenReport
}: {
  rows: SourceRow[];
  totalBookings: number;
  totalRevenue: number;
  currency: string;
  demoMode: boolean;
  range: DateRange;
  setRange: Dispatch<SetStateAction<DateRange>>;
  onOpenReport: () => void;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-5">
        <div><h2 className="text-lg font-semibold">Booking Sources</h2><p className="mt-1 text-xs text-slate-500">Reservation share and booking value.</p></div>
        <DateRangePicker range={range} setRange={setRange} />
      </div>
      <div className="grid items-center gap-6 p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative grid h-44 w-44 place-items-center justify-self-center rounded-full" style={{ background: buildConicGradient(rows) }}>
          <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center"><div><p className="text-[11px] text-slate-500">Reservations</p><p className="my-1 text-3xl font-semibold tracking-tight">{totalBookings}</p><p className="text-[11px] text-slate-400">{demoMode ? "Demo data" : "PMS data"}</p></div></div>
        </div>
        <div className="min-w-0">
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_40px_100px_40px] gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400"><span>Channel</span><span className="text-right">Count</span><span className="text-right">Value</span><span className="text-right">Share</span></div>
          <div className="space-y-3">
            {rows.map((source) => <div key={source.channel} className="grid grid-cols-[minmax(0,1fr)_40px_100px_40px] items-center gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: source.color }} /><span className="truncate" title={source.channel}>{source.channel}</span></span>
              <span className="text-right text-slate-500">{source.bookings}</span><span className="text-right font-medium">{formatNumber(source.revenue)}</span><span className="text-right text-slate-500">{source.share}%</span>
            </div>)}
          </div>
          {!rows.length ? <p className="py-4 text-sm text-slate-500">No OTA reservations in this range.</p> : null}
          <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs"><span className="text-slate-500">Total booking value ({currency})</span><strong>{formatNumber(totalRevenue)}</strong></div>
          <button type="button" onClick={onOpenReport} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">Open channel report <ArrowRight className="h-3 w-3" /></button>
        </div>
      </div>
    </section>
  );
}

function ApiIntegrationStatus({ demoMode, errorCount }: { demoMode: boolean; errorCount: number }) {
  const items = [
    { label: "Reservation Sync", detail: demoMode ? "Last sync: 2 minutes ago" : "Waiting for provider", metric: demoMode ? "1,284 synced today" : "No live updates", icon: RefreshCw },
    { label: "Inventory Updates", detail: demoMode ? "Last sync: 3 minutes ago" : "Waiting for provider", metric: demoMode ? "3,421 updated today" : "No live updates", icon: Database },
    { label: "Rate Updates", detail: demoMode ? "Last sync: 4 minutes ago" : "Waiting for provider", metric: demoMode ? "892 updated today" : "No live updates", icon: Tags },
    { label: "Webhook Listener", detail: demoMode ? "Response time: 120ms" : "No endpoint registered", metric: demoMode ? "99.9% demo uptime" : "Not listening", icon: Webhook }
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5"><div><h2 className="text-lg font-semibold">API & Integration Status</h2><p className="mt-1 text-sm text-slate-500">Reservation, inventory, rates and webhook processing health.</p></div><Radio className={`h-6 w-6 ${demoMode ? "text-emerald-500" : "text-slate-400"}`} /></div>
      <div className="divide-y divide-line">
        {items.map((item) => <div key={item.label} className="flex flex-wrap items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><item.icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div><div className="text-right"><p className={`text-sm font-semibold ${demoMode && !(item.label === "Rate Updates" && errorCount) ? "text-emerald-600" : demoMode ? "text-amber-600" : "text-slate-500"}`}>{demoMode ? item.label === "Rate Updates" && errorCount ? "Needs attention" : "Operational (demo)" : "Not connected"}</p><p className="mt-1 text-xs text-slate-500">{item.metric}</p></div></div>)}
      </div>
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><Inbox className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">{message}</p></div></div>;
}

function ReservationStatusPill({ status }: { status: Reservation["status"] }) {
  const classes = status === "Cancelled" || status === "No Show" ? "bg-rose-50 text-rose-700" : status === "Checked-in" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}>{status}</span>;
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "emerald" | "violet" | "rose" | "slate";
}) {
  const toneClasses = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-white text-slate-700"
  }[tone];

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 truncate text-xs opacity-80" title={detail}>{detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: ChannelLogEntry["status"] }) {
  const statusClasses: Record<ChannelLogEntry["status"], string> = {
    Success: "bg-emerald-50 text-emerald-700",
    Warning: "bg-amber-50 text-amber-700",
    Error: "bg-rose-50 text-rose-700",
    Info: "bg-blue-50 text-blue-700"
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}>{status}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-light text-slate-600">{value}</p>
    </div>
  );
}

function createDemoChannelReservations(currency: string): Reservation[] {
  const channelPlan = [
    ...Array.from({ length: 12 }, () => "Agoda"),
    ...Array.from({ length: 8 }, () => "Expedia"),
    ...Array.from({ length: 10 }, () => "Booking.com")
  ];
  const today = stripTime(new Date());

  return channelPlan.map((channel, index) => {
    const bookedAt = new Date(today);
    bookedAt.setDate(today.getDate() - (index % 28));
    const checkIn = new Date(bookedAt);
    checkIn.setDate(bookedAt.getDate() + 3 + (index % 12));
    const nights = 1 + (index % 4);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + nights);
    const rooms = index % 8 === 0 ? 2 : 1;
    const status: Reservation["status"] = index % 13 === 0
      ? "Cancelled"
      : index % 17 === 0
        ? "No Show"
        : checkOut < today
          ? "Checked-out"
          : "Confirmed";
    const rate = 9_500 + (index % 5) * 1_750;

    return {
      id: `channel-demo-${index + 1}`,
      propertyId: "demo",
      resNo: `DMS-DEMO-${String(index + 1).padStart(4, "0")}`,
      bookingRef: `${channel.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase()}-${10000 + index}`,
      bookingReference: `DEMO-${10000 + index}`,
      bookingSource: channel,
      reservationDate: formatDateInput(bookedAt),
      checkIn: formatDateInput(checkIn),
      checkOut: formatDateInput(checkOut),
      rooms,
      source: channel,
      status,
      guest: `Demo Guest ${index + 1}`,
      phone: "+94 77 000 0000",
      email: `demo.guest${index + 1}@example.com`,
      country: index % 3 === 0 ? "Sri Lanka" : index % 3 === 1 ? "India" : "United Kingdom",
      roomType: index % 2 === 0 ? "Deluxe Double" : "Deluxe Twin",
      room: "Unassigned",
      adults: 1 + (index % 2),
      children: index % 5 === 0 ? 1 : 0,
      total: rate * nights * rooms,
      paid: status === "Cancelled" || status === "No Show" ? 0 : rate * nights * rooms,
      currency
    };
  });
}

function createDemoChannelLogs(): ChannelLogEntry[] {
  const rows: Array<Omit<ChannelLogEntry, "id" | "time"> & { minutesAgo: number }> = [
    { minutesAgo: 4, channel: "Agoda", event: "Reservation webhook received", status: "Success", direction: "Inbound", message: "New reservation AGD-10458 imported and acknowledged.", payload: "demo" },
    { minutesAgo: 8, channel: "All Channels", event: "Inventory push completed", status: "Success", direction: "Outbound", message: "Availability for 5 room types was accepted by all demo channels.", payload: "demo" },
    { minutesAgo: 16, channel: "Expedia", event: "Rate update completed", status: "Success", direction: "Outbound", message: "Standard and non-refundable demo rates were updated.", payload: "demo" },
    { minutesAgo: 29, channel: "Booking.com", event: "Reservation modification", status: "Info", direction: "Inbound", message: "Arrival date changed for demo reservation BDC-22104.", payload: "demo" },
    { minutesAgo: 47, channel: "Agoda", event: "Inventory retry", status: "Warning", direction: "Outbound", message: "One availability update was retried and then accepted.", payload: "demo" },
    { minutesAgo: 63, channel: "Expedia", event: "Rate update rejected", status: "Error", direction: "Outbound", message: "Demo rate was below the configured minimum and requires review.", payload: "demo" },
    { minutesAgo: 92, channel: "Booking.com", event: "Reservation cancellation", status: "Success", direction: "Inbound", message: "Cancellation BDC-22098 was imported and acknowledged.", payload: "demo" }
  ];

  return rows.map(({ minutesAgo, ...row }, index) => {
    const time = new Date();
    time.setMinutes(time.getMinutes() - minutesAgo);
    return { id: `channel-demo-log-${index + 1}`, time: time.toLocaleString(), ...row };
  });
}

function buildSourceRows(reportRows: ChannelReportRow[]): SourceRow[] {
  const rows = reportRows.map((row, index) => ({
    channel: row.channel,
    bookings: row.reservations,
    revenue: row.revenue,
    share: 0,
    color: channelColors[index % channelColors.length]
  }));
  const totalBookings = rows.reduce((sum, row) => sum + row.bookings, 0) || 1;
  return rows.map((row) => ({
    ...row,
    share: Math.round((row.bookings / totalBookings) * 100)
  }));
}

function buildReportRows(reservations: Reservation[], mode: ReportMode, range: DateRange, homeCurrency: string): ChannelReportRow[] {
  type Accumulator = {
    channel: string;
    revenue: number;
    reservations: number;
    roomNights: number;
    stayNights: number;
    leadTime: number;
    cancellations: number;
  };
  const grouped = new Map<string, Accumulator>();

  reservations.forEach((reservation) => {
    const channel = normalizeChannelName(reservation.bookingSource || reservation.source);
    if (!channel) return;
    const reportDate = toDateOnly(mode === "booked" ? reservation.reservationDate : reservation.checkIn);
    if (!reportDate || reportDate < range.start || reportDate > range.end) return;

    const stayNights = reservationNights(reservation);
    const roomCount = Math.max(1, reservation.reservationRooms?.length || reservation.rooms || 1);
    const cancelled = reservation.status === "Cancelled";
    const excludedRevenue = cancelled || reservation.status === "No Show" || reservation.status === "Blocked";
    const row = grouped.get(channel) || {
      channel,
      revenue: 0,
      reservations: 0,
      roomNights: 0,
      stayNights: 0,
      leadTime: 0,
      cancellations: 0
    };
    row.reservations += 1;
    row.cancellations += cancelled ? 1 : 0;
    row.stayNights += stayNights;
    row.leadTime += leadTimeDays(reservation.reservationDate, reservation.checkIn);
    const matchingCurrency = !reservation.currency || reservation.currency.toUpperCase() === homeCurrency.toUpperCase();
    if (!excludedRevenue && matchingCurrency) {
      row.revenue += Number(reservation.total) || 0;
      row.roomNights += stayNights * roomCount;
    }
    grouped.set(channel, row);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      channel: row.channel,
      revenue: roundCurrency(row.revenue),
      reservations: row.reservations,
      roomNights: row.roomNights,
      avgLengthOfStay: roundMetric(row.reservations ? row.stayNights / row.reservations : 0),
      avgLeadTime: roundMetric(row.reservations ? row.leadTime / row.reservations : 0),
      avgDailyRate: roundMetric(row.roomNights ? row.revenue / row.roomNights : 0),
      cancellations: row.cancellations
    }))
    .sort((left, right) => right.reservations - left.reservations || left.channel.localeCompare(right.channel));
}

function buildConicGradient(rows: SourceRow[]) {
  if (!rows.length) return "conic-gradient(#cbd5e1 0 100%)";
  let start = 0;
  const stops = rows.map((row, index) => {
    const end = index === rows.length - 1 ? 100 : start + row.share;
    const stop = `${row.color} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function filterChannelLogs(logs: ChannelLogEntry[], filter: string) {
  if (filter === "Errors") return logs.filter((log) => log.status === "Error");
  if (filter === "Bookings") return logs.filter((log) => /booking|reservation|webhook/i.test(`${log.event} ${log.message}`));
  if (filter === "Inventory") return logs.filter((log) => /inventory|availability|restriction/i.test(`${log.event} ${log.message}`));
  if (filter === "Rates") return logs.filter((log) => /rate|price/i.test(`${log.event} ${log.message}`));
  return logs;
}

function normalizeChannelName(source: string | undefined) {
  const value = String(source || "").trim();
  if (/agoda/i.test(value)) return "Agoda";
  if (/expedia/i.test(value)) return "Expedia";
  if (/booking\.com|bookingcom|b\.com/i.test(value)) return "Booking.com";
  if (/airbnb/i.test(value)) return "Airbnb";
  if (/makemytrip/i.test(value)) return "MakeMyTrip";
  if (/google hotel/i.test(value)) return "Google Hotel";
  if (/direct website|direct booking/i.test(value)) return "Direct Website";
  return "";
}

function reservationNights(reservation: Reservation) {
  const checkIn = parseDateValue(reservation.checkIn);
  const checkOut = parseDateValue(reservation.checkOut);
  if (!checkIn || !checkOut) return 1;
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
}

function leadTimeDays(bookedAt: string, checkInAt: string) {
  const booked = parseDateValue(bookedAt);
  const checkIn = parseDateValue(checkInAt);
  if (!booked || !checkIn) return 0;
  return Math.max(0, Math.round((checkIn.getTime() - booked.getTime()) / 86_400_000));
}

function toDateOnly(value: string) {
  const date = parseDateValue(value);
  return date ? formatDateInput(date) : "";
}

function parseDateValue(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : stripTime(date);
}

function buildSyncDates(startDate: string, count: number) {
  const start = parseDateValue(startDate) || stripTime(new Date());
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildOccupancyTrend(reservations: Reservation[], roomCapacity: number, days: number) {
  const end = stripTime(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(0, days - 1));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const occupiedRooms = reservations.reduce((sum, reservation) => {
      if (["Cancelled", "No Show", "Blocked"].includes(reservation.status)) return sum;
      const checkIn = parseDateValue(reservation.checkIn);
      const checkOut = parseDateValue(reservation.checkOut);
      if (!checkIn || !checkOut || date < checkIn || date >= checkOut) return sum;
      return sum + Math.max(1, reservation.reservationRooms?.length || reservation.rooms || 1);
    }, 0);
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.min(100, Math.round((occupiedRooms / Math.max(1, roomCapacity)) * 100))
    };
  });
}

function makeQuickRange(label: string, days: number): DateRange {
  const end = stripTime(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return {
    label,
    start: formatDateInput(start),
    end: formatDateInput(end),
    days
  };
}

function buildQuickRanges() {
  return [
    makeQuickRange("Last 7 days", 7),
    makeQuickRange("Last 14 days", 14),
    makeQuickRange("Last 30 days", 30),
    makeQuickRange("Last 90 days", 90)
  ];
}

function buildMonthDays(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = startOffset - 1; index >= 0; index -= 1) {
    const day = previousMonthDays - index;
    cells.push({ date: new Date(year, monthIndex - 1, day), label: String(day), currentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, monthIndex, day), label: String(day), currentMonth: true });
  }
  while (cells.length < 42) {
    const day = cells.length - startOffset - daysInMonth + 1;
    cells.push({ date: new Date(year, monthIndex + 1, day), label: String(day), currentMonth: false });
  }

  return cells;
}

function buildDateRange(start: Date, end: Date): DateRange {
  const normalizedStart = stripTime(start);
  const normalizedEnd = stripTime(end);
  return {
    label: "Custom",
    start: formatDateInput(normalizedStart),
    end: formatDateInput(normalizedEnd),
    days: inclusiveDays(normalizedStart, normalizedEnd)
  };
}

function parseDate(value: string) {
  return stripTime(new Date(`${value}T00:00:00`));
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inclusiveDays(start: Date, end: Date) {
  const diff = stripTime(end).getTime() - stripTime(start).getTime();
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

function isSameDate(left: Date, right: Date | null) {
  if (!right) return false;
  return stripTime(left).getTime() === stripTime(right).getTime();
}

function isDateInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start) return false;
  const value = stripTime(date).getTime();
  if (!end) return value === stripTime(start).getTime();
  return value >= stripTime(start).getTime() && value <= stripTime(end).getTime();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function weightedAverage(rows: ChannelReportRow[], valueKey: keyof ChannelReportRow, weightKey: keyof ChannelReportRow) {
  const weightedSum = rows.reduce((sum, row) => sum + Number(row[valueKey]) * Number(row[weightKey]), 0);
  const weightSum = rows.reduce((sum, row) => sum + Number(row[weightKey]), 0);
  return weightSum ? weightedSum / weightSum : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
