# QZ-ai-103-11-foundry-services — notes

`content/ai-103/quizzes/11-foundry-services.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q1, q6), 1.1.2 (q4, q8), 1.1.3 (q3, q7, q10), 1.1.4 (q2, q5, q9). Positions 6–10: single ×3, dropdown, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Azure AI Search is now named "Foundry IQ (Azure AI Search)"** in Learn page titles and headings (overview, hybrid search, semantic ranking, RAG, update or rebuild an index, all updated Nov 2026). The agent tool page is "Connect a Foundry IQ (Azure AI Search) index to Foundry agents", and the Toolbox table lists "Foundry IQ (Azure AI Search)". The chapter and this quiz still write "Azure AI Search". The name needs a glossary decision (en and fr) for the whole certification, because "Foundry IQ" also means knowledge bases.
- **Classic RAG row "Only GA features"** is out of date. The RAG overview (2026-11-17) says that planning and answer synthesis of agentic retrieval are GA in REST API `2026-10-01`, with some capabilities still in preview. Its classic RAG criteria no longer mention GA. The mock question `ai103-1a-classic-rag` uses "generally available features only" as the deciding constraint, so it should be reviewed too.
- **Tool catalog**: the URL `.../agents/concepts/tool-catalog` now serves "What is Toolbox in Microsoft Foundry?". New entries: Fabric IQ, Work IQ, tool search and the reminder tool (these two only through a toolbox), and Skills (preview). Seven tools can't go in a toolbox: function calling, Grounding with Bing, computer use, image generation, SharePoint, Fabric data agent and Azure Functions. The chapter only says this about function calling.
- **Agent types**: the Agent Service overview lists prompt agents, voice-based prompt agents ("generally available, with some features still in preview") and hosted agents. It lists no workflow agent. The chapter agrees, but the mock questions `ai103-1a-agent-types`, `ai103-1a-voice-agent` and `ai103-1a-hosted-agent` use workflow agents as answers or distractors, so they should be checked.
- **Azure Functions tool**: the only page found is a (classic) page. It says Agents (classic) are deprecated and retire on March 31, 2027, and that the tool needs a standard setup. The chapter lists Azure Functions as an action tool with no caveat.
- **Integrated vectorization**: the Azure Vision multimodal embeddings skill and vectorizer, and the Foundry model catalog vectorizer, are **preview**. The mock question `ai103-1a-image-search` uses the Azure Vision pair as its correct answer.
- Audio models: the models page now adds `gpt-realtime-translate`, `gpt-realtime-whisper` and `gpt-live-transcribe`, which Learn calls the "current recommended model for realtime transcription scenarios". The chapter table could mention them.
- Confirmed as written: Codex models are Responses API only; you can't upgrade between embedding models (you must generate new embeddings); the semantic ranker reranks the top 50 results and can't rerun the query over the corpus; captions and answers are verbatim, not generated; memory is preview (100 scopes, 10,000 memories per scope, no VNet support).

## Not verified on a fetched page

- The knowledge, action and instructions split in q5 comes from the chapter. None of the current Learn pages I fetched groups tools into categories any more.
- In q6, the cost order (`gpt-4.1-nano` costs less than `gpt-4.1`) comes from the chapter's SLM row, not from a pricing page. The statement that `text-embedding-3-small` takes text only isn't explicit on the models page.
- In q8, the explanation of option d (with Chat Completions, the app must implement web search and code execution itself) is general knowledge. It's worded as extra effort, not as a product limit.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are: models sold by Azure as a category, which component runs a function call, keyword-only search for exact codes, the Foundry resource kind, tool categories, a multimodal SLM for cost, the semantic ranker's lack of recall, the Responses API (ephemeral agent), a toolbox combined with a client-side function and the AI Search tool, and an indexer pipeline with OCR, a vectorizer and `kind: text`.
- No preview feature is an answer. Memory and knowledge bases appear only as distractors (q5 uses no memory item; q9 has a knowledge base distractor in one slot).
