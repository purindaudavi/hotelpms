"use client";

import type { ReactNode } from "react";

type ViewModeOption<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
};

export function ViewModeSwitch<T extends string>({ value, onChange, options, className = "" }: {
  value: T;
  onChange: (value: T) => void;
  options: Array<ViewModeOption<T>>;
  className?: string;
}) {
  return (
    <div className={`view-mode-switch inline-flex items-center rounded-full bg-slate-100 p-1 ${className}`}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            title={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`view-mode-toggle grid h-10 w-10 place-items-center rounded-full border border-transparent transition ${active ? "bg-ink text-white shadow-sm" : "bg-transparent text-slate-700 hover:bg-white"}`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
