A DevOps team improves only what it measures. The exam expects you to pick the right metric for a question (planning, development, testing, security, delivery, operations), the tool that produces it (a dashboard widget, a work item query, Analytics, a pipeline report, a security overview, a KQL query) and the configuration that makes it correct. Read the definitions carefully: several questions turn on the start and end points of a duration.

<!-- section: dashboards | objectives: 1.2.1 -->
## Dashboards and flow metrics

An Azure DevOps **dashboard** belongs to a team or to the project and holds **widgets**. Adding a widget to a team dashboard requires being a member of the team; editing a dashboard requires being a team or project administrator or having dashboard permissions. Widgets show only data the signed-in user is allowed to see.

Flow metrics describe how work moves through the system:

| Metric | Definition | Where to see it |
| --- | --- | --- |
| Lead time | From creation of a work item until it reaches a Completed state | Lead Time widget |
| Cycle time | From the first time a work item enters an In Progress state to its Completed state | Cycle Time widget |
| Work in progress | Items started and not finished | Cumulative Flow Diagram, board WIP limits |
| Throughput | Items completed per period | Velocity widget, Burnup widget |
| Time to recovery | From the start of a production incident to the restoration of service | Incident work items or alert timestamps, in a query or a report |

The four DORA metrics measure delivery performance: **deployment frequency**, **lead time for changes** (from commit to production), **change failure rate** (share of deployments that cause a failure) and **time to restore service** (also called mean time to recovery, MTTR). The first two measure speed, the last two stability.

> **Exam trap.** Lead time starts when the item is **created**; cycle time starts when work **begins**. A stem that says "how long customers wait from the request to the delivery" asks for lead time; "how long the team takes once it starts" asks for cycle time.

The **Lead Time** and **Cycle Time** widgets share one configuration: team, work items (a backlog level or a work item type; choose a backlog level to filter on a swimlane), optional field criteria (for example `Release = Milestone 1`) and a time period, either a **rolling period** in days or a **start date**. Only work item types that are on a backlog can be selected. The chart plots each completed item, a moving average and a standard deviation band; items far above the band are the outliers worth investigating.

The **Cumulative Flow Diagram** shows the count of items in each board column over time: a widening band is a bottleneck, and the horizontal distance between the first and last band approximates cycle time.

Data sources behind the widgets:

| Source | Use it for | Limits |
| --- | --- | --- |
| Work item queries and query charts | Current lists, counts and simple charts | Charts only from flat-list queries returning 1,000 items or fewer |
| Analytics widgets | Trends: lead time, cycle time, velocity, burndown, cumulative flow, test trends | Need Azure Boards enabled for work tracking widgets |
| Analytics views and Power BI | Custom reports and joins with other data | Prefiltered datasets through the Power BI connector |
| OData queries on Analytics | Custom aggregations, any reporting tool | Latest supported version `v2.0`, preview `v4.0-preview` |

Analytics is enabled automatically for every Azure DevOps Services project and replaces the old SQL Server Reporting Services platform. It is a copy of the data, so it isn't a real-time store: changes can take up to about 30 seconds to appear.

<!-- section: planning-metrics | objectives: 1.2.2 -->
## Metrics and queries for project planning

| Question | Widget or report |
| --- | --- |
| How much work does the team deliver per sprint? | Velocity (Analytics, one team) |
| Will we finish the sprint? | Sprint Burndown |
| Will we finish the release across several teams? | Burndown or Burnup (several teams, work item types and periods) |
| Is the team over capacity? | Sprint Capacity |
| Where does work accumulate? | Cumulative Flow Diagram |
| How many active bugs, by severity? | Query Tile or Chart for Work Items on a shared query |

Velocity and burndown sum a numeric field (Story Points, Effort or Size depending on the process) or count items: estimate consistently or the trend means nothing.

**Work item queries** exist in three types:

| Type | Use |
| --- | --- |
| Flat list of work items | Bulk updates, triage, charts and dashboard tiles, Excel export |
| Work items and direct links | Dependencies, related items, items without a parent |
| Tree of work items | Parent-child hierarchies |

Queries saved under **My Queries** are private; **Shared Queries** are visible to all project members and need the Contribute permission on the folder. Macros make queries reusable: `@Me`, `@Today - 7`, `@StartOfMonth`, `@CurrentIteration`, `@Project`, `@TeamAreas`.

A query is stored as WIQL (Work Item Query Language):

