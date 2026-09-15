"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyColorScheme,
  colorSchemeChangeEvent,
  type ColorScheme,
  normalizeColorScheme,
  readColorScheme,
  saveColorScheme
} from "@/app/lib/color-scheme";

export function useColorScheme() {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");

  useEffect(() => {
    const initial = readColorScheme();
    setColorSchemeState(initial);
    applyColorScheme(initial);

    function syncFromStorage() {
      const next = readColorScheme();
      setColorSchemeState(next);
      applyColorScheme(next);
    }

    function syncFromThemeEvent(event: Event) {
      const next = normalizeColorScheme((event as CustomEvent<unknown>).detail);
      setColorSchemeState(next);
      applyColorScheme(next);
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(colorSchemeChangeEvent, syncFromThemeEvent);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(colorSchemeChangeEvent, syncFromThemeEvent);
    };
  }, []);

  const setColorScheme = useCallback((next: ColorScheme) => {
    setColorSchemeState(next);
    saveColorScheme(next);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  }, [colorScheme, setColorScheme]);

  return { colorScheme, setColorScheme, toggleColorScheme };
}
