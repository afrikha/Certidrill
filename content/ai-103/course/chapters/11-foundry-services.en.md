Planning an AI solution on Microsoft Foundry comes down to four choices: which model for each task, which Foundry service for each capability, which retrieval and indexing method for grounding, and which memory, tools and knowledge sources an agent gets. Exam questions give a scenario with one or two decisive constraints (cost, latency, structured output, data freshness, actions to perform) and ask what to use.

<!-- section: model-choice | objectives: 1.1.1 -->
## Choosing a model for each task

The Foundry Models catalog lists models from Microsoft, OpenAI and other providers. **Models sold directly by Azure** (all Azure OpenAI models and selected models from other providers) are hosted by Azure, billed through your Azure subscription, covered by Azure service-level agreements and supported by Microsoft. **Models from partners and community** are listed separately and don't all support quota increases.

| Model category | Strength | Typical tasks | Examples on Learn |
| --- | --- | --- | --- |
| Large language model (LLM) | Broad knowledge, complex instructions, long context | Chat assistants, summarization, extraction with free-form prompts, agents | `gpt-4.1`, GPT-5 family |
| Reasoning model | Plans and verifies before answering; slower and more tokens per answer | Multistep problems, math, code, complex planning | GPT-5 and GPT-6 families |
| Small language model (SLM) | Low latency, low cost, can run where resources are limited | Classification, routing, short extraction, high-volume simple tasks | `-mini` and `-nano` variants, Phi family |
| Multimodal model | Text plus image (and for some, audio) as input | Describe an image, answer about a chart, read a screenshot | `gpt-4.1`, `gpt-4o` |
| Audio and realtime model | Speech in and out with low latency | Voice assistants, call centers | `gpt-realtime`, `gpt-audio`, `gpt-live-transcribe` |
| Code model | Code generation and editing through the Responses API | Coding agents, code review | Codex models |
| Embedding model | Turns text into vectors; generates no text | Vector search, RAG, similarity, clustering | `text-embedding-3-small`, `text-embedding-3-large` |
| Image and video generation | Creates media from a prompt and reference media | Marketing visuals, product videos | `gpt-image-1.5`, `gpt-image-2`, `sora-2` (preview) |

The model retirement schedule gives `o3`, `o4-mini`, `o3-mini` and `o1` a retirement date of November 19, 2026, with GPT-5.6 models as replacements.

**Foundry Tools** (formerly Azure AI services) are task-specific services: Azure Speech, Azure Language, Azure Translator, Azure Vision, Azure Content Understanding, Azure Document Intelligence and Azure Content Safety. They return a predictable, structured result for one task, with no prompt to write.

| Requirement | Choose |
| --- | --- |
| Open-ended reasoning, writing, multi-turn chat | LLM |
| Same simple task millions of times a day, cost and latency first | SLM |
| Hard multistep problem where accuracy matters more than latency | Reasoning model |
| Question about the content of a photo or diagram | Multimodal model |
| Real-time speech-to-text or text-to-speech in an app | Azure Speech (or a realtime audio model inside a voice agent) |
| Translate documents or text at scale with consistent results | Azure Translator |
| Fixed fields from invoices, forms, audio or video, with confidence scores | Azure Content Understanding |
| Detect harmful text or images | Azure Content Safety |
| Represent documents for semantic retrieval | Embedding model |

> **Exam trap.** A bigger model isn't the answer to every requirement. If the stem says "lowest cost" or "lowest latency" and the task is simple (classify, route, extract a few fields), an SLM or a Foundry Tool is expected. If it says "consistent structured output for a well-known document type", Content Understanding beats a free prompt to a multimodal model.

> **Exam trap.** The query vector and the indexed vectors must come from the same embedding model. Embedding models can't be upgraded in place: changing the embedding model means re-embedding the whole index.

<!-- section: foundry-services | objectives: 1.1.2 -->
## Mapping capabilities to Foundry services

A **Foundry resource** (Azure resource type `Microsoft.CognitiveServices/accounts`, kind `AIServices`) gives access in one resource to agents, evaluations, Azure OpenAI, Speech, Vision, Language and Content Understanding. **Foundry projects** are subresources of it where teams build agents and evaluations.

