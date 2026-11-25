An embedding is a vector of numbers that represents the meaning of a text; similar texts get vectors that are close to each other. In SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance and SQL database in Microsoft Fabric, the database itself can call an embedding model, cut long texts into chunks and store the vectors. Exam questions ask which model fits the stated constraints, how to declare it with `CREATE EXTERNAL MODEL`, what to embed and how to chunk it, how to generate the vectors and how to keep them current when the data changes.

<!-- section: evaluate-models | objectives: 3.1.1 -->
## Evaluating external models

The model runs outside the database (Azure OpenAI in Microsoft Foundry, OpenAI, a local Ollama server or a local ONNX runtime); the database only calls its endpoint. Evaluation criteria:

| Criterion | What to check | Typical exam constraint |
| --- | --- | --- |
| Modality | Text only, or also images and other inputs (multimodal) | "Search product photos and descriptions together" requires a multimodal model |
| Languages | Multilingual support | Catalog in French, German and Japanese, users query in any language: a multilingual embedding model |
| Size and capacity | Larger models reason better and give more nuanced output but consume more tokens, add latency and cost | Embedding generation is a focused task: a smaller model often suffices |
| Output dimensions | Length of the vector the model returns | Must fit the `VECTOR(n)` column; drives storage |
| Input limit (tokens) | Maximum tokens per request | Long documents must be chunked |
| Structured output | Model can return JSON that follows a schema | Generation results parsed in T-SQL with `JSON_VALUE` / `OPENJSON` |
| Cost | Price per token processed | Fewer tokens embedded = lower cost |

A **token** is a piece of text: a word, part of a word or a punctuation sign ("hamburger" may be three tokens, "the" one). Models charge per token and limit tokens per request, which is why what you embed and how you chunk it matter.

Azure OpenAI embedding models:

| Model | Output dimensions | Max input tokens | `dimensions` parameter |
| --- | --- | --- | --- |
| `text-embedding-ada-002` (version 2) | 1,536 | 8,192 | No |
| `text-embedding-3-small` | 1,536 | 8,192 | Yes: request fewer dimensions |
| `text-embedding-3-large` | 3,072 | 8,192 | Yes: request fewer dimensions |

The Microsoft Foundry model catalog lists models for text, embeddings, reasoning and multimodal input, with their capabilities, benchmarks, versions and lifecycle status: it's where models are compared and deployed.

> **Exam trap.** The query and the stored data must be embedded with the **same model and the same dimensions**. Vectors from two models aren't comparable, even when they have the same length. Changing the model means regenerating every stored vector.

> **Exam trap.** `text-embedding-3-large` returns 3,072 dimensions, more than a float32 `VECTOR` column accepts (1,998). Pass `"dimensions"` (for example 1,536) in the model parameters, or declare the column `VECTOR(3072, float16)`.

<!-- section: external-models | objectives: 3.1.2 -->
## Creating and managing external models

An **external model** is a database object that stores the endpoint, the API format, the model name, the credential and default parameters. T-SQL functions then reference it by name.

```text
-- 1. Database master key (protects the credential secret), if none exists
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = N'<strong password>';
GO
-- 2. Credential named after the endpoint URL (no query string)
CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com/]
    WITH IDENTITY = 'Managed Identity',
    SECRET = '{"resourceid":"https://cognitiveservices.azure.com"}';
GO
-- 3. External model
CREATE EXTERNAL MODEL EmbeddingModel
WITH (
    LOCATION = 'https://contoso-ai.openai.azure.com/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-02-01',
    API_FORMAT = 'Azure OpenAI',
    MODEL_TYPE = EMBEDDINGS,
    MODEL = 'text-embedding-3-small',
    CREDENTIAL = [https://contoso-ai.openai.azure.com/],
    PARAMETERS = '{"dimensions": 1536, "sql_rest_options": {"retry_count": 3}}'
);
```

