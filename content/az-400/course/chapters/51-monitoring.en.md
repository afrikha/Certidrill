Monitoring closes the DevOps loop: telemetry from applications and infrastructure feeds back into pipelines, boards and repositories. The exam asks which insight collects which telemetry and what it needs, how Azure Monitor connects to Azure DevOps and GitHub, how to configure GitHub insights and charts, and how to be alerted when a workflow or pipeline fails.

<!-- section: azure-monitor-devops | objectives: 5.1.1 -->
## Azure Monitor and Azure Monitor Logs with DevOps tools

Azure Monitor stores **metrics** (platform metrics, collected free; Prometheus and OpenTelemetry metrics in an **Azure Monitor workspace**) and **logs** in a **Log Analytics workspace**, queried with KQL. Resource logs reach a workspace through **diagnostic settings**; guest data from machines through the Azure Monitor Agent and **data collection rules (DCRs)**. Alert rules (metric, log search, activity log) call **action groups**: email, SMS, push, voice, webhook, Azure Function, Logic App, Automation runbook, Event Hubs, ITSM.

| Integration | How |
| --- | --- |
| Stop a deployment while the application is unhealthy | Check **Query Azure Monitor alerts** on the environment or service connection: passes only if no alert rule is active at evaluation, re-evaluated at an interval until a timeout |
| Create a work item or issue when production alerts | Action group with a Logic App or Function that calls the Azure Boards or GitHub REST API |
| Start a remediation workflow from an alert | Action group with a Logic App or Function that calls the GitHub `repository_dispatch` API or the Azure DevOps pipeline runs API (a webhook action only posts the alert payload, with credentials in the URI at most) |
| Keep the Azure activity log of pipeline deployments beyond 90 days and query it | Diagnostic setting that sends the activity log to a Log Analytics workspace (table `AzureActivity`) |
| Keep the Azure DevOps audit log beyond 90 days and query it | **Audit streaming** to Azure Monitor Logs (also Splunk, Event Grid); auditing is in public preview |
| Analyze GitHub Enterprise audit events in Azure | Enterprise audit log streaming to Azure Event Hubs or Azure Blob Storage |
| Version monitoring with the application | Alert rules, action groups, DCRs and workbooks in Bicep, deployed by the pipeline |

**Audit streaming** (Azure DevOps auditing is still in public preview) needs an organization backed by Microsoft Entra ID, auditing turned on (off by default), and Project Collection Administrators membership or **Manage audit streams** plus **View audit log**. For Azure Monitor Logs, enter the workspace resource ID and tenant ID and sign in to Azure with an identity that can access the workspace. The workspace keeps the data 30 days by default: extend its retention for longer. Events arrive in the table `AzureDevOpsAuditing`, in batches every half hour or less; a disabled stream catches up on at most the previous seven days. Two streams are allowed per target type.

```kusto
AzureDevOpsAuditing
| where TimeGenerated > ago(7d)
| where OperationName has "Policy"
| summarize Changes = count() by ActorUPN, OperationName
| order by Changes desc
```

> **Exam trap.** Azure DevOps keeps at most 90 days of audit data (auditing is in public preview). "Keep audit events for two years and correlate them with Azure activity" requires a stream to a Log Analytics workspace (with longer retention), not an export from the portal.

<!-- section: telemetry-collection | objectives: 5.1.2 -->
## Collecting telemetry with the Azure Monitor insights

| Insight | Monitors | Collection | Data goes to |
| --- | --- | --- | --- |
| Application Insights | Requests, dependencies, exceptions, traces, page views, availability | Autoinstrumentation on supported platforms (App Service, Functions, AKS...), or the OpenTelemetry distro in code | Workspace-based resource backed by a Log Analytics workspace |
| VM insights | Guest performance (CPU, memory, disk, network) of VMs, scale sets, Arc-enabled servers | Azure Monitor Agent + DCR (Arc-enabled servers need the Connected Machine agent first) | OpenTelemetry metrics to an Azure Monitor workspace (recommended for new deployments; individual VMs and Arc-enabled servers only) or logs-based metrics to Log Analytics (also scale sets) |
| Container insights | AKS nodes, pods, containers, container logs | Monitoring add-on (containerized Azure Monitor Agent: `ama-logs`, `ama-metrics`) | Logs to Log Analytics (`ContainerLogV2`, `KubePodInventory`), Prometheus metrics to an Azure Monitor workspace |
| Storage insights | Capacity, availability, transactions, latency of storage accounts | Platform metrics, nothing to install | Metrics; resource logs need a diagnostic setting |
| Network insights | Topology, health and connectivity of network resources | Platform metrics, Network Watcher, flow logs | Metrics, Log Analytics for traffic analytics |

