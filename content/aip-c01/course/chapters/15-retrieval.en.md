Retrieval quality decides answer quality: a foundation model cannot use a passage that was split badly, embedded poorly or ranked tenth. This chapter covers the retrieval chain from end to end: segmenting documents, choosing embeddings, deploying vector search, improving relevance with hybrid search and reranking, transforming queries, and exposing retrieval to models and agents through consistent interfaces. Questions usually describe a symptom (answers miss context, exact product codes are not found, multi-part questions fail) and ask for the setting or component that fixes it.

<!-- section: chunking | objectives: 1.5.1 -->
## Document segmentation strategies

Chunking is chosen per data source in customer-managed knowledge bases (`vectorIngestionConfiguration`). The options:

| Strategy | How it works | Parameters | Use it when |
| --- | --- | --- | --- |
| Default | Chunks of about 300 tokens, sentence boundaries preserved | None | No special requirement |
| Fixed-size | Chunks of a maximum token count with overlap | Max tokens, overlap percentage | Uniform documents, predictable cost |
| Hierarchical | Two levels: child chunks are matched, then replaced by their parent chunk in the results | Max parent tokens, max child tokens, overlap tokens | Long structured documents where precise matching and broad context are both needed |
| Semantic | Splits where the meaning changes, using embedding dissimilarity between sentences | Max tokens, buffer size, breakpoint percentile threshold | Documents whose topics shift inside sections (transcripts, reports) |
| No chunking | Each document is one chunk | None | Documents already pre-split (FAQ entries, product cards), or custom chunking in Lambda |

Details the exam tests:

- **Semantic chunking** uses a foundation model, so ingestion costs more. Buffer size 1 embeds each sentence with the previous and next one (3 sentences). A higher breakpoint percentile threshold gives fewer, larger chunks.
- **Hierarchical chunking** returns fewer results than `numberOfResults` when several children share a parent. AWS does not recommend it with S3 Vectors, and over about 8,000 tokens combined it can hit metadata size limits.
- **No chunking** loses page numbers in citations and the `x-amz-bedrock-kb-document-page-number` filter.
- Parsed content (Markdown, HTML, output of the advanced parsers) keeps tables and figures with context when the page or table is 10,000 characters or fewer, and chunks never cross logical boundaries such as pages or sections.
- A Managed Knowledge Base offers only built-in (default) or fixed-size chunking.

**Custom chunking with Lambda**: a custom transformation function runs at the `POST_CHUNKING` step. Two patterns:

1. Choose **no chunking** and let the Lambda function split documents your way (by heading, clause or record), writing chunk files back to the intermediate S3 bucket.
2. Keep a native strategy and let the function **enrich each chunk** with chunk-level metadata (section title, clause number). Chunk-level metadata overrides file-level metadata on collisions.

```json
{
  "vectorIngestionConfiguration": {
    "chunkingConfiguration": { "chunkingStrategy": "NONE" },
    "customTransformationConfiguration": {
      "intermediateStorage": {
        "s3Location": { "uri": "s3://example-kb-intermediate/chunks/" }
      },
      "transformations": [
        {
          "stepToApply": "POST_CHUNKING",
          "transformationFunction": {
            "transformationLambdaConfiguration": {
              "lambdaArn": "arn:aws:lambda:us-east-1:111122223333:function:heading-chunker"
            }
          }
        }
      ]
    }
  }
}
```

Outside Knowledge Bases (OpenSearch or Aurora pipelines), the guide's "Lambda functions to implement fixed-size chunking" means a function triggered by S3 events that splits text with overlap, calls the embedding model and writes vectors.

> **Exam trap.** "Answers lose the surrounding context of a matched sentence" calls for hierarchical chunking (or larger chunks with overlap), not a bigger model. "Chunks mix two unrelated topics" calls for semantic chunking.

<!-- section: embeddings | objectives: 1.5.2 -->
## Choosing and generating embeddings

Embedding models available to Knowledge Bases:

