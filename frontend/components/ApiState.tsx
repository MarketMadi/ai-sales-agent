export function ApiState({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading...</p>;
  }
  if (error) {
    return (
      <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
        <strong style={{ color: "#991b1b" }}>API error</strong>
        <p style={{ margin: "0.5rem 0", color: "#7f1d1d", whiteSpace: "pre-wrap" }}>{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: "#fff",
              border: "1px solid #fca5a5",
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  return null;
}
