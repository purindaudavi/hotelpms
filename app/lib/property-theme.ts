import type { ThemeSettings } from "@/app/components/modules/settings/property/property-types";
import type { ReservationStatus } from "@/app/data/pms-data";

export const DEFAULT_PROPERTY_THEME: ThemeSettings = {
  mode: "light",
  autoDetect: false,
  accent: "#3b82f6",
  statusColors: {
    "Confirmed Reservation": "#10b981",
    Tentative: "#f59e0b",
    "Checked-out": "#ef4444",
    "Checked-in": "#06b6d4",
    Cancelled: "#6b7280",
    "No Show": "#78716c",
    "No-Show (Surcharge)": "#57534e",
    Block: "#a855f7",
    "OUT OF ORDER": "#1f2937",
    InvalidCC: "#be185d"
  }
};

export const reservationStatusCssVariables: Record<string, string> = {
  "Confirmed Reservation": "--reservation-confirmed",
  Tentative: "--reservation-tentative",
  "Checked-out": "--reservation-checked-out",
  "Checked-in": "--reservation-checked-in",
  Cancelled: "--reservation-cancelled",
  "No Show": "--reservation-no-show",
  "No-Show (Surcharge)": "--reservation-no-show-surcharge",
  Block: "--reservation-blocked",
  "OUT OF ORDER": "--reservation-out-of-order",
  InvalidCC: "--reservation-invalid-card"
};

const statusClassNames: Record<ReservationStatus | "No-Show (Surcharge)" | "OUT OF ORDER" | "InvalidCC", string> = {
  Confirmed: "reservation-status-confirmed",
  Tentative: "reservation-status-tentative",
  "Checked-out": "reservation-status-checked-out",
  "Checked-in": "reservation-status-checked-in",
  Cancelled: "reservation-status-cancelled",
  "No Show": "reservation-status-no-show",
  "No-Show (Surcharge)": "reservation-status-no-show-surcharge",
  Blocked: "reservation-status-blocked",
  "OUT OF ORDER": "reservation-status-out-of-order",
  InvalidCC: "reservation-status-invalid-card"
};

export function propertyThemeStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:property:theme`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizePropertyTheme(value: unknown): ThemeSettings {
  const candidate = value && typeof value === "object" ? value as Partial<ThemeSettings> : {};
  const candidateColors = candidate.statusColors && typeof candidate.statusColors === "object"
    ? candidate.statusColors
    : {};
  const statusColors = Object.fromEntries(
    Object.entries(DEFAULT_PROPERTY_THEME.statusColors).map(([status, fallback]) => [
      status,
      isHexColor(candidateColors[status]) ? candidateColors[status] : fallback
    ])
  );

  return {
    mode: "light",
    autoDetect: false,
    accent: isHexColor(candidate.accent) ? candidate.accent : DEFAULT_PROPERTY_THEME.accent,
    statusColors
  };
}

export function applyPropertyTheme(theme: ThemeSettings) {
  if (typeof document === "undefined") return;
  const normalized = normalizePropertyTheme(theme);
  const root = document.documentElement;
  root.style.setProperty("--property-accent", normalized.accent);
  for (const [status, variable] of Object.entries(reservationStatusCssVariables)) {
    root.style.setProperty(variable, normalized.statusColors[status]);
  }
}

export function reservationStatusClass(
  status: ReservationStatus | "No-Show (Surcharge)" | "OUT OF ORDER" | "InvalidCC",
  appearance: "pill" | "dot" = "pill"
) {
  return `${statusClassNames[status]} reservation-status-${appearance}`;
}
