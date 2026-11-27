# QZ-gcp-ace-37-monitoring — report

File: `content/gcp-ace/quizzes/37-monitoring.yaml` (10 questions, 7 single + 3 multi; objectives 3.4.1, 3.4.2, 3.4.8 ×2, 3.4.9, 3.4.10, 3.4.11, 3.4.12, 3.4.13, 3.4.14). Check: 0 problem(s), 0 warning(s).

## Decisions kept away from the mock exam
Bank questions of these objectives were read first. The quiz tests other decisions: Query Insights as the tool for slow SQL (bank: enabling tags), unattended project recommender, PSH alert creation (bank: roles), Autopilot managed collection on by default, Cloud Hub default one-hour range, `AND_WITH_MATCHING_RESOURCE` combiner, investigation access restriction since 2026-04-10, Cloud Run OpenTelemetry Collector sidecar, legacy agent removal + `hostmetrics` override with restart, Query Insights viewer roles + Cloud Trace API.

## Chapter issues against current docs (not edited)
- **Cloud Hub pages**: the chapter marks **Maintenance** as Preview; the Cloud Hub overview page (fetched 2026-11-27) labels only **App Topology** as Preview, and the chapter does not mention App Topology. The overview also says Deployments shows "deployed applications that have updates available" and Security & compliance shows compliance framework status and failing cloud controls (chapter lists only SCC findings).
- **Alert combiners**: the chapter lists `OR`, `AND`, `AND_WITH_MATCHING_RESOURCE` but does not say that `AND` is the default and is met even when different resources meet each condition (the key trap; "Behavior of metric-based alerting policies"). Worth adding.
- **Ops Agent without external IP**: the chapter says to reach the repository and APIs through Private Google Access or Cloud NAT. The installation page says the agent packages can be reached through Private Google Access, but Linux dependencies from upstream repositories may be blocked, and recommends a custom image with the agent preinstalled when repository access is blocked. Cloud NAT is not mentioned there.
- **Query Insights**: the page adds that for Enterprise Plus, custom roles and other predefined roles don't give access to historical data (only Database Insights viewer + Cloud SQL viewer). The chapter's sentence is correct but could carry this trap.
- **Gemini Cloud Assist roles**: all `roles/geminicloudassist.*` roles (including Investigation Creator) are titled "Beta" in the IAM roles reference; the IAM requirements page now centers on Gemini Cloud Assist User/Viewer/Editor/Admin. The chapter names only Investigation Creator.

## Doubts / unverified
- Personalized Service Health alert templates: the quickstart page does not name the templates; Q3 says only "choose an example template".
- `gcloud sql instances patch --help` (SDK 570.0.0) gives 0–20 for `--insights-config-query-plans-per-minute`, while the Query Insights page gives up to 200 for Enterprise Plus. Q10 uses 20 (valid either way).
- Q9: the agent policies page (fetched) describes only `agentsRule` (package state, version) and `instanceFilter`; it does not say explicitly that a policy can't carry agent settings, so the explanation of option e relies on that field list.
