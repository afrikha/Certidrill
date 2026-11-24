# QZ-az-400-52-metrics-analysis — notes

`content/az-400/quizzes/52-metrics-analysis.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 5.2.1 (q4, q7), 5.2.2 (q2, q6, q9), 5.2.3 (q3, q8), 5.2.4 (q1, q5, q10). Positions 6–10: multi, dropdown ×2, yesno_statements, single.

## Chapter (and mock questions) vs current Learn

- **AppRequests has a built-in `TenantId` column**, which holds the Log Analytics workspace ID (table reference, fetched Nov 2026). The mock question `az400-5a-metric-types-yesno` uses a custom property named **TenantId**, which could be confused with that column. Renaming it would help (for example to StoreId).
- **VM insights OpenTelemetry experience** (5.2.1 table): Learn adds that it supports only individual VMs and Arc-enabled servers, not scale sets. It also doesn't support private link, and you can't query across a Log Analytics workspace and an Azure Monitor workspace in one query. Default logs-based metrics go to `InsightsMetrics`, and extra counters go to `Perf`. The chapter doesn't say this.
- **App Service plan metrics** exist only on Basic, Standard, Premium and Isolated plans (App Service quotas and metrics page). The chapter doesn't mention the tier.
- The rest of the chapter facts used here were confirmed on the fetched pages: metrics explorer (same type, location and subscription; 30 days per chart; 93 days retention by panning; split 10 by default, 1–50; Monitoring Reader at subscription scope), usage tools (JavaScript SDK, cookie-based anonymous users, `setAuthenticatedUserContext()`, HEART needs the authenticated context or Anonymous Users), the Application map (cross-subscription components, Intelligent view up to 7 days, connector error rate), string operators, the `top` default `desc`, and the InsightsMetrics `LogicalDisk`/`FreeSpacePercentage` with the `vm.azm.ms/mountId` tag.

## Unverified or judgment calls

- q6 assumes virtual machines support multi-resource charts in metrics explorer. The page says the scope picker shows which types do and lists no types, but VMs are the usual example.
- q10: the `sum(ItemCount)` correction rests on the AppRequests definition of ItemCount ("Number of telemetry items represented by a single sample item"). I didn't refetch the OpenTelemetry sampling page in this task. The chapter's C-az-400-5 report notes that the explicit `sum(itemCount)` guidance is on a previous-versions page.
- q4: CPU Time as "mainly useful for Free and Shared quotas" paraphrases the App Service quotas and metrics page.

## Design notes

- Decisions the mock bank doesn't test: workspace vs classic table names, the JavaScript SDK as the requirement for usage tools, the Application map for topology statistics, Http Queue Length, `==`/`in~`/`startswith` case sensitivity, metrics explorer scope and time limits, per-volume free space from InsightsMetrics with `top ... asc`, Application map facts (cross-subscription, Intelligent view range, error rate), the authenticated user context, and a sampling-corrected failure rate with `top ... desc`.
- No preview feature is a correct answer.
