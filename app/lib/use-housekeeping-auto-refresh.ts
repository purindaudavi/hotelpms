"use client";

import { useCallback, useEffect, useMemo, type RefObject } from "react";

// One read cycle per screen. Changing route/property cancels the previous cycle.
export function useHousekeepingAutoRefresh(
  load: (quiet: boolean, signal: AbortSignal) => Promise<boolean>,
  paused: RefObject<boolean>
) {
  const scope = useMemo(() => ({ active: false, pending: null as Promise<boolean> | null, controller: null as AbortController | null }), [load]);
  const refresh = useCallback((quiet = false): Promise<boolean> => {
    if (!scope.active) return Promise.resolve(false);
    if (scope.pending) return scope.pending;
    const controller = new AbortController();
    scope.controller = controller;
    const pending = load(quiet, controller.signal).finally(() => {
      if (scope.pending === pending) { scope.pending = null; scope.controller = null; }
    });
    scope.pending = pending;
    return pending;
  }, [load, scope]);
  const waitForRefresh = useCallback(() => scope.pending ?? Promise.resolve(false), [scope]);
  useEffect(() => {
    scope.active = true;
    void refresh();
    const poll = () => { if (!document.hidden && !paused.current && !scope.pending) void refresh(true); };
    const timer = window.setInterval(poll, 30_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      scope.active = false;
      scope.controller?.abort();
      scope.pending = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [paused, refresh, scope]);
  return { refresh, waitForRefresh };
}
