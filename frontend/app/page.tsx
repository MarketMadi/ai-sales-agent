import Link from "next/link";

const steps = [
  {
    n: "1",
    title: "Import leads",
    body: "Pull in contacts from Apollo (or a CSV). Duplicates are rejected automatically.",
  },
  {
    n: "2",
    title: "AI scores each company",
    body: "Claude, GPT-4o, Gemini, and DeepSeek score each lead against your ICP — compare outputs side-by-side in Review.",
  },
  {
    n: "3",
    title: "You approve before anything sends",
    body: "Review the draft email, edit if needed, then approve or reject. Nothing goes out without you.",
  },
  {
    n: "4",
    title: "Track everything",
    body: "Audit log records every import, score, and approval. Ask questions in chat with cited sources.",
  },
];

export default function Home() {
  return (
    <div>
      <p style={eyebrow}>AI outbound sales agent</p>
      <h1 style={{ fontSize: "2rem", margin: "0 0 0.75rem", maxWidth: 640 }}>
        Qualify leads, draft outreach, and approve sends — with AI reasoning you can actually review.
      </h1>
      <p style={{ color: "#4b5563", maxWidth: 620, fontSize: "1.05rem", lineHeight: 1.6 }}>
        Signal Desk is a working demo of an outbound pipeline: import leads, let AI score them against
        your ideal customer profile, generate personalized emails, and hold every send for human
        approval. Built for teams who want AI speed without AI autopilot.
      </p>

      <Link href="/dashboard" style={cta}>
        Try the live demo →
      </Link>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {steps.map((s) => (
            <div key={s.n} className="card">
              <div style={stepNum}>{s.n}</div>
              <strong>{s.title}</strong>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>What to click in the demo</h2>
        <ol style={{ color: "#4b5563", lineHeight: 1.8, paddingLeft: "1.25rem", maxWidth: 560 }}>
          <li>
            <Link href="/dashboard">Dashboard</Link> — click <strong>Ingest Apollo CSV</strong> to load 26 sample leads
          </li>
          <li>
            <Link href="/review">Review</Link> — see why AI scored Acme 82/100, edit the email, click <strong>Approve</strong>
          </li>
          <li>
            <Link href="/activities">Audit Log</Link> — every action is recorded
          </li>
          <li>
            <Link href="/chat">Chat</Link> — ask &quot;Why did Acme score high?&quot; and get a cited answer
          </li>
        </ol>
      </section>

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#9ca3af" }}>
        Integrates with Apollo, Attio, Instantly, and Cal.com in production. This demo runs entirely in your browser.
        {" "}
        <a href="https://github.com/marketmadi/ai-sales-agent/blob/main/docs/ARCHITECTURE.md" style={{ color: "#2563eb" }}>
          Architecture doc
        </a>
      </p>
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#2563eb",
  margin: "0 0 0.5rem",
};

const cta: React.CSSProperties = {
  display: "inline-block",
  marginTop: "1.5rem",
  background: "#111827",
  color: "#fff",
  padding: "0.75rem 1.25rem",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
};

const stepNum: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.85rem",
  marginBottom: "0.5rem",
};
