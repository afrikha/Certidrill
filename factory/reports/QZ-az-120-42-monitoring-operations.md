# QZ-az-120-42-monitoring-operations — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- Section `storage-monitoring`: **Data Disk Latency** (and OS Disk Latency) is labelled **(Preview)** on the Learn page "Disk metrics" (SCSI only). The chapter presents it as a normal metric and says "For HANA, alert on `/hana/log` latency" without saying it's preview. Mock question `az120-4b-sto-metric-statements` s2 is built on this preview metric (its answer is still correct, but it relies on a preview feature). q7 doesn't use the latency metric.
- Section `network-monitoring`: the NSG flow log retirement is right (September 30, 2027). Learn adds that after that date Azure deletes the NSG flow log resources and stops traffic analytics on them, while records already in storage are kept. Worth one line in the chapter.
- Section `network-monitoring`: the Connection troubleshoot page says the Network Watcher agent extension is no longer required for connectivity tests. Not in the chapter; q6 s1 uses it.
- Section `acss-start-stop`: Learn lists Windows Server Failover Clustering, next to SUSE/RHEL Pacemaker, as supported cluster software for HA start/stop; and "For HA HANA databases, start and stop … are supported only when a cluster management solution is in place". The chapter says "HA HANA needs a cluster" (fine) but doesn't mention WSFC.
- Section `vm-monitoring`: VM insights — the Learn page "Monitor virtual machines in Azure" now describes enhanced monitoring with a choice between OpenTelemetry metrics (recommended for new deployments) and logs-based metrics. The chapter's "VM Insights (uses the Azure Monitor Agent)" row is still true but may need an update; I avoided VM insights as an answer.
- The vm-extension-for-sap page doesn't state the managed identity/Reader requirement, the Host Agent 7.21 PL 47 version, the 127.0.0.1:11812 URL or the Host Agent restart (they are on the version-specific pages, not fetched). Not used in this quiz.

## Facts not verified, so left out

- Exact ID to enter in **User Name** for a user-assigned managed identity in the LaMa adapter ("enter its ID": client ID vs resource ID not specified).
- Whether the `sap_vendor_cluster_connector` name applies to Windows/WSFC systems: Learn states it generically for "HA deployments". q9 states that the connector is installed on both systems, so the answer doesn't depend on it.

## Design notes

- q5 (Data Path Availability) is the opposite decision of mock `az120-4b-ha-lb-probe-metric` (Health Probe Status); the stem avoids the words "data path".
- q10 overlaps the first two steps of mock `az120-4c-bkp-configure-order` (pre-registration script, discovery) but tests the MDC alternate-location restore and the second run of the script.
- q4: options a and c differ only by the workspace retention; the six-month requirement decides.