| Argument | Values and rules |
| --- | --- |
| `LOCATION` | HTTPS endpoint only (TLS). Azure OpenAI: `.../openai/deployments/{deployment}/embeddings?api-version=...`; OpenAI: `.../v1/embeddings`; Ollama: `.../api/embed`; ONNX Runtime: a local folder |
| `API_FORMAT` | `Azure OpenAI`, `OpenAI`, `Ollama`, `ONNX Runtime`. `ONNX Runtime` works only with SQL Server 2025 on Windows, with Machine Learning Services installed, `external AI runtimes enabled` and the preview features (`PREVIEW_FEATURES = ON`) |
| `MODEL_TYPE` | `EMBEDDINGS` is the only value |
| `MODEL` | Model name at the provider |
| `CREDENTIAL` | A database scoped credential; not needed for a local Ollama or ONNX model |
| `PARAMETERS` | JSON added to each request: `dimensions`, `sql_rest_options.retry_count` (0 to 10) |
| `AUTHORIZATION` | Owner of the model (default: current user) |

Credential identities:

| `IDENTITY` | `SECRET` | When |
| --- | --- | --- |
| `'Managed Identity'` | `{"resourceid":"https://cognitiveservices.azure.com"}` | Preferred: no key to store or rotate. The managed identity needs a role on the Azure OpenAI resource: Cognitive Services OpenAI User in the `sp_invoke_external_rest_endpoint` examples; the `CREATE EXTERNAL MODEL` page names Cognitive Services OpenAI Contributor for SQL Server 2025 (Azure Arc) |
| `'HTTPEndpointHeaders'` | `{"api-key":"..."}` or `{"Bearer":"..."}` | Key-based endpoints, OpenAI |

The credential name must be a URL whose scheme and host match the called URL, and whose path is the same or more generic. On SQL Server 2025, managed identity (Azure Arc or Azure VM) also needs `sp_configure 'allow server scoped db credentials', 1`, and calls to REST endpoints need `sp_configure 'external rest endpoint enabled', 1`; that option is already on in Azure SQL Database and SQL database in Fabric.

Permissions:

```text
GRANT CREATE EXTERNAL MODEL TO [ai_admins];                      -- create models
GRANT ALTER ANY EXTERNAL MODEL TO [ai_admins];                   -- alter or drop them
GRANT EXECUTE ON EXTERNAL MODEL::EmbeddingModel TO [app_role];   -- use the model in AI functions
```

Management:

```text
ALTER EXTERNAL MODEL EmbeddingModel SET (MODEL = 'text-embedding-3-large');
SELECT * FROM sys.external_models;          -- metadata of the models you can access
DROP EXTERNAL MODEL EmbeddingModel;         -- the credential is NOT dropped
```

> **Exam trap.** `MODEL_TYPE` accepts only `EMBEDDINGS`. An external model can't call a chat or completion model: to send a prompt to a language model from T-SQL, use `sp_invoke_external_rest_endpoint`.

> **Exam tip.** Least privilege for an application that only generates embeddings: `EXECUTE ON EXTERNAL MODEL::<name>`, not `CREATE EXTERNAL MODEL` or `ALTER ANY EXTERNAL MODEL`.

<!-- section: embedding-columns | objectives: 3.1.4 -->
## Choosing the columns to embed

Embed the text that carries **meaning**: names, titles, descriptions, comments, free-form text. Leave out identifiers, numbers, dates, codes and operational metadata: they add tokens and cost without improving similarity, and they're better handled by ordinary `WHERE` filters next to the vector search.

| Column | Embed? | Why |
| --- | --- | --- |
| `Name`, `Description`, `ReviewText` | Yes | Semantic content users search for |
| `Category` name | Often, concatenated with the description | Adds context ("Tent: ...") |
| `ProductID`, `SKU`, `Price`, `StockQty`, `ModifiedDate` | No | Exact values: filter or full-text, not embedding |
| `Status`, `IsActive`, `TenantID` | No | Filters applied in `WHERE` |

Several columns can be combined into one input so that one vector carries the context:

```text
SELECT p.ProductID,
       CONCAT(p.Name, N'. ', c.CategoryName, N'. ', p.Description) AS text_to_embed
FROM dbo.Products AS p
INNER JOIN dbo.Categories AS c ON c.CategoryID = p.CategoryID;
```

Store the vectors in a **separate embeddings table** keyed by the source row: the space used by vectors is easy to measure, and embeddings can be rebuilt without touching the source table.

> **Exam trap.** Embedding the price or the stock level doesn't let users search "under 50 dollars": vectors don't compare numbers. Keep numeric constraints as SQL predicates.

<!-- section: chunking | objectives: 3.1.5 -->
## Designing chunks

