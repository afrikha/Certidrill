# FIX-az-400-3 — chapters 42, 43, 51 and 52 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results:
- `check-cert az-400 42-sensitive-information 43-security-scanning 51-monitoring 52-metrics-analysis`: 0 problems.
- `content:validate --cert az-400`: 0 problems. The 16 warnings are all docs.github.com references that were already there. None of them is in a file changed here; 7 are in 5.1.3/5.1.4 questions (see "For a human decision").
- `check-quiz az-400` (4 chapters): 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables (one row added in 51, in both languages) and callouts. No code block changed.

## 42-sensitive-information

| Finding | Learn | Change |
| --- | --- | --- |
| AzureCLI@2 `addSpnToEnvironment` with federation | Confirmed (AzureCLI@2 task page): `servicePrincipalId`, `tenantId` and either `servicePrincipalKey` or `idToken`. The page doesn't map each variable to a scheme, but its wording ("service principal key or workload identity federation token") does | secretless paragraph: names the variables and `idToken` |
| Reusable workflows: how secrets are passed | Confirmed (training unit "Manage secrets in GitHub"): secrets aren't passed automatically, "explicitly pass only the required secrets". `secrets: inherit` isn't on Learn | One clause: the caller explicitly passes only the needed secrets. `secrets: inherit` not added |
| Secrets in `if:`: workaround | Confirmed (same unit): set them as job-level environment variables and test those | One sentence |
| Private key vault: Microsoft-hosted vs self-hosted | Confirmed (key-vault-access): Microsoft-hosted agents aren't trusted services. A linked variable group is queried from the Azure DevOps public IPs, so the geography's IP ranges must be allowed. Otherwise use AzureKeyVault@2 on a self-hosted agent whose VNet is allowed | Network paragraph: two sentences. Role inconsistency on the page (Secrets User vs Contributor): chapter unchanged (Secrets User) |
| Fork builds: organization/project control | Confirmed (pipelines/repos/github): **Limit building pull requests from forked GitHub repositories**, at organization and project level, with three options: disable, securely build, customize. The two defaults on the page (Sprint 229 "disable" for new projects and organizations; Sept. 2023 "securely build" for new organizations) still contradict each other | Leakage table, fork row: control and its three options. No default stated |
| Training unit advises secrets in script commands | Not a chapter error (set-secret-variables is followed) | None |

## 43-security-scanning

| Finding | Learn | Change |
| --- | --- | --- |
| Agentless code scanning is preview | Confirmed (devops-support: "Agentless code scanning (Preview)", the only preview item, also the SBOM prerequisite). The GHAS integration deploy page's prerequisites list doesn't include it. Its Step 1 says "Make sure that agentless scanning is turned on for your GitHub connector" | Labeled "in preview" in the capability table (code findings, SBOM) and in ghas-defender. Removed from the prerequisites list; new sentence: the deployment steps also check that it's on |
| `dependabot.yml` and security updates | Learn has nothing current. The training unit says groups apply to version updates only. docs.github.com (options reference) has `applies-to: security-updates`, and some options also change security update PRs | Trap reworded without "only": "configures version updates and doesn't turn on security updates". No `applies-to` fact added (not on Learn) |
| `open-pull-requests-limit` vs security updates (limit 10) | Not confirmed: not on Learn, and the GitHub options page was cut off before that option | None |
| Defender CLI `break`, Trivy | CLI CI/CD page shows `break: false` only, without explanation. CLI syntax page: `--defender-break` exits non-zero "if critical issues are found". CLI overview: "Microsoft Container Security Scanner (MDVM-backed) … replacing Trivy image scanning in pipelines" (migration from the MSDO CLI) | defender-devops: CLI paragraph (migration, scanner, `--defender-break`). Container table, build row: the CLI scanner replaces Trivy image scanning; "fail the pipeline" now names MSDO `break` and CLI `--defender-break`. The `MicrosoftDefenderCLI@2 … break: true` code block is unchanged (see human decisions) |
| GHAS for Azure DevOps details | Confirmed (configure-github-advanced-security-features): status checks `AdvancedSecurity/AllHighAndCritical` and `AdvancedSecurity/NewHighAndCritical`; Enable all = existing repositories only, with separate options for new repositories or new projects; default setup languages C#, C/C++, Java, JS/TS, Python, Ruby, Rust, while Go and Swift need advanced setup; Copilot Autofix for Azure DevOps in public preview | advanced-security: enablement sentence, languages, status checks. Copilot Autofix stays only in the GitHub product table (GitHub side, no Azure DevOps claim) |
| Dependabot alerts on PRs (training unit) | Chapter right not to say it | None |
| Dependency graph on by default for public repositories | Learn training unit "Manage your dependencies on GitHub": "automatically generated for public repositories". docs.github.com "About the dependency graph" says "Not enabled by default" for every repository type | None (Learn followed). Flagged |

