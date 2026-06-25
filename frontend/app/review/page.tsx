"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiState } from "@/components/ApiState";
import { api, apiAdmin, ApiError } from "@/lib/api";

type ReviewItem = {
  draft: {
    id: number;
    subject: string;
    body: string;
    status: string;
  };
  company: {
    id: number;
    name: string;
    domain: string;
    enriched_payload: Record<string, string>;
  };
  qualification: {
    score: number;
    icp_fit: string;
    reasoning: string;
    disqualifiers: string[];
    talking_points: string[];
  } | null;
};

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<ReviewItem[]>("/review/pending")
      .then((data) => {
        setItems(data);
        if (data.length) {
          setSelected(data[0]);
          setSubject(data[0].draft.subject);
          setBody(data[0].draft.body);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "Failed to load reviews");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      setSubject(selected.draft.subject);
      setBody(selected.draft.body);
    }
  }, [selected]);

  async function approve() {
    if (!selected) return;
    await apiAdmin(`/review/${selected.draft.id}/approve`, {
      method: "POST",
      body: JSON.stringify({ subject, body, actor: "admin" }),
    });
    setMsg("Approved — logged to audit trail.");
    setSelected(null);
    load();
  }

  async function reject() {
    if (!selected) return;
    await apiAdmin(`/review/${selected.draft.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ actor: "admin", reason: "Not a fit" }),
    });
    setMsg("Rejected.");
    setSelected(null);
    load();
  }

  return (
    <div>
      <h1>Review Queue</h1>
      <p style={{ color: "#6b7280", maxWidth: 560 }}>
        AI drafted these emails. Read the score reasoning, edit the copy, then approve or reject.
        <strong> Nothing sends without your click.</strong>
      </p>
      <ApiState loading={loading} error={error} onRetry={load} />
      {msg && <p style={{ color: "#059669" }}>{msg}</p>}

      {!loading && !error && (
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", marginTop: "1rem" }}>
        <div>
          {items.length === 0 ? (
            <p className="card">No pending drafts. Run ingest from Dashboard.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.draft.id}
                onClick={() => setSelected(item)}
                className="card"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: "0.5rem",
                  border:
                    selected?.draft.id === item.draft.id ? "2px solid #111" : "1px solid #e5e7eb",
                  background: "#fff",
                }}
              >
                <strong>{item.company.name}</strong>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Score: {item.qualification?.score ?? "—"}
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>{selected.company.name}</h2>
              <span className={`badge badge-${selected.qualification?.icp_fit || "pending"}`}>
                {selected.qualification?.icp_fit}
              </span>
            </div>
            <p style={{ color: "#6b7280" }}>{selected.company.domain}</p>

            {selected.qualification && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h3>LLM Reasoning</h3>
                <p>{selected.qualification.reasoning}</p>
                {selected.qualification.disqualifiers?.length > 0 && (
                  <p>
                    <strong>Disqualifiers:</strong>{" "}
                    {selected.qualification.disqualifiers.join(", ")}
                  </p>
                )}
                {selected.qualification.talking_points?.length > 0 && (
                  <p>
                    <strong>Talking points:</strong>{" "}
                    {selected.qualification.talking_points.join("; ")}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3>Outreach Draft</h3>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Subject
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
                />
              </label>
              <label style={{ display: "block", marginBottom: "1rem" }}>
                Body
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={approve} style={btnApprove}>
                  Approve
                </button>
                <button onClick={reject} style={btnReject}>
                  Reject
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

const btnApprove: React.CSSProperties = {
  background: "#059669",
  color: "#fff",
  border: "none",
  padding: "0.6rem 1.2rem",
  borderRadius: 6,
};

const btnReject: React.CSSProperties = {
  background: "#fff",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  padding: "0.6rem 1.2rem",
  borderRadius: 6,
};
