"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EDITOR_PORT = 5678;
const INSPECTOR_COLOR = "#0878FC";

type InspectorMode = "page" | "css";
type GlobalRule = {
  selector: string;
  line: string;
  column: string;
  conditions: { name: string; value: string }[];
  declarations: string;
};
type CssMatch = GlobalRule & { ancestor: string | null };
type CssSelection = { filePath: string; matches: CssMatch[]; message: string };

function matchGlobalRules(target: Element, rules: GlobalRule[]): CssMatch[] {
  const matches: CssMatch[] = [];
  for (const rule of rules) {
    if (!rule.conditions.every((condition) => condition.name === "media"
      ? window.matchMedia(condition.value).matches
      : CSS.supports(condition.value))) continue;
    let element: Element | null = target;
    while (element) {
      try {
        if (element.matches(rule.selector)) {
          matches.push({ ...rule, ancestor: element === target ? null : element.tagName.toLowerCase() });
          break;
        }
      } catch {
        // Pseudo-elements and unsupported selectors cannot be selected as DOM elements.
        break;
      }
      element = element.parentElement;
    }
  }
  return matches.sort((a, b) => Number(Boolean(a.ancestor)) - Number(Boolean(b.ancestor)) || Number(b.line) - Number(a.line));
}

async function openInEditor(source: SourceLocation) {
  const query = new URLSearchParams({ file: source.filePath, line: source.line, column: source.column });
  const response = await fetch(`http://localhost:${EDITOR_PORT}/?${query}`, {
    method: "GET", mode: "cors"
  });
  if (!response.ok) throw new Error("Editor bridge unavailable");
}

type SourceLocation = {
  filePath: string;
  line: string;
  column: string;
};

type ReactFiber = {
  type?: string | { displayName?: string; name?: string };
  return?: ReactFiber | null;
};

function parseSourceLocation(value: string): SourceLocation {
  const parts = value.split(":");
  parts.pop();

  const column = parts.pop() ?? "1";
  const line = parts.pop() ?? "1";

  return { filePath: parts.join(":"), line, column };
}

function findSourceLocation(element: Element | null): string | null {
  let current = element;

  while (current) {
    const sourceLocation = current.getAttribute("data-insp-path");
    if (sourceLocation) return sourceLocation;
    current = current.parentElement;
  }

  return null;
}

function getComponentName(element: Element): string | null {
  const fiberKey = Object.keys(element).find((key) => key.startsWith("__reactFiber$"));
  let fiber = fiberKey
    ? ((element as unknown as Record<string, unknown>)[fiberKey] as ReactFiber | undefined)
    : undefined;

  for (let depth = 0; fiber && depth < 30; depth += 1) {
    if (fiber.type && typeof fiber.type !== "string") {
      const name = fiber.type.displayName || fiber.type.name;
      if (name) return name;
    }
    fiber = fiber.return ?? undefined;
  }

  return null;
}

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

