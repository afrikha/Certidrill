# QZ-sc-900-33-sentinel — end-of-chapter quiz, SC-900, chapter 33-sentinel

File: `content/sc-900/quizzes/33-sentinel.yaml` (10 questions, `sc900-qz-33-01` to `-10`, EN + FR, `status: draft`).
Check: `npx tsx factory/check-quiz.ts sc-900 33-sentinel` → 0 problem(s), 0 warning(s).

- Objectives: 3.3.1 = 3 (q1, q4, q10), 3.3.2 = 7.
- Types: single 5, yesno_statements 3, multi 1, dragdrop 1. Positions 6–10: single, single, multi, dragdrop, yesno.
- Avoided the 16 mock-exam decisions of 3.3.1/3.3.2 (hunting, workbooks, playbooks on Logic Apps, automation rule + playbook, stages ordering, SIEM/SOAR definitions, enrichment...). New decisions: SIEM vs SOAR task, watchlists, content hub solutions, unified incident queue, Sentinel vs Defender XDR / Defender for Cloud / Defender for Cloud Apps, notebooks, analytics tier + data lake tier, detection mechanisms (ML, threat intelligence, rules, MITRE ATT&CK), incident grouping as a SIEM function, automation rule on incident update.

## Sources fetched (2026-11-24)

`azure/sentinel/overview`, `azure/sentinel/automation/automation`, `azure/sentinel/notebooks`, `azure/sentinel/watchlists`, `azure/sentinel/sentinel-solutions`, `azure/sentinel/datalake/sentinel-lake-overview`, `azure/sentinel/datalake/sentinel-lake-onboarding`, `azure/sentinel/fusion`, `azure/sentinel/microsoft-sentinel-defender-portal`, training units 2 and 3 of `describe-security-capabilities-of-azure-sentinel`.

## Chapter issues (not edited)

- **Fusion.** The Fusion page says: for workspaces onboarded to the Defender portal, Fusion is disabled and its functionality is replaced by the Defender XDR correlation engine. The chapter (and the Learn training unit) present Fusion as a current detection mechanism while recommending the Defender portal (Azure portal support ends after 2027-03-31). Suggest a one-line note in the chapter. The quiz does not use Fusion as an answer or a distractor.
- **Data lake status.** Neither the data lake overview nor the onboarding page mentions preview; the training unit describes it as part of Sentinel. Treated as generally available (q8). Retention "up to 12 years" not tested.
- The chapter's "Incident pages with an interactive graph of the entities" wording: the current training unit speaks of incidents bringing together alerts, entities, timelines and context, and of a separate "Microsoft Sentinel graph". q5 s3 only relies on "the entities involved are visible", which both support.

## Doubts

- q9 "machine learning detection" (behavioral baselines) follows the training unit; Learn no longer names UEBA there. If the exam names it UEBA, the item text may need a gloss.
- q10 s2 (automation rule on incident update) relies on the automation page ("when incidents are created or updated"); trigger list not fetched in detail.
