Retrieval-augmented generation (RAG) lets a language model answer from your own data: the database retrieves the relevant rows, T-SQL turns them into JSON, adds them to a prompt, sends the prompt to a model endpoint with `sp_invoke_external_rest_endpoint` and reads the answer back from the JSON response. Exam questions show a partial script or procedure and ask you to complete the payload, the call or the JSON path, to choose RAG over another approach, or to find why the answer comes back `NULL`.

<!-- section: rag-use-cases | objectives: 3.3.1 -->
## RAG use cases and architecture

A RAG request runs three steps:

| Step | What happens | Where it runs |
| --- | --- | --- |
| Retrieve | Find the rows relevant to the question: full-text, vector or hybrid search, joins, filters | In the database (T-SQL) |
| Augment | Format the rows as JSON and add them to the prompt next to the instructions and the question | In the database (T-SQL) |
| Generate | The model writes an answer grounded in the supplied context | Outside the database, for example an Azure OpenAI deployment in Microsoft Foundry |

The database stores the data and the embeddings and orchestrates the calls; it doesn't host the language model. The same pattern works in SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance and SQL database in Microsoft Fabric, the four platforms of `sp_invoke_external_rest_endpoint`.

Choose RAG when:

| Requirement | Answer |
| --- | --- |
| Answers must reflect data that changes daily (stock, prices, orders) | RAG: the context is read at question time, no retraining |
| You must know which records an answer came from | RAG: you control retrieval, so you can trace and log the rows sent |
| Data must not be used to train a model | RAG: only the per-request context leaves the database |
| Questions are about your products, customers, policies or history | RAG: a general model doesn't know them |
| Permanently change the model's style or behavior on a fixed corpus | Fine-tuning, not RAG |
| Return a list of matching rows, without generated text | A plain query or a search (full-text, vector, hybrid); no model call is needed |
| Exact figures such as a total or a count | Compute them in SQL; at most pass the result to the model to phrase it |

Typical use cases: customer support (order history plus the return policy), product configuration (compatible parts, stock and price within a budget), an internal knowledge base (policy documents stored in the database, summarized with steps), sales enablement (order history and tickets turned into a personalized follow-up email), technical documentation (scripts generated from the real table definitions).

> **Exam trap.** RAG doesn't train or modify the model, and the model never queries the database itself: only the rows your T-SQL puts in the payload reach it. If new products must appear in answers immediately, RAG is the answer, not fine-tuning.

<!-- section: json-context | objectives: 3.3.3 -->
## Converting structured data to JSON

JSON keeps each column name next to its value and nested objects show relationships, so the model can cite `"ProductName":"Trail-400"` correctly.

| Construct | Output | Use it for |
| --- | --- | --- |
| `FOR JSON AUTO` | Array of objects, structure inferred from the query and its joins; dotted aliases become keys that contain dots, not nested objects | Quick formatting |
| `FOR JSON PATH` | Array of objects, nesting set by dotted aliases such as `[product.price]` | Full control over names and nesting (most RAG code) |
| `WITHOUT_ARRAY_WRAPPER` | Removes the `[ ]` | A single-row result (one customer, one order) |
| `ROOT('products')` | Wraps the output in a named top-level property | Telling the model what the data is |
| `INCLUDE_NULL_VALUES` | Keeps properties whose value is `NULL` (omitted by default) | When a missing value means something |
| `JSON_OBJECT('k':v, ...)` | One object per call | Building an object from variables or per row |
| `JSON_ARRAY(v1, v2, ...)` | One array | Small fixed lists, the `messages` array |
| `JSON_ARRAYAGG(expr ORDER BY ...)` | One array aggregated over rows, per `GROUP BY` group | A list of child values, for example the SKUs of a model |

Retrieval and formatting usually happen in one statement assigned to a variable:

```text
DECLARE @question NVARCHAR(1000) = N'Which helmets fit a child under 10?';
DECLARE @questionVector VECTOR(1536);
DECLARE @context NVARCHAR(MAX);

SELECT @questionVector = AI_GENERATE_EMBEDDINGS(@question USE MODEL ProductEmbeddingModel);

SET @context = (
    SELECT TOP (5)
        p.Name        AS [product.name],
        p.ListPrice   AS [product.price],
        p.SizeRange   AS [product.size],
        c.Name        AS [product.category],
        p.Description AS [product.description]
    FROM dbo.Product AS p
    JOIN dbo.Category AS c ON c.CategoryID = p.CategoryID
    WHERE p.IsActive = 1
    ORDER BY VECTOR_DISTANCE('cosine', p.DescriptionVector, @questionVector)
    FOR JSON PATH, ROOT('products')
);
```

