# QZ-dp-420-15-ai-assisted-tools — report

File: `content/dp-420/quizzes/15-ai-assisted-tools.yaml` (10 questions, 1.5.1 ×6, 1.5.2 ×4). Check: 0 problem(s), 0 warning(s).

## Decisions tested (not in the mock bank)
What the kit is vs MCP Toolkit / Learn MCP / Azure Advisor; Copilot CLI plugin install command; `npx` not found; partition key review context; change feed pattern for embedding sync; project vs user install scope; SDK suggestions to reject (custom 429 retry loop, primary key); tool per need (kit, Learn MCP, MCP Toolkit, Data Explorer); MCP Toolkit authentication; `vector_search` failing alone (missing Azure OpenAI embedding deployment).

## Doubts and points against current Learn (Nov 2026)
- **MCP Toolkit read-only**: the Learn page "Model Context Protocol (MCP) Toolkit - Azure Cosmos DB for NoSQL" contradicts itself: "Full CRUD operations" under Capabilities, "Read-only operations" under Considerations (all 7 listed tools are read/search). The chapter states read-only without nuance; the quiz never relies on read-only as the deciding fact.
- The Learn page names the role given to the Container App identity "Cosmos DB Data Reader" (not the exact built-in name "Cosmos DB Built-in Data Reader"); the chapter says "a data reader role", which is safe. The page doesn't explain how `Mcp.Tool.Executor` is assigned. Preview/GA status isn't stated on Learn (a devblog of June 2026 announces GA; not verified on Learn).
- Chapter install table: Learn setup page also lists Grok Build and Kimi Code CLI; for OpenAI Codex Learn gives the exact command `codex plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, then install from the Plugins Directory of the ChatGPT desktop app. Minor omissions, not errors.
- Chapter "the repository ranks data modeling and partition key design as the most critical": confirmed only on the GitHub README (CRITICAL impact), not on Learn. The Learn overview lists 14 focus areas without ranking. Not used in the quiz.
- Q5 (change feed to keep embeddings in sync) relies on the chapter's example; the Learn change feed design patterns page covers "data movement" (keeping caches/search indexes/derived data in sync) but doesn't mention embeddings.
- The Learn MCP server page doesn't state whether authentication is required; not used.
