# QZ-az-400-51-monitoring — notes

`content/az-400/quizzes/51-monitoring.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 5.1.1 (q1, q6), 5.1.2 (q3, q5, q7, q10), 5.1.3 (q2), 5.1.4 (q4, q8, q9). Positions 6–10: single ×2, yesno_statements, dragdrop, multi.

## Chapter (and mock questions) vs current Learn — fix in the chapter, not done here

- **Azure DevOps audit streaming is preview.** "Create audit streaming" (fetched Nov 2026) says "Auditing is still in public preview." The chapter presents audit streaming without this caveat, and mock questions use it as the correct answer: `az400-5a-audit-stream-order`, `az400-5a-audit-kql`, `az400-5a-devops-integrations` (target `retain`). The quiz doesn't use audit streaming at all. Same page: the Azure Monitor Logs default retention is 30 days, and the identity that signs in must be able to reach the workspace through Azure Resource Manager.
- **"There are no organization-wide subscriptions" is wrong.** About Notifications lists **Global notifications** ("apply to all projects defined for an organization or collection"), managed by Project Collection Administrators. Default global subscriptions are managed in Organization settings.
- **Skip initiator** is described too broadly. Manage Notifications says the option (checked by default) belongs to the **Members of <team> by role** delivery option. The chapter says a team subscription never notifies the person who queued the run.
- **"Action group webhook calling GitHub `repository_dispatch` or the Azure DevOps pipeline runs API"** (5.1.1 table) is doubtful. The action groups page says a webhook action sends the alert payload. Basic authentication only works with the credentials in the URI, and you can't pass certificates. Both APIs need an authorization header and a specific body, so this normally needs a Logic App or a Function. The quiz (q6) uses Logic App + Azure DevOps connector ("Create a work item", not preview) instead.
- **VM insights and scale sets.** "Metrics experience for virtual machines" and "Monitor virtual machines in Azure" say the OpenTelemetry metrics experience supports only individual Azure VMs and Arc-enabled servers. VM Scale Sets must use the logs-based experience. The OpenTelemetry experience also doesn't support private link, and a single query can't span a Log Analytics workspace and an Azure Monitor workspace. The chapter row lists scale sets without this caveat.
- **Autoinstrumentation**: the support table marks the Windows container rows and AKS (.NET, Python) as **public preview**. Container rows support single-container apps only. The chapter says only "on supported platforms".
- **AKS resource logs**: "Monitor AKS" recommends `kube-audit-admin` (it excludes get/list) and resource-specific mode (`AKSAudit`, `AKSAuditAdmin`, `AKSControlPlane`) to reduce cost. The chapter mentions only `kube-audit` and `kube-apiserver`.
- **GitHub Projects historical charts**: the Learn training unit says they're available with GitHub Team and GitHub Enterprise Cloud for organizations. The docs.github.com page no longer states a plan, so I left this out of the quiz. q2 states Enterprise Cloud.

## Unverified or judgment calls

- q6 option a: I inferred that a webhook action can't build the body the work items REST API expects from the page (fixed alert payload, URI-only basic auth). The page doesn't say this in so many words.
- q9: Learn says the service hook permissions are **Edit subscriptions** and **View subscriptions** (only project administrators have them by default). I didn't fetch the page that shows where to grant them (security namespace / CLI). The option names only the permissions.
- q3: the App Service Linux / Node.js / publish-as-code autoinstrumentation row has no preview footnote, but the page doesn't say "GA" explicitly.
- GitHub Actions alerts (notification settings, `if: failure()`, `workflow_run`) aren't tested. I found no Learn page that covers them, and docs.github.com references raise a checker warning. 5.1.4 is tested on Azure DevOps only. The mock bank already has the GitHub side.

## Design notes

- Decisions the mock bank doesn't test: an action group as the alert's action container, a historical vs current project chart, App Service autoinstrumentation with no code change, the delivery and opt-out of notification subscriptions, a storage resource-log diagnostic setting vs Storage insights, an alert → Azure Boards bug with no code, the scope of what the Container insights add-on collects, a four-mechanism alert matching, least privilege for service hooks, and the OpenTelemetry VM insights experience for Arc servers.
