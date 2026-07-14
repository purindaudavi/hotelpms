import { ChevronDown } from "lucide-react";

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

type SelectOption = string | { value: string; label: string };

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[] }) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <span className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm">
          {options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

export function TextAreaField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="focus-ring min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm" />
    </label>
  );
}