## 51-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| Audit streaming is preview | Confirmed: auditing-streaming "Auditing is still in public preview"; azure-devops-auditing "Auditing is currently in public preview". The same pages give a 30-day default workspace retention and say the signed-in identity needs access to the workspace | Table row, paragraph and trap say auditing is in public preview. Paragraph adds the 30-day default and workspace access. Key points add "(preview)". New GA row: the activity log goes to a workspace through a diagnostic setting (`AzureActivity`), confirmed by the activity-log page |
| "No organization-wide subscriptions" | Partly wrong. About Notifications and Manage Notifications: global notifications apply to all projects, managed by Project Collection Administrators, who enable or disable default subscriptions. Manage Notifications also says "Azure DevOps doesn't support organization-wide notifications" (meaning mail to every user) | Notifications bullet: PCAs manage global settings and default subscriptions; no notification is sent to every user |
| Skip initiator too broad | Confirmed (Manage Notifications): it belongs to **Members of `<team>` by role**, checked by default | Trap reworded |
| Action group webhook to `repository_dispatch` / pipeline runs API | Confirmed doubtful (action-groups): the webhook sends the alert payload, and basic auth works only with credentials in the URI, with no certificates. If an endpoint expects a specific schema, use Logic Apps | Integration row: Logic App or Function. Webhook limit stated |
| VM insights OTel experience and scale sets | Confirmed (metrics-opentelemetry-guest, monitor-vm): metrics-based collection only on individual VMs and Arc-enabled servers. Scale sets use logs-based collection | Telemetry table, VM insights row |
| Autoinstrumentation preview rows | Confirmed (codeless-overview): App Service Windows containers (all languages) and AKS .NET/Python are public preview; containers support single-container apps only | Application Insights paragraph: one sentence; table cell lists platforms |
| AKS resource logs | Confirmed (monitor-aks): use `kube-audit-admin` (no get/list), resource-specific mode (`AKSAudit`, `AKSAuditAdmin`, `AKSControlPlane`) | Container insights paragraph: one sentence |
| GitHub Projects historical charts plan | Chapter states no plan; Learn training unit says Team / Enterprise Cloud, docs.github.com doesn't | None |

## 52-metrics-analysis

| Finding | Learn | Change |
| --- | --- | --- |
| AppRequests `TenantId` column | Confirmed (AppRequests table): `TenantId` = Log Analytics workspace ID | Bank question renamed (below) |
| VM insights OTel limits | Confirmed (metrics-opentelemetry-guest): VMs and Arc only, no private link, no single query across the two workspaces; default logs-based metrics in `InsightsMetrics`, extra in `Perf` | Experience table, Notes cells of both rows |
| App Service plan metrics tiers | Confirmed (web-sites-monitor): plan metrics only in Basic, Standard, Premium, Isolated; CPU Time is for Free/Shared quotas | Other-resources paragraph |

## Mock-exam bank questions changed