Rules that keep the context useful and cheap:

- Send only the columns that help answer: names, descriptions, specifications, prices. Leave out internal IDs, `rowguid`, audit dates and the embedding column itself. Every token costs money and counts against the model's context window, and focused context gives better answers.
- Limit rows with `TOP (n)` after ordering by relevance.
- Apply security filters (tenant, customer, Row-Level Security) in the retrieval query: what you put in `@context` is sent outside the database.
- Let the JSON functions escape the values. Concatenating strings such as `'{"name":"' + @name + '"}'` breaks as soon as a value contains a quotation mark or a line break; `FOR JSON` and `JSON_OBJECT` escape special characters.

The `NULL` defaults differ between functions:

| Function | Default when a value is `NULL` |
| --- | --- |
| `JSON_OBJECT` | `NULL ON NULL`: the key is kept with JSON `null` |
| `JSON_ARRAY` | `ABSENT ON NULL`: the element is dropped |
| `JSON_ARRAYAGG` | `ABSENT ON NULL`: the element is dropped |
| `FOR JSON` | The property is omitted unless `INCLUDE_NULL_VALUES` is specified |

> **Exam trap.** `JSON_ARRAY` needs SQL Server 2022 or later and `JSON_ARRAYAGG` SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance or SQL database in Fabric. `FOR JSON` exists since SQL Server 2016 and is the safe choice when an older SQL Server is in the scenario.

<!-- section: invoke-rest-endpoint | objectives: 3.3.2 -->
## Calling a model with sp_invoke_external_rest_endpoint

`sys.sp_invoke_external_rest_endpoint` calls an HTTPS REST endpoint from T-SQL.

| Platform | Availability |
| --- | --- |
| Azure SQL Database, SQL database in Microsoft Fabric | Enabled by default |
| SQL Server 2025, Azure SQL Managed Instance (SQL Server 2025 or Always-up-to-date update policy) | Disabled by default: `sp_configure 'external rest endpoint enabled', 1` then `RECONFIGURE WITH OVERRIDE` (requires `ALTER SETTINGS`) |

| Parameter | Type and default | Notes |
| --- | --- | --- |
| `@url` | `nvarchar(4000)`, required | HTTPS only. Maximum URL length 8 KB, query string 4 KB |
| `@payload` | `nvarchar(max)` | Valid JSON, well-formed XML or text. Up to 100 MB sent and received |
| `@headers` | `nvarchar(4000)` | **Flat** JSON (no nested objects). Total headers 8 KB |
| `@method` | Default `POST` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` |
| `@timeout` | `smallint`, default 30 | 1 to 230 seconds; cumulative across retries |
| `@credential` | `sysname` | A database scoped credential that injects authentication |
| `@response` | `nvarchar(max) OUTPUT` | The response wrapped in a JSON envelope |
| `@retry_count` | `tinyint`, default 0 | 0 to 10; retries on 408, 429, 500, 502, 503, 504, honoring `Retry-After` |

Security setup, in order:

```text
-- 1. Credential named after the endpoint URL (no query string).
--    Managed Identity: no key stored; the identity needs the
--    Cognitive Services OpenAI User role on the Azure OpenAI resource.
CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com]
    WITH IDENTITY = 'Managed Identity',
    SECRET = '{"resourceid":"https://cognitiveservices.azure.com"}';

-- Alternative: API key sent as a header
-- CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com]
--     WITH IDENTITY = 'HTTPEndpointHeaders', SECRET = '{"api-key":"<key>"}';

