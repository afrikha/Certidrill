# QZ-az-305-43-migrations — notes

`content/az-305/quizzes/43-migrations.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 4.3.1 (q1, q6), 4.3.2 (q2, q7), 4.3.3 (q3, q8), 4.3.4 (q4, q9), 4.3.5 (q5, q10). Positions 6–10: dragdrop, single, dropdown, yesno_statements, multi.

## Chapter vs current Learn (fix in the chapter and the mock bank, not done here)

- **Azure Migrate is now "Azure Catalyst (formerly Azure Migrate)".** The overview H1 reads "What is Azure Catalyst (formerly Azure Migrate)?", and the docs hub is "Azure Catalyst documentation". Page bodies say "Azure Catalyst assessments", "Azure Catalyst appliance", "Azure Catalyst Collector" (new, for air-gapped networks) and "Azure Catalyst: App Containerization tool". Page titles and URLs still end in "- Azure Migrate", and Learn uses both names. The chapter, the 40+ mock questions and this quiz all say "Azure Migrate". The glossary and course need a decision for the whole certification. I kept "Azure Migrate" so the quiz matches the chapter.
- Several old Azure Migrate URLs now redirect to the Azure Catalyst landing page: `concepts-assessment-calculation`, `best-practices-assessment`, `how-to-modify-assessment`. Check any mock-question references to them. The sizing content now sits on `azure/migrate/target-right-sizing`, titled "Performance vs As-is on-premises assessments". It calls the criterion **"As-is on-premises"**, while the chapter says "As on-premises".
- The target-right-sizing page says web apps are assessed only with As-is on-premises sizing, because the appliance collects no performance data for them. The chapter doesn't say this.
- Storage Mover now does **agentless** migrations as well as agent-based ones. Agentless is available for SMB (credentials in Key Vault, private connectivity) and for NFS (preview). It also covers AWS S3, Azure blob to Azure blob, and some other sources in preview (Google Cloud Storage, S3-compatible storage, FSx for Windows, file share to file share). The chapter only describes the agent model.
- Data Box: the overview still has an old 80-TB passage. The 80-TB device is being retired by region. The chapter's 120 TB / 525 TB figures and the Data Box Heavy retirement are correct.
- DMS overview: the table says TDE-encrypted databases and logins can't be migrated by the portal DMS. The chapter says nothing about this.
- The CAF strategy page has a probable copy error: Rebuild's "when to choose" list says "The workload has a mature SaaS alternative" and "requires little customization", which are Replace triggers. The chapter's Rebuild row ("the existing application can't meet the requirements") follows the definition, and so does q6.
- Confirmed as written: Managed Instance link needs SQL Server 2016 or later; LRS restores from Blob Storage (SQL Server 2012 and later per the Arc migration page), continuous mode needs a manual cutover, and the database isn't readable before cutover; Data Box Disk is 5 × 8 TB, about 35 TB usable, import only; DMS to SQL Database is offline only; DMS does online migrations to SQL Server on Azure VMs.

## Not verified on a fetched page

- q3, option c: Azure Container Registry tasks build from a Dockerfile. This is general knowledge; I fetched no ACR page.
- q5: the S3 path of Storage Mover isn't labelled preview on Learn, and an Azure update "Generally Available: Cloud-to-Cloud migration made simple with Azure Storage Mover" exists. The cloud-to-cloud page itself states no GA or preview status.
- q7: the Arc migration assessment page has no preview label. I treated the feature as GA, which matches the chapter.

## Design notes

- The mock bank already covers most decisions of the chapter (46 questions). This quiz tests other ones: refactor; percentile utilization; App Containerization to AKS; DMS online to SQL VM (MI link and LRS are MI-only); Storage Mover for S3; refactor, rearchitect, rebuild and retain together; the Arc SQL assessment versus the appliance and DMA (retired); the KVM-as-physical method; the MI link version limit against LRS; and transfer-time arithmetic, where a 150-TB copy over 1 Gbps is the network trap.
