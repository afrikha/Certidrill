Three tools answer three different questions: how could my environment be better (Azure Advisor), is Azure itself healthy for me (Azure Service Health), and what are my resources doing (Azure Monitor).

<!-- section: advisor | objectives: 3.4.1 -->
## Azure Advisor

**Azure Advisor** evaluates your resources and makes **personalized recommendations**, with the actions to take: immediately, later or never (dismiss). It is free, available from the portal and through an API, and it can notify you of new recommendations.

Its five categories:

| Category | Recommendations to |
| --- | --- |
| **Reliability** | Ensure and improve the continuity of business-critical applications |
| **Security** | Detect threats and vulnerabilities that might lead to breaches |
| **Performance** | Improve the speed of applications |
| **Operational excellence** | Improve process and workflow efficiency, resource manageability and deployment practices |
| **Cost** | Optimize and reduce overall Azure spending |

Examples: resize or shut down an underused virtual machine (cost), enable multifactor authentication (security), spread virtual machines across availability zones (reliability).

<!-- section: service-health | objectives: 3.4.2 -->
## Azure Service Health

**Azure Service Health** keeps you informed of the health of the Azure platform as it concerns you. It combines three services:

| Service | Scope | Use |
| --- | --- | --- |
| **Azure Status** | **All** Azure services in **all** regions, for everyone | A global picture of large outages, on a public status page |
| **Service Health** | Only the **services and regions you use** | Service issues in progress, **planned maintenance** to come, health advisories; you can set **alerts** to be notified |
| **Resource Health** | **Your individual resources**, such as one virtual machine | Whether a specific resource is available, and whether a problem comes from the platform |

Service Health also keeps a history of past events: the Health history pane shows them for 90 days, and the API keeps them for up to a year.

> **Exam trap.** "Is there an outage in the region where my virtual machines run?" is Service Health. "Is my virtual machine healthy?" is Resource Health. "What is the CPU usage of my virtual machine?" is Azure Monitor.

<!-- section: azure-monitor | objectives: 3.4.3 -->
## Azure Monitor

**Azure Monitor** is the platform for **collecting** data about your resources, **analyzing** it, **visualizing** it and **acting** on it. It monitors Azure resources, on-premises resources and resources in other clouds.

How it is organized:

- **Data sources**: applications, operating systems, Azure resources, subscriptions, the tenant.
- **Data stores**: **metrics** (numeric values over time) and **logs** (recorded events).
- **Uses**: dashboards and workbooks to visualize, queries to analyze, alerts and autoscale to respond.

Three components are named in the exam:

| Component | Role |
| --- | --- |
| **Azure Log Analytics** | The tool in the portal where you **write and run log queries** on the data collected by Azure Monitor. Simple mode filters, sorts and aggregates data by pointing and clicking; KQL mode gives the full Kusto Query Language for deeper analysis |
| **Azure Monitor alerts** | Automatically **notify** you when a threshold or a condition is met, on metrics (near real time) or on logs. An alert has a severity and uses **action groups** that say who is notified and what is done; it can also trigger a corrective action |
| **Application Insights** | Monitors your **web applications**, whether they run in Azure, on-premises or in another cloud. Enabled by automatic instrumentation on some platforms (no code change), or by adding a Microsoft OpenTelemetry distribution (Distro) to the application code; applications that use the older Application Insights SDKs can be migrated to OpenTelemetry |

What Application Insights watches: request rates, response times and failure rates; dependency rates and failures (calls to external services); page views and load performance; numbers of users and sessions; performance counters such as CPU and memory. It can also send synthetic requests periodically to check that the application answers, even when nobody uses it.

Choosing between the three tools:

| Need | Tool |
| --- | --- |
| "Recommendations to reduce costs and improve security" | Azure Advisor |
| "Be warned of planned Azure maintenance that affects my resources" | Azure Service Health |
| "Receive an email when the CPU of a virtual machine exceeds 80 %" | Azure Monitor alerts |
| "Query the logs collected from my resources" | Azure Log Analytics |
| "Find out why my web application is slow" | Application Insights |

<!-- section: key-points -->
## Key points

- Advisor: personalized recommendations in five categories (reliability, security, performance, operational excellence, cost).
- Azure Status: global view. Service Health: the services and regions you use, with planned maintenance and alerts. Resource Health: your individual resources.
- Azure Monitor: collect, analyze, visualize, act; metrics and logs; Azure, on-premises and multicloud.
- Log Analytics: log queries. Alerts: notifications and action groups. Application Insights: performance and usage of web applications.
