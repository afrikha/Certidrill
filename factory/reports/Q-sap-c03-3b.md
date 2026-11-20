# Q-sap-c03-3b — report

42 questions in `content/sap-c03/questions/cost/` (prefix `sapc03-3b-`): 6 per objective 3.2.3, 3.2.4, 3.2.5, 3.3.1, 3.3.2, 3.3.3, 3.3.4. Types: single 35, multi 7 (one per objective). Difficulty: 7 easy, 20 medium, 15 hard. Validator: 0 problem(s).

## Deviations / decisions
- Multi stems keep the line "NOTE: Each correct selection is worth one point." like every other AWS bank (SAA/SOA/DVA/AIF) and the current per-option scoring engine, although the SAP-C03 blueprint says `scoring.multi: all_or_nothing` (not implemented yet). Remove the line from all AWS multis when that rule ships.
- No SAP-C03 course chapter existed for these objectives when writing; facts come from AWS docs and pricing pages fetched on 2026-11-20.
- Closed services avoided as answers (Migration Hub, ADS, Snow, OpsWorks, Q Developer not used).

## Facts used from general knowledge (not confirmed on a fetched page)
- S3 Glacier Deep Archive retrieval times (standard within 12 h, bulk within 48 h) — crr-deep-archive-dr.
- AWS Backup S3 backup storage costs more than S3 Glacier Deep Archive — crr-deep-archive-dr (distractor b).
- VPC peering quota per VPC below 400 — privatelink-saas-overlap (distractor c).
- CloudWatch Logs metric filters can publish a JSON field as a dimension; AWS Budgets data refreshes only a few times per day — bedrock-token-alerts.
- Tag policy `enforced_for` also rejects noncompliant tags passed at creation (RunInstances/CreateVolume) — scp-plus-tag-policy.
- aws:createdBy on ASG-launched volumes / DLM snapshots would show the service role — distractor explanations only.
- Gateway endpoints cannot be used from other VPCs through a transit gateway (well-known; the fetched page only said gateway endpoints are per route table and free).

## Doubts
- Bedrock invocation logging Region with cross-Region inference is not documented; no question depends on it.
- Whether Data Exports can backfill history for a new export is undocumented; ce-api-to-cur was worded as "from now on, rolling 12 months".
