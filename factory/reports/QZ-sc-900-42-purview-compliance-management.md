# QZ-sc-900-42-purview-compliance-management

File: `content/sc-900/quizzes/42-purview-compliance-management.yaml`, 10 questions (`sc900-qz-42-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 42-purview-compliance-management` → 0 problem(s), 0 warning(s).
Objectives: 4.2.1 = 3 (q1, q5, q7), 4.2.2 = 3 (q2, q4, q9), 4.2.3 = 4 (q3, q6, q8, q10). Types: single 5, multi 2, yesno 2, dropdown 1. Positions 6–10: multi, single, yesno, single, dropdown.

The 24 mock questions `sc900-4a-portal-*` / `-cm-*` / `-score-*` cover nearly every fact. The quiz tests other decisions: Compliance Manager in Risk & Compliance (q1), Regulations page for templates (q2), encryption at rest = preventative (q3), control scope / evidence kept in the action / three control types in an assessment (q4), Purview tasks vs Entra and Defender tasks (q5), track and report uses vs non-uses (q6), missing card caused by the subscription, not permissions (q7), Microsoft-managed points before any action + Secure Score is a different score (q8), assessment score vs overall score vs STP report (q9), discretionary classification and preventative-discretionary (9) vs detective-mandatory (3) vs preventative-mandatory (27) (q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

Docs: "Learn about the Microsoft Purview portal", "Microsoft Purview Compliance Manager", "Compliance Manager scoring", "Microsoft Secure Score". Training unit "Describe Compliance Manager" (module "Describe the data compliance solutions of Microsoft Purview").

## Chapter against current Learn (not tested)

- The Solutions page of the portal has four sections: **Core**, Risk & Compliance, Data Governance, Data Security. The chapter names three families. The portal page doesn't say which solution sits in which section; q1 relies on the training unit ("Compliance Manager is a solution in the Risk & Compliance set").
- The portal page says the Purview compliance portal is retired, but for the classic governance portal it only says that features were "relocated or retired"; the chapter says the portal "replaces" both, which is acceptable.
- Scoring page details absent from the chapter: the baseline is drawn mainly from NIST CSF and ISO (plus FedRAMP and GDPR); action status updates within 24 hours; points are counted per action per assessment, so the overall score can differ from the average of the assessment scores. The Compliance Manager unit adds templates for AI regulations.

## Doubts

- q10: Learn gives "lock the computer when unattended" only as a discretionary example and doesn't type it; the stem therefore states that Action1 is preventative and Action2 detective. The third sentence assumes that a centrally enforced screen lock is a preventative mandatory action (same control, no longer bypassable): reasoning from the definitions, not a Learn example.
- q7: the "guided tour" distractor comes from the Help menu of the portal page; "same role groups" is used to rule out permissions.
- French not checked on fr-fr pages: page names « Vue d'ensemble (Overview) », « Réglementations (Regulations) », « Actions d'amélioration (Improvement actions) », « Afficher toutes les solutions », « vos points » / « points gérés par Microsoft », « RSSI » for CISO.
