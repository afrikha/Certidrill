# FIX-ai-103-3 — chapters 41, 42, 51 and 52 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-103 41-text-analysis 42-speech 51-retrieval-grounding 52-document-extraction` 0 problems; `content:validate --cert ai-103` 0 problems, 0 warnings; `check-quiz ai-103` (4 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block and no section marker changed.

## 41-text-analysis

| Finding | Learn | Change |
| --- | --- | --- |
| Text PII options (threshold, excluded values, synonyms, `syntheticReplacement`) said to be GA | **Learn disagrees with itself.** "What's new" (Language, June 2026 entry) says these four capabilities became GA in `2026-05-01`. But redact-text-pii (ms.date 2026-06-02) still puts them under "2025-11-15-preview" and calls synthetic replacement "currently available in preview", and so does the Language overview (2026-07-21) | None. Needs a human decision |
| Guardrail controls not marked preview | Confirmed (guardrails-overview): Personally identifiable information and Groundedness are preview, Protected material for text and for code aren't. Groundedness detection in Azure OpenAI retires on April 30, 2027. The PII filter page (2026-09-08) says the filter scans LLM output and gives no status | sentiment-safety paragraph: PII control (preview) on outputs, groundedness (preview) and its retirement date |
| Adaptive custom translation, 500 characters per pair | Wrong: 250 characters or fewer per segment, and longer segments are rejected. The playground is GA (Foundry NextGen), the dataset API v1.0 is preview | translation bullet |
| Operations removed in `2026-06-06` | Confirmed (migrate page): Detect, BreakSentence, Dictionary Lookup and Dictionary Examples are gone (Detect is replaced by Azure Language detection). Transliterate stays | New bullet in translation |
| Structured outputs, unsupported cases | Confirmed: not supported with bring-your-own-data, Assistants or Foundry Agents Service, or `gpt-audio`/`gpt-audio-mini`. The 100-property and five-level limits haven't changed | New bullet in the strict-mode list |
| Fine-tuning page | The page is now titled "Training in Microsoft Foundry". It doesn't put training last, and it says training "doesn't replace retrieval for current information". The chapter's ordering is its own advice and doesn't contradict the page | None |
| Not reported, re-checked | `2026-06-06` is GA (text-translation overview); the LLM limits of 50 elements of 5,000 and NMT 1,000 of 50,000 are confirmed there; at most five reference translations | None |

## 42-speech

