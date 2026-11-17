# K-dp-700-cs1 — report

3 case studies, 18 questions (`dp700-cs1*`), validator: 0 problem(s).

| Case study | Architecture | Questions (objective, type) |
| --- | --- | --- |
| dp700-cs1a-alpine-ski-house | Real-Time Intelligence + Spark structured streaming | stream-engines (2.3.1 dragdrop), update-policy (2.3.6 dropdown KQL), streaming-write (2.3.5 dropdown PySpark), stream-restart (2.1.3 single), stream-metrics (3.1.2 single), domain-role (1.1.2 single) |
| dp700-cs1b-lucerne-publishing | Warehouse, dimensional model, database projects, governance | data-stores (2.2.1 dragdrop), scd2-author (2.1.2 dropdown T-SQL), primary-key-error (3.2.6 single), database-project (1.2.2 single), endorse-label (1.3.6 yes/no), audit-deletion (1.3.7 single) |
| dp700-cs1c-trey-research | Lakehouse, shortcuts, Spark settings, OneLake security | shortcut-auth (2.2.3 single), spark-settings (1.1.1 multi), assay-summary (2.2.8 dropdown PySpark), foreach-parameter (1.4.3 dropdown), client-access (1.3.8 single), schema-mismatch (3.2.3 single) |

Difficulty: 5 easy, 10 medium, 3 hard.

## Overlap avoided

The parallel cs3/cs4 case studies (Proseware, Woodgrove, Tailspin, City Power) already test: accelerated shortcuts, eventstream filter before ingestion, KQL bin windows, Activator heartbeat, `.show ingestion failures`, caching policy, mirroring, adjuster RLS, DDM partial + UNMASK, query insights long-running queries, storage event trigger with file name, MERGE on most recent version, VACUUM retention, sharing with Read all with Apache Spark. My first drafts used several of these; I replaced them with other decisions.

## Facts not fully verified on Learn (check during review)

- `@activity('Get instruments').output.value` / `.output.firstRow`: the Fabric Lookup page only names "firstRow vs value"; the expression path is the ADF one.
- `.trigger(continuous=...)` explanation (experimental, limited sinks) comes from Apache Spark knowledge, not from a fetched Learn page.
- The `@'[...]'` literal form of `.alter table ... policy update` is from memory of the Kusto examples; the fetched page showed the JSON array body.
- OneLake security: the lakehouse-sharing page still calls OneLake security roles "(preview)"; the data-access-control page gives no status.
- dp700-cs1c-assay-summary cites Learn training units (Spark SQL examples with COALESCE / IS NOT NULL / joins); they don't show the PySpark `dropna` / `countDistinct` calls.
- French UI labels kept in English: Customize compute configurations for items, Reserve maximum cores for active Spark jobs, Read all with Apache Spark, Promoted/Certified. « définition de travail Spark », « stratégie de nouvelle tentative », « hub de supervision », « onglet de streaming structuré », « accès à l'espace de travail approuvé », « règle d'instance de ressource » come from the fr-fr pages.
