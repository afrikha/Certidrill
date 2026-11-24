# QZ-ai-103-51-retrieval-grounding — doubts and notes

Quiz: `content/ai-103/quizzes/51-retrieval-grounding.yaml` (10 questions; checker: 0 problem, 0 warning).

## Chapter out of date or incomplete against current Learn (chapter not edited)

- **Product name.** Learn now presents the service as **"Foundry IQ (Azure AI Search)"** (overview H1 "What is Foundry IQ (Azure AI Search)?", page titles of the Document Layout skill, hybrid search overview, RBAC enablement). The agent tool page is titled "Connect a Foundry IQ (Azure AI Search) index to Foundry agents" and speaks of the "Foundry IQ tool" and roles "on the Foundry IQ service". The chapter and the quiz still say "Azure AI Search" (study guide wording, SDK class `AzureAISearchTool`, URL path `/azure/search/`). Naming decision to take for the whole AI-103 course and bank.
- **Toolbox.** The tool page now recommends adding the search tool through a **toolbox** attached to the agent as an MCP tool (reuse, central credentials). Not in the chapter.
- **Foundry IQ knowledge base as an agent tool is partly preview.** Knowledge bases / agentic retrieval are GA (Search REST `2026-10-01`), but "Connect Agents to Foundry IQ (Azure AI Search) Knowledge Bases" marks the `RemoteTool` connection and the KB MCP endpoint (`2026-11-01-preview`) as preview. The chapter's table presents the KB as a knowledge tool with no preview mention. The quiz never uses the KB as an answer. Bank questions `ai103-5b-kb-mcp-tool` and `ai103-5b-retrieval-connection` (answer `kb`) use it as the correct answer: to review.
- **Azure Vision multimodal embeddings skill is labeled "(preview)"** on "Attach Resource to Skillset for Billing". The chapter lists it as a regular skill; bank question `ai103-5a-photo-similarity` uses it as the correct answer: to review.
- **Reset.** The chapter never says that a skillset or indexer change doesn't reprocess unchanged blobs and that the indexer must be **reset** then run (Reset Indexers is GA; Reset Skills, Reset Documents and Resync are preview). Q9 tests it (study-guide scope "Configure RAG ingestion flow"); adding a line to section `rag-ingestion` is suggested.
- **Utility skills are free.** Learn: Conditional, Document Extraction, Shaper, Text Merge and Text Split are never billable; the Azure OpenAI Embedding skill is charged at the Azure OpenAI price. The chapter only names the billable skills. Q6 relies on it (explained in the answer).
- **Quantization wording.** The chapter says quantization reduces "vector storage". Learn: it reduces the **vector index size** (memory, and disk per the quantization page), but "Eliminate Optional Vector Instances" says it slightly increases storage while originals are preserved (`preserveOriginals`); `stored: false` and `discardOriginals` are the storage levers. In the stable API, quantization applies to HNSW; exhaustive KNN with compression needs a preview API. Q3 is phrased on vector index size only.
- **Index requirements of the tool.** Learn also lists searchable/retrievable `Edm.String` fields and searchable vector fields as prerequisites, besides the retrievable content and URL fields the chapter gives.
- Text Merge: Learn's sample writes `merged_text`; the chapter writes `merged_content` (a target name, both valid).

## Unverified or weakly sourced facts

- **Query type semantics (Q7).** The current tool page and SDK enum pages list the values without describing them. The meaning of `vector_simple_hybrid` (keyword + vector, no semantic ranking) and the semantic-configuration requirement of `semantic` / `vector_semantic_hybrid` come from the classic "Azure OpenAI on your Azure Search data" reference, which is retired (On Your Data retired on 14 Oct 2026) and is therefore not cited.
- `top_k` and `filter` as Python parameters of `AISearchIndexResource` (chapter table): not shown in the Python sample of the tool page (only in the C# sample). Not used in the quiz.
- The quiz says Search Service Contributor "can't query indexes through role-based access" (Learn RBAC page, verbatim meaning).
- Memory in Foundry Agent Service is **preview**; it appears only as a false statement (Q4 s1).

## Mock-exam overlap avoided

Not repeated: content paths, file extensions, push vs pull, Import data wizard, vector field schema, reduced dimensions, RRF, exhaustive recall, semantic config/facts, prefilter, text vectorizer, hybrid query with `kind: text` (Q8 uses `kind: vector` + `k: 50` + captions instead), imageAction empty OCR, index projections, keyless ingestion roles (Q10 is about the query-time vectorizer identity and the app's data role), Document Layout headings/ordering (Q5 is the `allowSkillsetToReadFileData` fix), billing with OCR beyond the free limit (Q6 is about utility/embedding skills and Document Layout), search tool facts, private endpoint, streaming citations, file search, KB MCP tool.
