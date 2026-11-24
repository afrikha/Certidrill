# QZ-sc-900-44-insider-risk-ediscovery-audit

File: `content/sc-900/quizzes/44-insider-risk-ediscovery-audit.yaml`, 10 questions (`sc900-qz-44-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 44-insider-risk-ediscovery-audit` → 0 problem(s), 0 warning(s).
Objectives: 4.4.1 = q1, q4, q7, q9; 4.4.2 = q2, q3, q6, q8; 4.4.3 = q5, q10.
Types: single 5, yesno 2, multi 1, dragdrop 1, dropdown 1. Positions 6–10: yesno, multi, single, dragdrop, dropdown.

Decisions not in the 21 mock questions (`sc900-4b-irm/edisc/audit-*`): Integrated principle (q1), Content search now inside eDiscovery (q2), conversation threading (q3, the mock OCR question has it as a distractor), reminder notice vs escalation/dismiss (q4), audit log retention policies by user, custom over default, Premium only (q5), export copies not moves + hold keeps deleted SharePoint documents + Viva Engage searchable (q6), DLP + insider risk together (q7), analytics vs conversation threading (q8), templates by trigger: Risky AI usage / Data leaks (DLP high-severity alert) / departing users (HR date) (q9), minimum audit tier per service and age: Standard 180 days, Premium 1 year for Entra ID, Teams needs a policy (q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

purview/insider-risk-management, insider-risk-management-policy-templates, edisc, edisc-hold-create, audit-solutions-overview (audit-log-activities fetched but truncated, not used as a reference).

## Chapter issues against current Learn

- **Patient data misuse** is marked **(preview)** on the templates page; the chapter lists it among the "policy templates to recognize" without saying so. Not used in the quiz. Risky Agents and Risky browser usage are also preview; Risky AI usage isn't marked preview (used in q9).
- **Data theft by departing users**: the trigger is the HR connector resignation/termination date **or** the deletion of the Microsoft Entra account; the chapter says it "uses an HR connector".
- **eDiscovery naming**: the insider risk page still says "eDiscovery (Premium)" for escalation; the eDiscovery page describes one experience with premium features.
- **Content search**: Learn says its functionality is in a system-generated eDiscovery case for eDiscovery managers/administrators; chapter correct.

## Doubts / unverified

- q10 slot 2 assumes "add a user to a Microsoft Entra role" is a Microsoft Entra ID audit record (one-year default in Premium). The audit activities page was too long to confirm; the chapter states that Entra role assignments are recorded.
- q10 options say "one-year audit log retention policy"; whether durations of 3–7 years need the 10-year add-on wasn't checked, so the quiz avoids them.
- Intelligent insights: the audit overview says MailItemsAccessed etc. require Audit (Premium) licenses; whether Microsoft's expanded logging made some of them available in Standard wasn't checked (relevant to mock `sc900-4b-audit-premium-adds-multi`).
- q6 s2: the hold page describes deleted SharePoint documents going to the Preservation Hold library; FR name « bibliothèque de conservation (Preservation Hold library) » is not verified on fr-fr.
- The chapter's "Audit (Premium): enabled by default: Yes" wasn't verified (not tested).
