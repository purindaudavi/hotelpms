"use client";

import { useEffect } from "react";
import type { ThemeSettings } from "@/app/components/modules/settings/property/property-types";
import { getPropertyTheme } from "@/app/lib/property-api";
import {
  applyPropertyTheme,
  DEFAULT_PROPERTY_THEME,
  normalizePropertyTheme,
  propertyThemeStorageKey
} from "@/app/lib/property-theme";
import { useLocalStorageState } from "./use-local-storage-state";

export function usePropertyTheme(propertyId: string) {
  const [theme, setTheme] = useLocalStorageState<ThemeSettings>(
    propertyThemeStorageKey(propertyId),
    DEFAULT_PROPERTY_THEME,
    undefined,
    normalizePropertyTheme
  );

  useEffect(() => {
    applyPropertyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    getPropertyTheme(propertyId)
      .then((savedTheme) => {
        if (active) setTheme(savedTheme);
      })
      .catch(() => {
        // Keep the last cached appearance if the API is temporarily unavailable.
      });
    return () => {
      active = false;
    };
  }, [propertyId, setTheme]);

  return theme;
}
