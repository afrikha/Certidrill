# QZ-az-802-71-monitoring — report

File: `content/az-802/quizzes/71-monitoring.yaml` (10 questions; `check-quiz` 0 problem(s), 0 warning(s)).

Formats 6–10: dragdrop, single, dropdown, dropdown, multi. Objectives: 7.1.4 (Q1), 7.1.1 (Q2, Q4), 7.1.8 (Q3), 7.1.7 (Q5, Q7), 7.1.3 (Q6), 7.1.2 (Q8), 7.1.6 (Q9), 7.1.5 (Q10).

## Facts checked on Learn (fetched 2026-11-24)
- System Insights cmdlets (Invoke/Enable/Set schedule), default run daily at 3 AM.
- Counter thresholds (Troubleshoot performance problems in Windows): disk latency under 15 ms is healthy, over 25 ms is a warning and over 50 ms is critical; Available MBytes is healthy above 10 % or 4 GB; % User Time above 80 % and % Idle Time below 10 % are critical.
- VM insights Azure Policy initiatives: Enable Azure Monitor for VMs with Azure Monitoring Agent (AMA) (legacy = Log Analytics agent); remediation for existing VMs; the policies cover the logs-based experience only.
- Alerts: metric alert resolves after 3 consecutive checks; user response is set by users only; alerts are kept 30 days. Alert processing rules: apply action groups / suppression; filters include Severity; Service Health alerts aren't affected.
- Data Manager: Maximum root path size (overrides other limits), Resource policy Delete oldest/largest, Apply policy before the data collector set starts.
- IIS logs (AMA): W3CIISLog only, W3C format; Windows events only to Log Analytics (Event table); Basic filters only by log and level.
- WEF: Network Service in Event Log Readers to read the Security channel; source-initiated subscription ACL lists machine accounts/groups.

## Chapter vs Learn (to fix in the chapter)
- **Azure Monitor Metrics as a performance-counter destination is in preview** ("Azure Monitor Metrics (preview)" on *Collect performance counters with Azure Monitor Agent*). The chapter's DCR table says "Log Analytics workspace and/or Azure Monitor Metrics" without that mention. The quiz doesn't use it as an answer.
- **Dependency agent and the VM insights Map experience retire on June 30, 2028** (*Enable VM insights using Azure Policy*). The chapter mentions Map and the Dependency agent without this date.
- VM insights policies cover only the logs-based experience, not OpenTelemetry. The chapter says "at scale with Azure Policy" without this limit.
- Not verified (and not used): "two DCRs collecting the same events create duplicates" (the Windows events page only says that several workspaces duplicate the data); the Processor Queue Length threshold (no fetched page states it); "a DCR can have up to 10 data sources".

## Doubts
- Q8 French: Data Manager labels kept in English (Maximum root path size, Resource policy, Apply policy before…) because the French UI labels were not verified.
- Q10: on domain controllers, Event Log Readers is the domain Builtin group; the option says "the Event Log Readers group of the domain controllers".
