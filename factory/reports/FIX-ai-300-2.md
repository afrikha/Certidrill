# FIX-ai-300-2 — chapters 23, 24, 31, 32 and 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-300 23-model-deployment 24-model-monitoring 31-foundry-environments 32-foundation-models 33-prompt-management` 0 problems; `content:validate --cert ai-300` 0 problems, 0 warnings; `check-quiz ai-300` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. No code block changed. Note: 31 (2,612 words) and 32 (3,052 words) were already above the 2,200-word guide length; the additions are one or two sentences each.

## 23-model-deployment

| Finding | Learn | Change |
| --- | --- | --- |
| `egress_public_network_access` is legacy | Confirmed (reference-yaml-deployment-managed-online, concept-secure-online-endpoint): applies to the legacy network isolation method; Microsoft "strongly recommends" a workspace managed VNet, with which the flag no longer applies ("Avoid setting this flag"). `disabled` limits the deployment to the workspace resources secured in the VNet and downloads model, code and images through private endpoints; can't be updated after creation. Not deprecated, no date | online-deployment bullet rewritten with the legacy caveat and the managed VNet recommendation |
| Concurrency needs `WORKER_COUNT` | Confirmed (YAML schema note; troubleshooting 429 row) | request_settings bullet: new sentence |
| `max_queue_wait_ms` deprecated | Confirmed (schema: "(Deprecated)… Now increase `request_timeout_ms`"), default 500, no removal date | Same bullet |
| 429 wording | Confirmed: at most `2 × max_concurrent_requests_per_instance × instance_count` requests process in parallel, the excess is rejected; second cause = requests per second over the endpoint limits | 429 row reworded, `WORKER_COUNT` check added |
| Rollback by scaling blue down | Learn (safe rollout) doesn't present it, but nothing contradicts it | None |
| AzureML Data Scientist and `score/action` | Concept auth page: the data-plane table names only Owner/Contributor; the permissions section says AzureML Data Scientist includes `onlineEndpoints/*/actions` | None (chapter is right) |

## 24-model-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| Model performance (classification, regression) and feature attribution drift are preview | Confirmed on concept-model-monitoring (signal table and preview note). The how-to page "Monitor model performance in production" doesn't label its model performance section preview (silent, not contrary); the concept page is followed | performance-metrics section: preview sentence (data drift, prediction drift, data quality are the GA signals); "(preview)" added to the drift exam trap, the Exam tip and Key points |
| ModelRegistered subject | Confirmed (event-schema-machine-learning): `models/{ModelName}:{ModelVersion}`, example `models/sklearn_regression_model:20` | Event table row: subject `models/<name>:<version>`; a filter on the name must match the start of the subject |
| Reference window offset | Confirmed (concept page): default reference offset = 2 × production `lookback_window_size`; keep reference offset ≥ production size + production offset to avoid overlap | Windows paragraph: new sentence |
| Traffic log columns | Confirmed (how-to-monitor-online-endpoints): `ResponseCode` (to the client), `ModelStatusCode` (from the model), `TotalDurationMs`, `RequestDurationMs`, `ResponseDurationMs`, `RequestThrottlingDelayMs`, `ResponseThrottlingDelayMs` | `AmlOnlineEndpointTrafficLog` row |
| YAML schema conflicts (chi-squared key, model performance thresholds, trigger keys, `runtime_version` default) | Confirmed conflict: reference-yaml-monitor (preview) gives `chi_squared_test`, `timezone`, `pattern`, `week_days`, `runtime_version` 3.3; the how-to examples (followed by the chapter and the bank) give `pearsons_chi_squared_test`, `time_zone`, `schedule`, `weekdays`, "3.4". The reference page was truncated before its model performance section | None. For a human decision |
| Fixed window keys | Confirmed conflict: concept page `window_start_date` / `window_end_date` (chapter), reference page `window_start` / `window_end` | None. For a human decision |
| Out-of-box monitoring, `data_collector` defaults | Confirmed (how-to: alert email to the user who set up the monitor; schema: `sampling_rate` 1.0, `rolling_rate` Hour, asset name `<endpoint>-<deployment>-<collection>`) | None |

