# K-sc-100-cs1 — report

3 case studies, 15 questions (prefix `sc100-cs1`), all `status: draft`. Validator: `CERT=sc-100 npx tsx factory/validate.ts --prefix sc100-cs1` → 18 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| sc100-cs1a-humongous | Insurance; hybrid AD DS + Entra, B2B brokers, Global Secure Access client, Azure SQL with outsourced DBAs | protected-actions (2.2.5 dropdown, 2), partner-governance (2.3.2 dragdrop, 1), tenant-restrictions (3.4.3 single, 3), key-store (4.3.3 single, 2), claims-columns (4.3.5 multi, 2) |
| sc100-cs1b-lamna | Healthcare; Microsoft 365 E5 + Copilot rollout, BYOD phones, patient portal on Azure + AWS | copilot-controls (4.1.5 dropdown, 2), audit-retention (2.1.2 single, 2), clinician-phones (3.2.2 single, 1), portal-standard (2.4.4 yes/no, 3), threat-protection (4.1.2 dragdrop, 1) |
| sc100-cs1c-wingtip | Online games; AKS, Front Door Standard, APIM partner APIs, GitHub Actions, Key Vault signing keys | partner-apis (4.2.7 single, 2), edge-waf (4.2.8 single, 3), code-to-cloud (1.3.5 multi, 2), signing-exposure (3.1.7 single, 1), aks-guardrails (3.3.5 yes/no, 2) |

Types: single 7, multi 2, yesno 2, dropdown 2, dragdrop 2. Difficulty: 4 easy / 8 medium / 3 hard.

## Deviations and overlap with the parallel agents

- I first wrote an energy-utility case (Defender for IoT, MITRE ICS, MUA/immutable vault, LAPS). `sc100-cs2a-litware-energy` covered the same decisions, so I dropped it before writing files for it.
- `sc100-cs2c-southridge-video` appeared while I was writing a Southridge Video case. It covered Private Access for a MAM system, a DLP label for Copilot, Conditional Access for agents and Verified ID. I renamed my case Wingtip Toys (online games), removed my Private Access question, and replaced my agent CA (yes/no) and Verified ID questions with protected actions and Managed HSM. I also replaced the DLP-label slot in the Lamna dropdown with data access governance reports.
- Remaining proximity, different decisions: `sc100-cs2b-pci-report` (adding a standard) vs `sc100-cs1b-portal-standard` (which standards exist for AWS); `sc100-cs2c-partner-api` (publishing with APIM + WAF, Defender for APIs as a distractor) vs `sc100-cs1c-partner-apis` (Defender for APIs inventory and threat detection for APIs already in APIM). `sc100-cs2b-pipeline-identity` covers GitHub federation, so I left it out.

## Facts to review

- Not confirmed on a fetched page (stated from product knowledge):
  - Key Vault Standard keys are software-protected, and Key Vault Premium isn't a dedicated single-tenant HSM (key-store distractors).
  - Conditional Access app control session policies apply to browser sessions, not to the mobile Outlook/Teams apps (clinician-phones distractor).
  - The CA grant control "Require app protection policy" is real, but the fetched Intune page doesn't name it.
  - Azure Firewall IDPS mode "Alert and deny".
  - Front Door can be upgraded from Standard to Premium.
- sc100-cs1b-copilot-controls: the Purview DLP location is now named for Microsoft Copilot, Copilot Chat and Copilot Cowork (page title "Microsoft Purview DLP for Microsoft 365 Copilot and Cowork"). The questions say "the Copilot location". Restricted SharePoint Search: new enablement has been blocked since July 31, 2026 (Learn).
- sc100-cs1b-portal-standard: HIPAA is Azure-only in Defender for Cloud and HITRUST CSF v11.3.0 covers Azure/AWS/GCP. Both come from the "Available compliance standards" table, which may change.
- sc100-cs1b-audit-retention: 3/5/7-year audit retention requires the 10-year audit log retention add-on (Learn). The case says "use existing licenses whenever possible" so that the add-on is still acceptable.
- sc100-cs1c-code-to-cloud: code-to-cloud mapping for containers on GitHub requires Defender CSPM plus the Microsoft Security DevOps action. The case states that the action already runs.
- Reference titles use the page H1 as returned by WebFetch. For `devops-support` the H1 wasn't confirmed, so the title is "Support and prerequisites".
- French terms not checked on fr-fr pages: « actions protégées », « contexte d'authentification », « restrictions de locataire universelles », « HSM managé », « RBAC local », « découverte de contenu restreinte », « recherche SharePoint restreinte », « rapports de gouvernance de l'accès aux données », « contrôle d'accès restreint », « règles de déploiement contrôlé », « points d'étranglement », « réinitialisation sélective », « gestion des droits d'utilisation », « révisions d'accès ».
- The shared WebFetch budget ran out once mid-session, and calls resumed after a short wait.
