# K-sc-500-cs1 — report

Three SC-500 case studies, 17 questions, all `status: draft`. Validator: `CERT=sc-500 npx tsx factory/validate.ts --prefix sc500-cs1` → 20 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| sc500-cs1a-wingtip-energy | Energy utility; hybrid on-premises + Sentinel SOC | onprem-onboarding (3.2.5 single), cef-forwarder (4.2.5 ordering), sentinel-roles (4.2.2 dragdrop), automation-rule (4.2.8 yes/no), pim-scada (1.1.1 dropdown) |
| sc500-cs1b-proseware | Online retail; all-PaaS (App Gateway WAF, App Service, APIM, SQL, Storage, Key Vault) | sql-lockdown (2.2.1 multi), identity-roles (1.1.6 dragdrop), vault-purge (1.2.2 single), waf-geo (3.3.8 dropdown), apim-orders (3.3.9 single), malware-scan (2.1.3 yes/no) |
| sc500-cs1c-adatum-legal | Law firm; AI agents (Foundry, AI gateway, Entra Agent ID) | token-limit (3.1.7 dropdown), ai-threat-alerts (3.1.8 single), agent-guardrails (3.1.9 yes/no), agent-ca (3.1.4 single), gateway-identity (1.1.6 single), foundry-private (2.3.6 multi) |

Difficulty: 5 easy / 8 medium / 4 hard.

## Points to review

- **French terms not confirmed on fr-fr pages** (fr-fr pages were not fetched): « protection contre le vidage » (purge protection), « blueprint d'identité d'agent », « garde-fou » (guardrail), « redirecteur de journaux » (log forwarder), « hub de contenu », « attribution éligible ». Syslog "facility" was left in English (« facility syslog »).
- **Ordering sc500-cs1a-cef-forwarder**: the order of "create the DCR" and then "run Forwarder_AMA_installer.py" follows the order on the Learn page; the page does not say that the order is mandatory.
- **sc500-cs1b-sql-lockdown**: the fact that public network access = Disable allows only private endpoint connections comes from the Azure SQL "connectivity-settings" page. That page's exact title could not be read, so it is not listed as a reference; only the Entra-only authentication page is cited.
- **sc500-cs1b-vault-purge, option d**: the claim that a CanNotDelete lock does not block data plane purges comes from general resource lock behaviour (locks apply to the management plane); it was not re-fetched this session.
- **sc500-cs1c-gateway-identity**: what Cognitive Services OpenAI Contributor and Cognitive Services Contributor allow (distractor explanations) comes from the built-in role descriptions as I remember them; the role page was not fetched. The correct role (Cognitive Services OpenAI User) was checked on Learn.
- **sc500-cs1c-adatum-legal**: the license statement (Microsoft 365 E5 + Microsoft Agent 365) is written to meet the Conditional Access for agents licensing ("Agent 365 license paired with at least Microsoft Entra P1 or Microsoft 365 E3"). APIM Standard v2 outbound VNet integration was not re-checked.
- Reference titles use the H1 of each page where it could be read. The WebFetch budget ran out at the end of the session, so no more checks were possible.
