"use client";

import { useEffect, useState } from "react";
import { Xray } from "@stinsky/xray";

export function SourceInspector() {
  const [showButton, setShowButton] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.repeat &&
        (event.key === "." || event.code === "Period")
      ) {
        event.preventDefault();
        setShowButton((visible) => !visible);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Xray
      hotKey={{ ctrlKey: true, altKey: true, key: "/" }}
      showButton={showButton}
    />
  );
}
