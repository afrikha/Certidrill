# QZ-ai-200-12-container-orchestration — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Revision name format.** The chapter (and every mock question) names revisions `<app>--<suffix>`. The Learn page "Update and deploy changes in Azure Container Apps" now says the format is `<CONTAINER_APP_NAME>-<REVISION_SUFFIX>`, with a single dash (example: `album-api-first-revision`), and forbids `--` in the suffix. I don't know whether the platform changed or the page is wrong (the CLI has historically shown `app--suffix`). The quiz only uses revision names given in the stem (q8) and never tests the format. Check and harmonise the chapter, the bank and this quiz.
- **Labels.** The chapter's table shows a "Labels (preview)" mode. Learn marks the **Deployment labels** revision mode as preview, but labels used in multiple revision mode are not marked preview. Changing the inactive-revision limit (`--max-inactive-revisions`) is also preview (not in the chapter).
- **`--attach-acr` permissions.** The chapter says "Owner or another role that can assign roles". The Learn page "Authenticate with Azure Container Registry (ACR) from Azure Kubernetes Service (AKS)" lists Owner, Azure account administrator or Azure co-administrator (and Owner or User Access Administrator in its Terraform section). Classic co-administrators were retired in 2026, so the page itself looks stale; the chapter's wording is the safer one. q4 uses Owner only.
- **Secret names limited to 20 characters** (chapter, Container Apps table): not on the Learn page "Manage secrets in Azure Container Apps". Not verified, not used.
- The Learn scale page adds facts the chapter doesn't have: scale-down removes 100 % of the replicas that must shut down in one step, and TCP scale rules can't be configured in the portal.

## Facts not verified, so worded around

- q9: whether changing the ingress target port (an application-scope change) immediately re-evaluates the default probes of an existing revision, or only of replicas started afterwards. The requirement is written as "ca-embed runs healthy replicas that serve requests through its ingress", and the explanation doesn't claim the existing revision recovers without a restart.
- q9: whether Container Apps keeps the default startup and liveness probes when only a readiness probe is defined. The explanation of option a only uses the ingress port argument.
- q8: that traffic can't be routed to an inactive revision before it is activated is implied, not stated, by the revisions page and the CLI reference.
- q6: `envFrom` / `configMapRef` don't appear on any Learn page I fetched; the correct answers (`valueFrom` + `secretKeyRef`, `configMap` volume) are shown on the CSI configuration page and the App Configuration AKS quickstart. `envFrom`, `secretRef`, `fieldRef` are used only as distractors from Kubernetes knowledge.
- q7: FailedScheduling being a Warning event (so collected by default in KubeEvents) is Kubernetes knowledge; Learn only says that Normal events aren't collected by default.

## Design notes

- The mock bank already covers about 85 decisions on 1.2.x. The quiz tests what is left: Key Vault reference rotation in Container Apps (30 minutes, automatic restart, contrasted with App Service's 24 hours), Base64 Secret manifests, the default HTTP scale rule (0–10), `--attach-acr` permissions, a readiness probe on a wrong path, env and volume injection from a Secret and a ConfigMap, Container insights and Container Apps tables, rollback to an inactive revision, default probes on a wrong target port, and a scaling configuration that combines per-replica concurrency with a quota (max 12, `messageCount` 10).
- q10 uses `shuffle: false` (numeric options); correct values sit at positions 1, 3 and 2 of their slots.
