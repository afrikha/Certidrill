A retrieval-augmented application is only as good as the vector store behind it. This chapter covers how to choose and organize the store (Amazon Bedrock Knowledge Bases, Amazon OpenSearch Service, Aurora PostgreSQL with pgvector, Amazon S3 Vectors), how to attach metadata that sharpens retrieval, how to keep search fast at scale, how to connect document sources, and how to keep the index current. Exam questions usually give a set of constraints (operational overhead, filtering needs, source systems, freshness) and ask which store or which maintenance design meets them.

<!-- section: vector-architectures | objectives: 1.4.1 -->
## Vector store architectures for FM augmentation

**Amazon Bedrock Knowledge Bases** is the default answer when a question asks for RAG with the least operational overhead. It exists in two forms:

| Aspect | Managed Knowledge Base (recommended by AWS) | Customer-managed Knowledge Base |
| --- | --- | --- |
| Vector store | Fully managed by Bedrock, auto-scaling; you never see the database | You provision it (OpenSearch Serverless, Aurora, Neptune Analytics, S3 Vectors...) and keep direct access |
| Embedding model | Built-in managed model, or your own Bedrock embedding model (float32, 1,024 dimensions only) | Any supported Bedrock embedding model |
| Reranking | Built-in managed reranker, or a Bedrock reranker at query time | Bedrock reranker models |
| Connectors | 7: S3, SharePoint, Confluence, Web Crawler, Google Drive, OneDrive, Custom | S3 and Custom |
| Chunking | Built-in (default) or fixed-size | Default, fixed-size, hierarchical, semantic, none, custom Lambda |
| Extras | Agentic retrieval, document-level ACL filtering, native AgentCore Gateway integration | Full control of index settings, distance metric and storage |

Choose the customer-managed form when the question requires a specific vector database, custom index tuning, hierarchical or semantic chunking, or direct SQL or query DSL access to the vectors.

Vector stores supported by customer-managed knowledge bases:

| Store | Pick it when | Notable constraints |
| --- | --- | --- |
| Amazon OpenSearch Serverless | Serverless vector collection, hybrid search, binary vectors | Vector index with the `faiss` engine |
| OpenSearch Service managed cluster | Existing domain, full control of shards and instances | Public access domain only (VPC domains not supported for Knowledge Bases), `faiss` engine (`nmslib` not supported), 2.13+ for k-NN, 2.16+ for binary |
| Aurora PostgreSQL (pgvector) | Relational team, SQL joins with business tables, hybrid search | Same account as the knowledge base, RDS Data API enabled, credentials in Secrets Manager |
| Amazon S3 Vectors | Lowest storage cost for large, infrequently queried corpora | Float embeddings only, 1 KB custom metadata and 35 keys per vector |
| Neptune Analytics | GraphRAG (entities and relationships) | Empty graph created with a vector search index |
| Pinecone, Redis Enterprise Cloud, MongoDB Atlas | The company already runs that product | Credentials in Secrets Manager |

The exam guide names four architecture patterns:

- **Hierarchical organization with Knowledge Bases**: hierarchical chunking stores small child chunks for precise matching and returns their larger parent chunk to the model for context.
- **OpenSearch Service with the Neural plugin for Bedrock integration**: an ML Commons connector lets the domain call a Bedrock embedding model itself, so documents are embedded by an ingest pipeline and queries are embedded at search time (neural search). AWS provides CloudFormation integration templates for Titan Text Embeddings, Cohere Embed and Titan Multimodal Embeddings (domain 2.9 or later, fine-grained access control enabled, role mapped to `ml_full_access`). Topic-based segmentation means one index (or index pattern) per topic, each with its own pipeline and mapping.
- **Amazon RDS with S3 document repositories**: the original files stay in Amazon S3 and the relational database holds the document catalog, permissions and the vectors (pgvector), so one SQL query can combine similarity with business filters.
- **DynamoDB with vector databases**: DynamoDB holds document metadata, versions and ownership at single-digit-millisecond latency, and the vector store holds embeddings keyed by the same document ID. An OpenSearch Ingestion pipeline (DynamoDB source, change data capture) keeps an OpenSearch index in step with the table.

