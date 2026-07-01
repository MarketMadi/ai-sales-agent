-- Pipeline jobs for async webhook → score → HubSpot flow

CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB DEFAULT '{}',
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    hubspot_contact_id TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
