Grounding an agent means giving it the right passages of your own content at answer time. In Foundry, the retrieval engine is Azure AI Search: an indexer pulls content, a skillset enriches and chunks it, an index stores text and vectors, and a query (keyword, vector, hybrid, semantic) returns the passages. The exam asks you to choose the retrieval method, put the ingestion steps in order, pick the skill for a content type and connect the index to an agent or a workflow.

<!-- section: ingest-index | objectives: 5.1.1 -->
## Ingesting and indexing content

Four objects make an Azure AI Search ingestion pipeline:

| Object | Role |
| --- | --- |
| **Data source** | Connection to the content: Azure Blob Storage, Azure Data Lake Storage Gen2, Azure Cosmos DB, Azure SQL Database, and others |
| **Index** | The schema of the searchable documents: fields, their attributes, vector settings, semantic configuration |
| **Skillset** | The enrichment steps applied to each document: OCR, layout, chunking, embeddings, custom code |
| **Indexer** | The crawler that reads the data source, cracks files, runs the skillset and writes to the index, on demand or on a schedule, with change detection |

Two ways to fill an index: the **pull model** (an indexer on a supported data source, no code to maintain) and the **push model** (your code uploads documents through the REST API or the SDK, for any source or when you control the timing).

Field attributes decide what a field can do: `key` (unique ID, string), `searchable` (full-text), `filterable`, `sortable`, `facetable`, `retrievable` (returned in results). A vector field is a `Collection(Edm.Single)` with `dimensions` equal to the embedding model's output and a `vectorSearchProfile`.

```json
{
  "name": "contentVector",
  "type": "Collection(Edm.Single)",
  "searchable": true,
  "retrievable": false,
  "dimensions": 1536,
  "vectorSearchProfile": "hnsw-openai"
}
```

Content types and how they become searchable:

| Content | Path into the index |
| --- | --- |
| Digital PDFs, Office files, HTML | Document cracking extracts the text; split it into chunks; embed each chunk |
| Scanned PDFs, photos of forms | Extract images during cracking, then OCR or the Document Layout skill |
| Images without much text | Image Analysis captions and tags, or multimodal embeddings of the image itself |
| Audio and video | Transcribe and describe first (Content Understanding `prebuilt-audioSearch`, `prebuilt-videoSearch`, or Azure Speech), then index the text |

In the Azure portal, the **Import data** wizard creates the data source, skillset, index and indexer in one pass, including chunking and vectorization.

> **Exam trap.** An indexer doesn't read audio or video content. Recordings reach the index only as text produced upstream: a transcript, a summary, segment descriptions.

<!-- section: search-types | objectives: 5.1.2 -->
## Keyword, vector, hybrid and semantic search

| Method | How it ranks | Wins when |
| --- | --- | --- |
| Full-text (keyword) | BM25 on terms in `searchable` fields | Exact terms: product codes, error numbers, names |
| Vector | Similarity between the query embedding and chunk embeddings | Paraphrases and concepts, multilingual or multimodal content |
| Hybrid | Full-text and vector queries in one request, merged with **Reciprocal Rank Fusion (RRF)** | General grounding: both exact terms and meaning matter |
| Semantic ranker | Reranks the top results (50) of a text or hybrid query with a language model; adds captions and answers | Relevance of the first results matters most, as in RAG |

Vector search settings live in the index:

| Setting | Options |
| --- | --- |
| Algorithm | `hnsw` (approximate nearest neighbors, fast, the usual choice) or `exhaustiveKnn` (scans every vector: exact, slow, for small sets or to measure recall) |
| Metric | `cosine` (the default and the one Azure OpenAI embeddings expect), `euclidean`, `dotProduct` |
| Vectorizer | Converts the query text to a vector at query time with the same model used at indexing (Azure OpenAI, Azure Vision, custom Web API) |
| Compression | Scalar or binary quantization to reduce vector storage |

A hybrid query with semantic ranking:

```json
{
  "search": "refund policy for cancelled flights",
  "vectorQueries": [
    { "kind": "text", "text": "refund policy for cancelled flights", "fields": "contentVector", "k": 50 }
  ],
  "queryType": "semantic",
  "semanticConfiguration": "default",
  "captions": "extractive",
  "filter": "category eq 'policy'",
  "select": "title,chunk",
  "top": 5
}
```

