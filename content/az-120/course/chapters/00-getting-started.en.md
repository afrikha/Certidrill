AZ-120 checks that you can plan, build and run SAP landscapes on Azure: size and migrate SAP systems, design the compute, network and storage underneath them, make them highly available and recoverable, and keep them fast, affordable and monitored. It assumes you already know SAP (HANA, NetWeaver, Business Suite) and Azure at administrator level; questions are about what Azure for SAP changes. This course follows the official study guide objective by objective; each section names the objectives it prepares.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Exam and certification | AZ-120, Planning and Administering Azure for SAP Workloads; Microsoft Certified: Azure for SAP Workloads Specialty |
| Prerequisite | None formally; Microsoft strongly recommends the Azure Administrator Associate certification |
| Duration | 100 minutes of exam time |
| Questions | Not published; about 45 to 58 in practice; the exam "may have interactive components" |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft documents access to Microsoft Learn during associate and expert exams; it doesn't say so for specialty exams. Prepare as if the exam were closed book |
| Languages | English, Japanese, Chinese (Simplified), French, German, Spanish, Portuguese (Brazil); 30 extra minutes can be requested if your language isn't offered |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Migrate SAP workloads to Azure | 25 to 30 % |
| Design and implement an infrastructure to support SAP workloads on Azure | 25 to 30 % |
| Design and implement high availability and disaster recovery (HADR) | 20 to 25 % |
| Maintain SAP workloads on Azure | 20 to 25 % |

The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop, ordered steps) give one point per correct element.

An exam is made of sections:

- **Case study.** One SAP landscape to migrate or redesign, described in tabs (overview, existing environment, requirements: SAPS and memory, RPO and RTO, network, operating system), followed by several questions. Once you leave the case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final. Several solutions can be right, or none.
- **Main section.** Independent questions that you can flag and review: one answer among four (the most frequent format), drop-down lists with two or three selections (a design choice and a setting), Yes/No statements, "select two", drag and drop (component to layer, tool to task) and a few procedures to put in order (cluster setup, automated deployment).

There is little code: at most an `az` or PowerShell command, a Bicep fragment or a Pacemaker line to complete.

The exam is proctored and scheduled through Pearson VUE. Microsoft recommends registering with a personal Microsoft account rather than a work account, so that your certification history stays with you if you change employer. After a first failed attempt, you can retake the exam 24 hours later; waiting times for later retakes vary. The Exam Sandbox shows the question formats in the real exam interface before the day.

<!-- section: reading-questions -->
## Reading a question

AZ-120 is a design exam first and a configuration exam second. A typical stem has three to six sentences: a company such as Contoso runs SAP ERP on premises, a table of systems with their database, OS, memory and SAPS, then the constraints that decide the answer, and "You need to recommend...", "What should you include in the design?" or "Which storage should you use?".

Work in this order:

1. Read the last sentence: which layer is asked (VM size, storage, network, cluster, backup, monitoring)?
2. Note the **database** (HANA, SQL Server, Oracle, Db2, ASE), the **operating system** (SLES, RHEL, Windows, Oracle Linux) and whether the system is **production**: they decide what is certified and supported.
3. List the numbers: SAPS, memory, IOPS, RPO, RTO, latency.
4. Eliminate every option that isn't supported for SAP, even if it would work technically; then pick the cheapest supported option that meets every number.

| Words in the stem | Think of |
| --- | --- |
| "certified for SAP HANA production" | A VM of the SAP HANA hardware directory |
| "SAPS of each VM size" | SAP Note 1928533 |
| "M-series VM, Premium SSD, HANA log volume" | Write Accelerator on /hana/log |
| "latency between application servers and database" | Same virtual network, no NVA in between, Accelerated Networking; proximity placement group only if still too high |
| "highly available HANA in one region" | HANA System Replication (synchronous) with a Pacemaker cluster across zones |
| "fencing" on Linux | Azure fence agent or SBD |
| "DR for the database in another region" | Native asynchronous replication (HSR, Always On, Data Guard), not Site Recovery |
| "DR for application servers" | Azure Site Recovery |
| "guided deployment of S/4HANA", "start and stop SAP systems from Azure" | Azure Center for SAP solutions |
| "open-source, Terraform and Ansible, repeatable deployments" | SAP Deployment Automation Framework |
| "monitor HANA, NetWeaver and Pacemaker metrics in Azure" | Azure Monitor for SAP solutions |
| "S/4HANA run by SAP in SAP's Azure subscription" | RISE with SAP: virtual network peering, no access to SAP's VMs |

> **Exam trap.** "Supported" beats "works". An NVA between application and database, Azure Site Recovery for a HANA VM, or a VM size absent from SAP Note 1928533 can all run, and are all wrong answers.

<!-- section: confusing-pairs -->
## Options that are easy to confuse

Answer choices come from the same product family. Learn the one-line difference:

| Family | Options | What separates them |
| --- | --- | --- |
| Block storage for HANA | Premium SSD, Premium SSD v2, Ultra Disk | Premium SSD needs Write Accelerator for /hana/log on M-series; Premium SSD v2 and Ultra Disk meet the latency without it and don't work with availability sets |
| Shared file storage | Azure NetApp Files, Azure Files | Azure NetApp Files can hold HANA data and log over NFS 4.1; Azure Files SSD serves /sapmnt and transport directories, never DBMS files |
| VM placement | Availability set, availability zone, proximity placement group | Fault and update domains in one datacenter; separate datacenters in a region; physical closeness for latency, never resilience |
| Linux fencing | Azure fence agent, SBD | The fence agent calls the Azure API with a managed identity; SBD uses shared block devices (iSCSI target servers or an Azure shared disk) |
| Database protection | HANA System Replication, Azure Site Recovery, Azure Backup, snapshots | HSR replicates the database for HA or DR; Site Recovery replicates VMs (application layer only); Backup keeps restore points; snapshots are fast, storage-level copies |
| Deployment | SAP Deployment Automation Framework, Azure Center for SAP solutions, Bicep | An open-source framework you run and customize; a managed Azure service with guided deployment and management; general infrastructure as code |
| Monitoring | Azure Monitor for SAP solutions, VM insights, Network Watcher | SAP and HANA application metrics; VM performance and dependencies; network diagnostics and flows |
| Cost commitments | Reservations, savings plans, capacity reservations | A discount for a size and region; a discount for an hourly spend across sizes and regions; guaranteed capacity at pay-as-you-go price |
| Migration tools | SWPM, SUM DMO, DMO with System Move | Homogeneous or heterogeneous system copy; upgrade plus migration to HANA; DMO with the move from on premises to Azure |

<!-- section: study-plan -->
## A study plan that works

1. Start with the migration domain: sizing, supported scenarios and SAP notes come back in every later design.
2. Learn the four lists that most questions depend on: SAP-certified VMs, the storage matrix per volume, what is and isn't supported, and which replication protects which layer.
3. If you can, deploy a small SAP-like layout in a sandbox subscription: two Linux VMs in two zones, a Standard internal load balancer and an Azure NetApp Files or Azure Files share. Seeing the settings makes the drop-down questions easy.
4. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
5. Train on case studies: read the questions first, then look in the tabs for the numbers and constraints each question depends on.
6. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