Long texts are split into **chunks**, each embedded separately. Chunks that are too large can exceed the model's token limit and dilute the meaning of the vector; chunks that are too small lose context. Overlap repeats the end of one chunk at the start of the next, so that an idea cut at a boundary still appears whole in one chunk.

`AI_GENERATE_CHUNKS` is a table-valued function, used with `CROSS APPLY`:

```text
SELECT d.DocumentID, c.chunk, c.chunk_order, c.chunk_offset, c.chunk_length
FROM dbo.Documents AS d
CROSS APPLY AI_GENERATE_CHUNKS(
    SOURCE = d.Body,
    CHUNK_TYPE = FIXED,
    CHUNK_SIZE = 500,
    OVERLAP = 10
) AS c;
```

| Argument | Rule |
| --- | --- |
| `SOURCE` | Any character type |
| `CHUNK_TYPE` | `FIXED` only, as a literal |
| `CHUNK_SIZE` | Required, in **characters** (not tokens), greater than 0 |
| `OVERLAP` | Optional, default 0: a **percentage** of `CHUNK_SIZE`, 0 to 50 |
| `ENABLE_CHUNK_SET_ID` | `1` adds `chunk_set_id`, one value per source row |

Returned columns: `chunk`, `chunk_order` (1, 2, 3... per source), `chunk_offset` (position, starting at 1), `chunk_length` (characters) and optionally `chunk_set_id`. The function requires database **compatibility level 170**.

A chunk table keeps the parent key and the order, so that a matching chunk leads back to its document and its neighbors:

```text
CREATE TABLE dbo.DocumentChunks
(
    ChunkID     INT IDENTITY PRIMARY KEY,
    DocumentID  INT NOT NULL REFERENCES dbo.Documents (DocumentID),
    ChunkOrder  BIGINT NOT NULL,
    ChunkText   NVARCHAR(MAX) NOT NULL,
    Embedding   VECTOR(1536) NULL
);
```

> **Exam trap.** `CHUNK_SIZE = 500` means 500 characters, and `OVERLAP = 10` means 10 % of the chunk size (50 characters), not 10 characters.

<!-- section: generate-embeddings | objectives: 3.1.6 -->
## Generating embeddings

`AI_GENERATE_EMBEDDINGS(source USE MODEL model [PARAMETERS json])` sends the text to the external model and returns the vector as a JSON array, which converts to the `vector` column.

```text
-- Whole table, from an expression that combines columns
UPDATE e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(CONCAT(p.Name, N'. ', p.Description) USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN dbo.Products AS p ON p.ProductID = e.ProductID;

-- Chunk, embed and insert in one statement
INSERT INTO dbo.DocumentChunks (DocumentID, ChunkOrder, ChunkText, Embedding)
SELECT d.DocumentID, c.chunk_order, c.chunk,
       AI_GENERATE_EMBEDDINGS(c.chunk USE MODEL EmbeddingModel)
FROM dbo.Documents AS d
CROSS APPLY AI_GENERATE_CHUNKS(SOURCE = d.Body, CHUNK_TYPE = FIXED, CHUNK_SIZE = 500) AS c;

-- Query embedding, with a runtime parameter that overrides the model's PARAMETERS
DECLARE @p JSON = N'{"dimensions": 1536}';
DECLARE @q VECTOR(1536) =
    AI_GENERATE_EMBEDDINGS(N'family tent for heavy rain' USE MODEL EmbeddingModel PARAMETERS @p);
```

| Point | Detail |
| --- | --- |
| Input | Any character type |
| Prerequisites | An `EMBEDDINGS` external model, `EXECUTE` on it, `external rest endpoint enabled` (SQL Server, Managed Instance) |
| Runtime `PARAMETERS` | Override the same keys of the model definition, for example `dimensions` or `sql_rest_options.retry_count` |
| Troubleshooting | Extended events `ai_generate_embeddings_summary` (status code, errors, model) and `external_rest_endpoint_summary` |
| Platforms | SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance (Always-up-to-date), SQL database in Fabric |

Each row embedded is a call to the model: generate embeddings in **batches** (for example `UPDATE TOP (500) ... WHERE Embedding IS NULL`) rather than one giant statement, and regenerate only the rows whose embedded text changed.

<!-- section: maintenance | objectives: 3.1.3 -->
## Keeping embeddings current

When the source text changes, its embedding must be regenerated. The method depends on volume, update frequency, latency and where generation should run:

