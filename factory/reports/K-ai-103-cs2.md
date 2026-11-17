# K-ai-103-cs2 — notes

Output: 3 case studies, 17 questions (prefix `ai103-cs2`), all `status: draft`; validator 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| ai103-cs2a-tailwind-traders (online retail, catalog content pipeline) | product-video 3.1.2, cutout-controls 3.1.5, listing-captions 3.2.2, attribute-schema 4.1.1, service-map 1.1.2 | vision, text, planning |
| ai103-cs2b-trey-research (pharma, private RAG agent + MCP) | registry-skill 5.1.3, search-tool 5.1.5, private-agent 1.2.1, incomplete-summaries 2.3.1, lims-tools 1.4.4, registry-throttling 1.3.3 | extraction, planning, generative |
| ai103-cs2c-fourth-coffee (coffee chain, ordering agent + A2A + audio) | order-schema 2.2.1, pricing-rules 2.3.4, allergen-agent 2.2.4, model-upgrade 1.2.3, drive-thru-audio 4.2.3, order-loop 2.1.5 | generative, planning, text |

Types: single 8, dropdown 3, yes/no 3, multi 1, dragdrop 1, ordering 1. Difficulty: 4 easy, 8 medium, 5 hard.

## Deviations

- Parallel agents (cs1, cs3, cs4) were writing at the same time and had already used Southridge, Humongous, Alpine Ski, Lucerne, Relecloud, Consolidated Messenger and Margie's Travel. They had also covered most of the obvious decisions (Content Understanding analyzers, hybrid queries, RAG ingestion order, MCP approval, Voice Live, phrase lists, mask edits, video remix, RAG evaluators). I targeted objectives nobody had covered yet. I dropped three of my drafts because cs1c covered the same decision with the same answer: reference-image edits (cs1c-mascot-reference), strict JSON schema with a nullable field (cs1c-catalog-json) and the GitHub evaluation workflow with baseline ordering (cs1c-eval-workflow).
- One partial overlap remains: `ai103-cs2b-lims-tools` and `ai103-cs1a-payment-approval` both use `allowed_tools`. Mine tests read-only tools with no approval, plus the empty-list trap (`[]` allows every tool); theirs tests approval for one tool.

## Facts to watch (verified on Learn on 2026-11-17, but liable to change)

- Foundry workflows: preview, retiring on December 1, 2026 (designer). Used only as a distractor in allergen-agent.
- Connected agents: not available in the new Foundry Agent Service (A2A page). A2ATool (A2A 1.0) is GA, while A2APreviewTool (0.3) is preview.
- `background="transparent"` is documented as gpt-image-1 only, so the case uses a gpt-image-1 deployment (limited access). WebP isn't a supported output format.
- Sora 2 is in preview. `input_reference` must match the output size exactly (720x1280 or 1280x720), and `seconds` accepts 4, 8 or 12.
- The reasoning page says reasoning models "other than GPT-6 Astra" don't support temperature or max_tokens. The case pins summarize-chat to gpt-5.1.
- Version upgrade policy options use portal labels from the "(classic)" model versions page. The options are kept in English in FR; the French portal labels weren't verified.
- Content Understanding pro mode: Learn doesn't make clear whether it survived GA (2025-11-01), so I didn't test it.
- The WebFetch budget ran out once (hourly limit). All facts used were fetched after that.
