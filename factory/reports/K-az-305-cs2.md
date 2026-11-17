# K-az-305-cs2 — CASES, AZ-305 (prefix `az305-cs2`)

Check: `CERT=az-305 npx tsx factory/validate.ts --prefix az305-cs2` → `18 files, 0 problem(s)` (3 case studies, 15 questions).

## Files

| Case study | Industry and architecture | Questions (domain, objective, type) |
| --- | --- | --- |
| `az305-cs2a-lamna-healthcare` | Hospital group, rehost of VMware machines to Azure virtual machines, hub-and-spoke | `az305-cs2a-vm-migration` (infrastructure, 4.3.3, multi) ; `az305-cs2a-hub-firewall` (infrastructure, 4.4.4, single) ; `az305-cs2a-vm-backup` (continuity, 3.1.2, yes/no) ; `az305-cs2a-legacy-directory` (identity, 1.2.2, single) ; `az305-cs2a-log-workspaces` (identity, 1.1.1, dropdown) |
| `az305-cs2b-wide-world-importers` | Logistics, cloud-native platform in three regions operated by a service provider | `az305-cs2b-carrier-workflows` (infrastructure, 4.1.4, single) ; `az305-cs2b-caching` (infrastructure, 4.2.4, dragdrop) ; `az305-cs2b-region-deployment` (infrastructure, 4.2.6, dropdown) ; `az305-cs2b-events-container` (data, 2.2.1, dropdown) ; `az305-cs2b-partner-operations` (identity, 1.2.3, single) |
| `az305-cs2c-tailwind-traders` | Retail, online store on App Service with Azure SQL Database and Blob Storage | `az305-cs2c-store-plan` (infrastructure, 4.1.1, single) ; `az305-cs2c-database-scaling` (data, 2.1.3, dropdown) ; `az305-cs2c-orders-recovery` (continuity, 3.1.3, yes/no) ; `az305-cs2c-invoice-backup` (continuity, 3.1.4, single) ; `az305-cs2c-key-store` (identity, 1.2.5, single) |

Mix: single 7, dropdown 4, yes/no 2, multi 1, dragdrop 1. Difficulty: 4 easy, 7 medium, 4 hard.

## Deviation: the batch was written twice

`content/az-305/case-studies/` was empty when the task started, but the agents cs1, cs3 and cs4 were writing at the same time. My first version (Humongous Insurance, Wide World Importers, Trey Research; 18 questions) used two companies that cs1 also chose and tested decisions that the other batches also test (SQL Managed Instance, failover group, access package, application proxy, Data Box, messaging trio, Container Apps, Cosmos DB multi-region writes, Front Door Premium, GRS with archive, user-assigned managed identity, Batch with Spot, ExpressRoute with VPN backup). I replaced it: new companies and decisions taken from objectives the other batches did not cover at that time. The other agents were rewriting too, so a second pass removed six more questions that had become duplicates (zones for virtual machines, pass-through authentication, Flex Consumption, App Configuration with Key Vault, self-hosted integration runtime, long-term retention). That is why the cases have 5 questions each and not 6.

## Overlaps that remain (state of the folder at the end of my run)

- `az305-cs2b-caching`: one of its three targets is Azure Managed Redis, also the answer of `az305-cs4b-menu-cache`.
- `az305-cs2c-database-scaling`: its second slot (read scale-out replica of a Business Critical database) is close to the series `az305-sr1-sql-reporting`.
- `az305-cs2c-invoice-backup` (vaulted backup) and the series `az305-sr2c` (operational backup is the right answer there): same pair of features, opposite requirement.
- `az305-cs2a-vm-migration` (agentless replication) and `az305-cs1c-vm-assessment` (appliance and agentless dependency analysis): same appliance, different step of the migration.
- The other batches still changed while I finished: a reviewer should run a duplicate check over all `az305-cs*` and `az305-sr*` files.

## Facts not read on a page I fetched (taken from the AZ-305 course chapters or stable knowledge)

- `vm-backup`: Azure Disk Backup restores disks, not a whole virtual machine.
- `vm-migration`: Site Recovery uses the Mobility service for VMware machines; the test migration targets a non-production virtual network (the fetched page only names the test migration).
- `legacy-directory`: a Microsoft Entra joined machine gets neither Group Policy nor LDAP; Domain Services needs the password hashes that password hash synchronization provides.
- `carrier-workflows`: Consumption logic apps have no virtual network integration (the fetched page lists it as a benefit of Standard only); the sentence on Power Automate.
- `region-deployment`: a user with the Owner role can remove a resource lock; the description of template specs.
- `partner-operations`: with Azure Lighthouse the customer creates no account for the provider's users (the overview says the provider works "from within your own tenant").
- `store-plan`: autoscale and deployment slots start at the Standard tier (the fetched pages give zone redundancy for Premium v2 to v4 and the minimum of two instances).
- `invoice-backup`: a vaulted backup can be restored to another storage account (the fetched page states the protection against the deletion of the account and that operational backup restores to the source account only).
- `orders-recovery`: East US 2 and Central US are paired regions.
- The 99.99 % SLA for virtual machines in two zones is not on the Learn pages I fetched (they send to the SLA document); no question of this batch uses it.

## Other notes

- WebFetch was rate-limited twice (hourly limit); every reference of the 15 questions is a page fetched in this session, with its current H1 as title.
- French: tier, SKU, plan and product names stay in English (Flex Consumption, Premium v3, Business Critical, Managed HSM, Azure Lighthouse); « pile de déploiement », « paramètres de refus », « spec de modèle », « sauvegarde archivée (vaulted backup) », « accès en contexte de ressource », « lecture à l'échelle (read scale-out) » follow the course chapters.
