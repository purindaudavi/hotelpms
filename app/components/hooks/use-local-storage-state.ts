"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

const localStorageSyncEvent = "staypilot:local-storage-sync";

export type StorageValidator<T> = (value: unknown) => value is T;
export type StorageNormalizer<T> = (value: T) => T;

function resolveInitialValue<T>(value: T | (() => T)) {
  return typeof value === "function" ? (value as () => T)() : value;
}

function isCompatibleWithFallback<T>(value: unknown, fallback: T): value is T {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (fallback === null) return value === null;
  if (typeof fallback === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  return typeof value === typeof fallback;
}

function storageValuesEqual<T>(left: T, right: T) {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function parseStoredValue<T>(raw: string | null, fallback: T, validator?: StorageValidator<T>, normalizer?: StorageNormalizer<T>): T | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!(validator ? validator(parsed) : isCompatibleWithFallback(parsed, fallback))) return null;
    return normalizer ? normalizer(parsed as T) : parsed as T;
  } catch {
    return null;
  }
}

export function readLocalStorageValue<T>(key: string, fallback: T, validator?: StorageValidator<T>, normalizer?: StorageNormalizer<T>): T {
  if (typeof window === "undefined") return normalizer ? normalizer(fallback) : fallback;

  try {
    const localValue = parseStoredValue<T>(window.localStorage.getItem(key), fallback, validator, normalizer);
    if (localValue !== null) return localValue;

    const sessionValue = parseStoredValue<T>(window.sessionStorage.getItem(key), fallback, validator, normalizer);
    if (sessionValue !== null) {
      window.localStorage.setItem(key, JSON.stringify(sessionValue));
      window.sessionStorage.removeItem(key);
      return sessionValue;
    }
  } catch {
    // Storage is best-effort; callers receive their validated fallback.
  }

  return normalizer ? normalizer(fallback) : fallback;
}

export function hasLocalStorageState(key: string) {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(key) !== null) return true;
    const legacy = window.sessionStorage.getItem(key);
    if (legacy === null) return false;
    window.localStorage.setItem(key, legacy);
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  validator?: StorageValidator<T>,
  normalizer?: StorageNormalizer<T>
): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initialValue);
  const validatorRef = useRef(validator);
  const normalizerRef = useRef(normalizer);
  const [hydrated, setHydrated] = useState(false);
  const [value, setValue] = useState<T>(() => resolveInitialValue(initialRef.current));
  initialRef.current = initialValue;
  validatorRef.current = validator;
  normalizerRef.current = normalizer;

  useEffect(() => {
    const fallback = resolveInitialValue(initialRef.current);
    setValue(readLocalStorageValue(key, fallback, validatorRef.current, normalizerRef.current));
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<{ key: string; value: unknown }>).detail;
      if (!detail || detail.key !== key) return;
      const next = detail.value;
      if (!(validatorRef.current ? validatorRef.current(next) : isCompatibleWithFallback(next, resolveInitialValue(initialRef.current)))) return;
      const normalized = normalizerRef.current ? normalizerRef.current(next as T) : next as T;
      setValue((current) => storageValuesEqual(current, normalized) ? current : normalized);
    }

    function syncStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage || event.key !== key) return;
      const fallback = resolveInitialValue(initialRef.current);
      const next = parseStoredValue(event.newValue, fallback, validatorRef.current, normalizerRef.current);
      if (next !== null) setValue((current) => storageValuesEqual(current, next) ? current : next);
    }

    window.addEventListener(localStorageSyncEvent, sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(localStorageSyncEvent, sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const serialized = JSON.stringify(value);
      if (window.localStorage.getItem(key) === serialized) return;
      window.localStorage.setItem(key, serialized);
      window.dispatchEvent(new CustomEvent(localStorageSyncEvent, { detail: { key, value } }));
    } catch {
      // The app keeps the in-memory value if storage is unavailable or full.
    }
  }, [hydrated, key, value]);

  return [value, setValue];
}
