# QZ-sc-100-41-microsoft-365 — report

File: `content/sc-100/quizzes/41-microsoft-365.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 41-microsoft-365` → 0 problem(s), 0 warning(s)).

Coverage: 4.1.1 (q1, q5), 4.1.2 (q2, q6), 4.1.3 (q8, q9), 4.1.4 (q3, q7), 4.1.5 (q4, q10). Formats 6–10: dropdown, dragdrop, yesno_statements, multi, dropdown.

The mock bank has about 44 questions on 4.1.x. The quiz tests other decisions: Defender for Cloud secure score for Azure + AWS, impersonation protection in MDO Plan 1 (not EOP), sensitivity labels for containers, DLP Copilot location blocking web search for prompts with SITs, unified RBAC Exposure Management (read) role, ZAP for email (EOP) vs ZAP for Teams (Plan 1) vs attack simulation (Plan 2), Customer Key / trainable classifiers / Communication Compliance (with DKE, EDM, IRM as distractors), Retire vs Wipe vs selective wipe, CA "Require one of the selected controls" for compliant or app-protected iPhones, Audit (AccessedResources + labels) vs audit log retention vs eDiscovery for Copilot.

## Facts verified on Learn (fetched 2026-11-24)
MDO overview (features by plan, Plan 1 in E3/G3 and Business Premium); ZAP (email ZAP without special licensing, ZAP for Teams needs Plan 1 or 2); container labels; DLP for Copilot location (web search restriction not labeled preview, SIT prompt blocking preview, custom template, other locations disabled, four hours); Secure Score overview (unified RBAC read/manage, Entra roles); Defender for Cloud secure score (per subscription and connector, weighted); Intune Wipe, Retire, selective wipe; CA grant controls; Customer Key; trainable classifiers; Communication Compliance; Audit for Copilot; audit log retention policies; eDiscovery for Copilot data.

## Not verified on a fetched page
- q1: Azure Advisor score covers Azure only (distractor, stable knowledge).
- q5: Security Reader / Global Reader read scope beyond Secure Score (stable knowledge).
- q10: "A retention policy for Microsoft 365 Copilot interactions" (location name not fetched); 180-day default for Copilot audit records is inferred from the audit retention page ("all other activities ... 180 days").

## Chapter 41 vs current Learn
- **Defender for Cloud Apps file policies retire on January 6, 2027** (file policies page: "migrate to Microsoft Purview DLP or auto-labeling policies"). The chapter recommends "information protection policies" in Defender for Cloud Apps to label files or remove external collaborators in SaaS apps: add the retirement and the migration path.
- Copilot section: "Audit (prompts and responses in the unified audit log)" looks inaccurate. The Copilot audit page shows message IDs and an IsPrompt flag, plus AccessedResources and SensitivityLabelId; the text of prompts and responses is in the user's mailbox (eDiscovery page). Reword.
- Copilot section: the DLP Copilot location is now named "Microsoft Copilot, Copilot Chat, and Copilot Cowork"; "performing web searches" for SIT prompts isn't labeled preview, while SIT prompt response blocking is (chapter correct on that point).
- Copilot section: Purview Communication Compliance covers Copilot prompts and responses (chapter says "inappropriate content in prompts and responses": consistent).
- MDO: Learn now says Plan 1 is included in Microsoft 365 E3/G3 as well as Business Premium; the chapter mentions only Business Premium.
- Intune: Learn says the "Require approved client app" grant was to retire in early March 2026 but the page (dated 2026-11-17) still documents it; the chapter doesn't mention it. Customer Key covers Microsoft 365 Copilot interactions too (not in the chapter).
- Defender for Cloud now has the risk-based Cloud Secure Score in the Defender portal beside the classic secure score (June 30, 2026 multicloud change); the chapter's score table only says "secure score of Defender for Cloud".

## French
- « profil professionnel sur appareil personnel » (personally owned work profile) and « réinitialisation sélective » (selective wipe) not checked on fr-fr Learn; Intune actions Wipe and Retire kept in English.
- Secure Score: « Niveau de sécurité Microsoft (Microsoft Secure Score) » as in objectives/course (glossary still lists Secure Score as `undecided`).
