#!/usr/bin/env node
/**
 * Generate pre-seeded demo state for GitHub Pages static hosting.
 * Run: node scripts/generate-demo-state.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const csvPath = path.join(ROOT, "data/sample/apollo_export.csv");
const outPath = path.join(ROOT, "frontend/public/demo/state.json");

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() || "";
    });
    return row;
  });
}

function mockScore(company) {
  const employees = parseInt(company.enriched_payload.employees || "0", 10);
  const industry = (company.enriched_payload.industry || "").toLowerCase();
  let score = 50;
  const disqualifiers = [];
  const talking_points = [];

  if (industry.includes("consumer") || industry.includes("retail") || industry.includes("e-commerce") || industry.includes("grocery")) {
    score = 25;
    disqualifiers.push("Consumer-focused industry outside ICP");
  } else if (employees < 20) {
    score = 30;
    disqualifiers.push("Company too small for ICP");
  } else if (company.domain.endsWith(".eu")) {
    score = 35;
    disqualifiers.push("Non-US headquarters");
  } else if (employees >= 50) {
    score = 78 + Math.min(15, Math.floor(employees / 20));
    talking_points.push(`Growth-stage ${industry} with ${employees} employees`);
  }

  const icp_fit = score < 40 ? "disqualified" : score >= 70 ? "strong" : score >= 50 ? "moderate" : "weak";
  return {
    score,
    icp_fit,
    reasoning: `${company.name} (${company.domain}) scored ${score}/100 — ${employees} employees, ${industry}, ${company.enriched_payload.city} ${company.enriched_payload.state}.`,
    disqualifiers,
    talking_points: talking_points.length ? talking_points : [`GTM motion at ${company.name}`],
    model: "demo-scorer",
  };
}

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const state = {
  companies: [],
  qualifications: [],
  drafts: [],
  activities: [],
  pipelineJobs: [],
  documents: [
    { id: 1, company_id: 1, title: "Acme hires new CRO", body: "Acme Corp named Marcus Vega as CRO to lead mid-market expansion.", source: "press_release" },
    { id: 2, company_id: 1, title: "Acme Series B", body: "Acme closed $40M Series B to scale sales and RevOps.", source: "news" },
    { id: 3, company_id: 2, title: "Brightpath platform migration", body: "Brightpath completed Snowflake migration for enterprise clients.", source: "blog" },
  ],
  feedback: [],
  nextId: 100,
};

let nextId = 1;
const log = (action, companyId, payload = {}, actor = "system") => {
  state.activities.unshift({
    id: nextId++,
    company_id: companyId,
    action,
    actor,
    payload,
    created_at: new Date().toISOString(),
  });
};

const seenDomains = new Map();

for (const row of rows) {
  const email = row.email?.toLowerCase();
  const domain = (row.company_domain || "").toLowerCase();
  if (!domain) continue;

  if (!seenDomains.has(domain)) {
    const company = {
      id: nextId++,
      name: row.company,
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
    seenDomains.set(domain, company);
    log("company_imported", company.id, { source: "apollo_export.csv", domain });

    const scored = mockScore(company);
    const qual = {
      id: nextId++,
      company_id: company.id,
      ...scored,
      created_at: new Date().toISOString(),
    };
    state.qualifications.push(qual);
    log("company_scored", company.id, { score: qual.score, icp_fit: qual.icp_fit });

    if (qual.score >= 60 && qual.icp_fit !== "disqualified") {
      const first = row.first_name || "there";
      state.drafts.push({
        id: nextId++,
        company_id: company.id,
        subject: `Quick idea for ${company.name}'s GTM team`,
        body: `Hi ${first},\n\nI noticed ${company.name} is scaling (${scored.talking_points[0]}). We help similar teams run AI-scored outbound with human approval before anything sends.\n\nWorth 15 minutes this week?\n\nBest`,
        status: "pending",
        approved_by: null,
        approved_at: null,
        created_at: new Date().toISOString(),
      });
      log("draft_created", company.id, { subject: `Quick idea for ${company.name}` });
    }
  } else {
    log("dedupe_merged", seenDomains.get(domain).id, { email, reason: "duplicate_domain" });
  }
}

// REWORK demo: webhook pipeline + retries visible in Audit Log on GitHub Pages
const stackPilot = state.companies.find((c) => c.domain === "stackpilot.dev") || state.companies[0];
if (stackPilot) {
  const jobId = nextId++;
  const ts = new Date().toISOString();
  state.pipelineJobs.push({
    id: jobId,
    status: "completed",
    company_id: stackPilot.id,
    hubspot_contact_id: "hs_demo_stackpilot",
    retry_count: 2,
    last_error: null,
    payload: {
      email: "jordan.lee@stackpilot.dev",
      company: "StackPilot",
      domain: "stackpilot.dev",
      source: "landing_page",
    },
    created_at: ts,
    updated_at: ts,
  });
  log("lead_captured", null, { source: "landing_page", job_id: jobId });
  log("pipeline_scoring_retry", stackPilot.id, { attempt: 1, max_retries: 3 });
  log("pipeline_scoring_retry", stackPilot.id, { attempt: 2, max_retries: 3 });
  log("pipeline_scored", stackPilot.id, { attempt: 3 });
  log("hubspot_synced", stackPilot.id, { hubspot_contact_id: "hs_demo_stackpilot" });
  log("pipeline_completed", stackPilot.id, { job_id: jobId });
  log("slack_notify_failed", stackPilot.id, { error: "webhook timeout (demo)" });
}

state.nextId = nextId + 1;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.join(ROOT, "frontend/public/sample"), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
fs.copyFileSync(csvPath, path.join(ROOT, "frontend/public/sample/apollo_export.csv"));
console.log(`Wrote ${outPath} — ${state.companies.length} companies, ${state.drafts.filter(d => d.status === 'pending').length} pending drafts`);
