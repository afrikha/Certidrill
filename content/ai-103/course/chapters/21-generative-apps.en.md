A generative application in Microsoft Foundry is code that calls a model deployment through a Foundry project, usually with the Foundry SDK for Python and the OpenAI-compatible Responses API. Around that call you add retrieval for grounding, tools for actions, several steps for complex tasks, and evaluations to prove quality. Exam questions show a short Python snippet to complete, ask which retrieval option or evaluator fits a requirement, or ask how the application should authenticate.

<!-- section: deploy-consume | objectives: 2.1.1 -->
## Deploying and consuming models

You deploy a model from the Foundry model catalog into a Foundry resource; the project's code then calls the **deployment name**, which can differ from the model name. Start with the **Global Standard** deployment type (pay per token, new models first, highest default quota) and change only for a reason: data residency (Data Zone or Standard), reserved throughput (provisioned), or large asynchronous jobs at a 50% discount (Batch).

| Requirement | Kind of model |
| --- | --- |
| Open-ended chat, summarization, complex instructions | Large language model (LLM) |
| Low cost and latency for a narrow, simple task, or a model to run on limited hardware | Small language model |
| Multistep analysis, planning, math, code review | Reasoning model, with a `reasoning` effort setting |
| Generate, complete or explain code | A code-oriented model from the catalog |
| Text plus images (or audio) in the same request | Multimodal model |
| A single endpoint that picks a model per prompt for cost and quality | Model router |

The same client calls every chat model deployed in the project. Images go in the `input` as content parts:

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://contoso-ai.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)
openai = project.get_openai_client()

response = openai.responses.create(
    model="gpt-4.1-mini",            # deployment name
    instructions="You are a claims assistant. Answer in two sentences.",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "Describe the damage in this photo."},
            {"type": "input_image", "image_url": "https://contoso.com/claims/1234.jpg"},
        ],
    }],
    max_output_tokens=300,
)
print(response.output_text)
```

| Element | Role |
| --- | --- |
| `model` | The deployment name |
| `instructions` or a `system` / `developer` message | The rules for the whole conversation |
| `input` | A string, or a list of messages with content parts (`input_text`, `input_image`) |
| `max_output_tokens` | Caps the generated tokens (for reasoning models, reasoning tokens included) |
| `response.output_text` | The generated text |
| `response.usage` | `input_tokens`, `output_tokens`, `total_tokens` |

The Chat Completions API (`chat.completions.create` with `messages`) remains available; the Responses API is the one used by Foundry agents and the current samples. Claude models deployed in Foundry use a separate Anthropic endpoint and the `AnthropicFoundry` client.

> **Exam trap.** `model=` takes the deployment name. If the deployment is called `chat-prod` and runs `gpt-4.1-mini`, the code passes `"chat-prod"`.

<!-- section: rag | objectives: 2.1.2 -->
## Retrieval-augmented generation in an application

RAG grounds answers in your data: **retrieve** relevant passages from an index, **augment** the prompt with them, **generate** an answer that cites them. Preparing the data means chunking documents, generating embeddings with an embedding model and indexing them, usually in Azure AI Search, the recommended index store.

| Search type | Strength |
| --- | --- |
| Keyword (full text) | Exact terms: product codes, names, error numbers |
| Vector | Meaning, synonyms, paraphrased questions; needs embeddings |
| Hybrid | Keyword and vector in one query, results merged: the best general default |
| Semantic ranking | Reranks the top results with a language-understanding model; added on top of keyword or hybrid |

Implementation options:

| Option | When |
| --- | --- |
| Your code queries Azure AI Search, then calls the model | Full control of the query, filters and prompt in an app without agents |
| Azure AI Search tool on an agent | The agent decides when to search an existing index; `query_type` defaults to `vector_semantic_hybrid`, `top_k` to 5 |
| File search tool on an agent | Uploaded files; the service chunks (800 tokens, 400 overlap), embeds and indexes them for you |
| Foundry IQ knowledge base | Several sources (Blob Storage, SharePoint, OneLake, web) shared by many agents; agentic retrieval splits the question into subqueries, reranks and returns citations, with permissions enforced at query time |

For new RAG implementations, Learn now recommends starting with agentic retrieval (a Foundry IQ knowledge base); classic RAG in your own code stays the choice when you keep existing orchestration code or need fine control of the query pipeline.

A minimal app-level RAG call with hybrid search and semantic ranking:

```text
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