| Method | Latency | Fits | Trade-off |
| --- | --- | --- | --- |
| Table trigger | Immediate | Changes must be reflected at once, low write volume | Adds work to every write; a model call inside the transaction slows and can fail the write |
| Change Tracking | Near real time, batched | Balance of latency and performance; a background job processes changed keys | Knows *which* rows changed, not the old values |
| Change data capture (CDC) | Asynchronous | High-volume workloads; before and after values show whether the embedded text really changed | Capture process and change tables to manage |
| Azure Functions with SQL trigger binding | Near real time | Offload generation from the database engine, scale independently | Relies on Change Tracking; code to deploy |
| Azure Logic Apps | Per workflow schedule | Low-code orchestration with other services | Polling interval, connector limits |
| Change event streaming (CES) | Near real time | Several consumers of the same change stream, no extra work in the transaction | Preview; events go to Azure Event Hubs or Fabric Eventstream, a consumer must call the model and write back |
| Microsoft Foundry | Not a detection method | Central model selection, hosting and evaluation | Another process must detect changes and update the database |

Trigger that only **marks** the row, with a batch job that regenerates later (the model isn't called inside the user's transaction):

```text
CREATE OR ALTER TRIGGER dbo.trg_Products_Description
ON dbo.Products
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(Description)
    BEGIN
        -- Changed descriptions: invalidate the vector
        UPDATE e SET e.Embedding = NULL
        FROM dbo.ProductEmbeddings AS e
        INNER JOIN inserted AS i ON i.ProductID = e.ProductID;
        -- New products: queue a row without a vector
        INSERT INTO dbo.ProductEmbeddings (ProductID, Embedding)
        SELECT i.ProductID, NULL
        FROM inserted AS i
        WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductEmbeddings AS e WHERE e.ProductID = i.ProductID);
    END
END;
GO
-- Scheduled job
UPDATE TOP (500) e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(p.Description USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN dbo.Products AS p ON p.ProductID = e.ProductID
WHERE e.Embedding IS NULL;
```

Change Tracking pattern (the embeddings live in their own table, so writing them doesn't create new changes on the source table):

```text
DECLARE @last BIGINT = (SELECT LastVersion FROM dbo.EmbeddingSync);
DECLARE @now  BIGINT = CHANGE_TRACKING_CURRENT_VERSION();

UPDATE e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(p.Description USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN CHANGETABLE(CHANGES dbo.Products, @last) AS ct ON ct.ProductID = e.ProductID
INNER JOIN dbo.Products AS p ON p.ProductID = ct.ProductID
WHERE ct.SYS_CHANGE_OPERATION IN ('I', 'U');

UPDATE dbo.EmbeddingSync SET LastVersion = @now;
```

> **Exam trap.** Storing the vector in the source table and tracking that table makes every embedding update a new change, so the job reprocesses its own writes. A separate embeddings table (or column-level tracking) avoids the loop.

> **Exam tip.** "Without adding latency to transactions" and "several downstream consumers" point to CES; "before and after values" to CDC; "lightweight, only which rows changed" to Change Tracking; "serverless code that scales outside the database" to Azure Functions; "low-code workflow" to Logic Apps.

<!-- section: key-points -->
## Key points

- Evaluate a model on modality, languages, size, dimensions, token limit, structured output and cost; query and data must use the same model and dimensions.
- `CREATE EXTERNAL MODEL`: `LOCATION` (HTTPS), `API_FORMAT` (`Azure OpenAI`, `OpenAI`, `Ollama`, `ONNX Runtime`), `MODEL_TYPE = EMBEDDINGS`, `MODEL`, `CREDENTIAL`, `PARAMETERS`.
- Credential named after the endpoint URL; managed identity preferred; `EXECUTE ON EXTERNAL MODEL` to use it; dropping a model keeps its credential.
- Embed meaningful text, not IDs or numbers; store vectors in a separate table.
- `AI_GENERATE_CHUNKS`: `FIXED` only, size in characters, overlap in percent (0 to 50), compatibility level 170.
- `AI_GENERATE_EMBEDDINGS(text USE MODEL m [PARAMETERS j])` in `SELECT`, `UPDATE` or `INSERT ... SELECT`.
- Maintenance: trigger (immediate), Change Tracking (batched), CDC (old and new values), Functions (outside the engine), Logic Apps (low-code), CES (streams to Event Hubs or Fabric Eventstream), Foundry (models only).
