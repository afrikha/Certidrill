# QZ-sc-200-15-detections — end-of-chapter quiz, SC-200, chapter 15-detections

File: `content/sc-200/quizzes/15-detections.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts sc-200 15-detections` → 0 problem(s), 0 warning(s).

Objectives: 1.4.1 (q3, q7), 1.4.2 (q4), 1.4.3 (q1, q6, q8, q9), 1.4.4 (q5), 1.4.5 (q2, q10). Positions 6–10: single, dropdown, single, yesno_statements, dropdown (KQL).

Pages fetched (2026-11-24): custom-detection-rules, custom-detection-manage, create-analytics-rules, near-real-time-rules, use-matching-analytics-to-detect-threats, understand-threat-intelligence, use-threat-indicators-in-analytics-rules, mitre-coverage, work-with-anomaly-rules, soc-ml-anomalies, anomalies-reference, Azure Monitor table reference "Anomalies".

## Chapter out of date or imprecise against current Learn (not edited)

- **User response actions, required columns.** The chapter gives "`AccountObjectId` or `AccountSid`" for all user actions. Learn: *Mark user as compromised* uses `AccountObjectId` (or `InitiatingProcessAccountObjectId`, `RecipientObjectId`); *Disable user* and *Reset user authentication* need a SID column (`AccountSid`, `InitiatingProcessAccountSid`, `RequestAccountSid`, `OnPremSid`), plus `AccountObjectId` for Entra identities. Quarantine file also accepts `InitiatingProcessSHA1/SHA256`; Allow/Block needs Remediate permission.
- **Custom detection permissions.** Learn adds that permissions are per data source (e.g. `Email*` tables need Defender for Office 365 permissions, `IdentityLogonEvents` needs Defender for Cloud Apps and Defender for Identity permissions) and that Security Operator with MDE RBAC on also needs Manage Security Settings. Not in the chapter.
- **Continuous (NRT) restrictions.** Learn also excludes the `EmailEvents` columns `LatestDeliveryLocation` and `LatestDeliveryAction`, allows only GA columns, and requires `matches regex` patterns as encoded string literals.
- **Custom lookback for Sentinel data.** Learn is more detailed than "up to 30 days": frequency above hourly → lookback under 48 hours; above one day → up to 14 days; one day or less → up to 30 days. Custom detections evaluate `ingestion_time()`.
- **Include or exclude from correlation** is public preview for custom detections (GA wording for analytics rules). The chapter doesn't say so.
- **Microsoft Defender Threat Intelligence Analytics** matches domain and IPv4 indicators (URL/domain in `RequestURL`), per Learn; the chapter's table says "domain, IPv4, URL".
- **TI map templates.** "Use threat indicators in analytics rules" still describes `TI map IP entity to AzureActivity` with the legacy `ThreatIntelligenceIndicator` table (stopped July 31, 2025 per the TI overview). Only that template name is confirmed; that it is a scheduled, editable rule is confirmed. The chapter's "scheduled rules on `ThreatIntelIndicators`" is the post-migration state, not shown on that page.
- **Anomaly `Score` range 0–1** isn't stated on any fetched page (table reference gives `real`, no range). Not used in the quiz.
- **MITRE ATT&CK page** is preview (the whole of objective 1.4.4). Defender portal path shows no "(Preview)" label; Azure portal does.

## Mock-exam questions to check (not edited)

- `sc200-1d-mg-rules-as-code`: correct answer is the Microsoft Security Bicep extension, which the chapter calls preview — a preview feature as the correct answer. Not confirmed on the manage page (not mentioned there).
- `sc200-1d-mg-correlation`: fine for analytics rules; note the per-rule setting is preview for custom detections.

## Facts used in the quiz that rest on general knowledge (not on a fetched page)

- q10: `has` and `==` can't take a tabular expression; `BehaviorAnalytics` is the UEBA enriched activity table (distractor only).
- q8: an incident-trigger automation rule can't run an alert-trigger playbook (consistent with bank explanations of `sc200-cs2b-playbook-automation`); custom detection actions don't include playbooks (inferred from the action list on Learn).
- q4: that a query exclusion is the right tuning for a known benign tool is the chapter's exam tip; Learn says only that edits are made with Edit or Modify query.

## Doubts

- q7 relies on the Custom frequency being offered only when the rule's data is ingested by Sentinel; the stem states that Defender XDR tables are not streamed to the workspace to keep this unambiguous.
- q5 counts in the hot area are invented for the scenario; the logic (templates and hunting queries are not active detections) follows the chapter and the "shown by default" wording on Learn.