Since August 2026, DynamoDB also offers native vector search: a vector index on a table answers approximate nearest neighbor queries, with attribute filters, at single-digit-millisecond latency. It suits applications whose operational data already lives in DynamoDB, with embeddings you generate yourself (for example with a Bedrock embedding model).

> **Exam trap.** DynamoDB is not in the list of vector stores that Bedrock Knowledge Bases can use. A question that requires managed ingestion, chunking and citations from Knowledge Bases needs one of the supported stores; DynamoDB then stays the metadata or catalog layer.

<!-- section: metadata-frameworks | objectives: 1.4.2 -->
## Metadata frameworks for precise retrieval

Metadata turns "find similar text" into "find similar text from the right department, version and date". Three AWS mechanisms carry it:

| Mechanism | Limits and behavior | Typical use |
| --- | --- | --- |
| S3 user-defined object metadata | `x-amz-meta-` headers, 2 KB in total, set at upload; changing it requires copying the object | Author, source system, ingestion timestamp |
| S3 object tags | Up to 10 tags per object, editable, usable in IAM policies and Lifecycle rules | Domain classification, sensitivity, retention class |
| Knowledge Bases sidecar file | `<file name>.metadata.json` in the same S3 folder as the document, 10 KB maximum | Attributes used for retrieval filtering |

Knowledge Bases filters on the attributes declared in the sidecar file (or in the metadata fields of a CSV document): to filter on values held in S3 user metadata or tags, a Lambda function in the ingestion pipeline writes them into the sidecar. The sidecar for `policy-2026.pdf` is `policy-2026.pdf.metadata.json`:

```json
{
  "metadataAttributes": {
    "department": {
      "value": { "type": "STRING", "stringValue": "finance" },
      "includeForEmbedding": false
    },
    "published_epoch": {
      "value": { "type": "NUMBER", "numberValue": 1767225600 },
      "includeForEmbedding": false
    },
    "author": {
      "value": { "type": "STRING", "stringValue": "j.doe" },
      "includeForEmbedding": true
    }
  }
}
```

- Types: `STRING`, `NUMBER`, `BOOLEAN`, `STRING_LIST`.
- `includeForEmbedding: true` concatenates the key and value to the chunk text before embedding, so the attribute influences semantic similarity; the returned chunk text stays raw. With `false` (or the simplified `"key": "value"` format) the attribute is stored only for filtering.
- Store dates as epoch numbers so that range operators work.
- Reserved fields start with `x-amz-bedrock` (customer-managed) or an underscore such as `_source_uri` (managed). You cannot override them.

At query time, a filter narrows the vector search before ranking:

| Operator | Types |
| --- | --- |
| `equals`, `notEquals` | String, number, boolean |
| `greaterThan`, `greaterThanOrEquals`, `lessThan`, `lessThanOrEquals` | Number |
| `in`, `notIn` | String list |
| `stringContains`, `listContains` | String / string list (API only) |
| `startsWith` | String, OpenSearch Serverless only |
| `andAll`, `orAll` | Up to 5 expressions each, one level of nesting |

Managed knowledge bases and S3 vector buckets do not support `startsWith` or `stringContains`. **Implicit filtering** lets Bedrock derive the filter from the user's question and a metadata schema you describe (supported with Anthropic Claude models).

> **Exam trap.** With S3 Vectors as the store, custom metadata is capped at 1 KB and 35 keys per vector (10 non-filterable keys at most); exceeding it fails the ingestion job. Large hierarchical chunks also consume that budget, which is why AWS does not recommend hierarchical chunking with S3 Vectors.

<!-- section: vector-performance | objectives: 1.4.3 -->
## High-performance vector search at scale

**OpenSearch sharding strategy** (OpenSearch Service guidance):

