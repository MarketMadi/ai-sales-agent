import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Signal Desk</h1>
      <p style={{ color: "#6b7280", maxWidth: 600 }}>
        Practice project for AI outbound pipeline + analyst triage. Ingest leads, score with
        reviewable reasoning, approve outreach, and chat with cited answers.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <Link href="/dashboard" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Dashboard</strong>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
            Pipeline metrics
          </p>
        </Link>
        <Link href="/review" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Review Queue</strong>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
            Approve outreach drafts
          </p>
        </Link>
        <Link href="/chat" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Chat</strong>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
            Intent-routed Q&A with citations
          </p>
        </Link>
      </div>
    </div>
  );
}