## 31-foundry-environments

| Finding | Learn | Change |
| --- | --- | --- |
| Azure AI Search renamed | Confirmed: H1 "What is Foundry IQ (Azure AI Search)?"; the network isolation trusted-services table lists Foundry Tools, Foundry IQ (`Microsoft.Search`), Azure Machine Learning | Connected resources row: "Foundry IQ (Azure AI Search)". Later mentions keep "Azure AI Search". Bank-wide rename for a human decision |
| Browser automation with network injection | Conflict confirmed in part: configure-private-link matrix says Supported, "Through your VNet subnet in Playwright Workspaces"; the toolbox page (QZ report) says Not supported (not fetched in this pass). The browser automation page says the tool is GA but "private website browsing" is in public preview | None. For a human decision |
| Default project features | Confirmed (create-projects table): OpenAI Batch, OpenAI fine-tuning, stored completions and Speech fine-tuning are default-only; Language fine-tuning is in every project | Paragraph, exam trap ("OpenAI fine-tuning") and Key points |
| Reserved ranges, subnet sharing, region | Confirmed (Agent Service virtual-networks, updated 2026-10-29): the nine reserved ranges; private endpoints must avoid `192.168.0.0/24` (hosted agent sandbox); one dedicated agent subnet per Foundry resource; /24 or larger for production; Foundry resource in the VNet's region | network-security paragraph: new sentences |
| Deletion order | Confirmed (same page): delete the Foundry resource and VNet last; delete and purge the Foundry resource before the VNet | Same paragraph |
| Automatic role assignments for a portal-created project | Confirmed (rbac-foundry): Foundry User for the creator and for the project's managed identity on the Foundry resource, in the Foundry portal UI, if the creator can assign roles | identity-rbac: new sentence |
| Microsoft-managed network (`useMicrosoftManagedNetwork`, `managed-network` commands) | Confirmed on "Configure managed virtual network for Microsoft Foundry": `networkInjections[].useMicrosoftManagedNetwork`, set at creation; the `az cognitiveservices account managed-network` group is in preview | None (chapter is right) |
| `--assign-identity` description | Chapter doesn't describe the flag; the example is valid | None |

## 32-foundation-models

