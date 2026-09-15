"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import type { DashboardDateRange } from "@/app/lib/dashboard-api";

export function DateRangePill({
  label,
  value,
  onApply,
  ariaLabel = "Select date range",
  align = "right",
  monthOnly = false
}: {
  label: string;
  value?: DashboardDateRange;
  onApply?: (value: DashboardDateRange) => Promise<void> | void;
  ariaLabel?: string;
  align?: "left" | "right";
  monthOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!value || !onApply) {
    return (
      <div className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-700">
        <CalendarDays className="h-4 w-4" />
        <span className="max-w-[190px] truncate">{label}</span>
      </div>
    );
  }

  const validationError = validateDateRange(draft);
  const applyRange = async () => {
    if (!draft || validationError) return;
    setLoading(true);
    setError("");
    try {
      await onApply(draft);
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load this date range.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`${id}-popover`}
        onClick={() => { setDraft(value); setError(""); setOpen((current) => !current); }}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
        <span className="max-w-[190px] truncate">{label}</span>
      </button>

      {open ? (
        <div id={`${id}-popover`} role="dialog" aria-label={ariaLabel} className={`absolute z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-white p-4 shadow-panel ${align === "left" ? "left-0" : "right-0"}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              From
              <input
                type={monthOnly ? "month" : "date"}
                value={monthOnly ? draft?.date_from.slice(0, 7) ?? "" : draft?.date_from ?? ""}
                onChange={(event) => setDraft((current) => ({ date_from: monthOnly && event.target.value ? `${event.target.value}-01` : event.target.value, date_to: current?.date_to ?? "" }))}
                className="h-10 min-w-0 rounded-md border border-line bg-white px-2 text-sm text-slate-800 focus-ring"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              To
              <input
                type={monthOnly ? "month" : "date"}
                value={monthOnly ? draft?.date_to.slice(0, 7) ?? "" : draft?.date_to ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const end = monthOnly && value ? new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 0)).toISOString().slice(0, 10) : value;
                  setDraft((current) => ({ date_from: current?.date_from ?? "", date_to: end }));
                }}
                className="h-10 min-w-0 rounded-md border border-line bg-white px-2 text-sm text-slate-800 focus-ring"
              />
            </label>
          </div>
          {validationError || error ? <p className="mt-3 text-xs font-medium text-red-600">{validationError || error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={loading} onClick={() => setOpen(false)} className="h-9 rounded-md border border-line px-3 text-sm font-semibold text-slate-700">Cancel</button>
            <button type="button" disabled={loading || Boolean(validationError)} onClick={() => void applyRange()} className="dashboard-date-apply inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function validateDateRange(value?: DashboardDateRange) {
  if (!value?.date_from || !value.date_to) return "Choose both a start and end date.";
  if (value.date_to < value.date_from) return "The end date must be on or after the start date.";
  const start = new Date(`${value.date_from}T00:00:00Z`).getTime();
  const end = new Date(`${value.date_to}T00:00:00Z`).getTime();
  if ((end - start) / 86_400_000 + 1 > 366) return "Choose a range of 366 days or less.";
  return "";
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
    <div className={`dashboard-metric-card dashboard-metric-card-${tone} rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/80">{icon}</div>
        <span className="text-4xl font-semibold">{value}</span>
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-75">{detail}</p>
    </div>
  );
}
