"use client";

import { IS_DEMO_MODE } from "@/lib/api";

export function DemoBanner() {
  if (!IS_DEMO_MODE) return null;
  return (
    <div
      style={{
        background: "#eff6ff",
        borderBottom: "1px solid #bfdbfe",
        padding: "0.6rem 2rem",
        fontSize: "0.875rem",
        color: "#1e40af",
      }}
    >
      <strong>Interactive demo</strong> — sample sales leads, AI scoring, and email drafts. No login, no backend.
      Start on the <a href="./dashboard/" style={{ color: "#1d4ed8" }}>Dashboard</a> and click{" "}
      <strong>Ingest Apollo CSV</strong>.
    </div>
  );
}
