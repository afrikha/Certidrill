# QZ-gcp-pca-42-business-processes — report

File: `content/gcp-pca/quizzes/42-business-processes.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 42-business-processes` → 0 problem(s), 0 warning(s).

Coverage: 4.2.6 (q1, q7), 4.2.7 (q2, q10), 4.2.4 (q3), 4.2.3 (q4), 4.2.5 (q5, q9), 4.2.1 (q6), 4.2.2 (q8). Multi at q9 and q10. All the decisions differ from the 4.2.x mock-exam questions (bank read in full, including case-study questions).

## Facts verified on 2026-11-27 (pages fetched)
- Sustained use discounts: N1/M1/M2 up to 30 %, N2/N2D/C2 up to 20 %; only listed series are eligible (E2 not listed); not on CUD-covered usage.
- Spend cap budgets: GA on 2026-10-13 (Cloud Billing release notes; Preview since 2026-07-27); one project and one service; Gemini API, Gemini Enterprise Agent Platform, Cloud Run, Cloud Run functions; persistent resources keep billing; enforcement not instant.
- Alerts-only budgets don't cap spending.
- Customer Care: Standard = workloads under development, 8/5 for high-impact issues; Basic = documentation, community, billing, Active Assist.
- Reservations: capacity assurance, need and consume quota at creation, billed while they exist; compute flexible CUDs give no assured capacity, resource-based CUDs only with attached reservations; CUDs cannot be cancelled.
- DR planning guide: "DR is a subset of business continuity planning"; preallocate or reserve instances in the recovery environment.

## Doubts / not verified
- DORA's change-approval findings are on dora.dev, which is not an allowed reference host; q8 cites the Google "DevOps capabilities" summary page (which links to it) and the operational excellence "Automate and manage change" page.
- q6 relies on the shared responsibility page ("customers always remain responsible for their access policies and data"); that page does not mention Compliance Reports Manager, so the option names the audit reports generically.

## Chapter remarks (not edited)
- Sustained use discounts row: correct, but M1/M2 (and N1 sole-tenant, f1/g1) are also up to 30 %; "newer series" are excluded only implicitly (the page lists eligible series).
- Spend cap bullet: accurate; the chapter could state that spend caps are GA since October 13, 2026 and monthly only.
- "Google Skills, formerly delivered through Google Cloud Skills Boost" was not checked (not used in the quiz).
- Other quiz, not this task: `11-business-requirements` q2 answers "stop charges automatically" with Pub/Sub + a function that disables billing; still valid for a whole project, but spend caps now exist for the eligible services.
