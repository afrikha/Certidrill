# K-dp-600-cs2 — report

Case studies (prefix dp600-cs2), 18 questions, validator: 0 problem(s).

- dp600-cs2a-coho-vineyard (agriculture; eventhouse + lakehouse + Direct Lake): data-access (dragdrop 2.1.3), kql-moisture (dropdown 2.3.3), direct-lake-behavior (yes/no 3.2.3), agronomy-mode (single 3.2.4), consultant-access (multi 1.1.2), endorsement (single 1.1.5).
- dp600-cs2b-bellows-college (higher education; Azure SQL mirroring + warehouse + Import model + deployment pipeline): sis-replication (single 2.1.3), dimstudent-dedup (dropdown T-SQL 2.2.7), instructor-bridge (dropdown text 3.1.3), dean-rls (yes/no 1.1.3), deployment-rules (single 1.2.3), impact-analysis (single 1.2.4).
- dp600-cs2c-blue-yonder-airlines (airline; enterprise Import model, XMLA, Git): large-format (single 3.1.6), incremental-refresh (dropdown M 3.2.5), calc-features (dragdrop 3.1.5), partition-refresh (single 1.2.5), branch-workflow (ordering 1.2.1), airport-denormalize (single 2.2.4).

Difficulty 5/9/4. No DP-600 case studies existed when I started; the cs1/cs3/cs4 agents were writing at the same time, so their company choices could not be checked.

## Points not verified word for word on Learn

- KQL: the summarize page does not say that `by bin(Timestamp, 1h)` keeps the column name Timestamp (standard Kusto behaviour; kql-moisture relies on it for `order by`).
- Git: the "Update all" label is not used; the ordering action says "update the workspace from the Source control pane". French UI labels for Source control / Branch out (« Contrôle de code source », « créer une branche ») were not checked on fr-fr pages.
- RLS for app audiences: the RLS page covers workspace roles only; that app users are filtered is standard Power BI behaviour, not quoted.
- Large models page says "default size limit is 1 GB"; questions avoid any number other than the 30 GB target on an F128.
- The XMLA page says the capacity default is read-only; the case states Read Write explicitly.
- Lakehouse sharing with Read only + T-SQL GRANT: sourced from the warehouse sharing page (Read = CONNECT) and the SQL granular permissions page (applies to the SQL analytics endpoint); OneLake security "user identity" mode of the SQL analytics endpoint is not considered (default delegated mode assumed).
- The shared WebFetch budget ran out once during the task; all references were fetched afterwards.
