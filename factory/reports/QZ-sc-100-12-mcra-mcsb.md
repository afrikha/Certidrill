# QZ-sc-100-12-mcra-mcsb — end-of-chapter quiz, SC-100, chapter 12

File: `content/sc-100/quizzes/12-mcra-mcsb.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts sc-100 12-mcra-mcsb` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (q1, q8), 1.2.2 (q3, q7, q10), 1.2.3 (q5, q6), 1.2.4 (q2, q4, q9). Formats 6–10: single, multi, dropdown, single, multi.
The 37 mock-exam questions of 1.2.1–1.2.4 were read first. The quiz uses decisions they don't: the DS domain, CAF lifecycle phases, the Risky AI usage template, scenario choice for data protection, inherited NS/IM domains for AI workloads, missing AI-4 + AI-5, GHAS + Defender for Cloud DevOps security, Private Access vs application proxy / Internet Access / Sentinel vs XDR, breach scenario + scale motion, and Communication Compliance trigger + eDiscovery (Premium) escalation.

## Facts verified on learn.microsoft.com (2026-11-24)

- MCSB overview: v2 is "currently in preview" and supersedes v1; 12 domains incl. DS and AI; NS covers private connections, IM covers managed identities.
- MCSB v2 AI page: AI-1 to AI-7 titles; AI-4 (own identity with Entra Agent ID, RBAC/ABAC, scoped tokens); AI-5 (human approval for critical actions, Logic Apps / Power Automate).
- Zero Trust adoption overview: five business scenarios, same lifecycle phases as CAF, two-dimensional scale motion.
- Insider Risk Management: templates incl. Risky AI usage (not preview) and Data leaks by risky users; Communication Compliance integration brings users into scope; pseudonymized by default; escalation to eDiscovery (Premium).
- Global Secure Access: Private Access for any TCP/UDP app without VPN with per-app Conditional Access; Internet Access SWG with web content filtering and Conditional Access; both GA.
- Defender for Cloud DevOps security: Azure DevOps, GitHub, GitLab; code, secret and dependency findings in a central console with cloud posture. Sentinel: SIEM, third-party connectors, Logic Apps playbooks.

## Doubts and unverified points

- MCSB v2 (and its AI domain) is still preview. The study guide objective 1.2.3 targets it, so q5/q6 use it; q1 (DS) and q5 (NS, IM) answers also exist in v1.
- q3: coverage of consumer AI websites by Risky AI usage depends on Purview browser/endpoint signals; not confirmed in detail. Learn writes "Risk AI usage" once (typo).
- The DevOps security page doesn't state GA status and doesn't name GitHub Advanced Security (q7).
- The MCRA page doesn't name Sentinel, Private Access or Internet Access; q8 relies on the chapter's capability table and on the product pages.
- Reference titles: the IRM fetch didn't return the page title; "Learn about Insider Risk Management" is the title used elsewhere in the bank. Defender DevOps page: HTML title "Microsoft Defender for Cloud DevOps Security Benefits" (H1 "Overview of Microsoft Defender for Cloud DevOps security"); the bank uses both.

## Chapter issues (not edited)

- The chapter says Defender for Cloud assigns the MCSB by default; the MCSB overview page doesn't say whether v1 or v2 (preview) is the default standard. Worth checking on the Defender for Cloud pages.
- IRM also has Risky browser usage (preview) and "by risky users" templates that use Communication Compliance; the chapter lists neither by name (it only says Communication Compliance can bring users into scope).