search = SearchClient(endpoint=search_endpoint, index_name="policies", credential=DefaultAzureCredential())
results = search.search(
    search_text=question,
    vector_queries=[VectorizableTextQuery(text=question, k_nearest_neighbors=5, fields="contentVector")],
    query_type="semantic",
    semantic_configuration_name="default",
    top=5,
)
sources = "\n".join(f"[{r['title']}] {r['content']}" for r in results)

response = openai.responses.create(
    model="gpt-4.1-mini",
    instructions="Answer only from the sources. Cite the title in brackets. If the answer isn't in the sources, say you don't know.",
    input=f"Sources:\n{sources}\n\nQuestion: {question}",
)
```

Good practice: index a title and URL field so citations are useful; apply security filters at retrieval time so a user only gets documents they may read; use Microsoft Entra ID rather than keys for the search service; treat retrieved content as untrusted input (it can carry an indirect prompt injection).

> **Exam trap.** RAG adds knowledge; fine-tuning changes behavior, style or task performance. "Answers must reflect the policy documents updated every week" is RAG, not fine-tuning and not a lower temperature.

> **Exam tip.** Poor answers with good documents: look at the retrieval first (chunking, embedding model, keyword versus hybrid, semantic ranking) before changing the prompt or the model.

<!-- section: workflows | objectives: 2.1.3 -->
## Workflows, tool-augmented flows and multistep pipelines

A single prompt is rarely enough for a complex task. Three building blocks combine:

| Pattern | How it works | Example |
| --- | --- | --- |
| Prompt chaining | Break the task into steps; the output of one call feeds the next | Extract claims, then generate search queries, then verify |
| Tool-augmented flow | The model requests a tool; code or the service runs it; the result returns to the model | Look up an order status, then answer |
| Multistep reasoning pipeline | Plan, retrieve, draft, check, finalize, with structured output between steps | Answer a contract question, then verify each citation |

The function calling loop, in order:

1. Send the prompt with the tool definitions (name, description, JSON Schema parameters).
2. Read the output: items of type `function_call` carry `name`, `arguments` (a JSON string) and `call_id`.
3. Your code runs the function: the model never executes it.
4. Send back a `function_call_output` item with the same `call_id` and the result as a string.
5. The model produces the final answer, or requests another call.

A response can contain several `function_call` items: run them all and return all the outputs in one follow-up request.

For orchestration beyond a few calls, **Microsoft Agent Framework** (open-source SDK for Python and .NET) builds workflows in code or declarative YAML: sequential, concurrent, handoff, group chat and Magentic patterns, with human-in-the-loop requests and checkpoints. The visual **Foundry workflows** designer (sequential, group chat, human in the loop templates) is in preview and retires on December 1, 2026; Microsoft recommends Agent Framework for new work.

> **Exam trap.** Steps whose order is known in advance belong in a deterministic chain or workflow. Letting one model decide every step adds cost and unpredictability; reserve agent autonomy for tasks whose path can't be fixed.

<!-- section: evaluate | objectives: 2.1.4 -->
## Evaluating models and applications

Evaluation compares a model or an application against a test dataset before release, then on production traffic. Choose the evaluator from the question asked:

| Requirement | Evaluator |
| --- | --- |
| Detect fabrications: claims not supported by the retrieved context | Groundedness (precision against the context) |
| Strict yes/no consistency with the context, without a judge deployment | Groundedness Pro (preview) |
| Does the answer address the question? | Relevance |
| Did the retrieval return useful chunks? | Retrieval; Document Retrieval when you have labeled relevance judgments |
| Does the answer cover everything in the expected answer? | Response Completeness (preview; recall against ground truth) |
| Readable, logical answers | Fluency, Coherence |
| Closeness to a reference answer | Similarity, F1 Score, BLEU, ROUGE, METEOR, GLEU |
| Harmful content, jailbreak susceptibility | Risk and safety evaluators |

AI-assisted quality evaluators return a 1–5 score, a pass or fail label against a threshold (3 by default), and a reason. Groundedness needs `response` and `context`; Relevance needs `query` and `response`; Response Completeness needs `ground_truth` and `response`.

A cloud evaluation run with the SDK, against a model deployment or an agent as the target:

```text
eval_object = openai.evals.create(
    name="support-quality",
    data_source_config=data_source_config,   # schema of the test items
    testing_criteria=testing_criteria,       # builtin.groundedness, builtin.relevance, ...
)
run = openai.evals.runs.create(
    eval_id=eval_object.id,
    name="v2-candidate",
    data_source={
        "type": "azure_ai_target_completions",
        "source": {"type": "file_id", "id": dataset_id},
        "input_messages": input_messages,
        "target": {"type": "azure_ai_agent", "name": "support-agent", "version": "2"},
    },
)
```

Compare runs of two versions on the same dataset before promoting one. Results are visible in the Foundry portal and through the SDK.

> **Exam trap.** Groundedness and relevance measure different failures. A fluent answer that invents a refund period is ungrounded; a correct quote from the policy that doesn't answer the question is irrelevant.

<!-- section: sdks-connectors | objectives: 2.1.5 -->
## Foundry SDKs and connectors

| Package or client | Use |
| --- | --- |
| `azure-ai-projects` (2.x), `AIProjectClient` | Project operations: agents, connections, telemetry, evaluation rules |
| `project.get_openai_client()` | An OpenAI-compatible client for responses, conversations, files, vector stores and evals |
| `openai` | The OpenAI client the project client returns, or used directly against `https://<resource>.openai.azure.com/openai/v1/`, which embeddings require: the project endpoint doesn't currently route embedding requests |
| `azure-identity` | `DefaultAzureCredential` for keyless authentication |
| Microsoft Agent Framework | Multi-agent orchestration and workflows; its Foundry client targets the project's Responses endpoint |
| Foundry Tools SDKs | Speech, Language, Translator, Vision, Content Safety, Document Intelligence, Azure AI Search, each with its own endpoint |