```text
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM workitems
WHERE [System.TeamProject] = @project
    AND [System.WorkItemType] = 'Bug'
    AND [System.State] <> 'Closed'
    AND [Microsoft.VSTS.Common.Severity] = '1 - Critical'
ORDER BY [System.CreatedDate] DESC
```

`FROM workItemLinks` queries links instead of items, with a `MODE` (`MustContain`, `MayContain`, `DoesNotContain`, or `Recursive` for trees). `ASOF '2026-09-30'` runs the query against the data as it was on that date. A WIQL query can't exceed 32,000 characters, and the WIQL REST API returns only work item IDs.

For aggregations that queries can't do, query Analytics with OData, for example the average lead and cycle time of the user stories completed since October 1:

```text
https://analytics.dev.azure.com/fabrikam/Tailspin/_odata/v4.0-preview/WorkItems?$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate ge 2026-10-01T00:00:00Z&$apply=aggregate(LeadTimeDays with average as AvgLeadTime, CycleTimeDays with average as AvgCycleTime)
```

<!-- section: development-metrics | objectives: 1.2.3 -->
## Metrics and queries for development

Development metrics show how fast code moves from a branch to the default branch, and how healthy that path is:

| Metric | Source |
| --- | --- |
| Active pull requests and their age | Pull Request widget (Azure Repos), pull request list filters (GitHub) |
| Time to first review, time to merge | Pull request data in Analytics or the REST API; GitHub pull request timeline |
| Build success rate on pull requests | Pipeline pass rate report filtered on the pull request branches |
| Commit activity and contributors | Code Tile widget, Analytics version control data; GitHub repository Insights (Pulse, Contributors) |
| Work items without linked code | Query on work items with no Branch, Commit or Pull Request link |

Use these metrics to find waiting time (pull requests that wait days for a reviewer), not to rank developers: counting commits or lines per person rewards the wrong behaviour.

> **Exam tip.** When a stem asks to reduce the time pull requests wait, the answer is usually process, not reporting: automatic reviewers (`CODEOWNERS`, the **Automatically included reviewers** branch policy), smaller pull requests and required checks that run fast.

<!-- section: testing-metrics | objectives: 1.2.4 -->
## Metrics and queries for testing

**Test analytics** in Azure Pipelines works from the test results that the pipeline publishes. On the **Analytics** tab of a pipeline run, the **Test failures** report shows the pass rate trend, the distribution of outcomes and the top failing tests over a period (14 days by default), which you can group, for example by test file. On a dashboard:

| Widget | Shows |
| --- | --- |
| Test Results Trend | Results of one build or release pipeline |
| Test Results Trend (Advanced) | Near real-time trends of test count, pass rate and duration across several pipelines (Analytics) |
| Requirements Quality | Pass rate and failed tests per requirement, and requirements without tests |
| Chart for Test Plans | Authoring progress or execution results of a test plan or suite |

**Flaky tests** pass and fail without a code change. In Azure DevOps Services, turn on flaky test management in **Project settings > Test management**:

| Detection | How it works |
| --- | --- |
| System detection | A test that fails and then passes when rerun in the same pipeline run (VSTest task rerun, or rerun failed jobs) is marked flaky |
| Custom detection | Your own logic marks tests flaky or not through the REST API; the mark stays until you remove it |

You can then exclude flaky tests from the test summary: their results leave the pass percentage and appear under **Tests not reported**, so a flaky failure no longer fails the run. Testers can also mark or unmark a test as flaky manually; the change applies from the next run.

> **Exam trap.** Excluding flaky tests from the summary works with the **Visual Studio Test** and **Publish Test Results** tasks only. Other test runners need a custom script. Switching between system and custom detection erases the flakiness history.

Code coverage is the other testing metric the exam expects: publish it from the pipeline and enforce a minimum with a pull request check (see the testing chapter).

<!-- section: security-metrics | objectives: 1.2.5 -->
## Metrics and queries for security

Security metrics count open vulnerabilities by severity, the time to remediate them, the share of repositories covered by scanning and the secrets blocked before they reached a repository.

| Need | Tool |
| --- | --- |
| Alerts across all GitHub repositories of an organization | GitHub security overview (organization **Security** tab): Dependabot, code scanning and secret scanning alerts |
| Alerts and coverage across Azure Repos | **Organization settings > Security overview** with GitHub Advanced Security for Azure DevOps |
| One view across Azure DevOps, GitHub and GitLab, plus infrastructure as code findings | DevOps security in Microsoft Defender for Cloud |