**Application Insights.** Create a workspace-based resource and give the application its **connection string** (`APPLICATIONINSIGHTS_CONNECTION_STRING`); the connection string replaces the instrumentation key. For code-based instrumentation Microsoft recommends the OpenTelemetry distro (Microsoft OpenTelemetry Distro for .NET, Node.js and Python; Azure Monitor OpenTelemetry Distro for Java). Autoinstrumentation of Windows containers on App Service and of .NET and Python on AKS is in public preview, and container autoinstrumentation supports single-container apps only. Features: Live metrics, Application map, availability tests, Failures and Performance views, transaction search, and usage analysis (users, sessions, events, funnels, flows, cohorts).

```bicep
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: 'law-contoso-prod'
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-contoso-web'
  location: resourceGroup().location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
  }
}

output connectionString string = appi.properties.ConnectionString
```

**VM insights.** Three steps: install the Azure Monitor Agent once, create DCRs, associate them with the machines. The portal does all three when you enable monitoring; at scale use Azure Policy, CLI or Bicep.

```bash
az vm extension set --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor --vm-name vm-web1 --resource-group rg-web
az monitor data-collection rule association create --name dcr-vminsights \
  --rule-id "<dcr resource ID>" --resource "<vm resource ID>"
```

**Container insights.** Logs and Prometheus metrics are enabled separately:

```bash
az aks enable-addons --addon monitoring --name aks-contoso \
  --resource-group rg-aks --workspace-resource-id "<workspace resource ID>"
az aks update --enable-azure-monitor-metrics --name aks-contoso \
  --resource-group rg-aks
```

Control plane logs (`kube-audit`, `kube-audit-admin`, `kube-apiserver`) need a diagnostic setting on the cluster. To cut cost, prefer `kube-audit-admin` (it excludes get and list events) to `kube-audit`, and resource-specific mode (tables `AKSAudit`, `AKSAuditAdmin`, `AKSControlPlane`) to the `AzureDiagnostics` table. Azure Managed Grafana links to the Azure Monitor workspace for Prometheus dashboards.

| Requirement | Answer |
| --- | --- |
| Find which dependency slows a web request | Application Insights (Application map, Performance) |
| Memory of 200 VMs, including new ones | VM insights enabled through Azure Policy |
| Pod restarts and container stdout on AKS | Container insights (monitoring add-on) |
| Prometheus metrics with Grafana dashboards | Managed Prometheus + Azure Managed Grafana |
| Storage account latency without installing anything | Storage insights |

> **Exam trap.** The Log Analytics agent (MMA) is retired; VM insights and Container insights use the Azure Monitor Agent with data collection rules. Host metrics of a VM need nothing, guest memory needs the agent.

<!-- section: github-insights | objectives: 5.1.3 -->
## Monitoring in GitHub: insights and charts

| Where | What | Who |
| --- | --- | --- |
| Repository **Insights** tab | Pulse, Contributors, Community, Traffic, Commits, Code frequency, Dependency graph, Network, Forks | Repository readers; Traffic needs push access |
| Organization **Insights** | **Actions Usage Metrics** (minutes by workflow, job, repository, OS, runner type) and **Actions Performance Metrics** (average run time, queue time, failure rate) | Organization owners, or a custom organization role with **View organization Actions metrics** |
| Project **Insights** | Charts built from the items of a GitHub Project | Anyone who can view the project |

**Insights for Projects.** Open **Insights** at the top right of the project. **Current charts** show the present state (items per assignee, per iteration, per status); **historical charts** track the state of items over time (X-axis set to Time; the default chart is a burn up). To configure a chart, select it and choose **Configure**:

- **Layout**: the chart type (bar, column, line and stacked variants).
- **X-axis**: the field on the horizontal axis (Assignees, Status, Iteration, a custom field, or Time).
- **Group by** (current charts only): split each bar by a second field.
- **Y-axis**: item count by default, or the sum, average, minimum or maximum of a number field such as Estimate.
- **Filter**: the same filter syntax as project views, for example `label:bug iteration:@current`.

