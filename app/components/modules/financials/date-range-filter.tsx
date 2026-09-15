import { CalendarDays, X } from "lucide-react";

type DateRangeFilterProps = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  disabled?: boolean;
};

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  disabled = false
}: DateRangeFilterProps) {
  const active = Boolean(dateFrom || dateTo);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 self-center text-sm font-semibold text-slate-600">
        <CalendarDays className="h-4 w-4" /> Date
      </div>
      <label className="grid gap-1 text-xs font-semibold text-slate-500">
        From
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          disabled={disabled}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink disabled:opacity-50"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-slate-500">
        To
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          disabled={disabled}
          onChange={(event) => onDateToChange(event.target.value)}
          className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink disabled:opacity-50"
        />
      </label>
      {active ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => { onDateFromChange(""); onDateToChange(""); }}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-line px-3 text-sm font-semibold disabled:opacity-50"
        >
          <X className="h-4 w-4" /> Clear dates
        </button>
      ) : null}
    </div>
  );
}
