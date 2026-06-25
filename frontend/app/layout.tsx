import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Signal Desk — AI outbound sales agent demo",
  description:
    "Import leads, AI-score against your ICP with reviewable reasoning, approve outreach drafts before they send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoBanner />
        <Nav />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem 3rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
