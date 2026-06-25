export type ModelComparison = {
  model_id: string;
  label: string;
  available: boolean;
  live?: boolean;
  model?: string;
  score?: number;
  icp_fit?: string;
  reasoning?: string;
  disqualifiers?: string[];
  talking_points?: string[];
  error?: string;
};

export type CompareResponse = {
  company_id: number;
  company_name: string;
  comparisons: ModelComparison[];
};

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet": "Claude Sonnet",
  "gpt-4o": "GPT-4o",
  "gemini-flash": "Gemini 2.0 Flash",
};

export function ModelComparePanel({ data, loading }: { data: CompareResponse | null; loading: boolean }) {
  if (loading) return <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Comparing models…</p>;
  if (!data?.comparisons?.length) return null;

  const scores = data.comparisons.filter((c) => c.available && c.score != null).map((c) => c.score!);
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const spread = max - min;

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h3 style={{ margin: "0 0 0.25rem" }}>Model comparison</h3>
      <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem" }}>
        Same lead, same ICP prompt — {spread > 0 ? `${spread}-point spread across models` : "see how each model reasons"}.
        {!data.comparisons[0]?.live && " Demo uses simulated differences; add API keys for live calls."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
        {data.comparisons.map((c) => (
          <div
            key={c.model_id}
            className="card"
            style={{
              opacity: c.available ? 1 : 0.6,
              borderColor: c.score === max && scores.length > 1 ? "#86efac" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <strong style={{ fontSize: "0.9rem" }}>{c.label}</strong>
              {c.available && c.score != null ? (
                <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{c.score}</span>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#991b1b" }}>N/A</span>
              )}
            </div>
            {c.available && c.icp_fit && (
              <span className={`badge badge-${c.icp_fit}`} style={{ marginBottom: "0.5rem", display: "inline-block" }}>
                {c.icp_fit}
              </span>
            )}
            {c.available && c.reasoning && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#4b5563", lineHeight: 1.45 }}>
                {c.reasoning}
              </p>
            )}
            {c.error && (
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#991b1b" }}>{c.error}</p>
            )}
            {c.live && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.7rem", color: "#059669" }}>Live API</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export { MODEL_LABELS };
