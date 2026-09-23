"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EDITOR_PORT = 5678;
const INSPECTOR_COLOR = "#0878FC";

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

      if (event.key === "Escape") setEnabled(false);
    };

    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [toggleInspector]);

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
      if (!sourceValue) {
        hideSelection();
        return;
      }

      const rect = target.getBoundingClientRect();
      const source = parseSourceLocation(sourceValue);
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
      sourceLine.textContent = `${getFileName(source.filePath)}:${source.line}:${source.column}`;
      sourceLine.style.opacity = componentName ? "0.78" : "1";
      tooltip.appendChild(sourceLine);

      const fullPathLine = document.createElement("div");
      fullPathLine.textContent = source.filePath;
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
      const sourceValue = findSourceLocation(target);
      if (!sourceValue) return;

      const source = parseSourceLocation(sourceValue);
      const query = new URLSearchParams({
        file: source.filePath,
        line: source.line,
        column: source.column
      });

      fetch(`http://localhost:${EDITOR_PORT}/?${query.toString()}`, {
        method: "GET",
        mode: "cors"
      }).catch(() => {
        // The editor bridge exists only while the Next.js dev server is running.
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
  }, [enabled, hideSelection]);

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
          style={{ position: "fixed", right: 18, bottom: 18, zIndex: 2147483646 }}
        >
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