The Azure DevOps **Security overview** has three tabs:

| Tab | Shows |
| --- | --- |
| Risk | Alerts by severity across projects and repositories with Advanced Security enabled, on the default branch of each repository; the time filter defaults to the past seven days |
| Coverage | Enablement of each feature for every repository (disabled and deleted repositories excluded) |
| Alerts | Individual code scanning, dependency scanning and secret scanning alerts, filtered by tool, severity, state, project and repository |

Risk and Coverage export to CSV; the Alerts tab exports the first 1,000 alerts that match the filters. Advanced Security for Azure DevOps is sold as two products, **GitHub Secret Protection for Azure DevOps** (push protection and secret scanning alerts) and **GitHub Code Security for Azure DevOps** (dependency alerts, CodeQL code scanning and third-party findings), billed on active committers and enabled per repository, project or organization.

**DevOps security in Defender for Cloud** gives security teams scan findings by severity and type (code, secrets, dependencies, infrastructure as code), DevOps posture recommendations, Advanced Security coverage and an inventory of connected repositories, with a customizable DevOps workbook. Pull request annotations are available for Azure DevOps repositories.

> **Exam trap.** The Azure DevOps security overview counts only alerts on the **default branch**, and coverage turns on only after a scan result has been submitted. A repository whose last scan ran on a feature branch shows no risk.

<!-- section: delivery-metrics | objectives: 1.2.6 -->
## Metrics and queries for delivery

Delivery metrics answer "how often, how fast and how safely do we release?":

| Metric | Azure Pipelines source | GitHub source |
| --- | --- | --- |
| Deployment frequency | Deployment history of an environment; Deployment Status widget | Deployment history of an environment |
| Pipeline success | **Pipeline pass rate** report: pass rate, failure trend per stage, top failing tasks | Workflow run history and status |
| Pipeline speed | **Pipeline duration** report: duration trend and the slowest tasks | Workflow run durations |
| Change failure rate | Failed or rolled-back deployments divided by all deployments | Same calculation from deployments and incidents |

The pipeline reports open from the **Analytics** tab of a pipeline, show the last 14 days by default and filter on branches. The **Build History** widget shows recent runs of one pipeline as a colour-coded histogram; **Release Pipeline Overview** shows a classic release pipeline's stages and status.

> **Exam trap.** The **Pipeline pass rate** report measures runs that succeed and points to the **tasks** that fail most; the **Test failures** report measures **tests**. A stem about "the step that breaks most builds" asks for the pipeline pass rate report.

<!-- section: operations-metrics | objectives: 1.2.7 -->
## Metrics and queries for operations

Operational metrics come from Azure Monitor and Application Insights: availability, request rate, failure rate, response time, dependency failures and resource saturation. Time to detect and time to recover are measured from alerts and incidents. Query them with KQL in a Log Analytics workspace:

```kusto
AppRequests
| where TimeGenerated > ago(24h)
| summarize Requests = count(), Failed = countif(Success == false), P95Ms = percentile(DurationMs, 95) by bin(TimeGenerated, 1h)
| extend FailureRate = round(100.0 * Failed / Requests, 2)
| order by TimeGenerated asc
```

| Audience | Dashboard |
| --- | --- |
| Development team: work, builds, tests | Azure DevOps dashboard |
| Operations: live telemetry and alerts | Azure Monitor workbooks, Azure dashboards, Azure Managed Grafana |
| Management: combined delivery and business data | Power BI with Analytics views or OData |

The instrumentation chapters detail telemetry collection, alerts and KQL; here, remember that an operations metric is only useful with a target (a service level objective) and an alert that fires when it is breached.

<!-- section: key-points -->
## Key points

- Lead time = creation to completion; cycle time = start of work to completion; both need Analytics and backlog work item types.
- DORA: deployment frequency, lead time for changes, change failure rate, time to restore service.
- Query charts need a flat-list query of 1,000 items or fewer; WIQL `ASOF` queries the past; OData on Analytics aggregates.
- Analytics is near real time (up to about 30 seconds), enabled by default in Azure DevOps Services.
- Flaky test exclusion works with the Visual Studio Test and Publish Test Results tasks.
- Security overview: Risk, Coverage, Alerts, default branch only; Defender for Cloud unifies Azure DevOps, GitHub and GitLab.
- Pipeline pass rate points to failing tasks; Test failures points to failing tests.
