import { Play, X } from "lucide-react";
import type { ReactNode } from "react";

export function HkButton({
  children,
  onClick,
  variant = "secondary",
  className = "",
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "secondary" | "primary" | "purple" | "green";
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    secondary: "border border-line bg-white text-ink hover:bg-slate-50",
    primary: "bg-ink text-white hover:bg-slate-800",
    purple: "bg-indigo-700 text-white hover:bg-indigo-800",
    green: "bg-emerald-600 text-white hover:bg-emerald-700"
  };

  return (
    <button type={type} onClick={onClick} className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function SegmentedTabs<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (tab: T) => void }) {
  return (
    <div className="grid rounded-lg bg-slate-100 p-1 text-sm font-semibold text-slate-500" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)} className={`h-10 rounded-md px-3 transition ${active === tab ? "bg-white text-ink shadow-sm" : "hover:text-ink"}`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 min-w-[320px] rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
    />
  );
}

export function RightDrawer({ title, subtitle, children, onClose, width = "max-w-2xl" }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50">
      <aside className={`ml-auto flex h-full w-full ${width} flex-col overflow-y-auto rounded-l-2xl bg-white shadow-2xl`}>
        <header className="flex items-start justify-between border-b border-line px-8 py-7">
          <div>
            <h2 className="text-2xl font-bold text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close drawer">
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function HelpVideoButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid h-20 w-20 place-items-center rounded-full bg-cyan-100 text-ink shadow-sm" aria-label="Open help video">
      <Play className="h-5 w-5" />
    </button>
  );
}

export function HelpVideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6">
      <button onClick={onClose} className="absolute right-[22%] top-[24%] inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
        <X className="h-4 w-4" />
        Close
      </button>
      <section className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl border-8 border-white bg-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_45%,#ffffff_0_28%,transparent_29%),linear-gradient(135deg,#020617_0%,#041785_58%,#f8fafc_59%)]" />
        <div className="relative z-10 flex h-full items-center">
          <div className="ml-16 text-white">
            <p className="text-2xl font-bold">STAYPILOT PMS - hk act</p>
            <p className="text-sm">StayPilot PMS</p>
            <h3 className="mt-28 text-3xl font-extrabold">HOUSEKEEPING ACTIVITIES</h3>
          </div>
          <div className="absolute left-1/2 top-1/2 grid h-16 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-red-600 text-white">
            <Play className="h-9 w-9 fill-current" />
          </div>
          <div className="absolute bottom-8 left-8 flex gap-4 rounded-full bg-slate-950/50 px-5 py-3 text-white">
            <Play className="h-6 w-6" />
            <span className="font-semibold">Watch on video</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}
