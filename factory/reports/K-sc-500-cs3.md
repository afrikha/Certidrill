# K-sc-500-cs3 — report

3 case studies, 16 questions, prefix `sc500-cs3`, all `status: draft`. Validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| sc500-cs3a-trey-research | Pharma R&D, AI agents (Foundry Agent Service, APIM AI gateway, Entra Agent ID) | agent-ca 3.1.4 yesno d3; guardrail 3.1.9 single d2; token-limit 3.1.7 dropdown d2; ai-alerts 3.1.8 single d1; apim-identity 1.1.6 ordering d1; foundry-private 2.3.6 multi d2 |
| sc500-cs3b-alpine-ski-house | Ski resorts, hybrid on-prem + Azure + AWS, Sentinel SOC | cef-ama 4.2.5 ordering d2; soc-roles 4.2.2 dragdrop d1; playbook-identity 1.1.6 single d1; jit 3.2.3 yesno d2; aws-connector 4.1.4 single d3 |
| sc500-cs3c-humongous-insurance | Insurance, containerized claims platform (AKS, ACR, App Gateway WAF, Azure SQL) | acr-private 3.3.3 single d2; aks-access 3.3.2 dropdown d2; waf-rules 3.3.8 yesno d3; sql-tde 2.2.1 multi d2; policy-effects 1.3.1 dragdrop d1 |

Difficulty: 5 easy / 8 medium / 3 hard.

## Notes and doubts

- All facts fetched from Learn on 2026-11-17 (pages listed in each question's references).
- Conditional Access for agents: the Learn page gives the example "block agents identified as high risk" but does not name the portal condition; the stem describes the policy in prose, without UI labels.
- Foundry guardrails for agents, and the Tool response intervention point, are in preview; the question relies on them (Indirect attacks + Tool response + Annotate and block is the example of the Intervention points page, and Bing Grounding / SharePoint Grounding are listed as supported tools).
- Foundry private endpoint: Learn names the portal target "account"; the private DNS zone names were not verified, so they are not tested.
- XML of the `llm-token-limit` policy is shown with `language: text` (no XML highlighter in the allowed list).
- French: "prompt" kept as in Foundry FR docs; "blueprint d'identité d'agent" not verified on a fr-fr page (Learn FR term unknown). Defender for Cloud setting names (Enable user prompt evidence…) are kept in English in explanations, paraphrased in French in the options.
- An existing series `sc500-sr1-pim-approval` covers PIM approval; this batch avoids PIM. `sc500-sr1-kv-purge` covers purge protection in another context; sql-tde tests the TDE prerequisite (purge protection + Key Vault Crypto Service Encryption User), a different decision.
