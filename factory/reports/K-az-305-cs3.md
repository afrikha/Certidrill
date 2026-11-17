# K-az-305-cs3 — CASES, AZ-305, three case studies

Files (all `status: draft`):

- `content/az-305/case-studies/az305-cs3a-vanarsdel.yaml` — VanArsdel, Ltd. (manufacturing; hybrid datacenter, ERP migration, plant telemetry). Questions: `az305-cs3a-erp-database` (2.1.1), `az305-cs3a-telemetry-platform` (2.3.2), `az305-cs3a-mes-recovery` (3.1.1), `az305-cs3a-region-restriction` (1.3.2), `az305-cs3a-hybrid-connectivity` (4.4.2), `az305-cs3a-engineering-drawings` (4.3.5).
- `content/az-305/case-studies/az305-cs3b-woodgrove.yaml` — Woodgrove Bank (banking; PaaS loan portal). Questions: `az305-cs3b-employee-sign-in` (1.2.1), `az305-cs3b-app-credentials` (1.2.5), `az305-cs3b-sensitive-columns` (2.1.4), `az305-cs3b-loans-database` (2.1.3), `az305-cs3b-loan-documents` (2.2.4), `az305-cs3b-outbound-address` (4.4.1).
- `content/az-305/case-studies/az305-cs3c-alpineski.yaml` — Alpine Ski House (leisure; microservices and event-driven booking platform). Questions: `az305-cs3c-microservices-hosting` (4.1.3), `az305-cs3c-booking-messaging` (4.2.1), `az305-cs3c-webcam-thumbnails` (4.1.4), `az305-cs3c-loyalty-restore` (2.2.4), `az305-cs3c-access-governance` (1.3.3), `az305-cs3c-request-tracing` (1.1.3).

Check: `CERT=az-305 npx tsx factory/validate.ts --prefix az305-cs3` → `21 files, 0 problem(s). Types: yesno_statements=2 single=9 dropdown=4 dragdrop=2 multi=1`.
Mix: 18 questions; difficulty 5 easy / 9 medium / 4 hard; cs3a covers four domains, cs3b and cs3c three each (no continuity question in cs3b and cs3c).

## Deviation: the second and third case studies were rewritten

`content/az-305/case-studies/` was empty when this task started, because K-az-305-cs1, cs2 and cs4 ran at the same time. My first versions of cs3b and cs3c were "Humongous Insurance" and "Blue Yonder Airlines"; the other agents then published case studies with the same two companies and several identical decisions. I renamed and reworked them (Woodgrove Bank, Alpine Ski House) and replaced the questions whose decision and answer duplicated a case study of cs1 or cs2 as it stood on 2026-11-17 at about 06:50 UTC:

| My first version | Duplicate at that time | Now |
| --- | --- | --- |
| ERP target = SQL Managed Instance | cs1a `lims-target`, cs2a `database-target` | SQL Server on Azure VMs (vendor agent on the OS, SSRS on the server) |
| ExpressRoute + site-to-site VPN as backup | cs2c `hybrid-link` | Site-to-site VPN over ExpressRoute private peering (IPsec requirement) |
| External ID external tenant | cs1b `customer-identity` | Pass-through authentication replacing AD FS |
| Business Critical + zone redundancy + failover group | cs1b `bookings-database`, cs2a `database-resilience` | Hyperscale + named replica (objective 2.1.3) |
| Front Door Premium | cs2b `global-entry`, cs1b `global-entry` | NAT gateway for a static outbound IP of App Service (objective 4.4.1) |
| RA-GZRS + locked retention policy | cs1a `report-immutability` (half) | RA-GZRS + legal hold |
| Container Apps | cs2b `microservices` | AKS (Kubernetes API required) |
| Cosmos DB multi-region writes + session | cs1b `loyalty-cosmos`, cs2b `tracking-store` | Cosmos DB continuous backup (objective 2.2.4) |
| Batch pool of Spot nodes with autoscale | cs2c and cs1a `alignment-compute` | Flex Consumption function with Event Grid blob trigger (objective 4.1.4) |