| Model | Dimensions | Vector types |
| --- | --- | --- |
| Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`) | 1,024 (default), 512, 256 | Float, binary |
| Amazon Titan Embeddings G1 - Text | 1,536 | Float |
| Cohere Embed English v3 / Multilingual v3 | 1,024 | Float, binary |
| Amazon Titan Multimodal Embeddings G1 | 1,024 | Float |
| Cohere Embed v3 Multimodal | 1,024 | Float, binary |
| Amazon Nova Multimodal Embeddings | 1,024 | Float |

Titan Text Embeddings V2: up to 8,192 tokens or 50,000 characters of input, optimized for English with multilingual support, `normalize` true by default, `embeddingTypes` `float`, `binary` or both. Cross-language retrieval (Korean documents, German questions) gives sub-optimal results.

```json
{
  "inputText": "How do I rotate the signing key?",
  "dimensions": 512,
  "normalize": true,
  "embeddingTypes": ["float"]
}
```

Choosing:

| Requirement | Choice |
| --- | --- |
| Lowest storage and memory, slight accuracy loss acceptable | Titan Text Embeddings V2 at 256 or 512 dimensions, or binary vectors (OpenSearch only) |
| Highest retrieval accuracy for English text | 1,024 float dimensions |
| Documents and questions in many languages | A multilingual model such as Cohere Embed Multilingual v3 |
| Images, diagrams, audio or video alongside text | A multimodal embedding model (Nova Multimodal Embeddings handles audio and video chunks of 1–30 seconds, default 5) |
| Domain vocabulary (legal, medical) | Evaluate candidate models on a labeled set of the company's own queries |

Evaluate embedding models with retrieval metrics on representative queries (hit rate, precision of the top results), latency and cost, not with general benchmarks alone.

**Batch generation with Lambda**: outside Knowledge Bases, a Lambda function reads documents (S3 event, SQS batch or Step Functions Map state), sends several texts per invocation within the model quota, retries throttling with exponential backoff, and writes vectors to the store. Embedding models are throttled on **requests per minute**, so batching and concurrency control matter more than token counts. Step Functions Distributed Map runs up to 10,000 parallel child executions for very large backfills; reserved concurrency on the function caps the request rate.

> **Exam trap.** Queries must be embedded with the same model and the same dimensions as the documents. Changing either means re-embedding the whole corpus.

<!-- section: vector-search-deploy | objectives: 1.5.3 -->
## Deploying vector search

| Requirement | Deployment |
| --- | --- |
| Least operational overhead, managed ingestion and citations | Bedrock Knowledge Base (managed, or customer-managed with OpenSearch Serverless created by the console quick create) |
| Serverless vector database you control, hybrid search, binary vectors | OpenSearch Serverless vector search collection, `faiss` engine |
| Existing OpenSearch domain, full control of shards and plugins | OpenSearch Service managed cluster with k-NN (`knn_vector` field, up to 10,000 dimensions, `k` up to 10,000) |
| Vectors next to relational data, SQL filtering and joins | Aurora PostgreSQL with pgvector |
| Very large corpus, low query rate, lowest cost | S3 Vectors |

**Aurora PostgreSQL with pgvector for Knowledge Bases**:

1. pgvector 0.5.0 or later (HNSW support); Aurora PostgreSQL 16+, 15.4+, 14.9+ or 13.12+.
2. Enable the RDS Data API, and store the database user in Secrets Manager.
3. Create the schema, the table and the indexes:

```text
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA bedrock_integration;
CREATE TABLE bedrock_integration.bedrock_kb (
  id uuid PRIMARY KEY,
  embedding vector(1024),
  chunks text,
  metadata json,
  custom_metadata jsonb);
