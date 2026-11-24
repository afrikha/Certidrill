# QZ-az-900-34-monitoring — report

File: `content/az-900/quizzes/34-monitoring.yaml` (10 questions, 3.4.1 ×3, 3.4.2 ×2, 3.4.3 ×5). Check: 0 problem(s), 0 warning(s).

## Chapter issues against current Learn (Nov. 2026)

- **"Advisor is free"** (EN §advisor, FR same): neither *Introduction to Azure Advisor* nor the training unit *Describe the purpose of Azure Advisor* says so today. Not verified; not used in the quiz.
- **"Service Health keeps a history of events, with official reports that explain the cause of an incident"**: *Health history* (health-history-overview) and *Azure Service Health portal* describe an archive of past events (90 days in the portal, up to one year through the API) with the actions taken to resolve them, but do not mention post-incident reviews / root cause reports. Q1 tests only the history and the resolution actions. Suggest rewording the chapter or citing a page that documents PIRs.
- **Log Analytics "from simple record retrieval to statistical analysis"**: the current overview speaks of a Simple mode and a KQL mode for advanced analysis; "statistical analysis" is not on the page. Minor.
- **Application Insights "installed with an SDK or with an agent"**: Learn now presents code-based instrumentation through the Azure Monitor OpenTelemetry Distro (classic SDKs are a migration case) and codeless autoinstrumentation. The chapter's "SDK" is still acceptable at AZ-900 level (the training unit says SDK), but the chapter could mention OpenTelemetry.
- **Alert severity**: the chapter says an alert has a severity; *What are Azure Monitor alerts?* as fetched today doesn't define severity levels. Not used in the quiz.
- **Missing from the chapter but on Learn**: Service Health panes *Health advisories* (feature deprecation, required upgrades), *Security advisories*, *Billing updates*; action groups are reusable by Service Health and Advisor alerts (stated in the training unit *Describe Azure Monitor*). Q8 s1 and Q9 d rely on these; both are inferable from the chapter (advisories / alerts with action groups) but the chapter could state them explicitly.

## Doubts

- **Q10 t4** ("Create a Service Health alert…" → Operational excellence): verified on *Operational Excellence recommendations* (recommendation "Create an Azure Service Health alert", under Subscriptions). It is the intended trap (candidates may pick Reliability); the classification cannot be deduced with certainty from the category definitions alone, so it may be judged hard. If reviewers find it too obscure, replace t4 with another Operational excellence recommendation such as "Enable VM Insights for virtual machines" (same page).
- **Q10 t3** paraphrases the Reliability recommendation "Use Standard SKU with zone-redundant IP addresses" (Reliability recommendations page, public IP prefixes).
- **Q8 s3**: Azure status is the public global view of widespread outages (verified); "doesn't show health advisories" is inferred from that scope and from Service Health being where advisories are listed.
- **Q5**: Advisor alerts exist (mock question `az900-3c-adv-new-reco-alert`, training unit mentions notifications); used only as a distractor.
- Advisor was deliberately not offered as a distractor in Q8 (health advisories), because Advisor also surfaces some service-retirement information.

## Terminology

- FR "monitoring" kept as in the study guide objective title (« outils de monitoring »). "Health history" pane name kept in English. Resource Health status `Available` kept in English (enum value).
