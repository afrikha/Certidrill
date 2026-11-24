# FIX-dp-750-1 — chapters 11, 12, 21, 22 and 31 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-750 11-compute 12-unity-catalog-objects 21-securing-objects 22-governance 31-ingestion-design` 0 problems; `content:validate --cert dp-750` 0 problems, 0 warnings; `check-quiz dp-750` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched. The shared WebFetch budget ran out several times. Every finding below was still fetched before any change was made.

## 11-compute

| Finding | Learn | Change |
| --- | --- | --- |
| Dedicated compute assigned to a group | "Dedicated compute overview" labels group access "(Public Preview)". "Dedicated compute group access" and "Compute configuration reference" give no status label | access-modes table: row marked "(Public Preview)". Bank question rewritten (see below) |
| Pools: cluster min vs Min Idle; max above capacity | Confirmed ("Compute configuration reference", Autoscaling with pools): a size above Min Idle starts no faster than without a pool; a max above Max Capacity makes creation fail | Added "(otherwise startup is no faster than without a pool)" |
| Materialized views: compute | "Use standalone materialized views": created and refreshed "from a Databricks SQL warehouse, or from a notebook running on serverless general compute". Warehouse types aren't named there | SQL warehouse trap: added the serverless notebook option. The pro/serverless rule is kept |
| Driver logs visibility | Matches the chapter (QZ report) | None |

## 12-unity-catalog-objects

| Finding | Learn | Change |
| --- | --- | --- |
| Materialized views: compute | Same page as above | tables-views bullet and key points: "or a notebook on serverless compute" |
| Federation always read-only | The overview ("Connect to external databases and catalogs") says read-only for both. The more specific "Hive metastore federation: enable Unity Catalog to govern tables…" says internal Hive metastores "allow reads and writes" (Hive metastore and Unity Catalog metadata updated) and external ones are read-only | foreign-catalogs: exception sentence; trap now about "a foreign catalog on an external database"; key points "(except a federated internal Hive metastore)" |
| Type widening DBR 15.2+ | "Type widening" (feature page): DBR 15.4 LTS and above; such tables can be read only by 15.4 LTS+. The ALTER TABLE … COLUMN page still says 15.2 | ddl bullet: DBR 15.4 LTS+, plus the read restriction |
| RENAME/DROP COLUMN "Public Preview" | SQL reference "ALTER TABLE … COLUMN clause": both clauses labelled Public Preview. "Rename and drop columns with Delta Lake column mapping" (feature page) has no label | None. For a human decision |
| Genie naming and end-user entitlement | "Create and manage a Genie Agent": "Genie Agents were formerly known as Genie Spaces". End users need "The consumer access or Databricks SQL workspace entitlement"; up to 50 tables, views or metric views | genie bullet: end-user entitlement added. Bank renamed (see below) |
| MySQL two-level namespace | Not stated explicitly on Learn (QZ report) | None (not confirmed) |
| REFRESH syntax | Confirmed by the QZ report | None |

## 21-securing-objects

| Finding | Learn | Change |
| --- | --- | --- |
| ALL PRIVILEGES exclusions | "Unity Catalog privileges reference": excludes `EXTERNAL USE SCHEMA`, `EXTERNAL USE LOCATION`, `MANAGE`, `READ METADATA` | Privilege table: new `READ METADATA` row (owner-visible metadata, child of `MANAGE`, inherited from the metastore); `ALL PRIVILEGES` row and trap list the four exclusions |
| Denials, ABAC grant/deny | "Unity Catalog permissions model concepts": denials inherit downward; ABAC policies grant or deny. "Attribute-based access control in Unity Catalog": DENY policies (Beta) | privileges: one sentence |
| Parent owner and child objects | Same page: an owner doesn't own children but can manage all new and existing child objects, "functionally the same as having MANAGE", not explicitly assigned | privileges: one sentence |
| Unity Catalog secrets | "Secret management": `catalog.schema.secret`, every workspace of the metastore, privileges on secret/schema/catalog; Azure Databricks-managed (no status) or Key Vault-backed (Beta); scopes have no secret-level access control | key-vault-secrets: new paragraph |
| Scope ACLs need Premium | "Workspace secret scopes": "Granting permissions on a secret scope requires the Premium plan" | key-vault-secrets: added |
| Dedicated compute with filters/masks | "Row filters and column masks": DBR 15.4–16.2 reads only; writes need 16.3+ with supported patterns such as `MERGE INTO` | table-column-row-security bullet |
| OAuth secrets | "Authorize service principal access to Azure Databricks with OAuth": deleted after 90 days without use; scopes fixed at generation | service-principals bullet |
| CREATE EXTERNAL LOCATION by default | "Admin privileges in Unity Catalog": metastore admins, and workspace admins of workspaces enabled for Unity Catalog automatically (created after November 9, 2023) | managed-identities: one sentence |
| Old `tables/row-and-column-filters` URL | Still serves "Row filters and column masks" (not a redirect); bank titles match | None |

## 22-governance