Then **Save changes**. Archived and deleted items aren't tracked.

| Requirement | Answer |
| --- | --- |
| Story points remaining per sprint | Project chart, X-axis Iteration, Y-axis sum of Estimate |
| Open versus completed issues over the quarter | Historical chart (X-axis Time) |
| Which workflows consume the most minutes | Organization Insights > Actions Usage Metrics |
| Which jobs wait longest for a runner | Actions Performance Metrics (queue time) |
| Clones and visitors of a public repository | Repository Insights > Traffic |

> **Exam tip.** Queue time and failure rate are performance metrics; minutes are usage metrics. Grant a release manager **View organization Actions metrics** through a custom organization role rather than making them an owner.

<!-- section: pipeline-alerts | objectives: 5.1.4 -->
## Alerts for events in GitHub Actions and Azure Pipelines

**GitHub Actions.**

- Personal notifications: **Settings > Notifications > Actions**, web or email, optionally **only for failed workflows**; you're notified for runs you triggered.
- Chat: the GitHub app for Microsoft Teams or Slack subscribes a channel to workflow run notifications of a repository.
- In the workflow: a job with `if: failure()` that opens an issue or calls a webhook; webhooks or GitHub Apps can subscribe to the `workflow_run` and `workflow_job` events.

```yaml
notify:
  needs: deploy
  if: failure()
  runs-on: ubuntu-latest
  permissions:
    issues: write
  steps:
    - run: gh issue create --repo "$GITHUB_REPOSITORY" --title "Deployment failed" --body "$RUN_URL"
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

**Azure Pipelines.**

- **Notifications**: **Project settings > Notifications > New subscription**, category Build or Release, template such as **Build completes** with a filter on the status, delivered to a team, a team role, or a custom email address. Users manage personal subscriptions in **User settings > Notifications**. Project Administrators manage project subscriptions, team administrators team subscriptions, and Project Collection Administrators the global settings, including enabling or disabling the default subscriptions of the organization. Azure DevOps has no notification sent to every user of the organization.
- **Service hooks**: **Project settings > Service hooks** sends events (build completed, run state changed, release deployment completed, approval pending) to Slack, Microsoft Teams, webhooks, Azure Service Bus, Azure Storage queues and others.
- The Azure Pipelines app for Microsoft Teams or Slack subscribes a channel to a pipeline.
- In the pipeline: a job or step with `condition: failed()`.

```yaml
- job: Notify
  dependsOn: Deploy
  condition: failed()
  steps:
    - bash: |
        curl -sS -H "Content-Type: application/json" \
          -d "{\"text\":\"Deployment $(Build.BuildNumber) failed\"}" "$WEBHOOK_URL"
      env:
        WEBHOOK_URL: $(ChatWebhookUrl)
```

| Requirement | Answer |
| --- | --- |
| Email the team only when the main-branch build fails | Azure DevOps notification subscription, Build completes, filter status Failed and branch |
| Post every deployment of a pipeline to a Teams channel | Azure Pipelines app or a service hook |
| A developer wants to know when their own workflow fails | GitHub notification settings, failed workflows only |
| Open an issue automatically when production deployment fails | Job with `if: failure()` and `issues: write` |
| Alert when the application degrades after deployment | Azure Monitor alert rule with an action group, and the Query Azure Monitor alerts check |

> **Exam trap.** Notification subscriptions in Azure DevOps send email; to reach a chat tool or an external system, use a service hook or the chat app. And with the **Members of team by role** delivery option, **Skip initiator** is on by default: the person who started the activity isn't notified.

<!-- section: key-points -->
## Key points

- Logs in Log Analytics, Prometheus and OpenTelemetry metrics in an Azure Monitor workspace; diagnostic settings for resource logs, Azure Monitor Agent with DCRs for guests.
- DevOps integrations: Query Azure Monitor alerts check, action groups calling Logic Apps or webhooks, activity log diagnostic settings, audit streaming (preview) to `AzureDevOpsAuditing`.
- Application Insights: workspace-based, connection string, OpenTelemetry distro. VM insights: agent + DCR. Container insights: monitoring add-on plus managed Prometheus.
- GitHub: repository Insights, organization Actions usage and performance metrics, Projects current and historical charts configured with Layout, X-axis, Group by and Y-axis.
- Alerts: GitHub notification settings, chat apps and `if: failure()`; Azure DevOps subscriptions, service hooks and `condition: failed()`.
