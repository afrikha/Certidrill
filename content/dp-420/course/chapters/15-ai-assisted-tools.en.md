The Azure Cosmos DB Agent Kit brings Microsoft's Azure Cosmos DB best practices into AI coding assistants such as GitHub Copilot, Claude Code or Cursor. The exam tests what the kit is and isn't (guidance, not database access), how to install it and check that it loaded, which context to give it for a partition key, query or SDK review, and how it fits into building an AI application next to MCP servers.

<!-- section: agent-kit-overview | objectives: 1.5.1 -->
## What the Agent Kit is

The Agent Kit is an open-source collection of **Agent Skills** (the agentskills.io format), published in the `AzureCosmosDB/cosmosdb-agent-kit` GitHub repository. Its main skill, **`cosmosdb-best-practices`**, is a `SKILL.md` file (instructions and an index) plus a `rules/` folder of individual rule files. A compatible assistant loads the relevant rules **on demand**, when the task needs them, instead of adding every rule to every prompt.

The kit targets the decisions that drive performance, scalability and cost:

| Area | Examples of what the guidance covers |
| --- | --- |
| Data modeling and partition key design | Embedding versus referencing, key cardinality, hot partition prevention, logical partition growth |
| Query optimization and indexing | Single-partition queries, projections, indexing policy for common and vector workloads |
| SDK usage | Client reuse, asynchronous calls, parameterized queries, pagination, retries, diagnostics |
| Security and access | Microsoft Entra ID authentication instead of keys, access patterns |
| Throughput, scaling and global distribution | Autoscale, scaling options, consistency and region settings |
| AI workloads | Vector search, full-text search, hybrid search, design patterns |
| Operations | Developer tooling, monitoring and diagnostics |

The repository ranks data modeling and partition key design as the most critical categories.

What the kit is **not**:

- It doesn't authenticate the assistant to Azure or give it access to a database. The assistant works only from the code, documents and diagnostics you give it.
- Its recommendations are suggestions. A generated answer doesn't prove that a query ran or that RU consumption dropped: you validate and measure.
- It isn't the Microsoft Learn MCP server, which searches official documentation, nor a database MCP server.

| Capability | What you need |
| --- | --- |
| Apply Agent Kit guidance to code or a data model | A compatible host with the skill installed and discoverable |
| Search current Microsoft documentation | An MCP client connected to the Microsoft Learn MCP server |
| Query or manage an Azure Cosmos DB resource | Separately configured database tools, authentication and permissions |

> **Exam trap.** "The developer installed the Agent Kit, so the assistant can now read the production container" is false. Installing skills grants no data access; database operations need a separate tool (for example an MCP server) with its own identity and role assignment.

<!-- section: install-verify | objectives: 1.5.1 -->
## Installing the kit and verifying skill discovery