| Finding | Learn | Change |
| --- | --- | --- |
| "COMMENT ON doesn't target columns" (wrong trap) | SQL reference "COMMENT ON": `COMMENT ON COLUMN relation_name.column_name`, Databricks SQL and DBR 16.1+ | Comments table row, trap rewritten (16.1+ vs `ALTER TABLE … ALTER COLUMN … COMMENT` everywhere), key points. The chapter now agrees with `dp750-2a-column-comment-code` and `-comment-privileges` |
| Retention rule DBR 18.0 only | "Work with table history": 18.0+, and 12.2+ for UC managed tables; time travel older than `deletedFileRetentionDuration` blocked (same runtimes) | retention paragraph |
| ABAC: policy types, compute, older runtimes | ABAC overview: GRANT policies, DENY policies (Beta), views (Beta), metastore level (Beta). "Requirements, quotas, and limitations for row filter and column mask policies": serverless, standard 16.4+, dedicated 16.4+ **with fine-grained access control filtering enabled**; workaround for older runtimes = exclude the principal with `EXCEPT`. Row filter/mask policies carry no label | abac: policy-types sentence; requirements sentence rewritten with the workaround. row-filters-masks: "Not on views (… ABAC policies on views are Beta)" |
| Dedicated compute with filters/masks | Same as chapter 21 | limitations bullet |
| Lineage system tables 395 days vs "rolling 1-year window" | "Lineage in Unity Catalog" says a rolling 1-year window; "System tables reference" gives 395 days free retention for both lineage tables | None (both on Learn, not contradictory in practice). For a human decision |
| Lineage: `runs submit` / `spark submit` | Confirmed (lineage page): table and column lineage captured, link to the job run not | lineage: one sentence |
| Audit system table retention and details | "System tables reference": 395 days (kept). "Audit log system table reference": **"This system table is in Public Preview"**; SQL-definition keys of `request_params` omitted unless account admin or `databricks_pii_access`; events older than 14 days removed when a workspace is deleted | audit table row "(Public Preview; recommended)"; new paragraph with the two details |
| IP access lists for recipients | "Restrict OpenSharing recipient access using IP access lists": controls the REST API, activation URL and credential file download; without SecureConnect, storage URLs reachable from any IP | Tokens bullet |
| D2D-only assets, schema shares | "Create shares for OpenSharing": metric views only to Azure Databricks recipients; schema shares always include history (any runtime), no table aliases or partitions. "Agent skills" not found on that page | Protocol table: metric views added; History bullet: schema-share sentence |
| Auto time-to-live | "Automatic row deletion with auto time-to-live": no status label; buffer up to 6 days plus `deletedFileRetentionDuration`; example 30 − 6 − 7 = 17 days | retention: one sentence |
| December 8, 2026 token expiry tip | Re-verified on "Create a recipient object for non-Databricks users using bearer tokens" | None |

## 31-ingestion-design

