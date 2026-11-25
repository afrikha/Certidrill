# QZ-sc-900-32-defender-for-cloud

File: `content/sc-900/quizzes/32-defender-for-cloud.yaml`, 10 questions (`sc900-qz-32-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 32-defender-for-cloud` → 0 problem(s), 0 warning(s).
Objectives: 3.2.1 = q5, q9, 3.2.2 = q2, q7, q10, 3.2.3 = q3, q8, 3.2.4 = q1, q4, q6. Types: single 5, multi 1, dragdrop 1, dropdown 1, yesno 1, hotarea 1. Positions 6–10: dragdrop, dropdown, yesno, single, hotarea.

The 34 mock questions of 3.2.x cover the definitions; the quiz tests other decisions: Defender for App Service vs APIs (q1), agentless VM scanning in Defender CSPM (q2), regulatory standards such as PCI DSS need Defender CSPM (q3), CWP vs CSPM classification of paid features (q4), DevSecOps for a secret in a GitHub repo (q5), plan per threat with Defender CSPM as a trap (AI/API posture vs threat detection) and Defender for Servers on AWS (q6), least-cost plan per need incl. "nothing more" for AWS secure score (q7), secure score rules: preview and custom recommendations don't count (q8), Defender plans + Defender portal for XDR incidents (q9), deducing plans from findings (q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

Docs: defender-for-cloud-introduction, concept-cloud-security-posture-management, security-policy-concept, secure-score-security-controls, concept-regulatory-compliance-standards. Training units 2, 3, 4, 5a of `describe-security-management-capabilities-of-azure`.

## Chapter issues against current Learn

- **Defender portal experience.** `security-policy-concept` now says the Defender portal has no free Foundational CSPM plan (Defender CSPM required for posture recommendations there), uses an "MDC Baseline Policy" assigned by default rather than naming the MCSB, and supports posture policy management for Azure only. The chapter (and the quiz) describe the Azure portal model: Foundational CSPM free, MCSB default.
- **Two secure score models.** The secure score page describes the classic score (Azure portal) and a risk-based Cloud Secure Score (Defender portal, 0–100). The chapter mentions only one score; the quiz doesn't test the calculation.
- **When the score improves.** The training unit says the score improves only when all recommendations for a single resource within a control are remediated; the chapter just says remediating recommendations raises the score. Not tested (absent from the chapter).
- **Regulatory compliance.** The CSPM table marks "Regulatory compliance assessments" as Defender CSPM only (q3, q10 rely on it); `security-policy-concept` says regulatory standards are "available when you enable a Defender for Cloud plan" (any plan?). The training unit says other standards come with "enhanced security features". Consistent with the chapter, but worth a reviewer check.
- **Agentless scanning.** Defender for Servers Plan 2 also includes agentless scanning; the chapter mentions it only under Defender CSPM. q2 doesn't offer Defender for Servers as an option; q10 explanation says agentless secret scanning "is a Defender CSPM capability" (true, not exclusive).
- Defender for DNS is folded into Defender for Servers Plan 2 for new subscriptions (intro page); the chapter's plan list doesn't mention DNS (fine).

## Doubts / unverified

- **French "secure score"** is still `undecided` in `content/glossary.yaml` (« score sécurisé » / « score de sécurité »); the quiz follows chapter 32 (« score de sécurité »). To settle.
- q9 distractor d: Defender for Cloud Apps described as protecting the use of cloud apps (CASB) from chapter 34 / general knowledge; no Defender for Cloud Apps page fetched in this task.
- q10: the alert text "Unusual access to a key vault from an IP address known to be malicious" is a generic description, not an exact Defender for Key Vault alert name; the recommendation text is generic too.
- q6: prompt injection detection by Defender for AI Services and run-time detection by Defender for Containers come from the training unit 5a and the intro page.
- French plan names kept in English (Defender for App Service...), as in chapter 32 and the mock bank; « Microsoft Defender pour Identity », « Microsoft Defender pour les applications cloud » as in chapter 34.