| Need | Foundry service | Notes |
| --- | --- | --- |
| Generate text, code, images or video | Foundry Models (model deployments) | Called through the Responses API or Chat Completions |
| Ground answers in enterprise content | Foundry IQ knowledge base, or an Azure AI Search index | Retrieval with citations; RAG |
| Vector, keyword and hybrid search | Azure AI Search | Index with vector fields, semantic ranker |
| Build an agent with instructions, a model and tools | Foundry Agent Service, prompt agent | Managed runtime, no infrastructure |
| Real-time voice agent | Foundry Agent Service, voice-based prompt agent | Low-latency audio interaction |
| Agent with your own code, framework or custom orchestration | Foundry Agent Service, hosted agent | Your container, managed endpoint, scaling and identity |
| One-off call with tools, no persisted agent | Responses API | The definition lives in your application code |
| Documents, images, audio, video to structured data | Azure Content Understanding | Analyzers, Markdown or fields output |
| Speech, translation, text analytics, image analysis | Foundry Tools (Speech, Translator, Language, Vision) | Task-specific APIs |
| Block harmful content | Content filters (guardrails) on deployments, Azure Content Safety | Applied at run time |

Agent types in Foundry Agent Service:

| Agent type | Best for |
| --- | --- |
| Prompt agent | Fastest path: define instructions, a model and tools; Foundry runs the agent |
| Voice-based prompt agent | Customer-facing voice, call centers, low-latency audio |
| Hosted agent | Agents that call your own code; custom orchestration, multi-agent systems, custom protocols |

> **Exam tip.** Some capabilities exist only at the Foundry resource level, not in a project: the Translator API is the example Learn gives. Most new APIs, such as agents and evaluations, are project-scoped.

<!-- section: retrieval-indexing | objectives: 1.1.3 -->
## Choosing a retrieval and indexing method

Azure AI Search provides the indexing and retrieval behind RAG and behind Foundry IQ. First choose how the query matches content:

| Method | How it matches | Choose it when | Weakness |
| --- | --- | --- | --- |
| Keyword (full-text) | Terms of the query, BM25 scoring | Exact terms, codes, names, filters | Misses documents that use other words |
| Vector | Similarity between embeddings | Meaning and paraphrases, multilingual, images | Weak on exact identifiers and rare terms |
| Hybrid | Keyword and vector queries in parallel, results merged with Reciprocal Rank Fusion (RRF) | Mixed queries; maximum recall for RAG | Slightly more cost and latency |
| Semantic ranker | Re-scores the top results of a query with a language model | Best results first; adds captions and answers | Re-ranks only; doesn't retrieve new documents |

Learn recommends hybrid queries for maximum recall and combining them with the semantic ranker for the most relevant results. A hybrid request with semantic ranking looks like this (REST, `POST /indexes/{index}/docs/search`):

```json
{
  "search": "warranty for model X200 batteries",
  "vectorQueries": [
    { "kind": "text", "text": "warranty for model X200 batteries", "fields": "contentVector", "k": 50 }
  ],
  "queryType": "semantic",
  "semanticConfiguration": "default",
  "select": "title, chunk",
  "top": 5
}
```

`"kind": "text"` requires a **vectorizer** on the vector field, so the service embeds the query with the same model used at indexing.

Then choose the retrieval pattern:

| Pattern | How it works | Choose it when |
| --- | --- | --- |
| Classic RAG | Your code sends one query and passes the results to the LLM | No knowledge-base orchestration needed; simplicity and speed; existing orchestration code; fine control of the query pipeline |
| Agentic retrieval (knowledge base) | An LLM plans several subqueries, runs them in parallel, and returns structured results with citations | Client is an agent or chatbot; complex or conversational questions; highest relevance; new RAG implementations |

Learn recommends starting new RAG implementations with agentic retrieval. Its planning and answer synthesis are generally available in REST API `2026-10-01`; other capabilities remain in preview.

Finally choose how content gets into the index:

