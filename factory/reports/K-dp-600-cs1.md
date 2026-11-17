# K-dp-600-cs1 — report

3 case studies, 18 questions (6 each), validator: 0 problem(s).

- dp600-cs1a-wingtip-toys (retail, lakehouse medallion + Direct Lake on OneLake + deployment pipeline): 1.1.2, 1.1.3, 1.2.3, 2.2.7, 3.1.4, 3.2.3
- dp600-cs1b-woodgrove-bank (banking, Azure SQL mirroring + warehouse RLS + Import model, XMLA): 1.1.3, 1.1.5, 1.2.5, 2.1.3, 3.1.6, 3.2.5
- dp600-cs1c-litware-energy (utility, eventhouse/KQL + OneLake availability + composite model): 1.1.1, 1.2.4, 2.1.2, 2.1.5, 2.3.3, 3.1.7

Difficulty: 6 easy / 9 medium / 3 hard. Types: single 8, dropdown 4 (PySpark, DAX, T-SQL, KQL), yes/no 2, drag and drop 2, multi 1, ordering 1.

## Points to check at review

- WebFetch budget (shared) ran out several times; all facts used were fetched from Learn except: Query scale-out (read-only replicas) and automatic aggregations (DirectQuery models) in dp600-cs1b-large-format distractor explanations, and the Monitoring hub description (cs1c distractors). These are standard behaviours but were not re-fetched.
- Lakehouse sharing permission names: Learn tables say "Read all with Apache Spark" / "Read all with SQL analytics endpoint"; the exact dialog checkbox text was not visible on the fetched pages.
- Fabric Warehouse RLS page documents FILTER predicates only; the BLOCK distractor explanation uses the general SQL definition.
- Copy job: Learn documents run once, schedule, manual and pipeline-triggered runs; no standalone continuous mode, which the cs1b-replicate-core distractor relies on.
- French: deployment pipeline "stages" written « phases »; endorsement badges written with the English name in parentheses (« Certifié (Certified) », « Données de référence (Master data) ») because the official FR badge names were not verified.
- dp600-cs1b-incremental-refresh assumes the first publish recreates the partitions (republishing from Desktop removes existing partitions, per Learn).
- DAX code uses `language: text` (no DAX highlighter in lib/markdown.ts).
