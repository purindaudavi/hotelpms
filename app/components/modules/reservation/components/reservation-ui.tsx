"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import type { ReservationStatus } from "@/app/data/pms-data";
import { statusLabel, statusTone } from "../utils";

export function ReservationPageFrame({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <main className={`space-y-4 ${compact ? "p-4 lg:p-5" : "p-4 lg:p-6"}`}>{children}</main>;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "p-5"
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
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
  onClick,
  tone = "light",
  type = "button",
  disabled = false
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  tone?: "light" | "dark" | "purple";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "dark"
      ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
      : tone === "purple"
        ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
        : "border-line bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  active = false,
  disabled = false
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md border text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function SearchBox(props: InputHTMLAttributes<HTMLInputElement>) {
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

export function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
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
          className={`min-w-24 rounded px-4 py-2 text-sm font-semibold transition ${
            value === tab.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StatusPill({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(status)}`}>{statusLabel(status)}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex min-h-32 items-center justify-center text-sm text-slate-500">{children}</div>;
}

export function Drawer({
  title,
  children,
  onClose,
  width = "max-w-xl"
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <aside className={`ml-auto flex h-full w-full ${width} flex-col rounded-l-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  width = "max-w-3xl"
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-lg bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-sm text-slate-500">{item.label}</p>
          <div className="mt-1 text-sm font-semibold text-slate-800">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
