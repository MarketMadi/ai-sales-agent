"use client";

import { useState } from "react";
import { ApiState } from "@/components/ApiState";
import { api, apiAdmin, ApiError, IS_DEMO_MODE, sampleCsvUrl } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type Dashboard = {
  companies: number;
  qualified: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  activities: number;
};

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi<Dashboard>("/dashboard");
  const [ingestMsg, setIngestMsg] = useState("");

  async function runIngest() {
    setIngestMsg("Ingesting...");
    try {
      const result = await apiAdmin<{ imported: number; duplicates: number; scored: number }>(
        "/ingest/csv",
        { method: "POST" }
      );
      setIngestMsg(`Imported ${result.imported}, dupes ${result.duplicates}, scored ${result.scored}`);
      reload();
    } catch (e) {
      setIngestMsg(e instanceof ApiError ? e.message : String(e));
    }
  }

  const cards = [
    { label: "Companies", value: data?.companies ?? 0 },
    { label: "Qualified", value: data?.qualified ?? 0 },
    { label: "Pending Approval", value: data?.pending_approval ?? 0 },
    { label: "Approved", value: data?.approved ?? 0 },
    { label: "Rejected", value: data?.rejected ?? 0 },
    { label: "Audit Events", value: data?.activities ?? 0 },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.9rem", maxWidth: 520 }}>
            Pipeline overview. Click <strong>Ingest Apollo CSV</strong> to load sample leads — AI will score each company and queue outreach drafts for your approval.
          </p>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
            Sample:{" "}
            <a href={sampleCsvUrl()} download="apollo_export.csv" style={{ color: "#2563eb" }}>
              apollo_export.csv
            </a>
            {IS_DEMO_MODE ? " (26 leads, 14 companies)" : ""}
          </p>
        </div>
        <button onClick={runIngest} style={btnPrimary}>
          Ingest Apollo CSV
        </button>
      </div>
      {ingestMsg && <p style={{ color: "#6b7280" }}>{ingestMsg}</p>}
      <ApiState loading={loading} error={error} onRetry={reload} />
      {!loading && !error && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{c.value}</div>
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>{c.label}</div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "0.6rem 1rem",
  borderRadius: 6,
};
