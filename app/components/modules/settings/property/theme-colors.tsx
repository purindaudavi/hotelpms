"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { isHexColor } from "@/app/lib/property-theme";
import type { ThemeSettings } from "./property-types";

const accents = [
  { name: "Blue", color: "#3b82f6" },
  { name: "Green", color: "#22c55e" },
  { name: "Purple", color: "#a855f7" },
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Pink", color: "#ec4899" }
];

const descriptions: Record<string, string> = {
  "Confirmed Reservation": "Confirmed bookings",
  Tentative: "Tentative reservations",
  "Checked-out": "Guests who have checked out",
  "Checked-in": "Guests currently checked in",
  Cancelled: "Cancelled reservations",
  "No Show": "Guests who did not show up",
  "No-Show (Surcharge)": "No-show with a surcharge applied",
  Block: "Blocked rooms",
  "OUT OF ORDER": "Rooms that are out of order",
  InvalidCC: "Reservations with an invalid credit card"
};

type ThemeTabProps = {
  value: ThemeSettings;
  setValue: Dispatch<SetStateAction<ThemeSettings>>;
  defaults: ThemeSettings;
  onSave: (theme: ThemeSettings) => Promise<void>;
};

export function ThemeTab({ value, setValue, defaults, onSave }: ThemeTabProps) {
  const [draftColors, setDraftColors] = useState(value.statusColors);

  useEffect(() => {
    setDraftColors(value.statusColors);
  }, [value.statusColors]);

  function saveColors() {
    const next = { ...value, statusColors: draftColors, mode: "light" as const, autoDetect: false };
    setValue(next);
    void onSave(next);
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><Palette />Theme Colors</h2>
        <p className="mt-1 text-sm text-slate-500">Light and dark mode controls will be added later. These colors apply throughout the PMS.</p>
      </div>

      <Section title="Accent Color" subtitle="Used for shared buttons, active navigation and highlights across the PMS.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accents.map((accent) => (
            <button key={accent.name} type="button" onClick={() => setValue({ ...value, accent: accent.color })} className={`flex h-14 items-center gap-3 rounded-md border-2 px-4 font-semibold ${value.accent === accent.color ? "border-current" : "border-line"}`} style={{ color: value.accent === accent.color ? accent.color : undefined }}>
              <span className="h-7 w-7 rounded-full" style={{ background: accent.color }} />{accent.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Preview" subtitle="Preview the accent color before saving.">
        <div className="rounded-lg border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-lg font-semibold">Sample Content</h3><button type="button" className="rounded-md px-4 py-2 font-semibold text-white" style={{ background: value.accent }}>Sample Button</button></div>
          <p className="my-5 text-slate-500">Status colors below are used by Front Desk, Bookings and reservation details.</p>
        </div>
      </Section>

      <Section title="Reservation Status Colors" subtitle="Use one consistent color for each reservation status throughout the PMS.">
        <div className="space-y-3">
          {Object.entries(draftColors).map(([status, color]) => (
            <div key={status} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
              <div className="flex items-center gap-3"><span className="h-5 w-5 rounded-full" style={{ background: isHexColor(color) ? color : "transparent" }} /><div><p className="font-semibold">{status}</p><p className="text-sm text-slate-500">{descriptions[status]}</p></div></div>
              <div className="flex items-center gap-2"><input type="color" value={isHexColor(color) ? color : "#000000"} onChange={(event) => setDraftColors({ ...draftColors, [status]: event.target.value })} className="h-10 w-14" /><input value={color} onChange={(event) => setDraftColors({ ...draftColors, [status]: event.target.value })} className={`h-10 w-28 rounded border px-2 font-mono text-sm ${isHexColor(color) ? "border-line" : "border-red-500"}`} aria-invalid={!isHexColor(color)} /></div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-4">{Object.entries(draftColors).map(([status, color]) => <span key={status} className="rounded px-3 py-1 text-sm font-semibold text-white" style={{ background: isHexColor(color) ? color : "#6b7280" }}>{status}</span>)}</div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={saveColors} disabled={Object.values(draftColors).some((color) => !isHexColor(color))} className="h-11 rounded-md px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: value.accent }}>Save Theme Colors</button>
          <button type="button" onClick={() => setDraftColors(value.statusColors)} className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 font-semibold"><RotateCcw className="h-4 w-4" />Undo Changes</button>
        </div>
      </Section>

      <Section title="Reset Colors" subtitle="Restore the default accent and reservation-status colors.">
        <button type="button" onClick={() => { setValue(defaults); setDraftColors(defaults.statusColors); void onSave(defaults); }} className="rounded-md border border-line px-5 py-3 font-semibold">Reset Colors</button>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-line p-6"><h3 className="text-2xl font-semibold">{title}</h3><p className="mb-6 mt-1 text-slate-500">{subtitle}</p>{children}</section>;
}
