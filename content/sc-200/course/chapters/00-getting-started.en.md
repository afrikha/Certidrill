SC-200 is the exam of the security operations analyst: someone who works every day in the Microsoft Defender portal and in Microsoft Sentinel, configures the SOC tooling, responds to incidents and hunts with KQL. Questions are about doing: which setting, which role, which connector, which table, which rule type, which response action, which KQL operator. This chapter covers the format, a method for reading the questions, the pairs of features the exam expects you to tell apart and a study plan.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Security Operations Analyst Associate |
| Duration | 100 minutes of exam time |
| Questions | Not published; about 40 to 60 on most Microsoft exams |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |
| Study guide | Skills measured as of October 21, 2026 |

The three domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Manage a security operations environment | 40 to 45 % |
| Respond to security incidents | 35 to 40 % |
| Perform threat hunting | 20 to 25 % |

The first domain is the largest: notifications and Defender for Endpoint settings, automated response, Sentinel roles and retention, data connectors and detection rules. The October 2026 guide adds recent features: the Microsoft Sentinel data lake and its KQL jobs, Sentinel Graph and hunting graphs, the Sentinel MCP Server, case management and agentic investigation with Security Copilot. The course gives them as Microsoft Learn documents them in November 2026.

Question formats, roughly from the most to the least frequent: one answer among four, drop-down lists that complete a KQL query or a sentence, "select two", Yes/No statements, drag and drop (matching), ordering of steps, and occasionally a hot area. Questions made of several elements give one point per correct element. Two sections have their own rules:

- **Case study.** A company described in tabs (overview, existing environment, requirements) followed by four to six questions. Once you leave it, you can't come back.
- **Problem-solution series.** The same goal is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final, and several solutions can be right, or none.

> **Exam tip.** Microsoft Learn is available, but searching costs time. Use it to confirm a table column or a setting name, never to learn a topic during the exam. KQL drop-downs are faster to answer from practice than from the documentation.

<!-- section: reading-questions -->
## Reading a SOC question

A typical stem describes a tenant ("You have a Microsoft 365 E5 subscription that uses Microsoft Defender XDR and a Microsoft Sentinel workspace named LAW1"), names device groups, users or tables, states a requirement and one constraint, then asks "What should you configure?", "Which table should you query?" or "Which operator should you use?". Work in this order:

1. Read the last sentence: are you asked for a setting, a role, a rule type, a table or an operator?
2. Find the product the scenario happens in: Defender portal settings, Defender for Endpoint, Sentinel analytics, Logic Apps.
3. Underline the constraint. It eliminates the plausible distractors.

| Words in the stem | What they usually select |
| --- | --- |
| "minimize administrative effort" | The built-in feature: an automation rule rather than a playbook, a content hub solution, a built-in tuning rule, full automation on a device group |
| "least privilege" | The narrowest Sentinel role (Reader, Responder, Playbook Operator) or a custom Defender XDR role scoped to device groups |
| "without code" | Automation rule, alert tuning, notification rule |
| "call an external system", "post to Teams", "open a ticket" | Playbook (Azure Logic Apps) |
| "as soon as possible", "within a minute" | Near-real-time (NRT) rule, or a custom detection with continuous frequency |
| "query occasionally", "keep for years at the lowest cost" | Data lake tier, long total retention, KQL job or search job |
| "only devices of group X" | Device group scope: notification rules, indicators, automation levels, RBAC |
| "contain a compromised user or device automatically" | Automatic attack disruption, or automated investigation with full automation |

In a KQL drop-down, the rest of the query is the clue: the table name tells you the columns that exist, a `summarize` before the blank tells you the next operator works on aggregated rows, and a `join` needs the same key on both sides.

```kusto
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName =~ "powershell.exe" and ProcessCommandLine has "-enc"
| summarize Executions = count() by DeviceName, AccountName
| where Executions > 5
| order by Executions desc
```

> **Exam trap.** Defender XDR advanced hunting tables are filtered on `Timestamp`; Microsoft Sentinel and Log Analytics tables such as `SecurityEvent`, `SigninLogs` or `Syslog` are filtered on `TimeGenerated`. A query that filters a Sentinel table on `Timestamp` is a classic wrong option.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Sentinel automation rule | Playbook | Central rule without code that triages incidents and alerts and can run a playbook; Logic Apps workflow for multi-step actions and external systems |
| Scheduled analytics rule | NRT rule / custom detection rule | Sentinel rule that runs at an interval over a lookback period; Sentinel rule that runs every minute; Defender XDR rule built from an advanced hunting query, with response actions on devices, files or users |
| Alert tuning | Automation rule that closes incidents | Defender XDR rule that hides or resolves matching alerts at creation; Sentinel rule that changes incidents after they exist |
| Automated investigation and response | Automatic attack disruption | Investigates an alert and proposes or applies remediation according to the automation level; contains users and devices of an attack in progress with high-confidence signals |
| Device group automation levels | Advanced features | Remediation approval per device group; tenant-wide switches such as live response or EDR in block mode |
| Live response | Collect investigation package | Interactive remote shell on a device; one-shot ZIP of forensic data |
| Analytics tier | Data lake tier | Fast queries, analytics rules and workbooks, up to two years; low-cost storage up to twelve years, queried by KQL jobs and notebooks |
| Defender XDR retention | Sentinel retention | 30 days of advanced hunting data in Defender XDR; longer retention when the tables are stored in the Sentinel workspace |
| Windows Security Events via AMA | Windows Event Forwarding | Data collection rule on each machine with the Azure Monitor Agent; events collected on a central collector, then sent by its agent |
| Syslog via AMA | CEF via AMA | Plain Syslog messages into `Syslog`; CEF-formatted messages from appliances into `CommonSecurityLog` |
| Sentinel roles | Playbook permissions | Reader, Responder, Contributor act on Sentinel content; Logic App Contributor and Microsoft Sentinel Automation Contributor govern who edits and who runs playbooks |

<!-- section: scope -->
## What the exam doesn't test

The study guide leaves out deploying and licensing the Defender products, designing Microsoft Purview or identity policies, and the legacy Log Analytics agent. When a question mentions a Defender product, it is about what an analyst configures or does in it, not about onboarding devices or buying plans. Data collection always uses the Azure Monitor Agent and data collection rules.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order. Settings and automation come first because every incident question assumes you know the automation level, the role and the rule that produced the alert.
2. Get a Microsoft 365 E5 trial tenant and an Azure subscription. Connect a Sentinel workspace to the Defender portal, install a content hub solution, create an automation rule, a scheduled rule and a custom detection: most drop-downs become easy once you have seen the screens.
3. Write KQL every day. Run the queries of the course in advanced hunting until `where`, `summarize`, `join`, `extend`, `project`, `let`, `union`, `mv-expand`, `bin`, `ago` and `arg_max` are automatic.
4. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
