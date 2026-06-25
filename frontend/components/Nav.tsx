import Link from "next/link";

export default function Nav() {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/review", label: "Review" },
    { href: "/chat", label: "Chat" },
    { href: "/activities", label: "Audit Log" },
  ];

  return (
    <nav style={styles.nav}>
      <Link href="/" style={styles.brand}>
        Signal Desk
        <span style={styles.tagline}>AI sales outbound</span>
      </Link>
      <div style={styles.links}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={styles.link}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "2rem",
  },
  brand: { fontWeight: 700, fontSize: "1.25rem", textDecoration: "none", color: "#111", display: "flex", flexDirection: "column", lineHeight: 1.2 },
  tagline: { fontSize: "0.7rem", fontWeight: 500, color: "#6b7280" },
  links: { display: "flex", gap: "1.5rem" },
  link: { textDecoration: "none", color: "#374151" },
};
