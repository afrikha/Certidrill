# K-sc-100-cs2 — notes

Output: 3 case studies, 17 questions (prefix `sc100-cs2`), all `status: draft`. Validator result: 0 problem(s).

| Case study | Questions (objective) | Domains |
| --- | --- | --- |
| sc100-cs2a-litware-energy (electric utility, hybrid AD DS + OT plants) | ot-sensors 3.2.4, ics-coverage 2.1.6, laps 3.2.6, backup-guard 1.1.3, service-accounts 2.3.3, admin-devices 2.3.7 | best-practices, operations-identity, infrastructure |
| sc100-cs2b-vanarsdel-payments (payment provider, Azure + AWS EKS + GCP) | posture-plan 3.1.3, unused-permissions 2.3.5, pci-report 2.4.4, pipeline-identity 4.2.6, eks-protection 3.1.4, score-comparison 3.1.1 | infrastructure, operations-identity, apps-data |
| sc100-cs2c-southridge-video (media, M365 Copilot, agents, freelancers, partner API) | archive-access 3.4.4, copilot-unreleased 4.1.5, agent-access 2.2.1, external-identities 2.2.4, partner-api 4.2.7 | infrastructure, operations-identity, apps-data |

Types: single 8, dropdown 3, yes/no 3, multi 2, dragdrop 1. Difficulty: 4 easy, 10 medium, 3 hard.

## Deviations and overlap handling

- The cs1 agent (Humongous, Lamna) was writing at the same time. I rewrote three drafts to avoid testing the same decision with the same answer:
  - Copilot: cs1b answers with a DLP policy for the Copilot location plus Restricted Content Discovery. Mine now requires protection in the partner tenants too, so the answer is label permissions without EXTRACT. DLP and RCD are the distractors.
  - Agent CA: cs1a already tests blueprints and on-behalf-of targeting. Mine tests custom security attributes, group-based scoping of agent users (not supported) and the separation between agent identity and agent user.
  - Guest governance: cs1a already maps PIM, entitlement management and access reviews. Mine became 2.2.4 (inbound trust settings, B2B direct connect, email OTP, Verified ID).
- Partial overlap remains: cs1b-portal-standard (which standard Defender for Cloud can assess on AWS) and cs2b-pci-report (which tool produces a multicloud PCI DSS report). They test different decisions, but both point to the regulatory compliance dashboard.

## Facts to watch (verified on Learn on 2026-11-17)

- The Defender for Cloud regulatory standards page lists PCI DSS as v4.0.1 for Azure, AWS and GCP. Adding non-default standards requires at least one paid plan.
- The secure score page distinguishes three models: the cloud secure score (risk-based, Defender portal), the classic score (only MCSB built-in recommendations count) and Microsoft Secure Score. They aren't comparable.
- The Copilot DLP location is now called "Microsoft Copilot, Copilot Chat, and Copilot Cowork". The questions only say "the Copilot location". Blocking SITs in prompts and excluding external email are in preview, so neither is tested.
- Conditional Access for agents is licensed by Microsoft 365 E7 or Agent 365 plus Entra P1/M365 E3. The case gives Southridge Video E7, which also covers the Entra Suite (Private Access).
- Microsoft Entra Permissions Management: the CIEM page mentions its deprecation but gives no date, so it isn't used as an option.
- Not fetched, kept as well-known facts: Defender for Identity is included in Microsoft 365 E5, an sMSA is limited to a single server, application proxy publishes HTTP/HTTPS apps only, and cross-tenant synchronization is for tenants of one organization.
- Sentinel's MITRE ATT&CK page (preview, framework v18) doesn't say which matrices it supports. The ICS question relies only on the matrix definitions and on the T08xx IDs in the Defender for IoT alerts.
- The WebFetch budget ran out once (shared hourly limit), so fetches were spaced out. All the facts used were fetched afterwards.
- French: Service Trust Portal, Restricted Content Discovery and Data Security Posture Management for AI are kept in English because their Learn FR names weren't checked.