- `"kind": "text"` needs a vectorizer on the field's profile; `"kind": "vector"` means the client sends the vector itself.
- `k` is the number of nearest neighbors; `top` is the number of results returned after fusion.
- The semantic configuration names a title field, content fields and keyword fields, in priority order (long documents are trimmed). The ranker reads those text fields and reranks the BM25 or RRF results; captions and answers are verbatim text from the index, not generated.
- A filter on a vector query is applied before the vector search by default (`preFilter`).

> **Exam trap.** Changing temperature or top-p doesn't fix a model that answers from the wrong passages: that is a retrieval problem. Switch to hybrid search plus semantic ranking before tuning generation.

<!-- section: enrichment-skills | objectives: 5.1.3 -->
## Enrichment with built-in and custom skills

A skill takes inputs from the enriched document tree (`/document/content`, `/document/normalized_images/*`, `/document/pages/*`) and adds outputs to it.

| Need | Skill |
| --- | --- |
| Read text in images and scanned pages | **OCR** skill |
| Captions, tags, objects in images | **Image Analysis** skill |
| Text with structure (headings, tables, sections) as Markdown, chunked along headings | **Document Layout** skill (Document Intelligence layout model) |
| Put OCR text back at its place in the document text | **Text Merge** skill |
| Cut long text into chunks, with overlap | **Text Split** skill (`textSplitMode: pages`, `maximumPageLength`, `pageOverlapLength`) |
| Embed text chunks | **Azure OpenAI Embedding** skill |
| Embed images and text in one vector space | **Azure AI Vision multimodal embeddings** skill |
| Language, entities, key phrases, PII, translation | Language skills (language detection, entity recognition, key phrase extraction, PII detection, text translation) |
| Logic no built-in skill provides | **Custom Web API** skill: an HTTPS endpoint, often an Azure Function |

A custom Web API skill receives and returns a batch of records, matched by `recordId`:

```json
{
  "values": [
    { "recordId": "0", "data": { "text": "Order 4471 shipped to Lisbon." } }
  ]
}
```

The response contains the same `recordId` values, each with `data` (the outputs declared in the skill) and optional `errors` and `warnings`.

The Document Layout skill reads the file itself (`/document/file_data`, which the indexer provides when `allowSkillsetToReadFileData` is true), returns `markdown_document` sections down to `markdownHeaderDepth` (`h1` to `h6`), or text chunks with `outputFormat: text`. Beyond 20 documents per indexer per day, built-in skills such as OCR, Image Analysis and Document Layout need a billable Foundry resource attached to the skillset; the Azure OpenAI Embedding skill calls your embedding deployment.

> **Exam tip.** "Extract only the text" from scanned pages: OCR plus Text Merge. "Keep headings and tables so chunks follow the document's sections": Document Layout. "Our own classification service must tag each chunk": custom Web API skill.

<!-- section: rag-ingestion | objectives: 5.1.4 -->
## The RAG ingestion flow with OCR

Order of operations for a pull pipeline:

