"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

export function RoomsRatesFrame({ children }: { children: ReactNode }) {
  return <main className="space-y-4 p-4 lg:p-6">{children}</main>;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  bodyClassName = "p-5",
  className = ""
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white shadow-sm ${className}`}>
      {title || subtitle || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title ? <h2 className="text-xl font-semibold leading-tight">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ToolbarButton({
  children,
  icon,
  tone = "light",
  type = "button",
  onClick,
  disabled = false
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "light" | "dark" | "danger" | "muted";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    tone === "dark"
      ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
      : tone === "danger"
        ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
        : tone === "muted"
          ? "border-slate-100 bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "border-line bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  active = false,
  onClick
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        {...props}
        className={`h-12 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 ${
          props.className ?? ""
        }`}
      />
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 ${
        props.className ?? ""
      }`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-slate-500 ${props.className ?? ""}`}
    />
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = ""
}: {
  tabs: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-md bg-slate-100 p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`min-w-28 rounded px-4 py-2 text-sm font-semibold transition ${
            tab.value === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-3xl"
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <aside className={`ml-auto flex h-full w-full ${width} flex-col rounded-l-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-6">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-950">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </aside>
    </div>
  );
}

export function StatusPill({ children, active = true }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {children}
    </span>
  );
}