| Indexing method | Use it when |
| --- | --- |
| Indexer (pull) | Content sits in a supported Azure data source (Blob Storage, databases, SharePoint and others); scheduled, incremental indexing |
| Push API | Content is preprocessed elsewhere or comes from an unsupported source |
| Skillset | Chunk, vectorize, run OCR, analyze or verbalize images during indexing |
| Integrated vectorization | Embeddings created during indexing and at query time (Azure OpenAI or a Custom Web API vectorizer; the Azure Vision multimodal and Foundry model catalog options are preview) |
| Chunking | Large documents: split them so that each part can be matched on its own |

> **Exam trap.** If the stem says the model "invents answers" or "doesn't know our products", the fix is retrieval (grounding), not lowering the temperature. If it says users search with exact part numbers and also with natural-language questions, vector search alone isn't enough: choose hybrid.

<!-- section: agent-integration | objectives: 1.1.4 -->
## Choosing memory, tools and knowledge for agents

An agent combines a model, instructions and tools. Foundry offers built-in tools (web search, file search, code interpreter, memory) and custom tools (functions, OpenAPI specifications, MCP servers). Sort them by what they give the agent.

**Knowledge tools** bring content to ground answers:

| Tool | Use it when |
| --- | --- |
| File search | Users or developers upload documents for the agent; the service chunks and indexes them in a vector store |
| Azure AI Search | An existing, curated search index must ground the agent |
| Foundry IQ knowledge base | Several sources (Blob Storage, SharePoint, OneLake, web) shared by several agents, with agentic retrieval, citations and permissions enforced at query time |
| Web search or Grounding with Bing | Current public information |
| SharePoint, Fabric data agent | Microsoft 365 content or Microsoft Fabric data |

**Action tools** let the agent do something:

| Tool | Use it when |
| --- | --- |
| Function calling | The agent must call your code; the model returns the function name and arguments, your application runs it and returns the result |
| OpenAPI | Call an existing REST API described by an OpenAPI specification |
| MCP | Call tools exposed by a remote Model Context Protocol server |
| Azure Functions | Run serverless code as a tool, through Storage queues; standard agent setup only |
| Code interpreter | Run Python in a sandbox: calculations, charts, file processing |
| Browser automation, computer use | Operate web pages or a computer interface |
| Agent-to-agent (A2A) | Delegate a task to another agent |

A **toolbox** defines a curated set of tools once and exposes it through a single MCP-compatible endpoint shared by several agents, with central authentication and versioning. Seven tools can't go in a toolbox: function calling (it runs on the client side), Grounding with Bing, computer use, image generation, SharePoint, the Fabric data agent and Azure Functions.

**Memory** keeps context:

| Need | Choose |
| --- | --- |
| Follow-up questions in the same conversation | Conversation history (short-term memory), managed by the runtime |
| Remember preferences or facts across sessions and devices | Agent memory (long-term, preview): a memory store read and written by the memory search tool |
| Curated organizational content | Foundry IQ knowledge base, not memory |
| A document a user provides during the interaction | File search, not memory |

Long-term memory holds user profile memory (preferences such as language), chat summary memory (summaries of earlier topics) and procedural memory (recurring routines). It needs a chat model deployment and an embedding model deployment. The memory search tool can resolve the scope from the caller's identity when `scope` is set to `{{$userId}}`, so each user gets only their own memories. A memory store holds up to 100 scopes and 10,000 memories per scope, and doesn't support VNet integration.

> **Exam trap.** Tools are actions, knowledge is context, memory is what the agent learned about the user. "Answer from the HR policies" calls for a knowledge tool; "create a ticket in our system" calls for a function, OpenAPI or MCP tool; "remember that this customer prefers French" calls for memory.

<!-- section: key-points -->
## Key points

- Model choice follows the task and the constraint: LLM for open tasks, SLM for cheap and fast simple tasks, reasoning model for hard multistep problems, multimodal for images, embeddings for vectors, Foundry Tools for one predictable task.
- One Foundry resource (kind `AIServices`) gives models, agents, Speech, Vision, Language and Content Understanding; projects isolate teams.
- Prompt agent for managed agents, hosted agent for your own code, Responses API for an agent defined in code.
- Hybrid search gives maximum recall; the semantic ranker re-orders the top results; agentic retrieval plans subqueries for agents.
- Same embedding model at indexing and query time; changing it means re-indexing.
- Knowledge tools ground, action tools act, memory persists across sessions (preview, scoped per user).
