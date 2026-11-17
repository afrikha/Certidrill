# K-ai-200-cs4 — case studies AI-200 (Woodgrove Bank, Southridge Video)

Validator: `CERT=ai-200 npx tsx factory/validate.ts --prefix ai200-cs4` → 14 files, 0 problem(s). All files `draft`.

## Files

- `case-studies/ai200-cs4a-woodgrove.yaml` (retail bank; AKS + PostgreSQL pgvector + Service Bus topic + Key Vault): questions `ai200-cs4a-complaint-types` (2.2.2 dragdrop, d2), `-api-manifest` (1.2.3 dropdown YAML, d2), `-worker-crash` (1.2.4 single, d1), `-fraud-routing` (3.1.1 multi, d2), `-bureau-key` (4.1.1 yesno, d1), `-vector-setup` (2.2.3 ordering, d3).
- `case-studies/ai200-cs4b-southridge.yaml` (video streaming; Container Apps + Cosmos DB for NoSQL + Functions + Event Grid): `ai200-cs4b-recs-ingress` (1.2.1 single, d1), `-recs-scale` (1.2.2 dropdown YAML, d2), `-titles-access` (2.1.1 single, d1), `-backfill` (2.1.4 single, d3), `-webhook-validation` (3.1.2 single, d3), `-partner-plan` (3.2.2 multi, d2).
- Mix of the 12: single 5, dropdown 2, multi 2, yes/no 1, drag and drop 1, ordering 1; difficulty 4/6/2.
- Angles chosen to avoid the decisions of cs1–cs3 (no second lease-prefix, read_item, DLQ, Event Grid publisher or filter question).

## Sources fetched (2026-11-17)

Topic filters (Service Bus); Endpoint validation with CloudEvents v1.0; pgvector optimize; pgvector enable/use; Container Apps ingress; Container Apps scaling; Cosmos DB trigger for Functions 2.x; Flex Consumption how-to; Cosmos DB RBAC (data plane); AKS CrashLoopBackOff troubleshooting; AKS deployment and cluster reliability best practices (probes, maxUnavailable); SecretClient (get_secret without version = latest); Key Vault RBAC guide (Secrets User vs Reader).

## Not verified on a fetched Learn page (stable knowledge; review)

- `kubectl logs --previous` (standard Kubernetes; the Learn CrashLoopBackOff page lists `kubectl logs` but not the flag).
- `json` has no default GIN operator class (PostgreSQL docs, not Learn).
- A subscription with no rule receives no message (distractor explanation in fraud-routing).
- Always On not applicable to Flex Consumption, and the legacy Consumption plan has no VNet integration / always-ready instances (course chapter 32 states them; the fetched Flex page doesn't mention Always On).
- The Python `cosmos_db_trigger` decorator table on Learn lists no `start_from_beginning` / `lease_container_prefix`; the backfill question therefore names the settings by their function.json names (`startFromBeginning`, `leaseContainerPrefix`, `maxItemsPerInvocation`) and says so in the stem.

## Notes

- Reference titles use the HTML page title without the product suffix (e.g. "Scaling in Azure Container Apps", "Azure Service Bus Topic Filters Overview"); earlier batches sometimes use the H1 instead for the same pages.
- The web-fetch budget (shared) ran out once during the session; fetches were then spaced.
