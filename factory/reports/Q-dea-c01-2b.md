# Q-dea-c01-2b — report

49 questions in `content/dea-c01/questions/datastore/`, prefix `deac01-2b-` (7 per objective 2.1.8, 2.2.1–2.2.6), single 41 / multi 8, difficulty 15 easy / 24 medium / 10 hard. Validators: `factory/validate.ts` and `content:validate --cert dea-c01` 0 problems (only the pre-existing blueprint dragdrop warning).

## Deviations / choices
- Multi stems have no "NOTE: Each correct selection is worth one point." (WRITING_GUIDE AWS rule 4, blueprint scoring all_or_nothing), although older SAA/DVA questions still carry it.
- French "crawler": AWS fr_fr is inconsistent (« robot », « robot d'exploration »); used « robot d'analyse » as in objectives.yaml, with « (crawler) » at first mention in the stem. Classifier = « classificateur » (AWS fr_fr). LF-tags kept in English.
- Course chapter 22-cataloging did not exist yet when the batch was written; questions follow AWS docs only.

## Facts not stated word for word on a fetched AWS page
- deac01-2b-vec-ivf-pq-domain: k-NN model training (IVF/PQ) on an OpenSearch Service *domain*. Inferred from the serverless page (collections do not support IVF or the training API) and the AWS Big Data blog benchmark of IVFPQ on OpenSearch Service.
- deac01-2b-conn-multi-private-endpoints: the Glue interface endpoint for a job in an isolated subnet is inferred from the Glue PrivateLink page ("all API actions from your VPC") and the JDBC-VPC page (internet access needed for services without endpoints; KMS endpoint when the catalog is encrypted).
- deac01-2b-use-athena-dynamodb-connector: "Redshift external schemas do not support FROM DYNAMODB" relies on the list of external schema sources (DATA CATALOG, HIVE METASTORE, POSTGRES, MYSQL, KAFKA...), not on a fetched page.
- deac01-2b-vec-hnsw-* / multi facts on IVF vs HNSW: DocumentDB vector search page (HNSW/IVFFlat, lists, probes, efSearch) and MemoryDB overview (FLAT/HNSW, EF_RUNTIME, reindexing); pgvector specifics avoided.
