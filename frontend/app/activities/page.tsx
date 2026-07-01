"use client";

import { ApiState } from "@/components/ApiState";
import { useApi } from "@/lib/useApi";

type Activity = {
  id: number;
  company_id: number | null;
  action: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
};

function isHighlightAction(action: string): boolean {
  return /^(pipeline_|hubspot_|lead_captured|dedupe_|slack_notify_failed)/.test(action);
}

export default function ActivitiesPage() {
  const { data: rows, error, loading, reload } = useApi<Activity[]>("/activities?limit=100");

  return (
    <div>
      <h1>Audit Log</h1>
      <p style={{ color: "#6b7280" }}>
        Full history: imports, scoring, pipeline retries, HubSpot sync, approvals — who did what and when.
      </p>
      <ApiState loading={loading} error={error} onRetry={reload} />
      {!loading && !error && (
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={th}>Time</th>
              <th style={th}>Action</th>
              <th style={th}>Actor</th>
              <th style={th}>Company</th>
              <th style={th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr
                key={r.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: isHighlightAction(r.action) ? "#fef2f2" : undefined,
                }}
              >
                <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={td}>
                  <code>{r.action}</code>
                </td>
                <td style={td}>{r.actor}</td>
                <td style={td}>{r.company_id ?? "—"}</td>
                <td style={td}>
                  <pre style={{ margin: 0, fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(r.payload, null, 0)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "#6b7280" };
const td: React.CSSProperties = { padding: "0.75rem 0.5rem", fontSize: "0.875rem", verticalAlign: "top" };
