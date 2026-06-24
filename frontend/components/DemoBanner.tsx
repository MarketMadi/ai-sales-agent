"use client";

import { IS_DEMO_MODE } from "@/lib/api";

export function DemoBanner() {
  if (!IS_DEMO_MODE) return null;
  return (
    <div
      style={{
        background: "#eff6ff",
        borderBottom: "1px solid #bfdbfe",
        padding: "0.5rem 2rem",
        fontSize: "0.875rem",
        color: "#1e40af",
      }}
    >
      Live demo — runs in your browser with sample Apollo export data. No backend required.
    </div>
  );
}