Not rechecked after that time: the cs4 files were being rewritten by their agent (Relecloud, Fourth Coffee) and cs2 had just been renamed, so a reviewer should compare the final cs1, cs2 and cs4 files with mine once more. Remaining partial overlaps that I kept: `az305-cs3a-region-restriction` (Allowed locations at a management group; cs1c has one Yes/No statement on it) and `az305-cs3c-access-governance` (the access-package target matches cs1c and cs2a `broker-access`; mine is a three-way match with PIM and access reviews).

## Sources

Every reference is a Learn page fetched on 2026-11-17, and its title is the H1 returned by the fetch. Fetching was interrupted once by the hourly WebFetch limit (37 pages in the first hour, 12 in the second).

## Facts stated without a page fetched in this session (taken from the AZ-305 course chapters or general knowledge)

- `az305-cs3a-erp-database`: "SQL Managed Instance doesn't host SSRS" comes from course chapter 21. The fetched pages confirm only that SQL Server on Azure VMs gives OS-level access and lets you install services on the host, which is enough to decide the answer through the vendor agent.
- `az305-cs3a-telemetry-platform`: tumbling and other windows of Stream Analytics (course chapter 23; the fetched introduction speaks only of "temporal constraints"); the wrong-option explanations for Data Factory, Batch, Databricks, Table storage and the dedicated SQL pool.
- `az305-cs3a-mes-recovery`: statement s2 relies on crash-consistent recovery points every five minutes (fetched); Microsoft gives no SLA on RPO, which the explanation doesn't mention.
- `az305-cs3a-region-restriction`: "the owner of a subscription can remove an assignment made at that scope" and "a role definition can't restrict the region" are general knowledge.
- `az305-cs3a-engineering-drawings`: NTFS permissions preserved by Azure File Sync (the fetched introduction says "permissions ... remain intact"); the Storage Mover and Data Box explanations follow course chapter 43.
- `az305-cs3b-app-credentials`: managed identity access to Blob Storage through Azure RBAC (the fetched tutorial covers Azure SQL Database only).
- `az305-cs3b-loans-database`: the geo-replica cost remark ("keeps its own copy of the data") is derived from "geo-replicas have their own page servers".
- `az305-cs3b-outbound-address`: Azure Firewall as a costlier static-IP alternative is general knowledge. The fetched NAT gateway page adds that, with a NAT gateway, traffic from the app to Azure Storage must use private or service endpoints; the case doesn't mention it.
- `az305-cs3c-booking-messaging`: "topics aren't available in the Basic tier" comes from course chapter 42 (the fetched pages confirm sessions and duplicate detection in Standard and Premium only, and the 256 KB / 100 MB sizes); message deferral description.
- `az305-cs3c-access-governance`: automatic removal of unconfirmed members by an access review (course chapter 13; the fetched overview doesn't state the auto-apply setting); lifecycle workflows and Conditional Access descriptions.
- `az305-cs3c-request-tracing`: the fetched Application Insights overview describes the application map and the transaction search view; "failure rate and duration on the map" and the Container insights description are general knowledge.
- `az305-cs3c-loyalty-restore`: "deletions are replicated to the read region" is general knowledge; the fetched continuous backup page says a restore goes to a new account (not mentioned in the question).

## French

Terms follow the AZ-305 course chapters: « locataire », « groupe d'administration », « redondance de zone », « réplica nommé », « géoréplica », « conservation légale », « stratégie de rétention limitée dans le temps », « hiérarchisation cloud », « authentification directe », « synchronisation de hachage du mot de passe », « gestion des droits d'utilisation », « révisions d'accès », « rubrique » / « abonnement », « sessions de messages », « détection des doublons », « cartographie d'application », « passerelle NAT », « Pare-feu Azure ». Kept in English: tier and SKU names, role names, policy name Allowed locations, Tenant Root Group, plan names (Flex Consumption, Premium, Dedicated), ExpressRoute features.
Not checked on a fr-fr page: « bureau de crédit » (credit bureau), « tâche web continue » (continuous WebJob), « report de messages » (message deferral), « déclencheur d'objets blob basé sur Event Grid », « charts Helm ».

## Housekeeping

A helper script was copied to the repository root as `.cs3check.mjs` for two runs (module resolution of `yaml`) and deleted each time; scratch files are in `/tmp/K-az-305-cs3`.
