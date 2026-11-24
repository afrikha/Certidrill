# QZ-az-120-32-disaster-recovery — report

File: `content/az-120/quizzes/32-disaster-recovery.yaml` (10 questions, az120-qz-32-01..10). `npx tsx factory/check-quiz.ts az-120 32-disaster-recovery`: 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (q1, q6), 3.2.4 (q2, q10), 3.2.5 (q3), 3.2.7 (q4), 3.2.8 (q5), 3.2.2 (q7), 3.2.3 (q8), 3.2.6 (q9). Positions 6-10: dragdrop, single, multi, yesno_statements, dropdown.

## Unverified facts / doubts

- **q8**: no Learn page I fetched says, in so many words, "update DNS with a recovery plan post-action script". The recovery plan page lists automation runbooks and scripts for post-failover tasks. The SAP DR overview says the DR workload must be adapted to networking changes "like DNS update". The chapter's Exam tip states it, so I kept it.
- **q7**: the Site Recovery and on-demand capacity reservation integration is confirmed on the SAP DR overview page. The Site Recovery how-to page (`azure-to-azure-how-to-enable-replication-capacity-reservation`) returned an error, so I couldn't read it. "No term commitment" and "Reserved Instances don't guarantee capacity" come from the capacity reservation overview.
- **q4**: Learn says Replace existing replaces the disks of an existing VM and keeps the original disks. It doesn't say explicitly that the NIC and IP are kept; this is implied because the VM resource stays.
- **q10**: the Enhanced snapshot policy is still "Preview" on Learn (Nov. 2026), so it is a distractor. If it reaches GA, the `snapenh` explanation must change. ZRS is recommended for "data residency" on the vault page.
- **q9**: TLS inspection is unsupported for an Azure Firewall application rule (HANA backup page). The AzureResourceManager requirement for snapshots is on the same page.

## Chapter vs current Learn

- **French terminology**: the FR chapter `32-disaster-recovery.fr.md` uses « région associée » for "paired region". The glossary (`content/glossary.yaml`) and the writing guide use « région jumelée ». The quiz uses « région jumelée ».
- Chapter 3.2.6: "Snapshot supports `ext3` and `xfs` file systems" isn't on the pages I fetched (the snapshot page refers to the support matrix). Not verified, and not used.
- Chapter 3.2.8: "Production replication continues" during a test failover isn't stated on the DR drill tutorial. The recovery plan page says the primary site keeps running (the shutdown step is skipped).
- Chapter 3.2.3: "network mapping links source and target VNets in both directions" is confirmed (architecture and network mapping pages). Note that with manual network mapping you create the reverse mapping yourself; automatic mapping creates both directions.
- Chapter DB table: confirmed by "Disaster Recovery recommendation for SAP workload" (Oracle Data Guard (FarSync), Db2 HADR, ASE HADR Always On, MaxDB standby database).

## Mock-exam overlap

- The q10 policy slot (weekly full + logs only) is the same prerequisite as az120-3c-pol-snapshot-prereq. Here it is one element of a three-part design with ZRS and the Standard policy; the other slots are new decisions.
- q5 includes the isolated network choice of az120-3c-drt-test-network, inside a full drill procedure.