Prerequisites: an assistant that supports Agent Skills (or one of the kit's plugin formats), **Node.js with npm and npx** for the skills CLI, and access to GitHub and the package registry. No Azure subscription is needed to install the skills or review code.

The generic method selects the skills and the target assistants interactively:

```bash
npx skills add AzureCosmosDB/cosmosdb-agent-kit
```

Host-specific methods:

| Host | Installation |
| --- | --- |
| GitHub Copilot in Visual Studio Code, Cursor, other Agent Skills hosts | Skills CLI (`npx skills add`) |
| GitHub Copilot CLI | `/plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, then `/plugin install cosmosdb@cosmosdb-agent-kit` |
| Claude Code | `/plugin install cosmosdb@claude-plugins-official` |
| Gemini CLI | `gemini extensions install https://github.com/AzureCosmosDB/cosmosdb-agent-kit` |
| Agent Package Manager (APM) | `apm install AzureCosmosDB/cosmosdb-agent-kit` |
| OpenAI Codex | `codex plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, then install from the Plugins Directory of the ChatGPT desktop app |
| Grok Build | `grok plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, then `grok plugin install cosmosdb --trust` |
| Kimi Code CLI | `/plugins install https://github.com/AzureCosmosDB/cosmosdb-agent-kit`, then `/reload` |

Choose the project or user installation scope your host documents, and don't install the same skill through two methods in the same host.

To verify discovery: reload the host or start a new session if it requires it, open the project (or confirm the host reads the user-level scope), look for **`cosmosdb-best-practices`** in the host's installed skills or plugins view, then ask a test question about sanitized code and check the host's skill-loading indicators or logs.

```text
Use the installed cosmosdb-best-practices skill to review my Azure Cosmos DB code.
Identify the relevant guidance, explain your recommendations, and state what
information you need before suggesting changes.
```

| Symptom | What to check |
| --- | --- |
| `npx` isn't found | Install Node.js with npm, then reopen the terminal |
| Plugin command not recognized | Host and host version support that plugin method; otherwise use the skills CLI |
| Installed but not discovered | Selected assistant, installation scope, workspace, host trust settings; reload |
| The assistant loads too much context | Use on-demand loading, select only the relevant skill; if the host needs a compiled `AGENTS.md`, check its context budget |
| Download fails | Network, proxy and registry access |

> **Exam trap.** An answer that simply mentions Azure Cosmos DB doesn't prove the skill was loaded. The evidence is the host's list of installed skills and its skill-loading indicators.

<!-- section: best-practice-reviews | objectives: 1.5.1 -->
## Following recommended practices with task recipes

The kit works best when you supply the context a human reviewer would ask for, without secrets. Never paste credentials, access tokens, connection strings or sensitive document values: replace them while keeping the structure.

| Task | Context to provide | How to validate the answer |
| --- | --- | --- |
| Review a partition key | Proposed key, representative document shapes, common query filters, write rates, expected data growth, tenant-size differences | Test against representative data and traffic; a proposed key isn't a measured scalability result |
| Optimize a query | The query, partition key, indexing policy, document shapes, required result fields, RU charges and query diagnostics | Run original and revised queries on the same dataset and indexing state; confirm identical results; compare RU charge and latency |
| Review SDK code | SDK language and package version, client initialization, operations, authentication approach, sanitized error diagnostics | Build and run tests; check error and throttling (429) behavior; validate permissions in a nonproduction environment |

A partition key review prompt in the style of the kit's recipes:

```text
Use the Azure Cosmos DB Agent Kit to review my proposed partition key /tenantId.
Evaluate it against my query patterns, write distribution, cardinality,
and expected data growth. Identify hot-partition and storage risks.
Ask for missing workload information before recommending a key.
Explain the trade-offs between suitable alternatives.
```

What a good SDK review checks, and what you should expect the kit to recommend:

- **One `CosmosClient` per application**, reused (no client per request).
- Asynchronous operations, **parameterized queries**, correct pagination with continuation tokens.
- Respect for the SDK's built-in retry behavior instead of custom retry loops on top of it.
- **Microsoft Entra ID** authentication (`DefaultAzureCredential` plus a data plane role) where the deployment supports it.
- Diagnostics logged for slow or failed requests.

> **Exam tip.** In a scenario question, the right next step after receiving an Agent Kit recommendation is almost always to validate it: same dataset, same indexing state, RU charge and latency measured before and after. Applying it straight to production, or treating the answer as proof, is the distractor.

<!-- section: ai-app-acceleration | objectives: 1.5.2 -->
## Accelerating AI application development

For an AI application (retrieval-augmented generation, agents, semantic search), the kit's guidance covers the Azure Cosmos DB choices that are easy to get wrong early:

- **Vector search**: container vector embedding policy and vector index, index choice for the workload, queries that order by vector distance.
- **Full-text and hybrid search**: full-text policy and index, combining full-text and vector ranking.
- **Design patterns** for agentic workflows, change feed processing and materialized views (for example keeping an embeddings container in sync with source documents through the change feed).
- The same partition key, indexing and SDK rules as for any workload, applied to chunks, embeddings, chat history and agent memory.

A typical accelerated workflow:

1. Install the kit and connect the assistant to the **Microsoft Learn MCP server**, so that it also retrieves current official documentation.
2. Describe the data (document shapes, embedding dimensions, expected volume) and the access patterns (filters, top-k similarity, per-tenant isolation).
3. Ask the assistant to propose the data model, partition key, vector and full-text policies and the SDK code, asking for missing information first.
4. Generate code and infrastructure, then test: query results, RU charge, latency.
5. If the agent itself must read data at run time, give it a **separately configured** database tool.

The **Azure Cosmos DB MCP Toolkit** (open source, `AzureCosmosDB/MCPToolKit`) is such a tool: an MCP server, hosted in Azure Container Apps, that lets agents (for example in Microsoft Foundry, or GitHub Copilot in Visual Studio Code) query Azure Cosmos DB.

| Aspect | MCP Toolkit |
| --- | --- |
| Tools | `list_databases`, `list_collections`, `get_recent_documents`, `find_document_by_id`, `text_search`, `vector_search`, `get_approximate_schema` |
| Operations | **Read-only**: query and search |
| Caller authentication | Microsoft Entra ID tokens (JWT) with audience validation and the `Mcp.Tool.Executor` role |
| Access to Azure Cosmos DB | The Container App's managed identity with a data reader role; no stored credentials |
| Vector search | Requires an Azure OpenAI embedding deployment, stored embeddings and a vector indexing policy |
| Foundry integration | Added to a Foundry project as a custom tool with Microsoft Entra authentication |

| Requirement | Tool |
| --- | --- |
| The coding assistant must follow Azure Cosmos DB best practices while writing code | Agent Kit |
| The assistant must cite current Microsoft documentation | Microsoft Learn MCP server |
| A Foundry agent must search product documents stored in a container, read-only, without keys | Azure Cosmos DB MCP Toolkit |

> **Exam trap.** The Agent Kit and the MCP Toolkit solve different problems. The kit improves the code and the design your assistant writes; it never runs a query. The MCP Toolkit runs read-only queries for an agent; it doesn't review your design.

<!-- section: key-points -->
## Key points

- Agent Kit = Agent Skills collection (`cosmosdb-best-practices`) loaded on demand by compatible AI coding assistants; guidance for data modeling, partition keys, queries, SDK, security, throughput, global distribution, vector, full-text and hybrid search.
- Install with `npx skills add AzureCosmosDB/cosmosdb-agent-kit` (needs Node.js, npm, npx) or a host-specific plugin; verify that `cosmosdb-best-practices` is discovered and loaded.
- No Azure subscription needed and no data access granted; never paste secrets; validate every recommendation by measuring results, RU charge and latency.
- Supply the context of the task: workload and growth for a partition key, query plus indexing policy plus diagnostics for a query, SDK version plus initialization plus authentication for code.
- For AI apps: the kit guides vector, full-text and hybrid designs; the Learn MCP server provides documentation; a database MCP server (such as the read-only MCP Toolkit) provides run-time data access.