export function SourceInspector() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [mode, setMode] = useState<InspectorMode>("page");
  const [cssSelection, setCssSelection] = useState<CssSelection | null>(null);
  const [notice, setNotice] = useState("");
  const cssRequestRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const currentTargetRef = useRef<Element | null>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  const hideSelection = useCallback(() => {
    currentTargetRef.current = null;
    if (overlayRef.current) overlayRef.current.style.display = "none";
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }, []);

  const toggleInspector = useCallback(() => {
    setEnabled((current) => !current);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => current === "page" ? "css" : "page");
    setShowButton(true);
  }, []);

  useEffect(() => {
    cssRequestRef.current += 1;
    setCssSelection(null);
    setNotice("");
  }, [mode, enabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const ctrlAltOnly =
        event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && !event.repeat;

      if (ctrlAltOnly && (event.key === "/" || event.code === "Slash")) {
        event.preventDefault();
        toggleInspector();
        return;
      }

      if (ctrlAltOnly && (event.key === "." || event.code === "Period")) {
        event.preventDefault();
        setShowButton((visible) => !visible);
        return;
      }

      if (ctrlAltOnly && (event.key === "," || event.code === "Comma")) {
        event.preventDefault();
        toggleMode();
        return;
      }

      if (event.key === "Escape") setEnabled(false);
    };

    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [toggleInspector, toggleMode]);

  useEffect(() => {
    if (!enabled) {
      hideSelection();
      return;
    }

    const previousCursor = document.documentElement.style.cursor;
    document.documentElement.style.cursor = "crosshair";

    const isInspectorElement = (target: EventTarget | null) => {
      const node = target instanceof Node ? target : null;
      return Boolean(node && buttonRef.current?.contains(node));
    };

    const positionSelection = () => {
      const target = currentTargetRef.current;
      const overlay = overlayRef.current;
      const tooltip = tooltipRef.current;

      if (!target || !target.isConnected || !overlay || !tooltip) {
        hideSelection();
        return;
      }

      const sourceValue = findSourceLocation(target);
      if (!sourceValue && mode === "page") {
        hideSelection();
        return;
      }

      const rect = target.getBoundingClientRect();
      const source = sourceValue ? parseSourceLocation(sourceValue) : null;
      const componentName = getComponentName(target);
      const { x, y } = mousePositionRef.current;

      overlay.style.display = "block";
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;

      tooltip.replaceChildren();
      if (componentName) {
        const componentLine = document.createElement("div");
        componentLine.textContent = componentName;
        tooltip.appendChild(componentLine);
      }

      const sourceLine = document.createElement("div");
      sourceLine.textContent = mode === "css"
        ? "Global CSS · click to find matching rules"
        : source ? `${getFileName(source.filePath)}:${source.line}:${source.column}` : "";
      sourceLine.style.opacity = componentName ? "0.78" : "1";
      tooltip.appendChild(sourceLine);

      const fullPathLine = document.createElement("div");
      fullPathLine.textContent = mode === "css" ? "app/globals.css · Ctrl + Alt + , switches mode" : source?.filePath ?? "";
      fullPathLine.style.opacity = "0.62";
      fullPathLine.style.fontSize = "10px";
      fullPathLine.style.overflow = "hidden";
      fullPathLine.style.textOverflow = "ellipsis";
      tooltip.appendChild(fullPathLine);

      tooltip.style.display = "block";
      const gap = 12;
      let top = y + gap;
      let left = x + gap;

      if (top + tooltip.offsetHeight > window.innerHeight) {
        top = y - tooltip.offsetHeight - gap;
      }
      if (left + tooltip.offsetWidth > window.innerWidth) {
        left = x - tooltip.offsetWidth - gap;
      }

      tooltip.style.top = `${Math.max(8, top)}px`;
      tooltip.style.left = `${Math.max(8, left)}px`;
    };

    const inspectAtPointer = (event: MouseEvent | PointerEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
      const target = event.target instanceof Element ? event.target : null;

      if (!target || isInspectorElement(target)) {
        hideSelection();
        return;
      }

      currentTargetRef.current = target;
      positionSelection();
    };

    const blockEvent = (event: Event) => {
      if (isInspectorElement(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const openSource = (event: MouseEvent) => {
      if (isInspectorElement(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      setNotice("");
      if (mode === "css") {
        const request = ++cssRequestRef.current;
        setShowButton(true);
        setCssSelection({ filePath: "", matches: [], message: "Finding matching global CSS rules…" });
        void fetch("/api/dev/source-inspector", { cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) throw new Error("CSS source unavailable");
            return await response.json() as { filePath: string; rules: GlobalRule[] };
          })
          .then(({ filePath, rules }) => {
            if (request !== cssRequestRef.current) return;
            const matches = matchGlobalRules(target, rules);
            setCssSelection({ filePath, matches, message: matches.length
              ? "Choose a rule to open its source line. Ancestor rules may affect inherited styles."
              : "No matching handwritten rule in globals.css. This element may use Tailwind classes or inline styles; use Page mode to edit those." });
          })
          .catch(() => {
            if (request !== cssRequestRef.current) return;
            setCssSelection({ filePath: "", matches: [], message: "Could not load globals.css. Restart the development server and try again." });
          });
        return;
      }
      const sourceValue = findSourceLocation(target);
      if (!sourceValue) return;

      const source = parseSourceLocation(sourceValue);
      void openInEditor(source).catch(() => {
        setShowButton(true);
        setNotice("Editor bridge unavailable. Start the dev server with NEXT_PUBLIC_SOURCE_INSPECTOR=1.");
      });
    };

    const refreshSelection = () => positionSelection();
    const blockedEvents = ["pointerdown", "pointerup", "mousedown", "mouseup", "submit"];

    window.addEventListener("mousemove", inspectAtPointer, true);
    window.addEventListener("pointerdown", inspectAtPointer, true);
    window.addEventListener("click", openSource, true);
    window.addEventListener("scroll", refreshSelection, true);
    window.addEventListener("resize", refreshSelection);
    blockedEvents.forEach((eventName) => window.addEventListener(eventName, blockEvent, true));

    return () => {
      document.documentElement.style.cursor = previousCursor;
      window.removeEventListener("mousemove", inspectAtPointer, true);
      window.removeEventListener("pointerdown", inspectAtPointer, true);
      window.removeEventListener("click", openSource, true);
      window.removeEventListener("scroll", refreshSelection, true);
      window.removeEventListener("resize", refreshSelection);
      blockedEvents.forEach((eventName) =>
        window.removeEventListener(eventName, blockEvent, true)
      );
      hideSelection();
    };
  }, [enabled, hideSelection, mode]);

  if (!mounted || process.env.NODE_ENV !== "development") return null;

  return createPortal(
    <>
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          zIndex: 2147483644,
          display: "none",
          pointerEvents: "none",
          border: `2px solid ${INSPECTOR_COLOR}`,
          borderRadius: 4,
          background: "rgba(8, 120, 252, 0.09)",
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.9) inset"
        }}
      />
      <div
        ref={tooltipRef}
        role="status"
        style={{
          position: "fixed",
          zIndex: 2147483645,
          display: "none",
          width: "max-content",
          maxWidth: "min(520px, calc(100vw - 24px))",
          pointerEvents: "none",
          overflow: "hidden",
          padding: "7px 10px",
          borderRadius: 7,
          background: INSPECTOR_COLOR,
          color: "#fff",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.26)",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.45,
          whiteSpace: "nowrap"
        }}
      />
      {showButton && (
        <div
          ref={buttonRef}
          data-source-inspector-control="true"
          style={{ position: "fixed", right: 18, bottom: 18, zIndex: 2147483646, display: "flex", alignItems: "center", gap: 8, color: "#f8fafc", fontFamily: "Arial, sans-serif" }}
        >
          {(cssSelection || notice) && (
            <div role="dialog" aria-label="Global CSS source rules" style={{ position: "absolute", right: 0, bottom: 52, width: "min(460px, calc(100vw - 36px))", maxHeight: "min(480px, calc(100vh - 100px))", overflowY: "auto", padding: 16, borderRadius: 12, background: "#0f172a", color: "#f8fafc", border: "1px solid #475569", boxShadow: "0 12px 40px #0005", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong>Global CSS source · {cssSelection?.matches.length ?? 0} rules</strong>
                <button type="button" aria-label="Close source rules" onClick={() => { cssRequestRef.current += 1; setCssSelection(null); setNotice(""); }} style={{ background: "transparent", color: "#fff", border: 0, padding: 6, cursor: "pointer" }}>✕</button>
              </div>
              <p role="status" style={{ margin: "0 0 12px", color: "#cbd5e1", lineHeight: 1.5 }}>{notice || cssSelection?.message}</p>
              {cssSelection?.matches.map((rule) => (
                <button key={`${rule.line}:${rule.column}`} type="button" onClick={() => {
                  void openInEditor({ filePath: cssSelection.filePath, line: rule.line, column: rule.column }).catch(() => setNotice("Editor bridge unavailable. Start the dev server with NEXT_PUBLIC_SOURCE_INSPECTOR=1."));
                }} style={{ display: "block", textAlign: "left", width: "100%", marginTop: 8, padding: 10, border: "1px solid #475569", borderRadius: 7, background: "#1e293b", color: "#f8fafc", cursor: "pointer", overflowWrap: "anywhere" }}>
                  <strong style={{ display: "block", color: "#93c5fd" }}>{rule.selector}</strong>
                  <span style={{ display: "block", marginTop: 4 }}>globals.css:{rule.line} · {rule.ancestor ? `ancestor <${rule.ancestor}>` : "selected element"}</span>
                  {rule.conditions.length > 0 && <span style={{ display: "block", marginTop: 4, color: "#cbd5e1" }}>{rule.conditions.map((condition) => `@${condition.name} ${condition.value}`).join(" · ")}</span>}
                  <span style={{ display: "block", marginTop: 4, color: "#cbd5e1", fontFamily: "monospace", fontSize: 11 }}>{rule.declarations}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={toggleMode} title="Switch source mode (Ctrl + Alt + ,)" aria-label={`Source mode: ${mode === "page" ? "Page" : "Global CSS"}. Click to switch.`} style={{ border: "1px solid #475569", borderRadius: 20, padding: "8px 12px", background: "#0f172a", color: "#f8fafc", fontSize: 12, cursor: "pointer" }}>
            {mode === "page" ? "Page" : "Global CSS"}
          </button>
          <button
            type="button"
            aria-label={enabled ? "Disable source inspector" : "Enable source inspector"}
            aria-pressed={enabled}
            title="Source inspector (Ctrl + Alt + /)"
            onClick={toggleInspector}
            style={{
              width: 40,
              height: 40,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: enabled
                ? `1px solid ${INSPECTOR_COLOR}`
                : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.9)",
              color: enabled ? INSPECTOR_COLOR : "#fff",
              boxShadow: enabled
                ? "0 0 0 3px rgba(8, 120, 252, 0.2), 0 8px 28px rgba(15, 23, 42, 0.25)"
                : "0 8px 28px rgba(15, 23, 42, 0.22)",
              cursor: "pointer",
              opacity: enabled ? 1 : 0.68
            }}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" opacity="0.55" />
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
            </svg>
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
