# K-az-120-cs2 — report

3 case studies, 18 questions (6 each), all `status: draft`. Validator: `CERT=az-120 npx tsx factory/validate.ts --prefix az120-cs2` → 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| az120-cs2a-proseware | Pharma; ECC on Oracle → HANA on RHEL, M-series, zones, Pacemaker, ANF, DR North Europe | dmo-move (1.1.9 single), hana-disks (2.3.6 dropdown), hana-ilb (3.1.3 yes/no), fencing (3.1.7 ordering), dr-methods (3.2.1 dragdrop), ams-cluster (4.2.5 multi) |
| az120-cs2b-wingtip | Retail; RISE with SAP (S/4HANA PCE) + customer-managed BW/4HANA on SLES | dns-zone (1.3.2 single), identity (1.3.5 dragdrop), adf-runtime (1.3.4 single), datalake-pe (2.2.7 multi), ams-scope (4.2.5 yes/no), bw-backup (3.2.4 dropdown) |
| az120-cs2c-litware | Energy; ERP on Windows + SQL Server lift and shift, WSFC shared disk across zones, Always On AG | quota (1.1.4 single), ppg (2.2.3 single), ascs-disk (3.1.4 dropdown PowerShell), sql-listener (3.1.5 single), commitments (4.1.3 dragdrop), acss-stop (4.2.7 yes/no) |

Difficulty: 5 easy / 9 medium / 4 hard.

## Points to review

- The existing series `az120-sr2-rise-network` tests RISE peering with gateway transit; cs2b deliberately avoids that decision (DNS, identity, ADF runtime, private endpoints, AMS scope instead).
- `dbms-guide-sqlserver` says "Direct Network Name (DNN)"; the SQL Server docs use "distributed network name (DNN)". The question uses the latter.
- Not fetched explicitly: that a Backup vault (Data Protection) cannot hold SAP HANA streaming backups (the HANA backup page only says to create a Recovery Services vault); the exact quota row name "Standard EDSv5 Family vCPUs".
- The DR overview page (updated 2025-04) says ANF is not zone-aware; that statement was not used. Case cs2a states that Microsoft confirmed availability of every VM size and service in North Europe to avoid region-pair ambiguity for ANF cross-region replication.
- Migration terminology (DMO with System Move, Sequential/Parallel Data Transfer, two-step lift and shift + DMO) comes from the Learn training module "Explore migration options for SAP on Azure".