- Keep shards between **10 and 30 GiB** when search latency matters (30–50 GiB for write-heavy log workloads).
- No more than **25 shards per GiB of Java heap** on a node.
- OpenSearch Service creates indexes with 5 primary shards and 1 replica by default (open-source OpenSearch defaults to 1 and 1). The primary shard count cannot easily change after creation, so size it before the first document: (source data + growth) × (1 + indexing overhead) / target shard size.
- Spread shards evenly across data nodes; replicas add query throughput and availability.

**k-NN memory**: HNSW graphs live off-heap. OpenSearch Service gives half the RAM to the JVM heap (capped at 32 GiB), and k-NN can use up to 50 % of the remaining half by default: a 32 GiB node holds about 8 GiB of graphs. Watch `KNNGraphMemoryUsage`; when graphs exceed that budget, latency degrades. Remedies: more or larger nodes, fewer dimensions (Titan Text Embeddings V2 at 512 or 256), binary embeddings (OpenSearch only), or a separate index per domain.

**Index tuning**: Knowledge Bases on a managed cluster expects an HNSW `faiss` method; `ef_construction` and `m` trade build time and memory for recall.

```json
{
  "settings": { "index.knn": true },
  "mappings": {
    "properties": {
      "embedding": {
        "type": "knn_vector",
        "dimension": 1024,
        "method": {
          "name": "hnsw",
          "engine": "faiss",
          "space_type": "l2",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      },
      "AMAZON_BEDROCK_TEXT_CHUNK": { "type": "text" },
      "AMAZON_BEDROCK_METADATA": { "type": "text", "index": "false" },
      "department": { "type": "keyword" }
    }
  }
}
```

Fields used in metadata filters must be `keyword` (or `text` with a `keyword` subfield); otherwise filtering fails.

**Multi-index approaches**: one index per specialized domain (legal, product, HR) lets each use its own embedding model, analyzer and shard count, keeps graphs smaller and lets the application query only the relevant index; an index alias can group them for cross-domain queries. With Knowledge Bases, the equivalent is one knowledge base per domain, or one knowledge base with a `domain` metadata filter.

**Hierarchical indexing**: a coarse level (document summaries or parent chunks) narrows candidates, and a fine level (child chunks) gives precise passages. Knowledge Bases hierarchical chunking implements this natively.

**Aurora pgvector at scale**: HNSW index with `vector_cosine_ops`, a GIN index on `to_tsvector` of the chunk text for hybrid search, a GIN index on `custom_metadata`, and, with pgvector 0.8.0 or later, `hnsw.iterative_scan` so that filtered queries still return enough rows.

> **Exam tip.** "Searches slowed down as the index grew, the shards are 120 GiB each" points to resharding (reindex into more primaries). "Memory pressure on data nodes with millions of 1,024-dimension vectors" points to smaller or binary embeddings, or larger nodes.

<!-- section: integration-components | objectives: 1.4.4 -->
## Connecting document management systems, wikis and knowledge sources

| Source | Design with the least custom code |
| --- | --- |
| SharePoint, Confluence, Google Drive, OneDrive, public website | Managed Knowledge Base native connector, with document-level ACL filtering at retrieval (except Web Crawler) |
| Amazon S3 | S3 data source with optional inclusion prefixes (same Region as the knowledge base, general purpose buckets only) |
| Any other system (internal wiki, DMS, ticketing tool) | Custom data source: a Lambda function, container or AWS Glue job reads the source API and pushes documents with `IngestKnowledgeBaseDocuments` |
| SaaS application supported by Amazon AppFlow | AppFlow flow to S3, then S3 data source |
| On-premises file shares | AWS DataSync or AWS Transfer Family to S3, then S3 data source |
| Agents that must query the knowledge base | Managed Knowledge Base exposed as an MCP tool through AgentCore Gateway |

> **Exam trap.** Starting September 30, 2026, new Confluence, SharePoint, Salesforce and Web Crawler connectors can no longer be created on customer-managed knowledge bases (existing ones keep working). For a new design that needs these sources, choose a Managed Knowledge Base.

Two closed services still appear in the exam guide: Amazon Kendra (including the Kendra GenAI index usable by Knowledge Bases) and Amazon Q Business closed to new customers on July 30, 2026. Never choose them for a new design.

