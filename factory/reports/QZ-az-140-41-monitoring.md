# QZ-az-140-41-monitoring — report

File: `content/az-140/quizzes/41-monitoring.yaml` (10 questions, `npx tsx factory/check-quiz.ts az-140 41-monitoring` → 0 problem(s), 0 warning(s)).

Coverage: 4.1.1 (q1, q8), 4.1.2 (q5), 4.1.3 (q2), 4.1.4 (q6, q10), 4.1.5 (q4, q7, q9), 4.1.6 (q3). Positions 6–10: single, yesno_statements, dropdown (kusto), single, multi.
The 53 mock-exam questions of 4.1.x were read first; the quiz tests other decisions: Host registration category, custom copies don't get template updates, `Disconnect-AzWvdUserSession`, minimum-percentage rounding, Insights 1,000-host limit (ARM template + AMA), vCPU range in sizing, plan time zone / no scale-in during ramp-up / one plan per host pool, WVDErrors `ServiceError == false` + `dcount(UserName)`, disconnected-session time-limit policy, threshold vs max session limit at peak.

## Facts checked on Learn (Nov 2026)
- WVDErrors: `ServiceError` is a **bool** (table reference page), so the query uses `ServiceError == false`.
- Peak phase: the capacity threshold can't be set in peak; it carries over from ramp-up (autoscale-scaling-plan). Ramp-up never turns hosts off (autoscale-scenarios).
- Custom Insights copies "won't automatically adopt updates"; favorites need a custom copy (troubleshoot-insights).
- Insights automated deployment ≤ 1,000 session hosts; beyond, install the AMA at creation with an ARM template (insights).

## Chapter / Learn discrepancies and doubts
- Chapter 4.1.1 says log data appears "with up to about 15 minutes of latency". The troubleshoot page says 15 minutes. The diagnostics page says data "might take a few hours" after the first setup. Both could be mentioned.
- Chapter 4.1.4 says "Size VMs between 4 and 24 vCPUs". The Learn sizing page contradicts itself (4–24 in one section, 6–24 in another). q6 avoids the 4 vs 6 boundary: the D4 distractor is also below the 8-vCPU heavy minimum.
- Chapter 4.1.5 names only Power On Off Contributor. The Learn autoscale page has two conflicting permission sections: Power On Off Contributor alone, or that role plus Desktop Virtualization Virtual Machine Contributor (needed for dynamic autoscaling). The chapter is fine for power management, but it could say that dynamic autoscaling needs the extra role.
- Autoscale logging has two mechanisms that the chapter doesn't tell apart: a diagnostic setting on the **scaling plan** (storage account / Event Hubs, "Autoscale logs"), and the host pool category "Autoscale logs for pooled host pools" → table `WVDAutoscaleEvaluationPooled`, used by the Insights Autoscale tab (pooled only). Possible addition to the chapter.
- Chapter 4.1.1's query "How many users hit the same error" uses `count(UserName)`. This counts records, not distinct users. It's Learn's own sample, but the comment overstates it. q8 asks for `dcount(UserName)` and leaves `count(UserName)` out of the options, to avoid contradicting the chapter.
- Mock-exam references: 5 questions use the title "Azure Virtual Desktop diagnostics log analytics" for `.../virtual-desktop/diagnostics-log-analytics`, but the page title is now "Send diagnostic data to Log Analytics for Azure Virtual Desktop". 2 questions use the old sizing URL `.../virtual-machine-recs` (not fetched; the current page is `.../session-host-virtual-machine-sizing-guidelines`).
- Terminology: the shared glossary gives "workbook" → « classeur », but the AZ-140 French study guide (objectives.yaml) and the chapter use « workbook ». The quiz follows the chapter. The glossary or the course should settle this.
- "cmdlet" is `undecided` in the glossary: the French stem of q3 avoids it (« commande »).
