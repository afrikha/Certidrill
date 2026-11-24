# FIX-dp-900-1 — chapters 11, 12, 13, 14, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-900 11-data-representation 12-data-storage 13-data-workloads 14-data-roles 21-relational-concepts 22-azure-relational-services` 0 problems; `content:validate --cert dp-900` 0 problems, 0 warnings; `check-quiz dp-900` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed.

The shared WebFetch budget ran out early and stayed out for most of the session (403 "budget exhausted", shared by every agent). Pages fetched: explore-core-data-concepts/3-file-storage, azure/storage/blobs/data-lake-storage-introduction, explore-provision-deploy-relational-database-offerings-azure/2-azure-sql, azure-sql/managed-instance/sql-managed-instance-paas-overview, explore-roles-responsibilities-world-of-data/3-data-services. Not fetched (refused): azure-sql/database/serverless-tier-overview (site error), azure-sql/managed-instance/update-policy (budget).

## 11-data-representation

| Finding | Learn | Change |
| --- | --- | --- |
| No error reported. Doubts: q7 s1 (free-text column stays structured), q6 (XML = semi-structured), q8 (vector data not classified) | Not re-fetched. These are classification calls that rest on the chapter's definitions, not facts Learn contradicts | None |
| French terms | No glossary issue found | None |

## 12-data-storage

| Finding | Learn | Change |
| --- | --- | --- |
| "Azure Data Lake Storage Gen2" is out of date | Confirmed (data-lake-storage-introduction: H1 "Introduction to Azure Data Lake Storage". "Gen2" doesn't appear on the page, and "Gen1" appears once, for the old service. The page also says it "isn't a dedicated service or account type") | azure-data-stores table: "Azure Data Lake Storage" |
| ORC is no longer in the Learn unit | Confirmed (3-file-storage: the optimized formats are Parquet, Avro and Delta Lake, and ORC isn't mentioned) | ORC sentence removed after the XML sample |

## 13-data-workloads

| Finding | Learn | Change |
| --- | --- | --- |
| No error reported. Learn adds that ELT is "common in modern lakehouses" and gives Power BI semantic models as an example; "analytical schemas may denormalize" is a generalization of the lakehouse paragraph | Not re-fetched (budget). Nothing here contradicts the chapter | None |

## 14-data-roles

| Finding | Learn | Change |
| --- | --- | --- |
| Fabric Data Factory | Confirmed (3-data-services: a version of Data Factory is built into Fabric as Fabric Data Factory, "the recommended choice" for pipelines when all the data work is within Fabric) | data-engineer services paragraph: added in parentheses after Azure Data Factory |
| Cosmos DB is often managed by developers | Confirmed (3-data-services: sometimes a database administrator, "often software developers") | database-administrator: one sentence added to the Azure bullet |
| Microsoft Fabric IQ | Confirmed preview ("Fabric IQ is currently in preview") | None. It isn't in the objectives and it's a preview feature |

## 21-relational-concepts

| Finding | Learn | Change |
| --- | --- | --- |
| No error reported. Doubts: q5 (NULL in an added column), q8, q10 s1, q6 are reasoning, not stated facts | Not re-fetched | None |

## 22-azure-relational-services

| Finding | Learn | Change |
| --- | --- | --- |
| Serverless pauses only in General Purpose | Confirmed (2-azure-sql: "in the General Purpose service tier, the database can pause automatically when it's inactive") | Azure SQL Database table, serverless row, and Key points |
| Managed Instance update policies | Confirmed (MI overview: the "latest stable version" applies to the Always-up-to-date policy. Instances with the SQL Server 2022 or SQL Server 2025 update policy get updates from that engine. Automatic software patching: Yes). The update-policy page itself couldn't be fetched (budget) | managed-instance-and-vms: one sentence added. The decision row "specific version, upgraded only when you decide → VMs" stays right |
| CLR on MI only without file-system access in CREATE ASSEMBLY | Not re-fetched; the QZ report quotes the features-comparison page | None. Too detailed for DP-900 |
| Free tier and Copilot in Azure (preview) in the Learn unit | Confirmed (2-azure-sql: 100,000 vCore seconds of serverless compute and 32 GB per database each month. Copilot is preview) | None. Not needed for the objectives, and Copilot is preview |
| "Features comparison" page title | Not re-fetched | None. The bank keeps the H1 as the title |

## Mock-exam bank questions changed

- `questions/relational/dp900-2b-sql-fixed-version.yaml` (EN + FR): the explanation said that Azure SQL Database **and Managed Instance** "always run the latest stable version". That is true for MI only with the Always-up-to-date policy. Now: SQL Database runs the latest version, MI follows the engine of its update policy (Always-up-to-date, SQL Server 2022 or SQL Server 2025), and Azure patches both automatically. The option d explanation now says the MI policies don't offer SQL Server 2019. Answer (SQL Server on Azure VMs) unchanged.
- `questions/relational/dp900-2b-sql-serverless.yaml` (EN + FR, `explanation.correct`): automatic pause is now stated "in the General Purpose service tier". Stem and answer unchanged. The stem doesn't name a tier, and serverless is still the only option that bills compute by use.

## Checked and left unchanged

- No bank question or quiz of objectives 1.1–1.4 or 2.1–2.2 mentions "Gen2" (the Gen2 hits are Dataflow Gen2 or questions of domains 3 and 4) or ORC.
- `dp900-2b-sql-dd-logical-server` (distractor "pauses" explained as a serverless feature: still true), `dp900-2b-sql-yn-family`, `dp900-2b-sql-why-managed-instance`, `dp900-2b-sql-mi-automated-tasks`, `dp900-2b-sql-yn-managed-instance`, `dp900-2b-sql-yn-sql-database`, `dp900-2b-sql-hyperscale` (128 TB confirmed), `dp900-2b-sql-database-deployment-options`, `dp900-2b-sql-hot-workloads`, `dp900-2b-sql-dnd-compatibility`: none says that MI always runs the newest engine or that every serverless database pauses.
- Roles bank (36 questions on 1.4.x): no question has Cosmos DB managed by an administrator, and none relies on Fabric IQ.
- Quiz 22 q10 explanation ("serverless … can pause the database"): "can" stays true, so it wasn't changed. No quiz was changed.

## For a human decision

- FR product name: the chapters and 48 bank texts write « SQL Server sur Machines Virtuelles Azure ». The glossary has « Machines virtuelles Azure » (lowercase v) for Azure Virtual Machines. The fr-fr Learn form for the SQL product wasn't fetched, so nothing was changed.
- FR « stratégie de mise à jour » (MI update policy), used in 22 and in `dp900-2b-sql-fixed-version`, isn't in the glossary. It follows the glossary rule « stratégie » for policy. The policy names stay in English (Always-up-to-date).
- FR « General Purpose » kept in English for the service tier, as in the DP-300 bank. Not in the glossary.
- Not verified because of the fetch budget: the update-policy page (the default policy, and whether a SQL Server 2019 policy exists; the MI overview lists only the three named policies), and the serverless-tier page (site error).
