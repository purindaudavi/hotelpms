import { X } from "lucide-react";
import type { ReactNode } from "react";

export function HkButton({
  children,
  onClick,
  variant = "secondary",
  className = "",
  type = "button",
  disabled = false
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "secondary" | "primary" | "purple" | "green";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    secondary: "border border-line bg-white text-ink hover:bg-slate-50",
    primary: "bg-ink text-white hover:bg-slate-800",
    purple: "bg-indigo-700 text-white hover:bg-indigo-800",
    green: "bg-emerald-600 text-white hover:bg-emerald-700"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
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