| Finding | Learn | Change |
| --- | --- | --- |
| SQL Server integrated CDC | "Microsoft SQL Server ingestion connector": standard CDC (gateway + pipeline) and integrated CDC (one pipeline, `connection_name`, `connector_type: CDC`, staging through `data_staging_options`). No release status on the page | ingestion-tools: one sentence. The gateway row is kept (standard architecture still documented) |
| Managed streaming connectors | "Streaming connectors": managed Kafka and RabbitMQ connectors (serverless, UC connection); Event Hubs not listed. "Kafka connector": "This feature is in Beta" | Kafka/Event Hubs row: "(the Lakeflow Connect managed Kafka connector is in Beta)". Bank unchanged (Beta can't be the answer) |
| Foreign Iceberg tables read-only via Lakehouse Federation | Confirmed ("What is Apache Iceberg in Azure Databricks?": "read-only", "uses Lakehouse Federation") | None |
| Partitioned → liquid conversion | "Use liquid clustering for tables": `ALTER TABLE … REPLACE PARTITIONED BY WITH CLUSTER BY` in DBR 18.1+, then `OPTIMIZE` (`FULL` recommended); clustering not compatible with partitioning | partitioning: one sentence. `dp750-3a-replace-partitioning` is correct |
| Default trigger latency | "Configure Structured Streaming trigger intervals": default trigger "3-5 second latency" | Loading-method table, Streaming row |

## Mock-exam bank questions changed

- `questions/environment/dp750-1a-ml-group-dedicated.yaml` (1.1.3, single, difficulty 3, same id): the correct answer was dedicated compute assigned to a group (Public Preview). Rewritten: one data scientist needs GPU compute with Databricks Runtime ML and Unity Catalog access. Answer: Machine learning + GPU worker type + Dedicated assigned to her. Distractors: Standard (ML not supported), general-purpose worker type (no GPU), No isolation shared (no Unity Catalog). Facts from "Databricks Runtime for Machine Learning" (fetched).
- The 7 `dp750-1b-genie-*` questions (entity-matching, instruction-limits, knowledge-store-facts, sql-expressions, sql-function, text-instructions, trusted-assets): "AI/BI Genie space" / "space" became "Genie Agent" / "agent" (FR « Genie Agent » / « l'agent », as in chapter 12 FR). This follows Learn's rename. The answers don't change. The reference "Set up and manage an AI/BI Genie space" (`genie/set-up`, which still shows the old 25-table limit) was replaced by "Create and manage a Genie Agent" (`genie-agents/set-up`, fetched) in instruction-limits, sql-function and text-instructions.
- `questions/environment/dp750-1b-federation-access-rules.yaml` (EN + FR explanation): "Lakehouse Federation is read-only" became "Query federation to an external database is read-only", because federated internal Hive metastores allow writes. The answer doesn't change.

## Checked and left unchanged

Comments (`dp750-2a-column-comment-code`, `-comment-privileges`, `-metadata-commands-mapping`, `cs3a-sales-comments`: they already agree with Learn). Retention (`dp750-2b-ret-*`, series `dp750-sr2-ledger-retention-*`: the series says DBR 18.0+). Lineage (`dp750-2b-lin-retention` says "rolling one-year window", the lineage page's wording). Filters and masks on dedicated compute (`dp750-2b-rfcm-dedicated-runtime`: read scenario). ABAC (`dp750-2b-abac-runtime`, which already mentions fine-grained access control filtering). Secrets (`dp750-2a-kv-scope-isolation`: still right for scopes, and the stem requires the shared scope; `-secret-acl-mapping` and `-kv-scope-order` already say Premium). `ALL PRIVILEGES` questions (none lists the exclusions). Delta Sharing tokens and IP lists (`dp750-2b-ds-token-lifetime`, `-ds-compromised-order`). Ingestion tools (`dp750-3a-tool-match`, `-tool-statements`, `-db-connector-gateway`: the stem says "standard gateway-based architecture"). Iceberg (`dp750-3a-managed-iceberg-write`, `-iceberg-reads-props`). `dp750-3a-replace-partitioning` (confirmed). Federation (`dp750-1b-federation-choice`, `-postgres-sql`: about external databases, read-only is right). `dp750-1b-ddl-rename-column` (see below). `dp750-1a-dedicated-requirements` and `dp750-1a-ml-runtime-photon` mention group assignment only in explanations, not as the answer.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 22 doesn't use `COMMENT ON`, and quiz 21's `ALL PRIVILEGES` item tests only `MANAGE`.

## For a human decision

- **Audit log system table is Public Preview** (both the audit log reference and the DP-750 training unit "Configure audit logging" say so). The training unit teaches it for objective 2.2.6, so the bank questions where it is the answer were kept: `dp750-2b-aud-system-grant`, `-aud-permissions-sql`, `-aud-events-hotarea`, `-aud-statements`, `-aud-destinations`. The chapter now labels it. Decide whether to keep it as a correct answer.
- **RENAME COLUMN / DROP COLUMN**: the SQL reference labels them Public Preview, but the column-mapping feature page has no label. `dp750-1b-ddl-rename-column` (answer `RENAME COLUMN`) and chapter 12 were left unchanged. The SQL reference also implies that RENAME COLUMN needs table ownership (only ADD/ALTER/DROP COLUMN are listed under `MODIFY`).
- **Dedicated group access status**: only the overview page labels it Public Preview; the specific page is silent. I treated it as preview (chapter label plus bank rewrite). Revert if Microsoft confirms GA.
- **Lineage system table retention**: 395 days (system tables reference, kept in the chapter) vs "rolling 1-year window" (lineage page, used by `dp750-2b-lin-retention`).
- **Chapter 32 (another agent's)**: its Exam trap telling readers to recreate the table with CTAS to change partitioning is out of date. `REPLACE PARTITIONED BY WITH CLUSTER BY` converts in place on DBR 18.1+.
- **No status given on Learn**: SQL Server integrated CDC, the RabbitMQ connector, Azure Databricks-managed Unity Catalog secrets, auto time-to-live, row filter / column mask ABAC policies, SecureConnect. All are mentioned without a status label.
- Not confirmed, left out: "agent skills" as a Databricks-to-Databricks-only asset; MySQL's two-level namespace stated explicitly; the materialized view schedule ranges (not re-fetched in this task).

## French terms not settled (not in the glossary)

- « Genie Agent » kept in English in FR (chapter 12 and the 7 bank questions), but `case-studies/dp750-cs3a-proseware.yaml` and `cs3a-sales-comments` write « agent Genie ». One form should be chosen.
- « contrôle d'accès affiné » (fine-grained access control); « refus » (denials); « stratégies GRANT / DENY »; « vues de métriques » (metric views, already in chapter 12); « CDC intégrée » (integrated CDC); « volume intermédiaire (staging) »; « préversion publique » (built from the glossary's « préversion »); « bêta ».
- « étendues » for OAuth scopes (chapter 21) collides with « étendue de secrets » (secret scope).
- « droit consumer access » (entitlement name left in English, like « droit Databricks SQL »).