-- 2. Permissions for the application user
GRANT EXECUTE ANY EXTERNAL ENDPOINT TO [app_rag];
GRANT REFERENCES ON DATABASE SCOPED CREDENTIAL::[https://contoso-ai.openai.azure.com] TO [app_rag];
```

| Credential `IDENTITY` | Sends |
| --- | --- |
| `Managed Identity` | A token for the system-assigned managed identity; `SECRET` holds the `resourceid` |
| `HTTPEndpointHeaders` | The `SECRET` key-value pairs as request headers (flat JSON) |
| `HTTPEndpointQueryString` | The `SECRET` values in the query string |
| `SHARED ACCESS SIGNATURE` | A SAS token (storage) |

Creating the credential requires `CONTROL` on the database and a database master key; Azure SQL Database creates the master key automatically. The credential name must be a URL on the allowed list with the same scheme and host as `@url`, and its path must be equal to or more generic than the called path: `[https://contoso-ai.openai.azure.com]` works for every deployment of that resource.

In Azure SQL Database and Managed Instance only allowed domains can be called; Azure OpenAI (`*.openai.azure.com`), Azure AI services (`*.cognitiveservices.azure.com`), Azure AI Search, Azure Functions, API Management (`*.azure-api.net`) and others are on the list. Put any other endpoint behind API Management.

> **Exam trap.** Don't put the API key in `@headers` or in the URL of a stored procedure: store it in a credential (`HTTPEndpointHeaders`), or better use `Managed Identity` so that no secret exists. The caller needs two permissions: `EXECUTE ANY EXTERNAL ENDPOINT` on the database and `REFERENCES` on the credential.

<!-- section: prompt-payload | objectives: 3.3.2 -->
## Building the prompt payload

A chat completions request takes a `messages` array; each message has a `role` and a `content`:

| Role | Content |
| --- | --- |
| `system` | Rules: scope, tone, format, what to do when the data is missing |
| `user` | The retrieved context plus the user's question |
| `assistant` | Earlier answers, to continue a multi-turn conversation |

Grounding instructions in the system message keep the model inside your data: answer only from the products provided, don't invent specifications, say so when the information is missing, keep the answer short. Two settings control the output: `max_tokens` caps the answer length (newer models use `max_completion_tokens`), and a low `temperature` (around 0.3 to 0.5 in the Learn examples) favors consistent, factual answers. Most reasoning models don't support `temperature` or `max_tokens` (check the model's feature table): their output is capped with `max_completion_tokens`.

```text
DECLARE @system NVARCHAR(MAX) = N'You are the Contoso Outdoors assistant. Answer only from the products in the JSON. If the answer is not in the data, say that you do not know.';
DECLARE @user NVARCHAR(MAX) = CONCAT(N'Products: ', @context, N' Question: ', @question);

DECLARE @payload NVARCHAR(MAX) = JSON_OBJECT(
    'messages': JSON_ARRAY(
        JSON_OBJECT('role': 'system', 'content': @system),
        JSON_OBJECT('role': 'user', 'content': @user)
    ),
    'max_tokens': 500,
    'temperature': 0.3
);
```

The deployment URL has the form `https://contoso-ai.openai.azure.com/openai/deployments/chat-model/chat/completions?api-version=2024-10-21`: the deployment name is in the path, so the body has no `model` property. The newer v1 route `https://contoso-ai.openai.azure.com/openai/v1/chat/completions` takes the deployment in a `model` property of the body instead. An embeddings deployment is called on `/embeddings` with a payload such as `JSON_OBJECT('input': @text)`.

> **Exam trap.** With `+`, one `NULL` makes the whole string `NULL`: if retrieval finds nothing, `N'Products: ' + @context + ...` becomes `NULL` and the model receives an empty user message. Use `CONCAT` (which treats `NULL` as an empty string) or `ISNULL(@context, N'[]')`, and handle the empty-retrieval case explicitly.

<!-- section: send-to-model | objectives: 3.3.4 -->
## Sending the results to the model

A RAG stored procedure chains the four steps: embed the question, retrieve as JSON, build the payload, call the model.

```text
CREATE OR ALTER PROCEDURE dbo.AskProductQuestion
    @Question NVARCHAR(1000),
    @Answer NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @v VECTOR(1536), @context NVARCHAR(MAX), @payload NVARCHAR(MAX),
            @response NVARCHAR(MAX), @rc INT;

    SELECT @v = AI_GENERATE_EMBEDDINGS(@Question USE MODEL ProductEmbeddingModel);

    SET @context = (
        SELECT TOP (3) p.Name AS ProductName, p.Color, p.SizeRange, p.ListPrice
        FROM dbo.Product AS p
        ORDER BY VECTOR_DISTANCE('cosine', p.DescriptionVector, @v)
        FOR JSON PATH);

    SET @payload = JSON_OBJECT(
        'messages': JSON_ARRAY(
            JSON_OBJECT('role': 'system', 'content': N'Answer only from the provided products.'),
            JSON_OBJECT('role': 'user', 'content': CONCAT(N'Products: ', @context, N' Question: ', @Question))),
        'max_tokens': 500, 'temperature': 0.3);

    EXECUTE @rc = sp_invoke_external_rest_endpoint
        @url = N'https://contoso-ai.openai.azure.com/openai/deployments/chat-model/chat/completions?api-version=2024-10-21',
        @method = 'POST',
        @payload = @payload,
        @credential = [https://contoso-ai.openai.azure.com],
        @timeout = 60,
        @retry_count = 3,
        @response = @response OUTPUT;

    IF @rc = 0
        SELECT @Answer = content
        FROM OPENJSON(@response, '$.result.choices')
             WITH (content NVARCHAR(MAX) '$.message.content');
    ELSE
        THROW 50001, 'The language model call failed.', 1;
END;
```

What to know about the call itself:

- The procedure is synchronous: the session waits (wait type `HTTP_EXTERNAL_CONNECTION`) until the response arrives or `@timeout` expires. Keep context small and `@timeout` within 1 to 230 seconds.
- `@retry_count` handles transient failures (429 throttling, 503); it doesn't replace testing the return value.
- Outbound connections are throttled: about 15 % of worker threads, up to 175. Beyond the limit, error 10928 (database) or 10936 (elastic pool) is raised.
- Only HTTPS is supported and HTTP redirects aren't followed.

> **Exam tip.** Data sent with `sp_invoke_external_rest_endpoint` leaves the database. When a stem says sensitive columns must not reach the model, the fix is in the retrieval query (remove the column, filter rows), not in the call.

<!-- section: extract-response | objectives: 3.3.5 -->
## Extracting the model response

`@response` is an envelope: the HTTP metadata under `response`, the body returned by the model under `result`.

```json
{
  "response": {
    "status": { "http": { "code": 200, "description": "OK" } },
    "headers": { "Content-Type": "application/json" }
  },
  "result": {
    "choices": [
      {
        "index": 0,
        "finish_reason": "stop",
        "message": { "role": "assistant", "content": "The Junior Trail helmet fits head sizes 48-54 cm..." }
      }
    ],
    "usage": { "prompt_tokens": 812, "completion_tokens": 96, "total_tokens": 908 }
  }
}
```

| Need | Expression |
| --- | --- |
| The answer, short | `JSON_VALUE(@response, '$.result.choices[0].message.content')` |
| The answer, any length | `OPENJSON(@response, '$.result.choices') WITH (content NVARCHAR(MAX) '$.message.content')` |
| Why generation stopped | `JSON_VALUE(@response, '$.result.choices[0].finish_reason')`: `stop`, `length` (cut by `max_tokens`), `content_filter`, `tool_calls` |
| Tokens consumed (cost monitoring) | `JSON_VALUE(@response, '$.result.usage.total_tokens')` |
| HTTP status | The return value of the procedure, or `$.response.status.http.code` |
| An embedding (array) | `JSON_QUERY(@response, '$.result.data[0].embedding')` |

The return value is `0` when the HTTP status is 2xx, otherwise the HTTP status code itself (429, 401, 403...); an exception is raised only when the call can't be made at all. A 204 response has no `result`.

```text
IF @rc = 0
    SET @answer = JSON_VALUE(@response, '$.result.choices[0].message.content');
ELSE IF @rc = 429
    THROW 50002, 'The model is busy. Try again later.', 1;
ELSE IF @rc IN (401, 403)
    THROW 50003, 'Authentication failed. Check the credential and the role assignment.', 1;
ELSE
    SELECT @rc AS HttpStatus,
           JSON_VALUE(@response, '$.response.status.http.description') AS Description;
```

When the model is asked for structured output (`response_format` of type `json_schema`, or `json_object`), `content` is a JSON string that you parse a second time, for example `OPENJSON(@content) WITH (...)` to insert the extracted values into a table.

> **Exam trap.** Without `RETURNING`, `JSON_VALUE` returns `nvarchar(4000)`: a longer answer returns `NULL` in lax mode (the default) and an error in `strict` mode. Use `OPENJSON ... WITH (... NVARCHAR(MAX))` for long text. `JSON_VALUE` also returns `NULL` for an object or an array (use `JSON_QUERY`), and a path that forgets the `$.result` envelope (`$.choices[0]...`) returns `NULL` too.

<!-- section: key-points -->
## Key points

- RAG = retrieve in SQL, augment the prompt with JSON context, generate with an external model; nothing is retrained and the data stays current.
- `FOR JSON PATH` with dotted aliases, `WITHOUT_ARRAY_WRAPPER` for one row, `TOP (n)` and only the useful columns.
- `JSON_OBJECT` defaults to `NULL ON NULL`; `JSON_ARRAY` and `JSON_ARRAYAGG` default to `ABSENT ON NULL`.
- `sp_invoke_external_rest_endpoint`: enabled by default in Azure SQL Database and Fabric, `sp_configure` in SQL Server 2025 and Managed Instance; needs `EXECUTE ANY EXTERNAL ENDPOINT` plus `REFERENCES` on the credential.
- Credential named after the endpoint URL, preferably `Managed Identity` with the Cognitive Services OpenAI User role.
- Payload: `messages` with `system` rules and `user` context plus question; low `temperature`, `max_tokens`.
- Return value `0` = 2xx, otherwise the HTTP status; answer at `$.result.choices[0].message.content`; `OPENJSON` for answers over 4,000 characters.
