export type ColorScheme = "light" | "dark";

export const colorSchemeStorageKey = "staypilot:color-scheme";
export const colorSchemeChangeEvent = "staypilot:color-scheme-change";

export function normalizeColorScheme(value: unknown): ColorScheme {
  return value === "dark" ? "dark" : "light";
}

export function readColorScheme(): ColorScheme {
  if (typeof window === "undefined") return "light";

  try {
    return normalizeColorScheme(window.localStorage.getItem(colorSchemeStorageKey));
  } catch {
    return normalizeColorScheme(document.documentElement.dataset.theme);
  }
}

export function applyColorScheme(scheme: ColorScheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.classList.toggle("dark", scheme === "dark");
  root.style.colorScheme = scheme;
}

export function saveColorScheme(scheme: ColorScheme) {
  if (typeof window === "undefined") return;

  applyColorScheme(scheme);
  try {
    window.localStorage.setItem(colorSchemeStorageKey, scheme);
  } catch {
    // The theme still applies for the current page when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(colorSchemeChangeEvent, { detail: scheme }));
}
