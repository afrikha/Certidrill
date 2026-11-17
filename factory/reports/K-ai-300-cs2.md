# K-ai-300-cs2 — report

3 case studies, 17 questions, validator: 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| ai300-cs2a-blue-yonder (airline, Azure ML tabular MLOps + Foundry chat app) | registry-promote 1.2.4, github-oidc 1.3.1, outbound-rules 1.3.4, safe-rollout 2.3.3, monitor-signals 2.4.1, techassist-role 3.1.2 | mlops, ml-lifecycle, genaiops |
| ai300-cs2b-wide-world-importers (freight forwarding, Foundry GenAI app with PTU) | deployment-type 3.2.4, spillover 3.2.4, quality-evaluators 4.1.2, safety-evaluators 4.1.3, tracing-code 4.2.4, finetuned-test 5.2.4 | genaiops, quality, optimization |
| ai300-cs2c-adventure-works (bicycle maker, RAG on Azure AI Search) | chunking-split 5.1.1, part-numbers 5.1.3, retrieval-dataset 4.1.1, preference-tuning 5.2.1, deployment-bicep 3.2.3 | optimization, quality, genaiops |

Difficulty: 4 easy, 9 medium, 4 hard.

## Points to review

- **Foundry role names.** The RBAC page (updated 2026-09-16) renamed Azure AI User / Azure AI Project Manager / Azure AI Account Owner to Foundry User / Foundry Project Manager / Foundry Account Owner. ai300-cs2a-techassist-role uses the new names and mentions the old one in the explanation. The exam may still use the old names.
- **Role conflict on Learn.** The Azure AI Search vectorizer page still recommends Cognitive Services OpenAI User for the search identity, while the Foundry RBAC page says not to assign Cognitive Services roles. No question relies on this.
- **Tracing reference.** ai300-cs2b-tracing-code uses the "(classic)" Foundry page (the new-portal tracing page could not be fetched). The code (`telemetry.get_application_insights_connection_string()`, `configure_azure_monitor`, `OpenAIInstrumentor().instrument()`) matches that page.
- **versionUpgradeOption.** The Bicep reference lists the three values but does not describe them; the question relies on their literal meaning (NoAutoUpgrade / OnceCurrentVersionExpired / OnceNewDefaultVersionAvailable).
- **Model version.** ai300-cs2c-deployment-bicep shows gpt-4.1 version 2025-04-14 and API version 2025-06-01 in the template (not tested by a slot). I did not check that gpt-4.1 is offered as DataZoneStandard in East US 2.
- Text Split `unit` / `azureOpenAITokenizerParameters` are preview; the case states preview features are allowed.
- The WebFetch budget ran out during the session, so I did not fetch the Azure OpenAI monitoring metrics page; no question uses metric names.
