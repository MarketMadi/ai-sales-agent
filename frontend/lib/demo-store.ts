/**
 * Client-side demo API for GitHub Pages (no backend).
 * State persists in sessionStorage for the browser session.
 */

export type DemoCompany = {
  id: number;
  name: string;
  domain: string;
  email: string | null;
  enriched_payload: Record<string, string>;
};

export type DemoQualification = {
  id: number;
  company_id: number;
  score: number;
  icp_fit: string;
  reasoning: string;
  disqualifiers: string[];
  talking_points: string[];
  model: string;
  created_at: string;
};

export type DemoDraft = {
  id: number;
  company_id: number;
  subject: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "sent";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export type DemoActivity = {
  id: number;
  company_id: number | null;
  action: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DemoState = {
  companies: DemoCompany[];
  qualifications: DemoQualification[];
  drafts: DemoDraft[];
  activities: DemoActivity[];
  documents: { id: number; company_id: number; title: string; body: string; source: string }[];
  feedback: { id: number; company_id: number; useful: boolean; note: string | null }[];
  nextId: number;
};

const STORAGE_KEY = "signal-desk-demo-state";

let memoryState: DemoState | null = null;

function now() {
  return new Date().toISOString();
}

function loadState(): DemoState {
  if (typeof window === "undefined") {
    return emptyState();
  }
  if (memoryState) return memoryState;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    memoryState = JSON.parse(raw) as DemoState;
    return memoryState;
  }
  return emptyState();
}

function saveState(state: DemoState) {
  memoryState = state;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function emptyState(): DemoState {
  return {
    companies: [],
    qualifications: [],
    drafts: [],
    activities: [],
    documents: [],
    feedback: [],
    nextId: 1,
  };
}

function nextId(state: DemoState): number {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}

function log(state: DemoState, action: string, companyId: number | null, payload: Record<string, unknown> = {}, actor = "system") {
  state.activities.unshift({
    id: nextId(state),
    company_id: companyId,
    action,
    actor,
    payload,
    created_at: now(),
  });
}

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() || null;
}

function normalizeDomain(domain: string | undefined, email: string | null) {
  if (domain) return domain.trim().toLowerCase().replace(/^www\./, "");
  if (email?.includes("@")) return email.split("@")[1].toLowerCase();
  return null;
}

function mockScore(company: DemoCompany): Omit<DemoQualification, "id" | "company_id" | "created_at"> {
  const employees = parseInt(company.enriched_payload.employees || "0", 10);
  const industry = (company.enriched_payload.industry || "").toLowerCase();
  let score = 50;
  const disqualifiers: string[] = [];
  const talking_points: string[] = [];

  if (industry.includes("consumer") || industry.includes("retail") || industry.includes("e-commerce") || industry.includes("grocery")) {
    score = 25;
    disqualifiers.push("Consumer-focused industry outside ICP");
  } else if (employees < 20) {
    score = 30;
    disqualifiers.push("Company too small for ICP");
  } else if (company.domain.endsWith(".eu")) {
    score = 35;
    disqualifiers.push("Non-US headquarters");
  } else if (employees >= 50 && (industry.includes("saas") || industry.includes("data") || industry.includes("fintech") || industry.includes("developer") || industry.includes("hr tech") || industry.includes("cloud") || industry.includes("marketing") || industry.includes("ai"))) {
    score = 78 + Math.min(15, Math.floor(employees / 20));
    talking_points.push(`Growth-stage ${industry} with ${employees} employees`);
    if (company.enriched_payload.title?.toLowerCase().includes("revenue") || company.enriched_payload.title?.toLowerCase().includes("sales")) {
      talking_points.push("Sales leadership contact — strong buying signal");
    }
  }

  const icp_fit = score < 40 ? "disqualified" : score >= 70 ? "strong" : score >= 50 ? "moderate" : "weak";
  return {
    score,
    icp_fit,
    reasoning: `${company.name} (${company.domain}) scored ${score}/100 based on ${employees} employees in ${industry || "unknown industry"}, ${company.enriched_payload.city || ""} ${company.enriched_payload.state || ""}.`,
    disqualifiers,
    talking_points: talking_points.length ? talking_points : [`Recent GTM activity at ${company.name}`],
    model: "demo-scorer",
  };
}

function draftEmail(company: DemoCompany, qual: DemoQualification): { subject: string; body: string } {
  const first = company.enriched_payload.first_name || "there";
  const hook = qual.talking_points[0] || qual.reasoning;
  return {
    subject: `Quick idea for ${company.name}'s ${company.enriched_payload.title?.includes("Sales") ? "sales team" : "GTM"}`,
    body: `Hi ${first},\n\nI noticed ${company.name} is scaling (${hook}). We help similar ${company.enriched_payload.industry} teams tighten outbound with AI-scored pipeline and human-approved sends.\n\nWorth a 15-minute look this week?\n\nBest`,
  };
}

export async function initDemoFromJson(basePath: string): Promise<void> {
  if (loadState().companies.length > 0) return;
  const res = await fetch(`${basePath}/demo/state.json`);
  if (!res.ok) return;
  const state = (await res.json()) as DemoState;
  memoryState = state;
  saveState(state);
}

export function resetDemo() {
  sessionStorage.removeItem(STORAGE_KEY);
  memoryState = null;
}

export function ingestCsvRows(rows: Record<string, string>[]): { imported: number; duplicates: number; scored: number } {
  const state = loadState();
  let imported = 0;
  let duplicates = 0;
  const domains = new Set<string>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const domain = normalizeDomain(row.company_domain || row.domain, email);
    if (!domain) continue;

    if (email && state.companies.some((c) => c.email === email)) {
      duplicates++;
      log(state, "dedupe_rejected", state.companies.find((c) => c.email === email)?.id ?? null, { email });
      continue;
    }

    let company = state.companies.find((c) => c.domain === domain);
    if (!company) {
      company = {
        id: nextId(state),
        name: row.company || domain,
        domain,
        email,
        enriched_payload: {
          first_name: row.first_name,
          last_name: row.last_name,
          title: row.title,
          employees: row.employees,
          industry: row.industry,
          city: row.city,
          state: row.state,
          country: row.country,
          technologies: row.technologies,
          annual_revenue: row.annual_revenue,
        },
      };
      state.companies.push(company);
      imported++;
      log(state, "company_imported", company.id, { source: "csv", domain });
    } else {
      duplicates++;
      if (email && !company.email) company.email = email;
      log(state, "dedupe_merged", company.id, { email, reason: "duplicate_domain" });
    }
    domains.add(domain);
  }

  let scored = 0;
  for (const domain of domains) {
    const company = state.companies.find((c) => c.domain === domain);
    if (company) {
      scoreCompany(state, company.id);
      scored++;
    }
  }

  saveState(state);
  return { imported, duplicates, scored };
}