**Connections** are project resources that store how to reach another service (Azure AI Search, Blob Storage, Application Insights, an MCP server, an OpenAPI endpoint, a remote A2A agent) and its authentication, so credentials never appear in code. Code looks them up by name:

```text
search_connection = project.connections.get("contoso-search")
connection_id = search_connection.id    # passed to a tool as project_connection_id
```

> **Exam tip.** When a snippet needs a resource ID for a tool, the answer is usually `project.connections.get(name).id`, not a key copied into the code.

<!-- section: connect-project | objectives: 2.1.6 -->
## Connecting an application to a Foundry project

The application needs the **project endpoint**, shown on the project's home page:

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

| Endpoint | Used for |
| --- | --- |
| `https://<resource>.services.ai.azure.com/api/projects/<project>` | `AIProjectClient`: agents, connections, evaluations, models through the Responses API |
| `https://<resource>.openai.azure.com/openai/v1/` | The `openai` client directly; the only one that also accepts an API key |
| `https://<resource>.cognitiveservices.azure.com/` | Most Foundry Tools SDKs; Text Translation uses `https://api.cognitive.microsofttranslator.com/` and Speech uses regional endpoints |

Authentication is **keyless by default**: `DefaultAzureCredential` uses the developer's `az login` session locally and the managed identity of the App Service, Container Apps or Functions app in Azure. With the `openai` client directly, pass a token provider for the scope `https://ai.azure.com/.default`:

```text
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import OpenAI

token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")
client = OpenAI(base_url="https://contoso-ai.openai.azure.com/openai/v1/", api_key=token_provider)
```

| Role (Foundry RBAC) | Grants |
| --- | --- |
| Foundry Agent Consumer | Call agent endpoints only: the least-privileged role for applications and users that only interact with agents |
| Foundry User (formerly Azure AI User) | Build and call agents and models in the project: day-to-day development and application identities that call models through the project |
| Foundry Project Manager | Manage projects, build in them, publish agents, and assign the Foundry User role |
| Foundry Account Owner | Create projects and account-level resources |

Steps for a production app: enable a managed identity on the hosting service, assign it **Foundry User** on the project (Foundry Agent Consumer if the app only calls agents), store the endpoint in configuration (for example an environment variable), and create the client with `DefaultAzureCredential`. Assign roles at the narrowest scope.

> **Exam trap.** An API key works only on the `/openai/v1` endpoint and gives no identity to audit. "No secrets in the code or configuration" means a managed identity with the Foundry User role, not a key stored in an app setting.

<!-- section: key-points -->
## Key points

- Code calls a deployment name; Global Standard is the default deployment type.
- `AIProjectClient(endpoint, DefaultAzureCredential())`, then `get_openai_client()` and `responses.create(model=..., input=...)`.
- RAG: retrieve, augment, generate with citations. Hybrid plus semantic ranking is the best general retrieval; RAG adds knowledge, fine-tuning changes behavior.
- Function calling: your code runs the function and returns `function_call_output` with the same `call_id`.
- Agent Framework for code workflows; Foundry workflows designer retires December 1, 2026.
- Fabrications: Groundedness. On-topic: Relevance. Missing content: Response Completeness (preview). Scores 1–5, threshold 3.
- Connections hold credentials; `project.connections.get(name).id` feeds tools.
- Keyless: managed identity plus Foundry User on the project; keys only on `/openai/v1`.
