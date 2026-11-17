# K-az-120-cs1 — report

## Delivered

3 case studies, 16 questions, all `status: draft`. `CERT=az-120 npx tsx factory/validate.ts --prefix az120-cs1` gives 19 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| az120-cs1a-blue-yonder-airlines | Airline; S/4HANA on RHEL, all HANA and shared file systems on Azure NetApp Files, DR to Germany North | anf-hana-volumes (2.3.8 dropdown 2), byq-latency (2.2.4 single 3), hana-snapshots (3.2.6 single 2), dr-region (3.2.2 yesno 3), anf-metrics (4.2.3 dragdrop 2) |
| az120-cs1b-lucerne-publishing | Publisher; SAP ERP on Oracle 19c / Oracle Linux, lift and shift | oracle-os (1.1.2 dragdrop 2), oracle-licensing (1.1.5 single 2), oracle-storage (2.3.1 dropdown 1), oracle-ha (3.1.2 single 2), oracle-backup (3.2.4 single 3), resize (4.1.4 yesno 1) |
| az120-cs1c-tailspin-toys | Toy maker; platform team, SAP landing zone, SDAF, SAP Cloud Identity Services, SAP LaMa | vm-size-policy (1.2.2 single 1), cis-provisioning (1.2.4 multi 2), sdaf-order (2.1.6 ordering 2), golden-image (2.1.4 single 1), lama-connector (4.2.9 yesno 2) |

Mix: single 7, dragdrop 2, dropdown 2, yesno 3, multi 1, ordering 1. Difficulty: 4 easy / 9 medium / 3 hard.

## Changes from the first plan

The sibling agents (cs2, cs3, cs4) had already picked Trey Research, Humongous Insurance and Wide World Importers. They had also covered SLES HANA clusters (fencing, ILB, log disks, AMS providers), RISE networking and DNS, SQL Server listeners, reservations vs savings plans, and DR methods per layer. I dropped my first three drafts and picked companies and topics that nobody else covered: Azure NetApp Files, AzAcSnap, Oracle, constrained vCPU licensing, SDAF, SAP Cloud Identity Services and LaMa.

## Facts to double-check at review

- Availability zone volume placement for Azure NetApp Files: the SAP HANA ANF page (fetched 2026-11-17) still calls it "public preview". The question doesn't say whether it is GA or preview.
- oracle-ha: "synchronous redo transport" and the observer role are standard Data Guard behavior. The Learn page only says that automatic failover needs Fast-Start Failover and that it is supported for HA/DR.
- oracle-licensing: the stem says to assume every listed size is supported, because I couldn't check whether Standard_E32-8s_v5 is in SAP Note 1928533. The Learn constrained-vCPU page gives SQL Server, not Oracle, as its licensing example. The explanation stays general ("software licensed on the available vCPU count").
- oracle-storage: mdadm RAID 1 is wrong only because requirement 3 asks for the Microsoft recommendation (ASM). Learn doesn't say mdadm is unsupported.
- golden-image: the claim that VHD copies give no managed replication or versioning is general knowledge. The Compute Gallery page doesn't compare the two.
- cis-provisioning, option e (provisioning agent is for on-premises targets): general Entra knowledge, not stated on the fetched tutorial.