| Finding | Learn | Change |
| --- | --- | --- |
| Managed compute in Foundry projects | Conflict confirmed: the managed compute page (QZ report) says preview, Global only, `/openai/v1/`; "Deployment overview for Microsoft Foundry Models" (updated 2026-11-17) has no preview label, lists "Global, Data Zone (US/EU)" but also says "currently available for global deployment", endpoint `<endpoint>/managed-deployments/<deployment-name>/`, `/openai/v1/` also works for chat-completions runtimes. Foundry Local on Azure Local is preview | None. For a human decision |
| Role to call managed compute (Foundry User vs Azure AI User) | Not a conflict: Azure AI User was renamed Foundry User (rbac-foundry, evaluate-results) | None |
| Flex and Priority processing | Confirmed (deployment-types; priority-processing): Global Standard supports Flex and Priority processing (`service_tier`), Data Zone Standard (US only; not EU) supports Priority. No preview label on either page | New sentence after the deployment type table |
| Data zones | deployment-types lists US, EU, APAC; provisioned-throughput says Data Zone Provisioned stays "within a geographic zone (US or EU)" | None (the table says "within a data zone" for provisioned). Flagged |
| PTU regional minimums | Confirmed (provisioned-throughput-sizing): gpt-5.6-luna/terra/sol, gpt-6-sol and gpt-6-luna are 15 / 5 in Regional; image models 100 / 100. Chapter table values (gpt-4.1, 4.1-mini, 5, 5-mini) are correct | Minimum sentence reworded |
| Cached tokens for GPT-6 Astra and later | Confirmed (sizing page): weighted normalized-token accounting; earlier models deduct cached tokens 100 % | New sentence after the sizing table |
| Spillover triggers and details | Confirmed (spillover-traffic-management): non-200 responses 429, 400 (long context), 500/503; deployment property wins over the header; `IsSpillover = True` on the Azure OpenAI Requests metric; standard deployment of the same model and version in the same resource; spilled requests billed at standard token rates. DeepSeek/Llama exclusion not on that page (chapter's existing "Azure OpenAI models only" kept) | Utilization paragraph rewritten |
| Model router | Confirmed (model-router concept): GA `2025-11-18` (default); preview `2025-08-07` and `2025-05-19` retire January 27, 2027; routing fee per 1M input tokens plus selected model usage (fee only with own PTU deployments); text and image accepted, routing on text, no audio; failover to the next-best model on a retryable error. "Choose at least two" is not on Learn | Router paragraph: "at least two" removed, facts added |
| Lifecycle | Confirmed (model-retirements): GA deprecated (existing customers only) at 12 months, retired at 18; Anthropic, DeepSeek, Fireworks, Mistral AI on a 12-month GA lifecycle; GA dates not extendable, preview "not sooner than" dates can be extended until a replacement exists | GA row and notice paragraph |
| In-place PTU migration tools | Confirmed (working-with-models): version change in Foundry, REST, CLI; model family change only REST and CLI; CLI can't update `versionUpgradeOption` | In-place migration sentence |
| Classic serverless example DeepSeek-R1 | Not re-fetched; the QZ report says the classic page still uses it | None |
| Evaluation cost estimate | See 33 | — |

## 33-prompt-management

| Finding | Learn | Change |
| --- | --- | --- |
| "Newer chat models are less sensitive to the order" | Confirmed not on Learn: the page says ChatGPT and GPT-4 gave the same response either way, and some techniques differ with gpt-4.1 and gpt-4.5 | Table note reworded |
| Inline citations | Confirmed | Output-structure row |
| Use of affordances | Confirmed (`SEARCH("query")`, stop generation, paste results back) | New table row (EN + FR) |
| Estimated cost of evaluation runs | Confirmed (evaluate-results): Global Standard deployments only, "partial" when some models can't be priced, excludes evaluator usage, runtime, negotiated pricing, commitments and discounts | Run-details paragraph |
| Comparison labels | Confirmed: Improved/Degraded/Changed × Strong (p ≤ 0.001) / Weak (0.001 < p ≤ 0.05), Inconclusive | Evaluation runs row (prose in the cell, table shape unchanged) |
| Reasoning model parameters and summaries | Confirmed (reasoning how-to): reasoning models other than GPT-6 Astra don't support `temperature`, `top_p`, `max_tokens`; cap with `max_output_tokens` / `max_completion_tokens`; `reasoning.summary` with the Responses API, not guaranteed for every request. The GPT-6 feature table contradicts the parameter list for gpt-6-sol, gpt-6-luna, gpt-6.1 models | Generation-parameters and reasoning sentences. The contradiction is flagged |
| Role rename | Already Foundry User | None |
| Training module out of date | Not a chapter issue | None |
| Git experiments (document failed experiments, delete branch after results are committed, `promoted-to-prod-<date>` tags) | **Not confirmed**: the page "Apply Git-based workflows to optimization experiments" wasn't found in this pass | None |

## Mock-exam bank questions changed

- `questions/ml-lifecycle/ai300-cs2a-monitor-signals.yaml` (2.4.1, yesno): s3 used the preview model performance signal as a true statement (requirement 5). New s3 (still Yes): to meet requirement 4, set `alert_enabled` on the data drift signal and list ml-alerts@blueyonder.example under `alert_notification.emails` (how-to-monitor-model-performance). Explanation EN + FR updated.
- `questions/ml-lifecycle/ai300-cs4a-monitor-signals.yaml` (2.4.1, dragdrop): target M4 removed (its answer was the preview model performance signal); 3 targets remain. Explanation updated; explanations added for the preview distractors (feature attribution drift, model performance).
- `questions/ml-lifecycle/ai300-2c-drift-symptoms.yaml` (2.4.1, dragdrop): target t4 (answer: feature attribution drift, preview) removed; stem "four issues" became "three issues"; explanation updated; explanation added for the `fa` distractor.

## Checked and left unchanged

- 2.3.x: `ai300-2c-online-deployment-yaml` (uses `egress_public_network_access: disabled`; legacy, not retired, not contradicted; see human decisions), the auth, troubleshooting, batch and mirroring questions (none relies on the changed wording).
- 2.4.x: `ai300-2c-monitoring-facts`, `-drift-signal-inputs`, `-drift-signal-yaml`, `-prediction-drift-reference`, `-data-quality-yaml`, `-schedule-yaml`, `-weekly-retrain-schedule`, `-eventgrid-threshold-retrain`, `-alert-mechanism-match`, `ai300-sr1-training-drift-*` (preview signals only as distractors; YAML keys follow the how-to pages).
- 3.1.x: `ai300-3a-default-project-*`, `-finetune-roles`, `-agent-subnet-choice`, `-project-mi-role`, `-iac-facts`, `-network-facts` (all agree with the fetched pages).
- 3.2.x: spillover (`ai300-cs2b-spillover`, `-3b-bicep-spillover`, `-3b-spillover-headers`, `ai300-sr2-ptu-bursts-*`), PTU sizing (`-3b-ptu-sizing-calc`, `-3b-ptu-cli-regional`: gpt-4.1 values correct), migrations, router (`ai300-cs1b-triage-router`; nothing relies on "at least two"), managed compute questions.
- 3.3.x: `ai300-3c-citations-structure`, `-inconclusive-label`, `-compare-baseline`, `-cot-statements`, temperature distractors.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- **Preview model performance signal under objective 2.4.2.** The objective ("Monitor performance metrics of models deployed to production") arguably names the preview feature, so these bank questions were kept with model performance as the correct answer: `ai300-2c-ground-truth-performance`, `ai300-2c-performance-monitor-order`, `ai300-cs1a-precision-signal`, `ai300-2c-monitoring-source-match` (t3). Decide whether 2.4.2 requires the preview signal or should be tested through endpoint monitoring only.
- **Case study texts (not my files).** `case-studies/ai300-cs2a-blue-yonder.yaml` requirement 5 and `case-studies/ai300-cs4a-coho-winery.yaml` M4 now have no question (their only solution is the preview model performance signal). Also, cs2a requirement 6 (mlw-by-prod allows only approved outbound) conflicts with requirement 4 (model monitoring in mlw-by-prod): model monitoring "doesn't support the `AllowOnlyApprovedOutbound` managed virtual network isolation setting" (concept-model-monitoring limitations).
- **`egress_public_network_access`** in `ai300-2c-online-deployment-yaml`: the legacy flag is the correct slot for "block outbound internet access". Not contradicted, but Microsoft recommends a workspace managed VNet. Consider rewording the requirement or the explanation.
- **Model monitoring YAML keys and window keys**: reference page vs how-to pages (see 24). The chapter and bank follow the how-to pages.
- **Browser automation with network injection**: network isolation matrix vs toolbox page.
- **Managed compute in Foundry projects**: preview and Global only (managed compute page) vs no preview label, Data Zone and `/managed-deployments/` endpoint (deployment overview).
- **Data Zone Provisioned zones**: US/EU (provisioned-throughput) vs US/EU/APAC (deployment-types).
- **GPT-6 reasoning parameters**: the reasoning page's unsupported-parameter list (all reasoning models except GPT-6 Astra) contradicts its GPT-6 feature table.
- **Foundry IQ (Azure AI Search)** rename: applied once in chapter 31; the bank and other chapters still write "Azure AI Search".

## French terms not settled (not in the glossary)

- « méthode d'isolement réseau héritée », « réseau virtuel managé d'espace de travail », « images d'inférence », « délais d'attente en file » (23).
- « signaux en disponibilité générale » (24; « disponibilité générale » is in the glossary).
- « réseaux connectés par peering » (31, follows the « peering » rule), « bac à sable des agents hébergés », « purger » / « purgez » (31, follows the chapter's existing « purgée »).
- « traitement Flex », « traitement prioritaire (Priority processing) », « niveaux de traitement par requête », « frais de routage », « jetons normalisés », « famille de modèle » (32).
- « utilisation d'affordances », « citations en ligne », « estimation partielle » (33).
