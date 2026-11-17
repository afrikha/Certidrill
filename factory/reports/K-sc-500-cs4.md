# K-sc-500-cs4 — report

Two case studies (status draft), 11 questions, validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `sc500-cs4a-relecloud` (5 questions) | Travel agency — Foundry agents with Entra Agent ID, API Management, firewalled Key Vault, user consent | user-consent (1.1.5, yesno, 2), kv-firewall (1.2.4, single, 2), agent-sponsor (3.1.6, single, 2), foundry-dns (2.3.6, multi choose 3, 2), ai-posture (4.1.1, single, 1) |
| `sc500-cs4b-blue-yonder-airlines` (6 questions) | Airline — hub-spoke with Azure Firewall Premium, App Service, Logic Apps, Storage, Logs Ingestion API into Sentinel | phish-resistant (1.1.3, dropdown, 1), logicapp-access (3.3.6, dropdown code json, 3), app-basic-auth (3.3.7, multi choose 3, 2), tls-inspection (2.3.8, multi choose 3, 3), delegation-sas (2.1.4, yesno, 2), logs-ingestion (4.2.7, ordering, 2) |

## Overlap with parallel case studies

The sibling agents (cs1–cs3) wrote at the same time and converged on the same decisions several times. I rewrote my drafts three times to avoid duplicates (same decision, same answer) with their files as they appeared: dropped agent Conditional Access, AI gateway token limit, AI prompt evidence, CEF forwarder ordering, Sentinel roles, ACR Premium private endpoint, AKS local accounts, Defender for Servers plans, PIM eligible plus approval, Front Door access restriction, Bastion SKU, Trusted launch with Enhanced backup, and Machine Configuration prerequisites. I also renamed the companies after name collisions (Humongous Insurance is used by cs3c, Margie's Travel by cs2c). Checked against the bank at the end of my run; anything written by siblings after that has not been checked.

Partial overlaps that remain and that a reviewer may want to look at:
- `sc500-cs4a-user-consent` vs `sc500-cs2a-user-consent`: same feature, but my statements test other facts (existing grants are kept, Privileged Role Administrator, apps that require user assignment).
- `sc500-cs4b-delegation-sas` vs `sc500-cs2b-contractor-sas`: both lead to a user delegation SAS; mine tests Shared Key denial of a service SAS, the generateUserDelegationKey role, and key expiry.
- `sc500-cs4a-foundry-dns` vs `sc500-cs1c/cs3a-foundry-private`: theirs test private endpoint and Disabled public access; mine gives those as facts and tests the three private DNS zones.

## Facts not re-fetched this session (from memory, well known)

- DNS zones used as distractors: `privatelink.azure-api.net` (APIM), `privatelink.api.azureml.ms` (Azure ML), `privatelink.vaultcore.azure.net` (Key Vault).
- Defender for Resource Manager plan name (distractor in ai-posture).
- `allowedCallerIpAddresses` and `openAuthenticationPolicies` are the property names under `accessControl.triggers` of a Consumption logic app (the Learn page shows `sasAuthenticationPolicy`, and it describes the OAuth authorization policy and IP restrictions).
- App Service FTP state value "FTPS only" (distractor), and the App Service authentication distractor.
- Email OTP / SMS as Authentication methods policy entries (distractors in phish-resistant).

## Other notes

- `sc500-cs4b-logicapp-access` slot `policy` has 3 options and slot `secure` has 3; `phish-resistant` has 2 slots (the guide asks for 2–4).
- AI security posture: since 1 July 2026, agent-level discovery needs a Microsoft Agent 365 licence. The case gives Microsoft 365 E7, which includes Agent 365 according to the Conditional Access for agents page. The question only tests Defender CSPM against other plans.
- French terms for Agent ID come from fr-fr Learn (« identité d'agent », « blueprint d'identité d'agent ») and « workflow du consentement administrateur » from the fr-fr admin consent page. "Sponsor", "owner" and "manager" are kept as « sponsor », « propriétaire », « manager ».
- Process slip: one shell command contained a stray argument-less `git mv` (the folder is not a git repository, and the command did nothing). No other git command was run.
