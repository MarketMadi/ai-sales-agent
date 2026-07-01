#!/usr/bin/env bash
# REWORK proof-of-work demo — webhook + retries + audit trail
set -euo pipefail
API="${API_URL:-http://localhost:8000}"

echo "=== REWORK Demo: async lead pipeline ==="
echo ""
echo "1. Webhook lead (202 Accepted — persisted before scoring)"
curl -s -X POST "$API/webhooks/lead?simulate_retries=2" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jordan.lee@stackpilot.dev",
    "company": "StackPilot",
    "domain": "stackpilot.dev",
    "title": "Head of Sales",
    "employees": "95",
    "industry": "Developer Tools",
    "source": "landing_page"
  }' | jq .

echo ""
echo "2. Wait for async processing (retries + HubSpot sync)..."
sleep 5

echo ""
echo "3. Pipeline jobs"
curl -s "$API/pipeline/jobs?limit=3" | jq .

echo ""
echo "4. Audit log — error handling + recovery"
curl -s "$API/activities?limit=12" | jq '[.[] | select(.action | test("pipeline|hubspot|lead"))]'

echo ""
echo "=== Done — screenshot terminal + Dashboard + Audit Log ==="
