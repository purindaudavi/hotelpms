"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Inbox, RefreshCw } from "lucide-react";

type ChannelManagerDashboardPageProps = {
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

const defaultRange: DateRange = {
  label: "Last 30 days",
  start: "2026-05-16",
  end: "2026-06-16",
  days: 30
};

const quickRanges: DateRange[] = [
  { label: "Last 7 days", start: "2026-06-09", end: "2026-06-16", days: 7 },
  { label: "Last 14 days", start: "2026-06-02", end: "2026-06-16", days: 14 },
  defaultRange,
  { label: "Last 90 days", start: "2026-03-18", end: "2026-06-16", days: 90 }
];

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

const sourceBaseRows = [
  { channel: "Agoda", bookings: 45, revenue: 762.15, share: 69, color: "#f59e0b" },
  { channel: "Expedia", bookings: 14, revenue: 347.22, share: 31, color: "#0b3b63" }
];

const reportBaseRowsByMode: Record<ReportMode, ChannelReportRow[]> = {
  booked: [
    { channel: "Agoda", revenue: 762.15, reservations: 45, roomNights: 48, avgLengthOfStay: 1.02, avgLeadTime: 12.47, avgDailyRate: 15.88, cancellations: 1 },
    { channel: "Expedia", revenue: 347.22, reservations: 14, roomNights: 18, avgLengthOfStay: 1.29, avgLeadTime: 31.86, avgDailyRate: 19.29, cancellations: 2 }
  ],
  "check-in": [
    { channel: "Agoda", revenue: 685.42, reservations: 39, roomNights: 43, avgLengthOfStay: 1.1, avgLeadTime: 11.92, avgDailyRate: 15.94, cancellations: 0 },
    { channel: "Expedia", revenue: 421.8, reservations: 16, roomNights: 21, avgLengthOfStay: 1.31, avgLeadTime: 29.14, avgDailyRate: 20.09, cancellations: 1 }
  ]
};

const eventFilters = ["All Events", "Bookings", "Inventory", "Rates", "Errors"];

export function ChannelManagerDashboardPage({ setToast }: ChannelManagerDashboardPageProps) {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [eventFilter, setEventFilter] = useState("All Events");
  const [view, setView] = useState<"dashboard" | "report">("dashboard");
  const sourceRows = useMemo(() => buildSourceRows(range), [range]);

  if (view === "report") {
    return <ChannelsReport range={range} setRange={setRange} setToast={setToast} onBack={() => setView("dashboard")} />;
  }

  const totalBookings = sourceRows.reduce((sum, source) => sum + source.bookings, 0);

  return (
    <main className="bg-slate-100 p-4 lg:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-7 py-5">
            <h2 className="text-xl font-semibold">Booking Sources</h2>
            <DateRangePicker range={range} setRange={setRange} />
          </div>
          <div className="grid gap-8 px-7 py-8 md:grid-cols-[260px_1fr]">
            <div
              className="relative grid h-56 w-56 place-items-center justify-self-center rounded-full"
              style={{ background: `conic-gradient(${sourceRows[0]?.color ?? "#f59e0b"} 0 ${sourceRows[0]?.share ?? 0}%, ${sourceRows[1]?.color ?? "#0b3b63"} ${sourceRows[0]?.share ?? 0}% 100%)` }}
            >
              <div className="grid h-44 w-44 place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="text-slate-400">Bookings</p>
                  <p className="mt-2 text-4xl font-medium">{totalBookings}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5">
              {sourceRows.map((source) => (
                <div key={source.channel} className="grid grid-cols-[1fr_70px_110px_60px] items-center gap-3 text-slate-600">
                  <span className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: source.color }} />
                    {source.channel}
                  </span>
                  <span className="text-right">{source.bookings}</span>
                  <span className="text-right">{source.revenue.toFixed(0)} USD</span>
                  <span className="text-right">{source.share}%</span>
                </div>
              ))}
              <button type="button" onClick={() => setView("report")} className="mt-10 self-end text-sm font-semibold text-blue-500 hover:text-blue-700">
                Details
              </button>
            </div>
          </div>
        </section>

        <section className="row-span-2 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-7 py-5">
            <h2 className="text-xl font-semibold">Live Feed Events</h2>
            <label className="flex items-center gap-3 text-sm">
              <span className="font-semibold">Filter:</span>
              <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="focus-ring h-11 min-w-64 rounded border border-line bg-white px-4 text-sm text-slate-500">
                {eventFilters.map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid min-h-[740px] place-items-center px-6 py-16 text-center text-slate-400">
            <div>
              <Inbox className="mx-auto h-16 w-16 text-slate-300" />
              <p className="mt-6 text-slate-500">No events in last {range.days} days</p>
            </div>
          </div>
        </section>

        <section className="min-h-[520px] bg-white px-7 py-7">
          <h2 className="text-xl font-semibold">Announcements</h2>
          <div className="mt-9 space-y-7 text-slate-900">
            <div>
              <h3 className="text-lg font-semibold">June Update (JUN 2026)</h3>
              <p className="mt-6 font-semibold">Summary of Features</p>
              <ul className="mt-4 list-disc space-y-2 pl-8">
                <li>New OTA: Julian Alps Booking</li>
                <li>New OTA: Guirez</li>
                <li>New OTA: More.com</li>
                <li>New OTA: Heytrip</li>
                <li>New OTA: Crewdogs</li>
                <li>Booking acknowledge status icon now only checks the latest revision</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Coming Soon</p>
              <ul className="mt-4 list-disc pl-8">
                <li>
                  View Roadmap: <span className="text-blue-500">https://feedback.channex.io/roadmap</span>
                </li>
              </ul>
            </div>
            <button type="button" onClick={() => setToast("Changelog opened")} className="text-blue-500 hover:text-blue-700">
              Link to Changelog
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ChannelsReport({
  range,
  setRange,
  setToast,
  onBack
}: {
  range: DateRange;
  setRange: Dispatch<SetStateAction<DateRange>>;
  setToast: (message: string) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<ReportMode>("booked");
  const rows = useMemo(() => buildReportRows(mode, range), [mode, range]);
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
    const headers = ["Channel", "Revenue (USD)", "Reservations", "Room Nights", "Avg Length Of Stay", "Avg Lead Time", "Avg Daily Rate (USD)", "Cancellations"];
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
        <h2 className="text-2xl font-semibold">Channels Report</h2>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-500 hover:text-blue-700">
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4">
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
        <button type="button" onClick={() => setToast(`${mode === "booked" ? "Booked-on" : "Check-in"} report refreshed`)} className="inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold text-blue-500 hover:text-blue-700">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="grid gap-x-12 gap-y-8 px-10 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Revenue (USD)" value={`$${formatNumber(totals.revenue)}`} />
        <Metric label="Reservations" value={String(totals.reservations)} />
        <Metric label="Room Nights" value={String(totals.roomNights)} />
        <Metric label="Cancellations" value={String(totals.cancellations)} />
        <Metric label="Avg Daily Rate (USD)" value={`$${totals.avgDailyRate.toFixed(2)}`} />
        <Metric label="Avg Length Of Stay" value={totals.avgLengthOfStay.toFixed(2)} />
        <Metric label="Avg Lead Time" value={totals.avgLeadTime.toFixed(2)} />
      </section>

      <section className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-slate-50">
              {["Channel", "Revenue (USD)", "Reservations", "Room Nights", "Avg Length Of Stay", "Avg Lead Time", "Avg Daily Rate (USD)", "Cancellations"].map((heading) => (
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
                <td className="px-5 py-5">${row.revenue.toFixed(2)}</td>
                <td className="px-5 py-5">{row.reservations}</td>
                <td className="px-5 py-5">{row.roomNights}</td>
                <td className="px-5 py-5">{row.avgLengthOfStay.toFixed(2)}</td>
                <td className="px-5 py-5">{row.avgLeadTime.toFixed(2)}</td>
                <td className="px-5 py-5">${row.avgDailyRate.toFixed(2)}</td>
                <td className="px-5 py-5">{row.cancellations}</td>
              </tr>
            ))}
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
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDate(range.start)));
  const [draftStart, setDraftStart] = useState(() => parseDate(range.start));
  const [draftEnd, setDraftEnd] = useState<Date | null>(() => parseDate(range.end));
  const firstMonth = visibleMonth;
  const secondMonth = addMonths(visibleMonth, 1);

  useEffect(() => {
    if (!open) return;
    setDraftStart(parseDate(range.start));
    setDraftEnd(parseDate(range.end));
    setVisibleMonth(startOfMonth(parseDate(range.start)));
  }, [open, range.start, range.end]);

  function selectDate(date: Date) {
    const selected = stripTime(date);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(selected);
      setDraftEnd(null);
      return;
    }

    const nextStart = selected < draftStart ? selected : draftStart;
    const nextEnd = selected < draftStart ? draftStart : selected;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setRange(buildDateRange(nextStart, nextEnd));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`focus-ring inline-flex h-11 min-w-[330px] items-center justify-between gap-4 rounded border bg-white px-4 text-sm ${open ? "border-blue-500" : "border-line"}`}
      >
        <span>{range.start}</span>
        <span className="text-slate-400">-&gt;</span>
        <span>{range.end}</span>
        <CalendarDays className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-30 grid w-[760px] max-w-[calc(100vw-2rem)] grid-cols-[150px_1fr] rounded-sm border border-line bg-white shadow-2xl">
          <div className="border-r border-line py-3">
            {quickRanges.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setDraftStart(parseDate(item.start));
                  setDraftEnd(parseDate(item.end));
                  setVisibleMonth(startOfMonth(parseDate(item.start)));
                  setRange(item);
                  setOpen(false);
                }}
                className={`block w-full px-5 py-3 text-left text-sm hover:bg-slate-50 ${range.label === item.label ? "font-semibold text-blue-500" : "text-slate-700"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-8 p-5 md:grid-cols-2">
            <CalendarMonth
              month={firstMonth}
              rangeStart={draftStart}
              rangeEnd={draftEnd}
              onPrevious={() => setVisibleMonth((current) => addMonths(current, -1))}
              onNext={() => setVisibleMonth((current) => addMonths(current, 1))}
              onSelectDate={selectDate}
            />
            <CalendarMonth
              month={secondMonth}
              rangeStart={draftStart}
              rangeEnd={draftEnd}
              onPrevious={() => setVisibleMonth((current) => addMonths(current, -1))}
              onNext={() => setVisibleMonth((current) => addMonths(current, 1))}
              onSelectDate={selectDate}
            />
          </div>
        </div>
      ) : null}
    </div>
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
              onClick={() => onSelectDate(day.date)}
              className={`py-2 ${selected ? "bg-cyan-50" : ""} ${day.currentMonth ? "text-slate-700" : "text-slate-300"} hover:bg-cyan-100`}
            >
              <span className={`inline-grid h-7 w-7 place-items-center rounded ${endpoint ? "bg-blue-500 text-white" : ""}`}>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-light text-slate-600">{value}</p>
    </div>
  );
}

function buildSourceRows(range: DateRange): SourceRow[] {
  const factor = range.days / defaultRange.days;
  const rows = sourceBaseRows.map((row) => ({
    ...row,
    bookings: Math.max(1, Math.round(row.bookings * factor)),
    revenue: roundCurrency(row.revenue * factor)
  }));
  const totalBookings = rows.reduce((sum, row) => sum + row.bookings, 0) || 1;
  return rows.map((row) => ({
    ...row,
    share: Math.round((row.bookings / totalBookings) * 100)
  }));
}

function buildReportRows(mode: ReportMode, range: DateRange): ChannelReportRow[] {
  const factor = range.days / defaultRange.days;
  return reportBaseRowsByMode[mode].map((row) => {
    const reservations = Math.max(1, Math.round(row.reservations * factor));
    const roomNights = Math.max(reservations, Math.round(row.roomNights * factor));
    const revenue = roundCurrency(row.revenue * factor);
    return {
      ...row,
      revenue,
      reservations,
      roomNights,
      avgLengthOfStay: roundMetric(roomNights / reservations),
      avgLeadTime: roundMetric(Math.max(1, row.avgLeadTime * (0.85 + Math.min(range.days, 90) / 180))),
      avgDailyRate: roundMetric(revenue / roomNights),
      cancellations: Math.max(0, Math.round(row.cancellations * factor))
    };
  });
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
