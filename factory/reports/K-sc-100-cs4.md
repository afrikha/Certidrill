# K-sc-100-cs4 — report

2 case studies, 12 questions (prefix `sc100-cs4`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| sc100-cs4a-blue-yonder-airlines | Regional airline, hybrid AD DS + Microsoft Entra, AWS organization (EC2), on-premises Linux, airport kiosks | zero-trust-scenario 1.2.4 single 1; access-planes 2.3.1 dragdrop 2; ca-validation 2.2.6 yesno 2; multicloud-monitoring 2.1.3 dropdown 2; web-filtering 3.4.2 single 3; kiosks-elevation 4.1.3 multi 2 |
| sc100-cs4b-adatum-university | Public research university, Microsoft 365 with B2B guests, Azure SQL / ADLS / SQL Server on a VM, AI adoption | ai-strategy 1.3.1 single 2; guest-reviews 2.3.6 single 2; purview-compliance 2.4.2 dropdown 1; secure-score 4.1.1 yesno 1; data-discovery 4.3.1 multi 3; research-storage 4.3.6 single 1 |

Type mix: single 5, multi 2, yesno 2, dropdown 2, dragdrop 1. Difficulty: 4 easy, 6 medium, 2 hard. Domains: all four in cs4a, three in cs4b.

All 12 objectives were not yet used by the cs1 to cs3 case studies. A first Intune draft (MAM for unenrolled phones) was dropped because sc100-cs1b-clinician-phones already tests that decision.

## Deviations and doubts

- The WebFetch budget (shared) ran out several times. These facts come from the SC-100 course chapters or general knowledge, not from a page fetched in this session:
  - Global Secure Access client platforms (Windows, macOS, iOS, Android); Defender for Endpoint web content filtering is scoped to device groups (web-filtering).
  - The Log Analytics agent retirement and Arc + AMA + DCR for non-Azure machines (multicloud-monitoring; it is in the course and the writing guide).
  - Account SAS revoked only by key rotation, and account-level "allow blob anonymous access" overriding container settings (research-storage; the reference titles are reused from other files).
  - WAF "AI workloads" guidance and MCRA AI content exist as distractors (ai-strategy).
  - Compliance Manager GDPR template and eDiscovery holds (purview-compliance; the course states them).
- Access reviews: the fetched page says they need Microsoft Entra ID Governance or Microsoft Entra Suite licenses, unlike the course (2.3.2 section) that says P2 includes basic access reviews. The case gives staff ID Governance licenses so the question doesn't depend on it. The course should be checked.
- Purview Data Map BigQuery scans only support US multi-region datasets and don't confirm classification, so GCP was left out of cs4b.
- Autopilot self-deploying mode: a device can't re-enroll automatically after a first self-deploying deployment (Intune record must be deleted), so the kiosk requirement doesn't mention reinstalled kiosks.
- French not checked against fr-fr pages: Zero Trust scenario names kept in English as in the course; « mode de déploiement automatique » / « mode piloté par l'utilisateur » (Autopilot); « journal de suivi d'organisation » (organization trail); « analyse inscrite » (registered scan); Purview names follow the course (Gestionnaire de conformité, Data Lifecycle Management, Conformité des communications, Gestion des risques internes).
