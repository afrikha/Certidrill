# QZ-az-120-31-high-availability — report

File: `content/az-120/quizzes/31-high-availability.yaml` (10 questions, az120-qz-31-01..10). `npx tsx factory/check-quiz.ts az-120 31-high-availability`: 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q10), 3.1.9 (q2), 3.1.2 (q3), 3.1.7 (q4), 3.1.6 (q5), 3.1.8 (q6), 3.1.5 (q7), 3.1.3 (q8), 3.1.4 (q9). Positions 6-10: multi, single, single, yesno_statements, dropdown.

## Unverified facts / doubts

- **99.99% zone SLA** (q1 explanation of option a, q10): none of the Learn pages I fetched states it (the SAP HA architecture page and "Availability options for Azure Virtual Machines" only point to the Azure SLA page). I used the figure because the chapter and the mock bank use it. The 99.9% and 99.95% figures and the 30-day / 43,200-minute basis are on the SAP HA architecture page.
- **q10**: I assume that two parallel Web Dispatcher VMs in two zones behind a Standard load balancer get the 99.99% multi-zone SLA for that layer. This is the standard parallel Web Dispatcher pattern, but no Learn page I fetched states it for the Web Dispatcher.
- **q5**: Learn gives `resource-stickiness=1000`, `migration-threshold=5000` and `priority-fencing-delay=30` (SLES HANA guide) but doesn't explain the first two. The stem describes them using standard Pacemaker semantics.
- **q9**: the multi-SID page limits SLES multi-SID to 5 SIDs, doesn't support mixing ENSA1 and ENSA2 in one cluster, and says "the 3-node setup can only be used for ENSA2". Because that sentence is on the multi-SID page, I took a three-node multi-SID cluster of ENSA2 systems as supported (statement s3 = Yes).
- **q7**: the DNN prerequisites (SQL Server 2019 CU8+) and the VNN/load balancer requirement come from the SQL Server on Azure VMs pages. I didn't find an SAP-specific page that restates them.

## Chapter vs current Learn

- Chapter 3.1.8 table: "Zone resilience for volumes that no application replication protects" and "destination read-only until you break the replication peering". The current ANF replication page ("Understand Azure NetApp Files Replication") confirms async replication and no extra charge for cross-zone replication. It doesn't state the read-only destination or the SAP use case in these words. The SAP zones page says ANF has no synchronous cross-zone replication and that databases use DBMS replication.
- Chapter 3.1.6 corosync `token` 30000: the SLES Pacemaker page sets the value but gives no reason. That's fine because the chapter states no reason either.
- Chapter 3.1.2 "Premium SSD v2 and Ultra Disk not supported in availability sets": not verified, and not used in the quiz.
- Learn multi-SID page (SLES): the probe list labels the ERS ports 62102/62112/62122 as "ASCS". The crm commands on the same page use them for ERS, so this is a typo on Learn. No impact on the chapter.
- Chapter 3.1.9 `kernel.panic` (20 to 30 seconds) is confirmed on "SAP HANA availability within one Azure region".

## Mock-exam overlap

- I avoided the decisions already in `questions/hadr` (3a-*, 3b-*, case studies cs1-cs4, series sr1).
- q8 uses the same port convention as az120-3a-lb-ascs-ers-ports (620/621 + instance number), but tests a different decision: adding a multi-SID SID to the existing load balancer, with different numbers.
- q10 is a composite SLA, like az120-3a-sla-composite, but with zones, different figures and a "fix the weak layer" slot.