CREATE INDEX ON bedrock_integration.bedrock_kb USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON bedrock_integration.bedrock_kb USING gin (to_tsvector('simple', chunks));
CREATE INDEX ON bedrock_integration.bedrock_kb USING gin (custom_metadata);
```

4. Create the knowledge base with the cluster ARN, the secret ARN, the database name, the table name and the column mapping. The vector dimension must match the embedding model.

**OpenSearch Serverless for Knowledge Bases**: vector index with the `faiss` engine, Euclidean distance recommended for float embeddings, a filterable text field and a non-filterable Bedrock metadata field. For private access, create the collection with VPC access and a VPC endpoint.

> **Exam tip.** The GIN index on the chunk text is what makes hybrid search possible on Aurora; without a filterable text field, Knowledge Bases falls back to semantic search.

<!-- section: advanced-search | objectives: 1.5.4 -->
## Hybrid search and reranking

**Semantic search** matches meaning; **keyword search** matches exact terms (part numbers, error codes, names). **Hybrid search** runs both and merges the scores, so "error E-4471 on the pump" finds the passage that contains `E-4471` even if its embedding is not the closest.

In Knowledge Bases, `overrideSearchType` selects `HYBRID` or `SEMANTIC`; by default Bedrock decides. Hybrid is supported only for Amazon RDS (Aurora), OpenSearch Serverless and MongoDB stores that contain a filterable text field; otherwise the query runs as semantic.

```json
{
  "retrievalConfiguration": {
    "vectorSearchConfiguration": {
      "numberOfResults": 10,
      "overrideSearchType": "HYBRID",
      "filter": { "equals": { "key": "department", "value": "engineering" } }
    }
  }
}
```

`numberOfResults` defaults to 5. On OpenSearch directly, hybrid search uses a `hybrid` query (a `match` clause plus a `knn` or `neural` clause) and a search pipeline whose `normalization-processor` normalizes scores (`min_max` default, `l2`, `z_score`) and combines them (for example `arithmetic_mean` with optional weights).

**Reranking**: a reranker model scores each retrieved chunk against the query and reorders the results. Retrieve more candidates (for example 30), rerank, and send only the best few to the model: fewer tokens, lower cost and latency, better answers. Reranking works on text only.

| Reranker | Model ID | Note |
| --- | --- | --- |
| Amazon Rerank 1.0 | `amazon.rerank-v1:0` | Not available in us-east-1 |
| Cohere Rerank 3.5 | `cohere.rerank-v3-5:0` | Available in us-east-1 |

Use it in `Retrieve` or `RetrieveAndGenerate` (the reranked order overrides the knowledge base ranking) or call the `Rerank` operation on results from any source. A Managed Knowledge Base includes a built-in reranker at no extra cost.

> **Exam trap.** Raising `numberOfResults` alone puts more noise into the prompt. When the right chunk is retrieved but ranked low, the fix is a reranker; when it is not retrieved at all, look at chunking, embeddings, metadata filters or hybrid search.

<!-- section: query-handling | objectives: 1.5.5 -->
## Query expansion, decomposition and transformation

User questions are often short, ambiguous or compound. Transform them before retrieval:

| Technique | What it does | AWS implementation |
| --- | --- | --- |
| Query decomposition | Splits a complex question into sub-queries, retrieves for each, then answers | Knowledge Bases `queryTransformationConfiguration` type `QUERY_DECOMPOSITION`, or a Lambda function that calls a model to produce sub-queries |
| Query expansion | Adds synonyms, acronyms and related terms, or generates several paraphrases | A Bedrock model call before retrieval; union of the results, then rerank |
| Query rewriting with history | Turns "what about the second one?" into a standalone question using the conversation | A Bedrock model call with the last turns stored in DynamoDB |
| Hypothetical answer | Generates a draft answer and embeds it to search for similar passages | A Bedrock model call, then vector search |
| Implicit filtering | Derives metadata filters ("policies from 2025") from the question | `implicitFilterConfiguration` with a metadata schema (Anthropic Claude models) |
| Multi-step transformation | Classify, rewrite, decompose, retrieve in parallel, merge, rerank | Step Functions: Bedrock `invokeModel` tasks, a Parallel or Map state for sub-queries, a Lambda merge step |

```json
{
  "retrieveAndGenerateConfiguration": {
    "type": "KNOWLEDGE_BASE",
    "knowledgeBaseConfiguration": {
      "knowledgeBaseId": "KB12345678",
      "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/MODEL_ID",
      "orchestrationConfiguration": {
        "queryTransformationConfiguration": { "type": "QUERY_DECOMPOSITION" }
      }
    }
  }
}
```

Decomposition runs several queries against the knowledge base, which adds latency and cost: use it for comparative or multi-hop questions ("Which plan has the higher deductible, Gold or Platinum?"), not for simple lookups. A Managed Knowledge Base adds **agentic retrieval** for multi-hop reasoning without custom code.

Step Functions limits to remember in such pipelines: 256 KiB of state payload (pass large retrieval results through S3), Express workflows up to 5 minutes for synchronous request-response chains, Standard workflows up to 1 year.

<!-- section: retrieval-access | objectives: 1.5.6 -->
## Consistent access to retrieval for FMs and agents

Bedrock Agent Runtime operations:

| Operation | Returns | Use it when |
| --- | --- | --- |
| `Retrieve` | Chunks with scores, source location and metadata | You build the prompt yourself, combine several sources or call a model of your choice |
| `RetrieveAndGenerate` | A generated answer with citations, plus a session ID for follow-ups | Managed RAG in one call, with optional guardrail, prompt template and query transformation |
| `RetrieveAndGenerateStream` | The same, streamed | Chat interfaces that display tokens as they arrive |

The generation prompt template must contain `$search_results$`; the orchestration template needs `$output_format_instructions$` or citations disappear.

**Function calling interface**: expose retrieval as a tool so that the model decides when to search. With the Converse API, describe a `search_knowledge_base` tool with a JSON schema; when the model stops with `tool_use`, the application calls `Retrieve` and returns the chunks in a `toolResult` block.

```json
{
  "toolSpec": {
    "name": "search_knowledge_base",
    "description": "Search internal product documentation. Use for any question about product features, limits or configuration.",
    "inputSchema": {
      "json": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Standalone search query" },
          "product": { "type": "string", "enum": ["router", "switch", "firewall"] }
        },
        "required": ["query"]
      }
    }
  }
}
```

**MCP clients for vector queries**: the Model Context Protocol standardizes how agents discover and call tools. A Managed Knowledge Base integrates natively with AgentCore Gateway, so any MCP-compatible agent framework can discover and call it as a tool without custom code. For a customer-managed knowledge base or a self-managed index, wrap the search in a Lambda function and register it as a Gateway target, which presents it as an MCP tool.

**Standardized API patterns**: one retrieval API (Amazon API Gateway plus Lambda) in front of every store gives each application the same request and response contract (query, filters, top-k, results with source and score), central authentication with IAM or Amazon Cognito, throttling, caching and logging, and lets the team change the store behind it without changing clients.

> **Exam trap.** `RetrieveAndGenerate` is the least-code option, but it does not let an agent decide whether to search. When the scenario says "the model must decide when to query the documents" or "agents built with different frameworks must share the same retrieval tool", choose a tool definition or an MCP tool (AgentCore Gateway).

<!-- section: key-points -->
## Key points

- Chunking: default about 300 tokens; fixed-size with overlap; hierarchical returns parents (avoid with S3 Vectors); semantic costs a model call; no chunking plus a `POST_CHUNKING` Lambda for custom splitting.
- Titan Text Embeddings V2: 1,024, 512 or 256 dimensions, float or binary, 8,192 tokens. Same model and dimensions for queries and documents; a new model means re-embedding everything.
- Aurora for Knowledge Bases: pgvector 0.5.0+, Data API, Secrets Manager, HNSW index plus GIN on chunk text (needed for hybrid search).
- Hybrid search for exact terms (Aurora, OpenSearch Serverless, MongoDB with a filterable text field); rerankers (Amazon Rerank 1.0, not in us-east-1; Cohere Rerank 3.5) for ordering.
- Query decomposition (`QUERY_DECOMPOSITION`) for compound questions, expansion and rewriting with a model call, implicit filtering with a metadata schema, Step Functions for multi-step transformation.
- `Retrieve` to build your own prompt, `RetrieveAndGenerate` for managed RAG with citations; tools and MCP (AgentCore Gateway) when the model or agent must decide when to search.
