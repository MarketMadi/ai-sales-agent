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
  pipeline_pending?: number;
  pipeline_completed?: number;
  pipeline_dead?: number;
};

type PipelineJob = {
  id: number;
  status: string;
  company_id: number | null;
  hubspot_contact_id: string | null;
  retry_count: number;
  last_error: string | null;
  payload: Record<string, string>;
  created_at: string;
};

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi<Dashboard>("/dashboard");
  const { data: jobs, reload: reloadJobs } = useApi<PipelineJob[]>("/pipeline/jobs?limit=8");
  const [ingestMsg, setIngestMsg] = useState("");
  const [webhookMsg, setWebhookMsg] = useState("");

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

  async function simulateWebhook() {
    setWebhookMsg("Sending webhook lead...");
    try {
      const result = await api<{ job_id: number; status: string }>(
        "/webhooks/lead?simulate_retries=2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "jordan.lee@stackpilot.dev",
            company: "StackPilot",
            domain: "stackpilot.dev",
            title: "Head of Sales",
            employees: "95",
            industry: "Developer Tools",
            source: "form_webhook",
          }),
        }
      );
      setWebhookMsg(`Job #${result.job_id} accepted — scoring runs in the background`);
      setTimeout(() => {
        reload();
        reloadJobs();
      }, 4000);
    } catch (e) {
      setWebhookMsg(e instanceof ApiError ? e.message : String(e));
    }
  }

  const cards = [
    { label: "Companies", value: data?.companies ?? 0 },
    { label: "Qualified", value: data?.qualified ?? 0 },
    { label: "Pending Approval", value: data?.pending_approval ?? 0 },
    { label: "Approved", value: data?.approved ?? 0 },
    { label: "Rejected", value: data?.rejected ?? 0 },
    { label: "Audit Events", value: data?.activities ?? 0 },
    { label: "Pipeline Active", value: data?.pipeline_pending ?? 0 },
    { label: "Pipeline Done", value: data?.pipeline_completed ?? 0 },
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
        <button onClick={simulateWebhook} style={btnSecondary}>
          Simulate Webhook Lead
        </button>
      </div>
      {ingestMsg && <p style={{ color: "#6b7280" }}>{ingestMsg}</p>}
      {webhookMsg && <p style={{ color: "#6b7280" }}>{webhookMsg}</p>}
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

      {!loading && !error && (jobs?.length ?? 0) > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Lead pipeline jobs</h2>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Webhook leads are persisted first (202), then scored + synced to HubSpot async with retries.
          </p>
          <table style={{ width: "100%", marginTop: "0.75rem", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={th}>Job</th>
                <th style={th}>Status</th>
                <th style={th}>Retries</th>
                <th style={th}>HubSpot</th>
                <th style={th}>Lead</th>
              </tr>
            </thead>
            <tbody>
              {jobs!.map((j) => (
                <tr key={j.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}>#{j.id}</td>
                  <td style={td}>
                    <code>{j.status}</code>
                    {j.last_error && (
                      <div style={{ color: "#991b1b", fontSize: "0.75rem" }}>{j.last_error}</div>
                    )}
                  </td>
                  <td style={td}>{j.retry_count}</td>
                  <td style={td}>{j.hubspot_contact_id ?? "—"}</td>
                  <td style={td}>{j.payload.company || j.payload.domain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.5rem", color: "#6b7280" };
const td: React.CSSProperties = { padding: "0.5rem", verticalAlign: "top" };

const btnPrimary: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "0.6rem 1rem",
  borderRadius: 6,
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "0.6rem 1rem",
  borderRadius: 6,
};
