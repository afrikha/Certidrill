# FIX-sc-200-2 — chapters 22, 23, 24, 31 and 32 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-200 22-xdr-incidents 23-endpoint-response 24-m365-activities 31-xdr-hunting 32-sentinel-hunting` 0 problems; `content:validate --cert sc-200` 0 problems, 0 warnings; `check-quiz sc-200` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. One code block changed, in 23 (identical in both languages). The WebFetch budget, which all agents share, ran out several times. Each fetch was retried after a wait. No finding was left unverified because of the budget.

## 22-xdr-incidents

| Finding | Learn | Change |
| --- | --- | --- |
| Blast radius restricted | Confirmed (investigate-incidents, "(Legacy)"): available to customers who onboarded to the data lake **before September 23, 2026**. Also needs Exposure management (read). 8 paths, up to 7 hops (5/5/3) | Blast radius paragraph and key points |
| "Group similar nodes" | Not on the page. Its filters are severity, status and service sources, plus **Entity types** | Table row replaced |
| Assets tab "ordered by risk", "cloud resources" | Page: Devices, Users, Mailboxes, Apps, with a count per category. No risk ordering (that ordering is on the Summary's Scope) | Assets row |
| Similar incidents is preview | Confirmed (move-to-defender) | Azure portal table row: "preview" |
| Incident page now "(legacy)"; owner is a user or group; assigning an incident assigns its alerts | Confirmed (manage-incidents, investigate-incidents) | New paragraph after the investigation steps |
| Copilot in advanced hunting | The page has a prerelease notice. It describes the Threat Hunting Assistant: **Rich insights** (default) and **Query only** modes | "Generate KQL queries" row |
| Defender Chat preview, incident cases preview | Confirmed (security-copilot-in-microsoft-365-defender, manage-incident-cases) | Chapter already says so. Bank questions rewritten (below) |
| Cases: link indicators, comment attachments, delete case are preview | Confirmed (cases-overview) | Chapter already labels the first two. Bank fixed (below) |
| FR | "Defender for Endpoint" in FR prose | « Defender pour point de terminaison » |

## 23-endpoint-response

| Finding | Learn | Change |
| --- | --- | --- |
| `isolate`/`release` macOS only | Confirmed (live-response): isolate/release macOS only. scan/collect run on macOS and Linux | Command table |
| `putfile` limits | Confirmed: 300 MB on Windows, 10 MB on other platforms | Limits table |
| Library upload | Confirmed: console upload needs Manage security settings. The Library management page doesn't | Prerequisite bullet |
| Isolation lifted after 7 days; retried for 3 days when offline | Confirmed (respond-machine-alerts) | New bullet |
| Linux `iptables` rule removes isolation | Confirmed (respond-machine-alerts: "removed from isolation when an administrator modifies or adds a new iptable rule") | None |
| Activities tab tracking and Policy status are preview | Confirmed (autoad-results; automatic-attack-disruption) | Remediation step 2 and key points: "(preview)" |
| `DisruptionAndResponseEvents` columns | **Learn is inconsistent.** The table's schema page has no `AccountUpn`, `AttackDisruptionCategory`, `RemoteIP` or `IncidentId` columns. autoad-results queries use them. Schema page (most specific) followed. The table is "(Preview)" on the data tables page | The query projects `DeviceName, SourceUserName, SourceIpAddress, PolicyName`. The sentence says the table is preview and holds block and policy-application events and automatic actions. Flag below |
| New disruption actions | Confirmed (automatic-attack-disruption): Safeboot hardening, GPO hardening and proactive user containment (predictive shielding). Okta and AWS are preview | One table row, one sentence |
| Contain user duration | Confirmed (respond-machine-alerts): removed from containment within five days. Undo needs Global Administrator | Contain user sentence |
| Timeline 90-day retention | Not an error in the chapter | None |

## 24-m365-activities

| Finding | Learn | Change |
| --- | --- | --- |
| "Consent to application." | Not on "Audit log activities" (whole page read: Application, Directory, Role and User administration tables). The page does list `Add delegation entry.` and `Add member to role.` | Replaced with `Add delegation entry.` |
| Review set KQL queries preview | Confirmed ("Learn about eDiscovery") | "(preview)" in the eDiscovery table |
| Content Search case default access | Confirmed: "all members of the eDiscovery manager and Administrator role groups" | Wording follows Learn |
| Audit (Premium) 1-year default only for E5 users | Confirmed (audit-log-retention-policies): E5, or the Purview Suite or E5 eDiscovery and Audit add-on. Non-E5 and guest users get 180 days. audit-solutions-overview doesn't say so | Retention row |
| Purge on mailboxes on hold | Confirmed (ediscovery-search-for-and-delete-email-messages): only 10 items are removed from view, not permanently deleted. Items are kept until the hold expires or is removed | "Mailboxes on hold" row |
| Graph purge "Premium cases" | The purgeData page gives 100 items per location (mailboxes, Teams messages) and doesn't require a Premium case | Row label: "Microsoft Graph `purgeData`, mailboxes and Teams messages" |
| KeyQL pages now for 21Vianet only | The chapter and course.yaml link to none of them. The 2.3.2 bank questions cite the `edisc-*` pages | None |

## 31-xdr-hunting

| Finding | Learn | Change |
| --- | --- | --- |
| `DisruptionAndResponseEvents` preview | Confirmed (advanced-hunting-schema-tables) | Table row "(preview)" |
| `EntraIdSignInEvents` | The data tables page shows no preview label | None (`sc200-3a-tbl-entra-noninteractive` left) |
| Advanced hunting date range | Confirmed (advanced-hunting-overview): 30 days, or up to 90 days of supported data with an eligible ISOC license | Rules bullet, quotas table, key points |
| Take actions and guided mode on Sentinel data | Confirmed (advanced-hunting-microsoft-defender): Defender XDR data only. Bookmarks aren't supported in advanced hunting | New bullet in advanced-hunting |
| Hunting graph prerequisite | Confirmed (advanced-hunting-graph): "customers who have onboarded to Sentinel data lake, before September 23rd, 2026 are eligible" (wording is ambiguous, see below) | Prerequisites, blast radius paragraph, key points |
| MCP graph tools preview | Confirmed (sentinel-mcp-data-exploration-tool: "Graph tools (preview)" section) | "which are in preview" |
| Custom graphs preview | Confirmed (sentinel-graph-overview). The Sentinel graph itself and graph jobs have no preview label | Chapter already says so. Bank flagged for a human decision (below) |
| Timestamp vs TimeGenerated | Learn: rely on `Timestamp` for streamed Defender tables. Nothing says Sentinel tables must use `TimeGenerated` | None (not contradicted) |
| Blast radius seven hops | Confirmed (investigate-incidents) | None |

## 32-sentinel-hunting

| Finding | Learn | Change |
| --- | --- | --- |
| Bookmarks: create in the Azure portal only; incident actions in the Azure portal only | Confirmed (bookmarks). The Defender portal shows existing bookmarks only | Bookmarks and Incident actions rows, exam trap (use Link to incident in the Defender portal), key points |
| Notebook session timeout | **Learn is inconsistent** (notebooks): session timeout setting 30 min by default, configurable. The limits table gives a 20-minute inactivity timeout. Session start is 3-5 or 5-6 min | Both stated. Session start: "3 to 6 minutes" |
| Notebook jobs in the Defender portal | **Learn is inconsistent.** notebook-jobs (most specific, followed): enable/disable the schedule, view history, no edit. kql-manage-jobs says "view-only" | Sentence rewritten |
| Disabling or deleting a KQL job | Confirmed (kql-manage-jobs): runs in progress or queued continue | One sentence |
| Submitted notebook job not linked to the local notebook | Confirmed (notebook-jobs): download, edit, Edit job, Submit. A new name creates a new job definition | Same sentence as above |
| Summary rules | Confirmed (azure-monitor summary-rules): `isActive: false` after eight consecutive bin retries; data only from the recent past, up to 24 hours. Auxiliary source restrictions aren't documented | Failures row, exam trap |
| Hunts preview | Confirmed (hunts: "Hunts (Preview)" tab) | Chapter already says so. Bank fixed (below) |
| "Job disabled when its source workspace is deleted" | Not on kql-manage-jobs | Left unchanged (not verified) |

## Mock-exam bank questions changed

- `sc200-2b-cop-defender-chat` (2.1.8): rewritten. The answer was Defender Chat (preview). The question now asks for the **Identity summary** (security-copilot-defender-identity-summary). Same id, type, objective and difficulty.
- `sc200-2c-case-incident-resolve` (2.1.10): rewritten. The answer was incident cases (preview). It now asks what happens when an incident linked to a case is assigned to a group from the legacy incident page: the group owns the incident and its alerts, and the case stays assigned to its single user (manage-incidents, cases-overview).
- `sc200-2c-case-indicators` (2.1.10): rewritten. The answer was linking indicators (preview). It now asks for the least-privilege Sentinel role that lets an auditor view a case and its audits: Microsoft Sentinel Reader.
- `sc200-2c-case-limits` (2.1.10): correct option b was "10 files per comment" (attachments to comments are preview). It is now "100,000 cases per tenant". Distractor d is now "closed cases deleted after 90 days" (cases aren't purged). The explanation was updated.
- `sc200-2c-entity-evidence-tab` (2.2.3): the Assets explanation no longer lists cloud resources.
- `sc200-2c-disruption-policy-status` (2.2.4): rewritten. The answer was the Policy status column (preview). It now asks how to release a contained device and undo Contain user: Release from containment, then Undo in the Action center, which needs Global Administrator.
- `sc200-2c-disruption-kql-actions` (2.2.4): rewritten. It filtered `DisruptionAndResponseEvents` on `IncidentId`: that column is not in the schema, and the table is preview. It is now the Learn query for accounts disabled by disruption: port 88, `IdentityDirectoryEvents`, `"Account disabled"`, `in`.
- `sc200-2c-disruption-release-order` (2.2.4): the preview step (Activities tab, Policy status) was removed. Now 3 of 7 actions, with a new distractor (add an exclusion).
- `sc200-3b-blast-prereqs` (3.1.5): option a and the explanation now say "onboarded before September 23, 2026". The reference title now reads "(Legacy)".
- `sc200-3b-blast-full-list`, `sc200-3b-blast-facts`, `sc200-3b-blast-next-hop`, `sc200-3b-hgraph-vs-blast`, `sc200-3b-hgraph-no-incident` (3.1.5), `sc200-2b-cx-blast-radius-permission` (2.1.9): stems now say "onboarded to the data lake in June 2026", so blast radius or the hunting graph is surely available. The explanation of the 2.1.9 question was updated too.
- `sc200-3a-tbl-yesno-retention` (3.1.1): the stem says Contoso has no eligible ISOC license (otherwise s1, DeviceProcessEvents 60 days ago, could be Yes). The explanation was updated.
- `sc200-3b-hq-bookmark-incident`, `sc200-3b-hq-bookmark-facts` (3.2.1), `sc200-3c-hunting-tool-match` (3.2.3): the stems now place the bookmark work in the Azure portal.
- `sc200-3b-hq-hunt-order` (3.2.1): rewritten. The required steps were Hunts (preview). It is now Run selected queries, then Add bookmark, then Incident actions > Create new incident in the Azure portal: 3 of 6 actions.
- `sc200-3b-hq-tools` (3.2.1): target t1 was "track a hypothesis" (Hunts, preview). It is now "run a query each time the Hunting page opens" (Favorites). Hunt is a distractor with its own explanation, and the hunts reference was removed.
- Reference title only ("(legacy)" → "(Legacy)", the current title of investigate-incidents): `sc200-2b-cx-blast-radius`, `-attack-progression`, `-correlation-reason`, `-go-hunt`, `-graph-play`, `sc200-2b-sen-defender-portal-statements`.

## Checked and left unchanged

- `sc200-2b-cx-blast-radius`: the stem already says the tenant meets every prerequisite.
- `sc200-2c-disruption-contain-user`: the five days are confirmed (respond-machine-alerts).
- The live response questions (`sc200-2c-action-lr-*`, `sc200-cs3a-live-response`, `sc200-cs2a-live-response-script`): none relies on Linux isolate/release or on the putfile size.
- `sc200-2c-case-malware-sample`: the case Attachments tab isn't labeled preview.
- The purge and audit questions (`sc200-2d-*`): they state E5 or no hold where it matters.
- `sc200-3c-mcp-tool-match`: graph tools appear only as a distractor.
- `sc200-3a-tbl-entra-noninteractive`: the table has no preview label.
- `sc200-sr2-hunt-schedule-3`: the answer stays No.
- `sc200-3b-hq-alert-rule`: Hunt is only a distractor.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- **3.1.6 custom graphs (preview) as correct answers**: `sc200-3b-sg-custom-author`, `-graph-job`, `-custom-perms`, `-gql-query`, `-explore-hop`, `-table-export`, and the "Custom graph" target of `sc200-3b-sg-experiences`. The Sentinel graph itself isn't labeled preview. But hands-on use of it ("analyze relationships", GQL, graph jobs) goes through custom graphs, so the objective seems to need this preview feature. Not rewritten: owner's decision.
- `sc200-2b-cop-kql-generation` (2.1.8): its answer, KQL generation in advanced hunting, isn't labeled preview on the Copilot page. The advanced-hunting Copilot page carries a "prereleased product" notice that covers "some information". Ambiguous, so left unchanged.
- `DisruptionAndResponseEvents`: Learn's schema page and its autoad-results queries disagree on the columns. The chapter now uses only schema-page columns. Recheck when Learn is aligned.
- Blast radius and hunting graph: "customers who have onboarded … before September 23rd, 2026 are eligible". Read as an onboarding cutoff, but the wording is ambiguous.
- Notebook interactive timeout 30 min (setting) vs 20 min (limits table). Notebook jobs in the Jobs page: "view-only" (kql-manage-jobs) vs enable/disable the schedule (notebook-jobs).
- "Administrator" role group (Content Search case access) is Learn's wording. It doesn't say which group it means.
- Out of scope, not changed: `sc200-2a-disruption-hunting-table` (2.1.1) makes `DisruptionAndResponseEvents`, a preview table, its correct answer.

## French terms not settled (not in the glossary)

- « héritée (legacy) » for the legacy incident page; « version préliminaire » (prerelease); « assistant de chasse aux menaces » (threat hunting assistant); « protection prédictive » (predictive shielding).
- « conservation pour litige » (Litigation Hold), « conservation inaltérable » (In-Place Hold).
- contain: the chapters use « contenir / contenu », some bank questions use « confiné ». Not harmonized.
- « licence ISOC (Integrated Security Operations Center) éligible ».
