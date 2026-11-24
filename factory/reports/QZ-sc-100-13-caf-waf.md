# QZ-sc-100-13-caf-waf — report

File: `content/sc-100/quizzes/13-caf-waf.yaml` (10 questions, `sc100-qz-13-01` to `-10`). Check: `npx tsx factory/check-quiz.ts sc-100 13-caf-waf` → 0 problem(s), 0 warning(s).

Objectives: 1.3.1 (Q4, Q10), 1.3.2 (Q1, Q6), 1.3.3 (Q5, Q7), 1.3.4 (Q2, Q9), 1.3.5 (Q3, Q8). Formats 6–10: multi, single, single, multi, dragdrop.

## Verified on Learn (fetched 2026-11-24)
- CAF Secure overview: phases; incident preparation stages (readiness, detection, triage, containment, eradication, recovery, post-incident learning); automate containment; tabletop simulations; alert fidelity.
- Management groups page: Connectivity subscription (Virtual WAN, Azure Firewall, DNS private zones); limit assignments at root; workload RBAC at subscription/RG.
- Security design area: Defender for Cloud on all subscriptions + Azure Policy; activity log export; built-in ALZ policies.
- Exemption structure: resource-level exemption, `policyDefinitionReferenceId` for one policy of an initiative, Waiver category, `expiresOn`.
- Remediation: only `deployIfNotExists` and `modify`; existing resources fixed through remediation tasks.
- GitHub Advanced Security for Azure DevOps: Secret Protection (push protection, secret scanning) vs Code Security (dependency alerts, CodeQL).
- Microsoft Agent 365 overview: GA for Commercial (per-user), registry with owner/usage/risk, signals from Defender/Entra/Purview, block a risky agent.
- CAF Secure AI page: inventory (Resource Graph + AI-SPM) is under Protect; Insider Risk Management data-risk assessment and red teaming under Discover; automated AI risk detection under Detect.
- App Service managed identities: no secrets to provision or rotate; Azure SQL Database supported.

## Not verified / doubts
- Q9: the exact built-in policy names that enable Defender for Cloud plans and stream the activity log with `deployIfNotExists` were not fetched; the question only relies on the effect and the scope (intermediate root), which follow from the fetched CAF pages.
- Q6 tests the CAF incident stages; the other CAF Secure pages (strategy) don't name these stages: only the Secure overview does.

## Chapter vs current Learn
- The chapter's AI section and the mock-exam bank treat MCSB v2 AI controls as reference; MCSB v2 is still labeled preview in chapter 12, so no quiz question makes it a correct answer.
- The CAF "Secure DevOps" URL the chapter relies on now resolves to the Zero Trust page "Secure the developer environment for Zero Trust" (EMU, SSH CA, branch protection, extension governance, OIDC); the chapter's DevSecOps table (CodeQL, Dependabot, Defender for Cloud DevOps security) isn't on that page — fine as a synthesis, but its CAF attribution is loose.
- The chapter says the Strategy step covers "incident preparedness"; the CAF strategy page lists objectives, not stages — the stages come from the Secure overview. No error, just a source nuance.
