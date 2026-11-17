# K-ai-103-cs3 — report

3 case studies, 16 questions, validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective) |
| --- | --- | --- |
| ai103-cs3a-lucerne | Educational publisher; image generation and editing, vision descriptions, document translation | region-edit (3.1.3), provenance (1.4.3), blocking-level (3.3.1), diagram-descriptions (3.2.4), manuscript-translation (4.1.3) |
| ai103-cs3b-alpine | Ski resorts; voice concierge agent (Responses API, conversations), live interpreter, deployments, tracing | agent-access (1.3.4), conversation-code (2.1.6), desk-interpreter (4.2.4), peak-deployment (1.2.2), run-tracing (2.3.3) |
| ai103-cs3c-relecloud | Offshore wind; Content Understanding video analysis, AI Search OCR ingestion, private indexer, RAG evaluation | blade-segments (3.2.6), video-limits (3.2.8), manual-pipeline (5.1.4), enrichment-billing (1.3.3), indexer-private (1.3.4), rag-evaluators (2.1.4) |

## Deviations and choices

- Overlap avoided with siblings already on disk: MCP `require_approval` (cs1a, sr1), Foundry User + managed identity (cs1a, sr1) and hybrid + semantic query (cs1a) are not retested. cs3b tests **Foundry Agent Consumer at agent scope** instead.
- No multi-agent question: the Learn page says Foundry workflows retire on 1 December 2026 (use Microsoft Agent Framework); left out because it is moving.
- Image model names are not cited (the Learn page lists GPT-Image-2 / 2.5 variants; dall-e-3 retired 4 March 2026). The case says "a GPT-Image series model".

## Facts to watch (verified on Learn, 17 Nov 2026, but recent)

- Foundry roles renamed: Foundry User / Owner / Account Owner / Project Manager (formerly Azure AI ...); Foundry Agent Consumer exists; the portal assigns it only at the account scope, so the CLI is needed for project or agent scope.
- Guardrail blocking levels: **High** = most restrictive (blocks low, medium, high); **Low** blocks high only. This is the reverse of the older "threshold" wording.
- AI Search billable skillset: the keyless option uses `#Microsoft.Azure.Search.AIServicesByIdentity` and the **Cognitive Services User** role on the Foundry resource (search docs), although the Foundry RBAC page says Cognitive Services roles do not apply to Foundry scenarios. The question follows the search page.
- Content Understanding video: ~1 FPS sampling, 512 x 512 frames, segmentation consumes tokens even without fields, only spoken words are transcribed; `extract` is for documents only.

## Process note

The shared WebFetch budget ran out twice during the task; every fact used was fetched before writing, and the ones that could not be fetched were left out.