- `questions/instrumentation/az400-5a-audit-stream-order.yaml` (ordering, 5.1.1, difficulty 1): **rewritten**, because Azure DevOps auditing is in public preview and was the whole answer. The new scenario uses only GA features: an alert should open a GitHub issue without custom code. The sequence is: a logic app (When a HTTP request is received trigger plus the GitHub connector's Create an issue action, not preview), then an action group with a Logic App action and the common alert schema, then the action group linked to the alert rule. Sources: alerts-logic-apps and connectors/github. Same id, type, objective, difficulty and count.
- `questions/instrumentation/az400-5a-audit-kql.yaml` (dropdown kusto, 5.1.1, difficulty 2): **rewritten** for the same reason. It now counts failed operations per resource group in `AzureActivity` (`ActivityStatusValue == "Failed"`, `count()`). The activity log reaches the workspace through a diagnostic setting. Column values come from the AzureActivity table reference and the activity-log page.
- `questions/instrumentation/az400-5a-devops-integrations.yaml` (dragdrop, 5.1.1): the "keep Azure DevOps audit events" target (answer: audit stream, preview) is replaced by "send the web app's resource logs to a Log Analytics workspace" (answer: diagnostic setting, confirmed by troubleshoot-diagnostic-logs). The audit-stream item is replaced by a "Data collection rule" distractor. A reference was added.
- `questions/security/az400-4b-ghas-defender-setup.yaml` (ordering, 4.3.4): the correct sequence contained "turn on agentless code scanning" (preview). It is now: connector, then Cloud Security Explorer validation of the code-to-runtime mapping, then the organization campaign (deploy page Steps 1–3). The stem now states the validation requirement. The agentless action was removed, and a Dependabot security updates distractor was added.
- `questions/instrumentation/az400-5a-metric-types-yesno.yaml`: the custom property `TenantId` is renamed `StoreId` (EN + FR), so it can't be confused with the built-in AppRequests column. The answers don't change.
- `questions/instrumentation/az400-5a-workitem-template.yaml`: the reference title is now the page's title, "Work item integration with Application Insights". The content doesn't change. Learn shows no preview label for work item integration.

## Checked and left unchanged

- 4.2.x: kv-* (roles, purge protection, AzureKeyVault@2 YAML), cs3c-keyvault-group (latest values, Secrets User), fork-secrets and pipeline-settings (pipeline-level fork options match the github page), the OIDC questions, secure files and issecret. None contradicts the findings.
- 4.3.x: cs2b-dependabot s2 ("security updates only where dependabot.yml exists" = No) is still right. dependabot-statements, cs1a-dependabot-updates (grouped security updates), msdo-task (`break` default false), container-scan-points (CLI at build), registry-scan-facts, cs2b-defender-github, cs3a-defender-connector, ghas-ado-statements. Agentless appears only in the reference URLs of two questions (agentless *vulnerability assessment* of registries, a different feature).
- 5.1.x: monitor-alerts-check, slack-service-hook (audit stream only as a distractor), ado-build-fail-subscription (team subscription; no skip-initiator claim), arc-vminsights, vminsights-policy, insight-match, aks-monitoring-cli, appinsights-connection. No scale-set or preview-autoinstrumentation answer.
- 5.2.x: no question relies on the App Service tier or the OTel limits.
- Quizzes: none changed. 42 q7 already uses `idToken` and 43 q8 the version-updates rule, and both agree with the corrected chapters. 51 doesn't use audit streaming.

## For a human decision

- `MicrosoftDefenderCLI@2` `break: true` (43 code block): Learn shows only `break: false` and never explains the input. The CLI's `--defender-break` is documented (non-zero exit on critical issues). The code is kept; decide whether to align it with the Learn sample.
- Dependabot `groups.applies-to: security-updates` and the fixed limit of 10 open security update PRs: on docs.github.com only (the limit wasn't even confirmed there). The Learn training unit says the opposite for groups. The chapter now avoids "only", but doesn't teach `applies-to`. Quiz 43 q8 s2 relies on the PR-limit fact.
- Dependency graph default for public repositories: Learn says it's generated automatically, and the docs.github.com "About" page says it isn't enabled by default. Chapter follows Learn.
- Fork builds defaults in pipelines/repos/github are contradictory on Learn (disable vs securely build for new organizations). The chapter gives no default.
- key-vault-access gives Key Vault Secrets User in its steps, then Key Vault Contributor in a note. Chapter keeps Secrets User.
- Pre-existing docs.github.com references (checker warnings) in 5.1.3/5.1.4 questions: actions-metrics-role, actions-queue-time, gh-failure-issue, gh-notify-multi, project-chart-config, project-insights-yesno, traffic-access. Most have no Learn equivalent. They weren't changed: no Learn fact contradicts them. Decide whether docs.github.com is accepted for GitHub-only facts.
- Audit streaming remains in chapter 51 with a preview label (objective 5.1.1 doesn't name it). Decide whether to keep it at all.

## French terms not settled

- « services approuvés » (Key Vault trusted services; follows the guide's « approuver »), « zone géographique » (geography), « mode spécifique à la ressource » (resource-specific mode), « schéma d'alerte courant » (common alert schema), « liaison privée » (private link), « analyse du code sans agent » (agentless code scanning), « Gestion des vulnérabilités Microsoft Defender » (existing): not in the glossary.
- « générer de manière sécurisée » in 42 translates the "Securely build" option, whose name stays in English in bold.
- Existing, not changed: chapter 42 FR uses « étiquette » for Git tags (lines 97, 103). The glossary has « étiquette » for Azure tags and « balise » for image tags, nothing for Git tags.
- « cmdlet / applet de commande » is still `undecided`. It doesn't appear in these chapters.