Security rules apply to every connector: credentials for third-party systems live in AWS Secrets Manager, the knowledge base service role needs read access to the bucket and the secret, and a customer managed AWS KMS key can encrypt the data source and the intermediate data.

<!-- section: vector-maintenance | objectives: 1.4.5 -->
## Keeping vector stores current

**Sync (ingestion job)**: each sync crawls new, modified and deleted content since the last sync; the first sync crawls everything. Unchanged documents are not re-embedded.

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id KB12345678 \
  --data-source-id DS12345678

aws bedrock-agent get-ingestion-job \
  --knowledge-base-id KB12345678 \
  --data-source-id DS12345678 \
  --ingestion-job-id IJ12345678
```

Maintenance patterns, from simplest to most real-time:

| Requirement | Design |
| --- | --- |
| Refresh daily, weekly or monthly with no code | Managed Knowledge Base `syncSchedule` (`daily`, `weekly` with `dayOfWeek`, `monthly` with `dayNumber` 1–28 or `lastDayOfMonth`) |
| Scheduled refresh of a customer-managed knowledge base | Amazon EventBridge Scheduler invoking `StartIngestionJob` (through Lambda or Step Functions) |
| Index a document within minutes of its upload | S3 event notification to EventBridge, then Lambda calling `IngestKnowledgeBaseDocuments` for that document only |
| Index changes from a DynamoDB catalog | DynamoDB Streams, then OpenSearch Ingestion (CDC) or a Lambda function |
| Audit what changed in a bucket | S3 Metadata journal table (Apache Iceberg in S3 Tables, near real time, queried with Athena) |
| Multi-step refresh with validation and rollback | Step Functions: extract, validate, ingest, run test queries, alert on failure |

Rules for direct ingestion:

- With a **custom** data source, documents ingested or deleted through the `KnowledgeBaseDocuments` operations become part of the data source; no sync is needed.
- With an **S3** data source, direct ingestion updates the index but not the bucket: write the same change to S3, or the next sync overwrites it.
- Never run `IngestKnowledgeBaseDocuments` and `StartIngestionJob` at the same time.

The data source's `dataDeletionPolicy` (`DELETE` or `RETAIN`) decides whether vectors are removed when the data source is deleted. Monitor `GetIngestionJob` statistics (documents scanned, indexed, failed) and alarm on failures; stale or failed syncs are a common root cause of "the assistant answers with last quarter's policy".

> **Exam trap.** Moving to another embedding model is not a sync: vectors from two models live in different vector spaces (often with different dimensions) and cannot be compared. Plan a new knowledge base or index, re-ingest every document, validate retrieval, then switch the application over.

<!-- section: key-points -->
## Key points

- Least operational overhead for RAG: Bedrock Managed Knowledge Base. Specific vector database, custom index tuning or hierarchical and semantic chunking: customer-managed knowledge base.
- S3 Vectors: cheapest storage, float embeddings only, 1 KB and 35 metadata keys per vector, hierarchical chunking not recommended. Binary vectors: OpenSearch Serverless or managed clusters only.
- OpenSearch managed cluster for Knowledge Bases: public access domain, `faiss` engine, 2.13+ (2.16+ for binary). Aurora: same account, Data API, Secrets Manager, HNSW plus GIN indexes.
- Metadata: sidecar `<file>.metadata.json` (10 KB), epoch numbers for dates, `includeForEmbedding` to influence similarity, filter operators with `andAll` / `orAll`; S3 user metadata (2 KB) and tags (10) must be copied into the sidecar.
- Shards 10–30 GiB for search, at most 25 per GiB of heap, primary count decided before indexing; k-NN graphs need off-heap memory.
- New Confluence, SharePoint, Salesforce and Web Crawler sources: Managed Knowledge Base (customer-managed connector creation ended September 30, 2026). Kendra and Q Business are closed to new customers.
- Freshness: incremental sync, `syncSchedule` on managed knowledge bases, event-driven `IngestKnowledgeBaseDocuments`, and never a direct ingestion and a sync at the same time.
