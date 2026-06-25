"use client";

import { useState } from "react";
import { ApiState } from "@/components/ApiState";
import { api, ApiError } from "@/lib/api";

type ChatResponse = {
  answer: string;
  intent: string;
  company_id: number | null;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("Why did Acme score high?");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setResponse(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Request failed");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(useful: boolean) {
    if (!response?.company_id) return;
    await api("/feedback", {
      method: "POST",
      body: JSON.stringify({
        company_id: response.company_id,
        useful,
        note: question,
      }),
    });
    setFeedbackMsg(useful ? "Marked useful" : "Marked not useful");
  }

  const suggestions = [
    "Why did Acme score high?",
    "What recent signals do we have for Brightpath?",
    "Tell me about Acme Corp company facts",
  ];

  return (
    <div>
      <h1>Chat</h1>
      <p style={{ color: "#6b7280", maxWidth: 560 }}>
        Ask questions about your leads — e.g. &quot;Why did Acme score high?&quot; Answers cite the underlying data.
      </p>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "0.35rem 0.75rem",
                fontSize: "0.85rem",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 8, marginBottom: "0.75rem" }}
        />
        <button onClick={ask} disabled={loading} style={btnPrimary}>
          {loading ? "Asking..." : "Ask"}
        </button>
        {error && <p style={{ color: "#991b1b", marginTop: "0.75rem" }}>{error}</p>}
      </div>

      {response && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <span className="badge badge-pending">intent: {response.intent}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{response.answer}</p>
          {response.company_id && (
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Was this useful?</span>
              <button onClick={() => sendFeedback(true)} style={btnSmall}>
                Yes
              </button>
              <button onClick={() => sendFeedback(false)} style={btnSmall}>
                No
              </button>
              {feedbackMsg && <span style={{ fontSize: "0.875rem", color: "#059669" }}>{feedbackMsg}</span>}
            </div>
          )}
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

const btnSmall: React.CSSProperties = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  padding: "0.25rem 0.6rem",
  borderRadius: 4,
  fontSize: "0.8rem",
};