function scoreCompany(state: DemoState, companyId: number) {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return;

  const scored = mockScore(company);
  const qual: DemoQualification = {
    id: nextId(state),
    company_id: companyId,
    ...scored,
    created_at: now(),
  };
  state.qualifications.push(qual);
  log(state, "company_scored", companyId, { score: qual.score, icp_fit: qual.icp_fit });

  if (qual.score >= 60 && qual.icp_fit !== "disqualified") {
    const { subject, body } = draftEmail(company, qual);
    const draft: DemoDraft = {
      id: nextId(state),
      company_id: companyId,
      subject,
      body,
      status: "pending",
      approved_by: null,
      approved_at: null,
      created_at: now(),
    };
    state.drafts.push(draft);
    log(state, "draft_created", companyId, { subject });
  }
}

export function demoApi(path: string, options?: RequestInit): unknown {
  const state = loadState();
  const method = options?.method?.toUpperCase() || "GET";
  const url = new URL(path, "http://local");
  const pathname = url.pathname;

  if (pathname === "/dashboard") {
    return {
      companies: state.companies.length,
      qualified: state.qualifications.length,
      pending_approval: state.drafts.filter((d) => d.status === "pending").length,
      approved: state.drafts.filter((d) => d.status === "approved").length,
      rejected: state.drafts.filter((d) => d.status === "rejected").length,
      activities: state.activities.length,
    };
  }

  if (pathname === "/review/pending") {
    return state.drafts
      .filter((d) => d.status === "pending")
      .map((d) => {
        const company = state.companies.find((c) => c.id === d.company_id)!;
        const qual = [...state.qualifications].reverse().find((q) => q.company_id === d.company_id);
        return {
          draft: d,
          company: { id: company.id, name: company.name, domain: company.domain, enriched_payload: company.enriched_payload },
          qualification: qual || null,
        };
      });
  }

  if (pathname.startsWith("/review/") && pathname.endsWith("/approve") && method === "POST") {
    const id = parseInt(pathname.split("/")[2], 10);
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const draft = state.drafts.find((d) => d.id === id);
    if (!draft) throw new Error("Draft not found");
    if (body.subject) draft.subject = body.subject;
    if (body.body) draft.body = body.body;
    draft.status = "approved";
    draft.approved_by = body.actor || "admin";
    draft.approved_at = now();
    log(state, "draft_approved", draft.company_id, { subject: draft.subject }, body.actor || "admin");
    saveState(state);
    return draft;
  }

  if (pathname.startsWith("/review/") && pathname.endsWith("/reject") && method === "POST") {
    const id = parseInt(pathname.split("/")[2], 10);
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const draft = state.drafts.find((d) => d.id === id);
    if (!draft) throw new Error("Draft not found");
    draft.status = "rejected";
    log(state, "draft_rejected", draft.company_id, { reason: body.reason }, body.actor || "admin");
    saveState(state);
    return draft;
  }

  if (pathname === "/activities") {
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    return state.activities.slice(0, limit);
  }

  if (pathname === "/ingest/csv" && method === "POST") {
    // Handled separately via ingestCsvFromPublic
    return { imported: 0, duplicates: 0, scored: 0 };
  }

  if (pathname === "/chat" && method === "POST") {
    const { question } = JSON.parse((options?.body as string) || "{}");
    const q = question.toLowerCase();
    let intent = "company_facts";
    let company = state.companies.find((c) => q.includes(c.domain.split(".")[0]) || q.includes(c.name.toLowerCase().split(" ")[0]));
    if (q.includes("score") || q.includes("why") || q.includes("fit") || q.includes("thesis")) intent = "thesis_fit";
    if (q.includes("signal") || q.includes("news") || q.includes("recent")) intent = "recent_signals";
    if (!company) company = state.companies[0];

    if (intent === "thesis_fit" && company) {
      const qual = [...state.qualifications].reverse().find((x) => x.company_id === company!.id);
      return {
        answer: qual
          ? `${company.name} scored ${qual.score}/100 (${qual.icp_fit} fit). ${qual.reasoning} [source: qualification:${qual.id}]`
          : `${company.name} has not been scored yet.`,
        intent,
        company_id: company.id,
      };
    }
    return {
      answer: company
        ? `${company.name} (${company.domain}) — ${company.enriched_payload.employees} employees, ${company.enriched_payload.industry}, ${company.enriched_payload.city}, ${company.enriched_payload.state} [source: company:${company.id}]`
        : "No company data loaded. Ingest the sample CSV first.",
      intent,
      company_id: company?.id ?? null,
    };
  }

  if (pathname === "/feedback" && method === "POST") {
    const body = JSON.parse((options?.body as string) || "{}");
    const fb = { id: nextId(state), company_id: body.company_id, useful: body.useful, note: body.note || null };
    state.feedback.push(fb);
    log(state, "feedback_recorded", body.company_id, { useful: body.useful });
    saveState(state);
    return fb;
  }

  throw new Error(`Demo API: unknown route ${method} ${pathname}`);
}

export async function ingestDemoCsv(basePath: string): Promise<{ imported: number; duplicates: number; scored: number }> {
  const res = await fetch(`${basePath}/sample/apollo_export.csv`);
  const text = await res.text();
  const rows = parseCsv(text);
  return ingestCsvRows(rows);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() || "";
    });
    return row;
  });
}
