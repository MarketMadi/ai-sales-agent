#!/usr/bin/env bash
# Demo script — exercises the full Signal Desk flow via API
set -euo pipefail
API="${API_URL:-http://localhost:8000}"
SECRET="${ADMIN_SECRET:-dev-secret}"

echo "=== Signal Desk Demo ==="
echo "1. Health check"
curl -s "$API/health" | jq .

echo ""
echo "2. Ingest sample CSV + score"
curl -s -X POST "$API/ingest/csv" -H "X-Admin-Secret: $SECRET" | jq .

echo ""
echo "3. Dashboard metrics"
curl -s "$API/dashboard" | jq .

echo ""
echo "4. Pending reviews"
curl -s "$API/review/pending" | jq '.[0] | {company: .company.name, score: .qualification.score, subject: .draft.subject}'

DRAFT_ID=$(curl -s "$API/review/pending" | jq -r '.[0].draft.id // empty')
if [ -n "$DRAFT_ID" ]; then
  echo ""
  echo "5. Approve first draft (id=$DRAFT_ID)"
  curl -s -X POST "$API/review/$DRAFT_ID/approve" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Secret: $SECRET" \
    -d '{"actor":"api-demo"}' | jq .

  echo ""
  echo "6. Audit log (latest)"
  curl -s "$API/activities?limit=3" | jq .
fi

echo ""
echo "7. Chat — thesis fit"
curl -s -X POST "$API/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"Why did Acme score high?"}' | jq .

echo ""
echo "8. Feedback"
COMPANY_ID=$(curl -s "$API/companies" | jq -r '.[0].id // 1')
curl -s -X POST "$API/feedback" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":$COMPANY_ID,\"useful\":true,\"note\":\"demo\"}" | jq .

echo ""
echo "=== Demo complete ==="
