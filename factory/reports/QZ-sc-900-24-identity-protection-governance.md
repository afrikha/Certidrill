# QZ-sc-900-24-identity-protection-governance

File: `content/sc-900/quizzes/24-identity-protection-governance.yaml`, 10 questions (`sc900-qz-24-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 24-identity-protection-governance` → 0 problem(s), 0 warning(s).
Objectives: 2.4.1 = 3 (q2, q3, q9), 2.4.2 = 2 (q4, q8), 2.4.3 = 2 (q6, q10), 2.4.4 = 3 (q1, q5, q7). Types: single 5, yesno 2, dropdown 2, multi 1, dragdrop 1. Positions 6–10: single, dropdown, multi, dragdrop, yesno.

The 42 mock questions `sc900-2c-*` cover almost every single fact of the chapter; the quiz tests other decisions: dynamic groups, automatic removal of B2B guests at expiration, access reviews of access packages and Azure resource roles, risk feedback (confirm sign-in safe / confirm user compromised), risky sign-ins vs risk detections reports, PIM notifications + audit history vs neighbouring features, and cross-feature combinations (q8, q9, q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

id-protection: overview-identity-protection, concept-identity-protection-risks, concept-risk-detection-types, howto-identity-protection-remediate-unblock, howto-identity-protection-risk-feedback. id-governance: identity-governance-overview, entitlement-management-overview, access-reviews-overview, what-are-lifecycle-workflows, lifecycle-workflow-tasks, privileged-identity-management/pim-configure.

## Chapter issues against current Learn

- PIM now also protects the last active **Privileged Role Administrator** assignment (not only Global Administrator) and supports app roles (preview); the chapter mentions only Global Administrator. Not tested.
- ID Protection remediation: Learn now describes "Require risk remediation" and says the legacy ID Protection risk policies are retired (noted in Q-sc-900-2c); the chapter's "secure password change" is still documented on the remediation page, and q10 relies on it.
- Access reviews page: reviewers of access package assignments are "specified reviewers, group members, self-review" (no "sponsors"); q8 says "designated reviewers".

## Doubts / unverified

- q1: "User reported suspicious activity" is in the user risk table of the risk detections page; the description (user denies an MFA prompt and reports it) is product knowledge consistent with the chapter, the page section itself was not quoted.
- q5: the action labels "Confirm sign-in safe", "Confirm sign-in compromised", "Confirm user compromised", "Dismiss user risk" come from the risk feedback page. French labels are descriptive translations aligned on the mock `sc900-2c-idp-dismiss-risk` (« Rejeter le risque utilisateur »), not the fr-fr portal labels (not checked).
- q6: notifications and downloadable audit history are both listed as PIM features; "history of privileged uses" is my wording for role activation history.
- q2 / q3 use "PIM for Groups" as a distractor; membership vs ownership was not verified on a dedicated page in this task (the chapter states both).