1. Create the **data source** (container, connection, preferably through the search service's managed identity).
2. Create the **index**: key, chunk text, vector field with its profile and vectorizer, parent key, semantic configuration.
3. Create the **skillset**: OCR or Document Layout, Text Merge, Text Split, Azure OpenAI Embedding, and **index projections** that write one search document per chunk.
4. Create the **indexer**, linking data source, skillset and index, with the image settings when OCR is needed.
5. Run it, then check the execution history for errors and warnings.

OCR works only on images the indexer extracts. For scanned PDFs, the indexer configuration must ask for them:

```json
{
  "name": "manuals-indexer",
  "dataSourceName": "manuals-blob",
  "skillsetName": "manuals-skillset",
  "targetIndexName": "manuals-index",
  "parameters": {
    "configuration": {
      "dataToExtract": "contentAndMetadata",
      "imageAction": "generateNormalizedImages"
    }
  }
}
```

The skills then run in this logical order: OCR on `/document/normalized_images/*`, Text Merge of `/document/content` with the OCR text into `merged_content`, Text Split of `merged_content` into `/document/pages/*`, embedding of each page. Index projections map each page to a child document (chunk, vector, parent ID); the parent document can be skipped.

Keyless access along the flow:

| Call | Identity and role |
| --- | --- |
| Indexer reads blobs | Search service managed identity, Storage Blob Data Reader |
| Embedding skill and vectorizer call Azure OpenAI | Search service managed identity, Cognitive Services OpenAI User |
| Application queries the index | Its identity, Search Index Data Reader |
| Agent's Azure AI Search tool, keyless | Foundry managed identity, Search Index Data Contributor and Search Service Contributor |

> **Exam trap.** A skillset with an OCR skill that returns nothing on scanned PDFs usually means `imageAction` was left at its default (`none`): no images were extracted, so OCR had no input.

<!-- section: connect-agents | objectives: 5.1.5 -->
## Connecting retrieval to agents and workflows

| Requirement | Connect retrieval with |
| --- | --- |
| An agent grounds answers on an existing Azure AI Search index, with citations | The **Azure AI Search tool** of Foundry Agent Service, through a project connection to the search service |
| An agent answers from a few files uploaded by users, no index to manage | The **file search** tool (a managed vector store) |
| Several sources, complex questions split into subqueries, one retrieval layer reused by many agents | A **Foundry IQ knowledge base** (agentic retrieval in Azure AI Search), exposed to agents as a knowledge tool |
| A deterministic workflow or app step, full control of the query and the prompt | Your code calls Azure AI Search (`SearchClient`), then passes the passages to the model |

The Azure AI Search tool targets **one index** through a project connection:

```text
from azure.ai.projects.models import (AzureAISearchTool, AzureAISearchToolResource,
    AISearchIndexResource, AzureAISearchQueryType, PromptAgentDefinition)

connection_id = project.connections.get("contoso-search").id
agent = project.agents.create_version(
    agent_name="manuals-agent",
    definition=PromptAgentDefinition(
        model="gpt-4.1-mini",
        instructions="Answer from the manuals only and always cite your sources.",
        tools=[AzureAISearchTool(azure_ai_search=AzureAISearchToolResource(indexes=[
            AISearchIndexResource(project_connection_id=connection_id,
                                  index_name="manuals-index",
                                  query_type=AzureAISearchQueryType.VECTOR_SEMANTIC_HYBRID)]))],
    ),
)
```

| Setting | Default and values |
| --- | --- |
| `query_type` | `vector_semantic_hybrid` (default), `vector_simple_hybrid`, `vector`, `semantic`, `simple` |
| Number of results (`top_k`) | 5 |
| Filter | Optional, applied to every query the agent sends to the index |

The index needs a retrievable text field with the content to cite, and a source URL field (optionally a title) so citations can link to documents. Citations appear only if the instructions ask for them; in a streamed response they arrive as `url_citation` annotations. On a private virtual network, the tool must use keyless authentication.

The code path keeps the grounding explicit:

```text
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

search = SearchClient(endpoint=search_endpoint, index_name="manuals-index",
                      credential=DefaultAzureCredential())
question = "How do I reset the thermostat?"
results = search.search(
    search_text=question,
    vector_queries=[VectorizableTextQuery(text=question, k_nearest_neighbors=50,
                                          fields="contentVector")],
    query_type="semantic", semantic_configuration_name="default", top=5)
sources = "\n".join(f"[{r['title']}] {r['chunk']}" for r in results)
# The prompt: answer only from the sources, cite the titles
```

> **Exam trap.** Memory stores what the user said in earlier conversations; it isn't a document retrieval method. Function calling runs your code; it doesn't ground on an index unless that code queries one. "Answer from the company manuals, with citations" points to a knowledge tool: Azure AI Search tool, file search or a knowledge base.

<!-- section: key-points -->
## Key points

- Data source, index, skillset, indexer; pull with an indexer, push with the API.
- Keyword for exact terms, vector for meaning, hybrid (RRF) for both, semantic ranker to rerank the top results.
- `kind: text` vector queries need a vectorizer with the indexing model; HNSW for speed, exhaustive KNN for exact results.
- Scanned documents: `imageAction: generateNormalizedImages`, OCR, Text Merge, Text Split, embedding, index projections.
- Document Layout for structure-aware Markdown chunks; custom Web API skill for your own logic.
- Agents ground through the Azure AI Search tool, file search or a Foundry IQ knowledge base; workflows query `SearchClient` themselves.