| Finding | Learn | Change |
| --- | --- | --- |
| `azure-speech` "works with non-multimodal models and agents" | Incomplete: per voice-live-how-to it also works with `gpt-realtime`, `gpt-realtime-mini`, `azure-realtime`, `microsoft-realtime-flash-1` and `phi4-mm-realtime`. `gpt-4o-transcribe-diarize` is gpt-realtime only. `mai-transcribe(-2)` are preview | `input_audio_transcription.model` row (realtime models, `gpt-4o-transcribe-diarize`). The preview `mai-transcribe` models aren't added |
| Agent mode looks like a preview | **Not confirmed.** The quickstart uses `api_version="2026-01-01-preview"` and beta packages, but no page labels agent mode as preview. Confirmed: the role is Foundry User (formerly Azure AI User), keys aren't supported in agent mode | One sentence on the Foundry User role. Status: for a human decision |
| Live Interpreter missing | Confirmed (speech-translation and how-to-use-live-interpreter): it identifies the spoken language continuously, handles language switches, keeps the speaker's style and tone, uses `TranslationRecognizer` with an empty `AutoDetectSourceLanguageConfig()`, the universal v2 endpoint, and `voice_name = "personal-voice"` (personal voice access). There's an LLM variant (`setfeature=llm`). Neither page gives a GA or preview status | New table row and a bullet in speech-translation |
| Structured outputs with audio models | Confirmed (structured-outputs: `gpt-audio` and `gpt-audio-mini` aren't supported) | audio-reasoning: one sentence (a second step with a text model) |
| Batch transcription limits | Confirmed (batch-transcription-create): diarization is mono only; channels 0 and 1 by default; language identification only with base models, falls back to base models with a custom model, and says to use real-time when both are needed; a custom model is referenced by its `self` URI, no endpoint needed | Diarization row, plus a short paragraph under the table |
| Batch synthesis / Long Audio API | Confirmed (batch-synthesis): batch synthesis is GA and asynchronous, for audio longer than 10 minutes; the Long Audio API retires April 1, 2027 | TTS bullet |
| Keyless trap: quote "for learning only" | Not on the quickstart. It says "For production, use a more secure way" and recommends Entra ID with managed identities, Key Vault and rotation. how-to-configure-azure-ad-auth: a custom domain name is required and can't be undone, the role is Cognitive Services Speech User or Speech Contributor, and the config is `SpeechConfig(token_credential=..., endpoint=...)` | Trap reworded and completed (same callout) |

## 51-retrieval-grounding

| Finding | Learn | Change |
| --- | --- | --- |
| Product name | Confirmed: "What is Foundry IQ (Azure AI Search)?" and the tool page "Connect a Foundry IQ (Azure AI Search) index to Foundry agents". No page mentions a rename | Intro: one sentence saying Learn's current title. The course and bank keep "Azure AI Search": **naming decision for the owner** |
| Toolbox | Confirmed: the tool page says to consider a toolbox, and the Java section recommends one (reuse, central credentials, MCP endpoint). The toolbox-overview page gives no GA or preview status | One sentence in connect-agents, with no status given |
| Knowledge base as an agent tool | Confirmed preview: the `RemoteTool` connection is labeled preview, and the KB MCP endpoint uses `2026-11-01-preview` (foundry-iq-connect). The KB retrieve action itself is GA in `2026-10-01` (agentic-retrieval-how-to-retrieve) | KB table row (preview connection). Workflow row: retrieve API (GA). Key points |
| Azure Vision multimodal embeddings skill | Confirmed preview (H1 "(preview)" and the billing page). The Foundry model catalog AML skill and its vectorizer are also preview (aml-skill page) | Skill table row renamed "Azure Vision" + (preview); content table "(preview skills)" |
| Reset not explained | Confirmed (run-reset-indexers): an unchanged source makes a run have no effect; Reset Indexers reindexes everything and must be followed by Run; Reset Skills, Reset Documents and Resync are preview | New paragraph after the ingestion steps; key point |
| Utility skills are free | Confirmed: Conditional, Document Extraction, Shaper, Text Merge, Text Split aren't billable. The page doesn't cover the Azure OpenAI Embedding skill's billing, so that isn't added | Billing sentence |
| Quantization wording | The quantization page says it reduces vector index size, memory **and** disk, and the stable API supports HNSW only. The "Eliminate Optional Vector Instances" page wasn't fetched | Compression row: "vector index size (memory and disk); HNSW only in the stable API" |
| Index requirements of the tool | Confirmed: searchable and retrievable `Edm.String` fields, searchable vector fields, a text field to cite, and a URL field | Paragraph completed |
| `merged_text` vs `merged_content` | Both are just target names | None |

## 52-document-extraction

| Finding | Learn | Change |
| --- | --- | --- |
| Confidence and grounding for all methods | Confirmed (analyzer-reference, What's new July 2026): document analyzers, `extract`, `classify`, `generate` | Stage table row, exam trap, key points |
| Field-level `estimateSourceAndConfidence` | Confirmed: must be true for `extract`, and it overrides the analyzer-level setting | Stage table row |
| `extract` is documents only | Confirmed (best-practices note) | Exam trap; key points |
| `source` only for rendered files | **Not confirmed**: neither analyzer-reference nor best-practices says so (the document-elements page wasn't fetched) | None |
| New items | Confirmed: `prebuilt-digitalParse` (no model; use read/layout for scanned files); RBAC roles Cognitive Service Content Understanding Owner/Contributor/Reader (May 2026); asynchronous PDF/TIFF limit raised to 2,000 pages (Oct 2026); latest GA still `2025-11-01`. Preview only and not added: agentic workflow, synchronous read/layout, signatures. Not added: `prebuilt-callCenter`, `segmentPerPage`, `chartFormat`, `annotationFormat`, `locales` (no status on the page), automatic normalization | Prebuilt table row (`prebuilt-digitalParse`), roles sentence, page limit sentence |
| Video classification | Confirmed: a video analyzer accepts only one `contentCategories` entry, used for segmentation | One sentence after the classifier |
| Risk level is a `generate` example | Confirmed (best practices). The chapter's "`generate` or `classify`" is still valid | None |
| `prebuilt-analyzer-completion-mini` | Confirmed (models-deployments): the default for `prebuilt-*Search` | Alias sentence |

## Mock-exam bank questions changed

- `questions/extraction/ai103-5b-kb-mcp-tool.yaml` (5.1.5, dropdown, difficulty 3, same id): rewritten. The correct answer was the preview path (a `RemoteTool` connection and the KB MCP endpoint). It is now an Azure Functions step that calls the GA retrieve action (`2026-10-01`). The slots are `KnowledgeBaseRetrievalClient`, a semantic intent (minimal effort rejects `messages`), and `result.response`. Reference: "Query Knowledge Base via API or MCP".
- `questions/extraction/ai103-5b-retrieval-connection.yaml` (5.1.5, dragdrop): the `kb` item is now "Retrieve call to a Foundry IQ knowledge base in your own code" (it was "through an MCP tool", which is preview), and the "shared" target is about back-office apps instead of agents. Same mapping. The explanation and reference were updated.
- `questions/extraction/ai103-5a-photo-similarity.yaml` (5.1.1, single, difficulty 3): rewritten because the correct answer was the preview Vision multimodal embeddings skill. Searching by an uploaded photo has no GA path: Vision multimodal and the Foundry-catalog AML skill and vectorizer are all preview. So the requirement became typed paraphrases matched by meaning, with no LLM per photo. The answer is the Image Analysis skill (captions), Azure OpenAI Embedding, and an Azure OpenAI vectorizer. Distractors: GenAI Prompt (an LLM per photo), OCR plus Text Merge, and Image Analysis tags with full-text search.

## Checked and left unchanged

- 4.1.x: `ai103-cs1c-house-style` (adaptive custom translation; the playground is GA, so the answer stands). `ai103-4a-document-pii` (syntheticReplacement is only a distractor). Translator and structured-output questions (none relies on 500 characters or on Detect being available).
- 4.2.x: `ai103-4b-voicelive-session`, `-phrase-list-modes`, `-voicelive-custom-speech` (consistent with voice-live-how-to and how-to-customize), `ai103-4b-diarization` (35 speakers, mono recordings), `ai103-cs3b-desk-interpreter` (Live Interpreter; the chapter now covers it), `ai103-4b-multi-voice`, `ai103-4b-auto-detect-source`.
- 5.1.x: billing questions (`5a-free-limit-timeout`, `5a-ingestion-billing`, `5a-keyless-billing`), quantization (`5a-reduced-dimensions`), `sr2-scanned-manuals-*` (multimodal embeddings only as a wrong solution), `5a-diagram-verbalization` (multimodal skill as a distractor), and the search tool questions.
- 5.2.x: all 27 questions. Confidence wording ("extract fields require it") is still true. `5b-cu-pipeline-facts` s2 (digitalParse not for scanned files) matches Learn.
- Quiz files: none changed. q3 (41), q7 (42), q9 (51) and q10 (52) already agree with the corrected chapters.

## For a human decision

- **Text PII GA status** (chapter 41 sentence "Text PII detection (GA) also supports…", `ai103-4a-pii-tuning` with `confidenceScoreThreshold` and `valueExclusionPolicy`, `ai103-4a-pii-request` with `entityMask` under `api-version=2025-11-15-preview`): Language "What's new" says GA in `2026-05-01`; redact-text-pii and the overview still say preview. Nothing was changed.
- **`ai103-cs4b-personal-data`**: the correct answer is the PII guardrail control. guardrails-overview labels it preview, the PII filter page gives no status, and guardrails for agents are labeled "Agents (Preview)" as a whole, so the case study (gr-support on support-agent) relies on a preview surface. The question wasn't rewritten: no GA option fits "add to gr-support", and the GA alternative (Language PII redaction before the response) is the decision of quiz 41 q3. Owner to decide, possibly together with the case-study file (not in scope).
- **Voice Live agent mode** (`ai103-4b-agent-mode-facts`, chapter 42): preview API version and beta packages, but no preview label. Left unchanged.
- **Live Interpreter**: no GA or preview label on the fetched pages.
- **Naming**: "Foundry IQ (Azure AI Search)" vs "Azure AI Search" across the course and bank. Also, 16 references in the bank still use the old title "Connect an Azure AI Search index to Foundry agents". The page is now "Connect a Foundry IQ (Azure AI Search) index to Foundry agents". Those references weren't changed, pending the naming decision.
- **Out of scope**: `questions/planning/ai103-1a-image-search.yaml` (1.1.3) has the preview Vision multimodal embeddings skill as its correct answer.

## French terms not settled (not in the glossary)

- « terrain de jeu (playground) », « boîte à outils (toolbox) », « détection en plage ouverte » (open-range detection), « voix personnelle » (personal voice), « nom de domaine personnalisé », « réindexation complète », « mise hors service » (retirement, already used in 41), « intention sémantique » (semantic intent), « légender » (caption, in 5a-photo-similarity). None was checked on fr-fr Learn.
- No « appairé », « faire confiance à » or « UC » in the four chapters. « étiquettes » for Image Analysis tags (existing text in 51) is untouched: it's the Azure-tag word in the glossary, and Learn FR wasn't checked for this skill.
