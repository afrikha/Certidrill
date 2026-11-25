# QZ-dp-900-12-data-storage — end-of-chapter quiz, DP-900, chapter 12

Result: `content/dp-900/quizzes/12-data-storage.yaml`, 10 questions (`dp900-qz-12-01` to `-10`), all `status: draft`.
`npx tsx factory/check-quiz.ts dp-900 12-data-storage` → 0 problem(s), 0 warning(s).

- Objectives: 1.2.1 ×3 (q2, q3, q6), 1.2.2 ×3 (q1, q7, q8), 1.2.3 ×4 (q4, q5, q9, q10).
- Types: single 4, yesno_statements 2, dropdown 2, multi 1, dragdrop 1. Positions 6–10: yesno, dropdown, multi, dropdown, dragdrop.

## Sources (fetched on 2026-11-24)

- `explore-core-data-concepts/3-file-storage` ("Explore file storage"), `4-databases` ("Explore databases"),
  `explore-roles-responsibilities-world-of-data/3-data-services` ("Identify data services"),
  `azure/storage/blobs/data-lake-storage-introduction` ("Introduction to Azure Data Lake Storage").
- The hourly WebFetch limit was hit before the Table storage, Azure Files, Blob Storage and OneLake doc pages could be fetched:
  every fact used for them comes from the "Identify data services" unit (Fabric runs on "one shared storage layer called OneLake";
  tables = key-value storage for quick reads and writes; file shares = corporate network shares; Cosmos DB = global-scale NoSQL).

## Chapter out of date against current Learn

- **"Azure Data Lake Storage Gen2"** (chapter 12, table of section azure-data-stores): the current doc page calls the product
  "Azure Data Lake Storage" and no longer uses "Gen2" as a product name. The quiz uses "Azure Data Lake Storage" (as the bank does).
- **ORC** (chapter 12, after the XML sample): the current Learn unit "Explore file storage" no longer mentions ORC; its optimized
  formats are Avro, Parquet and Delta Lake only. Consider removing the ORC sentence. ORC isn't used in the quiz.

## Doubts

- q3 (Avro for record-by-record reading over a low-bandwidth link): Parquet files also carry metadata; the deciding facts are
  "row-based" and "minimizing storage and network bandwidth", which Learn states for Avro.
- q8 option c (a key-value database doesn't parse its values): inferred from Learn's definition of the document database as the
  form of key-value database whose value the system is optimized to parse and query.
- q9: Azure SQL Database (which has graph features) is deliberately absent from the service slot to keep one defensible answer.
- Mock-exam overlap: the 38 bank questions of 1.2.1–1.2.3 cover every single-service decision; q7, q9 and q10 combine several
  of them in new scenarios, with other traps (Azure Files vs data lake folders, Table storage vs Cosmos DB, graph + service).
