# QZ-az-104-51-azure-monitor — doubts and notes

## Chapter out of date (not changed: outside my files)

- `51-azure-monitor.en.md` / `.fr.md`, section insights: "optionally the **Map** ... Map needs the Dependency agent". Learn ("View app dependencies with VM insights", fetched 2026-11-24): the Dependency Agent and the Map experience are deprecated, retire on 30 June 2028, and since 30 September 2025 new VMs cannot be onboarded to Map from the portal. The chapter should flag Map as deprecated. The quiz does not test Map.
- Learn ("Enable VM monitoring in Azure Monitor") now recommends the OpenTelemetry metrics experience for new VM insights deployments; logs-based metrics (InsightsMetrics) are the classic experience. The chapter mentions only the classic one.
- Learn ("Collect log data from virtual machines with Azure Monitor"): a DCR must be in the same region as every workspace it sends data to. The chapter does not say so. No quiz question depends on it.

## Choices and limits

- q9 (log search alert split by the Azure Resource ID column, automatic resolution) uses dimensions of log search alerts. The study guide covers this (5.1.4) but the chapter does not explain it. The chapter could add a line about it.
- q5: I did not use the Syslog table because Learn does not list the values of `SeverityLevel`. The question uses the Event table (`EventLevelName` "Error"/"Warning") instead.
- French "facilités" (Syslog facilities) in q7 follows the chapter, but it is not in the glossary. Please check the Learn fr-fr term.
- Portal values stay in English in the French text: Not connected, Provisioning succeeded, Suppress notifications, Apply action group, Unavailable, Degraded.
- Overlap with the mock exam that I checked and accepted:
  - q4: Service Health is the answer here. In cs1-tailspin-06 it is only a distractor.
  - q10: the mock questions test suppression alone (m1-alert-processing-weekend, cs1-tailspin-06) or apply action group alone (cs2-proseware-06). q10 tests which one takes precedence (suppression wins), the severity filter, and the fact that the alert stays visible.
