# K-sc-100-cs3 — report

3 case studies, 15 questions (prefix `sc100-cs3`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| sc100-cs3a-wide-world-importers | Online retail, AKS microservices, Azure | checkout-threats 4.2.2 single 1; aks-identity 4.2.6 single 3; policy-effects 2.4.3 dropdown 2; upload-scanning 4.3.7 yesno 1; privileged-pods 3.3.5 single 2 |
| sc100-cs3b-fabrikam-freight | Logistics, hybrid + AWS + GCP servers, two disconnected AD DS forests after an acquisition | server-onboarding 3.1.5 dropdown 2; update-strategy 1.1.4 single 1; proseware-discovery 3.1.6 single 2; forest-sync 2.2.3 yesno 2; protected-actions 2.2.5 single 3 |
| sc100-cs3c-trey-research | Pharma research, Azure landing zone, Foundry agent, Azure OpenAI behind API Management | landing-zone-policy 1.3.4 multi 2; ai-controls 3.3.6 dropdown 2; jailbreak-response 2.1.4 single 3; ai-gateway 4.2.7 dragdrop 1; vault-design 2.2.8 multi 2 |

Type mix: single 7, multi 2, yesno 2, dropdown 3, dragdrop 1. Difficulty: 4 easy, 8 medium, 3 hard.

## Deviations

- First drafts (OT utility, multicloud insurer, M365 law firm) were dropped because cs1/cs2 agents had already written case studies testing the same decisions (OT sensors, ICS coverage, backup MUA, LAPS, CIEM, Agent ID CA, Copilot DLP/RCD, audit retention, MAM, Front Door Premium WAF, DevOps connectors, B2B direct connect, Verified ID). The final set targets objectives not yet used by the other SC-100 case studies at the time of writing (cs4 and later cs1/cs2 files may still overlap).
- Web search budget was exhausted early; all facts come from Learn pages fetched with WebFetch.

## Facts not fetched in this session (general knowledge, low risk)

- Security Administrator can manage Conditional Access policies (protected-actions, option a explanation).
- Key Vault access policies apply to the whole vault, not to individual secrets (vault-design, option c).
- Intune Windows Update rings target Windows devices managed by Intune (update-strategy, option d).
- Arc autoprovisioning verified on the GCP connector page; assumed identical for the AWS connector (server-onboarding).
- Protected material control described as detecting "known protected text or code" (ai-controls).
- French: « garde-fou » for Foundry guardrail and « Gestion des API Azure » were not checked against fr-fr pages.
