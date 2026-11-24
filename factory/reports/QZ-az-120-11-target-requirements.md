# QZ-az-120-11-target-requirements — end-of-chapter quiz, AZ-120, chapter 11

File: `content/az-120/quizzes/11-target-requirements.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-120 11-target-requirements` → 0 problem(s), 0 warning(s).

| # | Objective | Difficulty | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 1.1.7 | 1 | single | Azure VM extension for SAP solutions as an SAP support prerequisite |
| 2 | 1.1.1 | 1 | single | Proof of concept when neither Quick Sizer nor a running system is reliable |
| 3 | 1.1.9 | 2 | single | Migration order: sandbox/training first, coupled ERP+BW together last, new system in Azure |
| 4 | 1.1.5 | 2 | single | RHEL PAYG → BYOS: Red Hat Cloud Access registration first |
| 5 | 1.1.6 | 2 | yesno | Guest-OS shutdown still billed; ANF billed on pool size; disks billed when deallocated |
| 6 | 1.1.2 | 3 | single | HANA scale-out with standby node → only NFS v4.1 on Azure NetApp Files |
| 7 | 1.1.8 | 3 | single | HANA → HANA on same OS = lift and shift, HSR for least downtime (not DMO, not ASR) |
| 8 | 1.1.2 | 3 | yesno | Db2 on RHEL on ANF NFS (yes), MCOS in a Pacemaker cluster (no), Pacemaker on Oracle Linux (no) |
| 9 | 1.1.4 | 3 | dropdown | Capacity reservation blockers: M-series v1, proximity placement group, Ultra Disk |
| 10 | 1.1.3 | 3 | multi | Design review: ZRS disks for DBMS and Write Accelerator on Premium SSD v2 must change |

Pages fetched (2026-11-24): sap/workloads planning-supported-configurations, planning-guide, planning-guide-storage, vm-extension-for-sap, hana-vm-premium-ssd-v2; virtual-machines capacity-reservation-overview, msv2-mdsv2-series, states-billing, disks-types, linux/azure-hybrid-benefit-linux; azure-netapp-files-cost-model; sap/large-instances hana-large-instance-virtual-machine-migration; training explore-migration-options units 2 and 7; CAF scenarios/sap/migrate (deprecated).

## Doubts and unverified facts

- Q7: no current Learn page states "HANA System Replication from on-premises to Azure" as a lift-and-shift method. The reference is the HLI → VM migration page ("the migration approach offering the least downtime is SAP HANA System Replication"), and the chapter's table lists HSR among homogeneous methods. The two-step training unit names only backup/restore, Data Guard and Always On. A reviewer may want a better reference.
- Q7: the claim that DMO is not used for a source that is already SAP HANA follows the chapter ("the database becomes SAP HANA"); not checked against SAP's DMO guide.
- Q9: Standard_M128s_v2 is confirmed as Msv2 Medium Memory (2,048 GiB) and that series is in the capacity-reservation supported list (multi-zone only). Its HANA certification and Premium SSD v2 support were not confirmed for this exact size (the Premium SSD v2 HANA page covers "M-series VMs that offer the same memory"). Standard_M128ms memory (more than 2 TiB) is general knowledge.
- Q1: the Learn page says the extension must be enabled "to be sure SAP supports your environment"; that SAP Note 2015553 itself lists the extension is taken from the chapter and the bank (az120-1a-supp-prereqs), the note was not read.
- Q4: the Azure Hybrid Benefit page contradicts itself on whether AHBForRHEL is needed for PAYG → BYOS (general statement "vice versa" vs a procedure that only runs `az vm update`). The question avoids it: Cloud Access registration is first in both readings, and the distractor explanation says the extension is used for BYOS → PAYG.

## Chapter issues against current Learn

- Section 1.1.1, step 3 "For SAP HANA, memory is the leading dimension": not stated on the planning guide (it says "start with the memory and CPU requirements"); not tested.
- Section 1.1.2 table, 2-tier row: Learn says a 2-tier configuration is supported "only for non-production cases that don't require a high availability failover cluster"; the chapter's "Supported" reads as if it were fine for production. Consider adding "non-production".
- Section 1.1.2, Oracle RAC: the supported-scenarios page no longer mentions Oracle RAC (only "Oracle Data Guard is supported for single instance per VM deployment cases only"); the chapter's "Oracle RAC not supported" isn't backed by the page I fetched.
- Section 1.1.2, Microsoft Entra Domain Services: the page's table marks Entra Domain Services "Supported" while its text says "still in testing". Chapter 12 says "still being tested"; the mock question az120-1a-sup-windows-ad makes Entra Domain Services the correct answer. Both follow one half of a self-contradictory page; a reviewer should align the chapter and the bank.
- French chapter, network bullet: « réseaux virtuels appairés » — the glossary says to avoid « appairage » and use « peering » (« réseaux virtuels avec peering »).
- The CAF SAP migrate page is marked deprecated with removal on 2026-10-30 but is still served; not used as a reference.
