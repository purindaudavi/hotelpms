"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { X } from "lucide-react";

export function PosFrame({ children }: { children: ReactNode }) {
  return <main className="space-y-5 p-4 lg:p-6">{children}</main>;
}

export function PosPanel({
  children,
  className = "",
  bodyClassName = ""
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white shadow-sm ${className}`}>
      <div className={bodyClassName || "p-5"}>{children}</div>
    </section>
  );
}

type PosButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "dark" | "blue" | "ghost";
  icon?: ReactNode;
};

export function PosButton({ tone = "default", icon, children, className = "", ...props }: PosButtonProps) {
  const tones = {
    default: "border border-line bg-white text-slate-800 hover:bg-slate-50",
    dark: "border border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
    blue: "border border-blue-500 bg-blue-500 text-white hover:bg-blue-600",
    ghost: "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
  };

  return (
    <button
      type="button"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  active,
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-md border text-sm transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${className}`}
      {...props}
    />
  );
}

export function SelectInput({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function SearchInput({
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">{icon}</span> : null}
      <input
        className={`h-12 w-full rounded-lg border border-blue-200 bg-white px-4 text-sm outline-none shadow-sm transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
          icon ? "pl-10" : ""
        }`}
        {...props}
      />
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  width = "max-w-xl"
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
      <section className={`w-full ${width} rounded-lg border border-line bg-white p-7 shadow-panel`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md border border-line p-1.5 text-slate-500 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Drawer({
  title,
  subtitle,
  children,
  onClose,
  width = "max-w-2xl"
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55">
      <section className={`h-full w-full ${width} overflow-y-auto rounded-l-2xl bg-white p-7 shadow-panel`}>
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
