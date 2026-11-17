# K-az-120-cs3 — report

Three case studies, 16 questions, all `status: draft`.

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| az120-cs3a-coho-winery | Wine producer; ECC on Db2 → S/4HANA on SLES, HANA scale-up HSR across zones, Pacemaker | migration-dmo (1.1.9 single), hana-log-disks (2.3.6 dropdown), pacemaker-settings (3.1.6 yes/no), hana-ilb (3.1.3 dropdown), fence-agent (3.1.7 ordering), ams-providers (4.2.5 dragdrop) |
| az120-cs3b-humongous-insurance | Insurer; RISE with SAP (S/4HANA Cloud Private Edition) + customer hub, self-managed BOBJ/data science VMs | rise-peering (1.3.1 dropdown), rise-dns (2.2.8 single), rise-responsibility (1.3.5 dragdrop), adf-runtime (1.3.4 single), commitments (4.1.3 dropdown) |
| az120-cs3c-trey-research | Pharma; NetWeaver ABAP on Windows + SQL Server AG, WSFC shared disk ASCS, DR to North Europe | migration-sql (1.1.8 single), ag-listener (3.1.5 single), dr-methods (3.2.1 dragdrop), sql-backup (4.2.6 yes/no), acss-register (4.2.8 multi) |

Difficulty: 4 easy, 9 medium, 3 hard.

## Notes and doubts

- Migration references: the CAF page "Migrate an SAP platform to Azure" announces its removal on 2026-10-30, so the training units of module "explore-migration-options" are used instead. The terms "lift-shift-migrate" / "migrate to HANA" are not defined on any page fetched; the questions rely on the one-step DMO vs two-step definitions that are documented.
- az120-cs3a-hana-ilb: the HANA SQL port 3<nn>13 and sapstartsrv port 5<nn>13 used in distractor explanations come from general SAP port conventions, not from a fetched Learn page.
- az120-cs3a-hana-log-disks: Mv3 is listed by Learn as supporting Write Accelerator; no exact VM size is named in the case to avoid stale SKUs.
- az120-cs3c-ag-listener: Learn's SAP SQL Server guide says DNN can replace the load balancer (SQL Server 2019 CU8+); it doesn't explicitly state SAP support beyond that.
- az120-cs3c-acss-register: role names taken from "Register an existing SAP system" (Azure Center for SAP solutions service role + Reader).
- Page titles were taken from WebFetch (direct curl to learn.microsoft.com is blocked by the proxy).
