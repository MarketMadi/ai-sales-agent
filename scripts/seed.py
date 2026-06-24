#!/usr/bin/env python3
"""Initialize database and seed sample data."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.db import SessionLocal, init_db
from backend.ingest import ingest_csv_leads, parse_csv_leads, seed_sample_documents
from backend.score import score_company


def main():
    init_db()
    db = SessionLocal()
    path = ROOT / "data" / "sample" / "apollo_export.csv"
    if not path.exists():
        path = ROOT / "data" / "sample" / "leads.csv"
    rows = parse_csv_leads(path)
    result = ingest_csv_leads(rows, db, score_fn=score_company)
    docs = seed_sample_documents(db)
    print(f"Seed complete: {result}, documents={docs}")


if __name__ == "__main__":
    main()
