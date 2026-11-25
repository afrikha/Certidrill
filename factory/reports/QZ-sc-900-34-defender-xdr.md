# QZ-sc-900-34-defender-xdr — end-of-chapter quiz, SC-900, chapter 34-defender-xdr

File: `content/sc-900/quizzes/34-defender-xdr.yaml` (10 questions, `sc900-qz-34-01` to `-10`, EN + FR, `status: draft`).
Check: `npx tsx factory/check-quiz.ts sc-900 34-defender-xdr` → 0 problem(s), 0 warning(s).

- Objectives: 3.4.1 = 2 (q7, q10), 3.4.2 = 1 (q3), 3.4.3 = 2 (q2, q4), 3.4.4 = 1 (q8), 3.4.5 = 1 (q9), 3.4.6 = 1 (q5), 3.4.7 = 1 (q1), 3.4.8 = 1 (q6).
- Types: single 5, dropdown 2, multi 1, yesno_statements 1, dragdrop 1. Positions 6–10: dropdown, multi, single, yesno, dragdrop.
- The mock bank has 64 questions on these objectives; the quiz tests decisions they don't: intel profiles, next-generation protection, impersonation protection, ASR vs EDR vs AIR, certificate inventory (MDVM), Defender vs Purview vs Entra portals, which products belong to the XDR suite, Conditional Access app control vs compliant-device Conditional Access, MDI sensors on AD FS/AD CS and no workstation agent, attribution of the alerts of one incident to Entra ID Protection / MDE / MDI / MDCA.

## Sources fetched (2026-11-24)

Training units 2, 3, 4, 5, 6, 6a, 6b and 7 of `describe-threat-protection-with-microsoft-365-defender`; `defender-office-365/anti-phishing-policies-about`; `defender-cloud-apps/proxy-intro-aad`; `purview/purview-portal`; `unified-secops/threat-intelligence-overview`.

## Chapter issues (not edited)

- **3.4.4 naming.** The Defender for Cloud Apps training unit now calls real-time session control "built-in adaptive access control (AAC)" and never says "Conditional Access app control"; the docs page still uses "Conditional Access app control" throughout. Chapter and q8 use the docs name. Check which name the exam uses.
- **3.4.1 suite list.** The training unit lists eight services, including Microsoft Defender Threat Intelligence and Microsoft Security Exposure Management; the chapter table lists six. q7 only relies on Sentinel, Defender for Cloud and Purview Insider Risk Management being outside the suite (stated on the page) and on MDVM and MDI being inside.
- **3.4.5.** The current training unit says Defender for Identity also monitors Microsoft Entra ID signals and other identity providers; the chapter describes only on-premises AD sensors. q10 keeps "risky sign-in from an anonymous IP" on Entra ID Protection (the chapter's exam trap), which stays the unambiguous mapping since each service is used once.
- **3.4.2.** The training unit describes anti-phishing as spoofing protection only; impersonation protection (q3) is verified on the anti-phishing policies page (Defender for Office 365 only, not in the basic protection of every cloud mailbox).

## Doubts

- q6 relies on "DLP is managed in the Microsoft Purview portal" (Purview portal page lists DLP among its solutions) and "Conditional Access policies are created in the Microsoft Entra admin center" (not on a page fetched in this task; standard Entra fact).
- French labels for the Defender portal "Action center" (« centre de notifications ») and "Advanced hunting" (« repérage avancé ») in q1 distractors were not verified on fr-fr Learn; the English name is kept in parentheses.
