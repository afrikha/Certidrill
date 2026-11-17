# K-ai-103-cs4 — report

## Delivered

- `ai103-cs4a-southridge` (media streaming, batch media pipeline: Content Understanding video, Sora 2, Content Safety, guardrails): 6 questions — 3.2.6 dropdown (JSON), 3.1.4 single, 1.4.1 yes/no, 3.3.1 dropdown (Python), 2.1.6 dropdown (Python), 5.2.2 single. Domains: vision, planning, generative, extraction.
- `ai103-cs4b-consolidated` (parcel logistics, agent + Functions apps + customs back office): 5 questions — 4.1.2 single, 2.1.4 drag and drop, 5.2.3 ordering, 1.4.1 yes/no, 1.3.4 dropdown (text). Domains: text, generative, extraction, planning.
- Types: single 3, dropdown 4, yes/no 2, dragdrop 1, ordering 1. Difficulty: 3 easy, 6 medium, 2 hard.
- Validator: `CERT=ai-103 npx tsx factory/validate.ts --prefix ai103-cs4` → 13 files, 0 problem(s).

## Deviations

- The case-studies folder was empty when I started; cs1/cs3 and sr1 were published while I wrote. I dropped planned questions that duplicated their decisions: MCP approval code (cs1a), hybrid + semantic query (cs1a), Foundry Agent Consumer for an app (cs1a, cs3b), mask-based background edit (sr1), Prompt Shields document attacks on image text (cs1a), Content Credentials provenance (cs3a), High blocking level (cs3a), batch / synchronous document translation (cs3a, sr1), Live Interpreter (cs3b), Application Insights tracing + Log Analytics Reader (cs3b).
- Remaining proximity judged acceptable: `ai103-cs4a-scene-analyzer` uses `enableSegment` (fixed in the template, not asked) like `ai103-cs3c-blade-segments`; my slots test the base analyzer (`prebuilt-video` vs `prebuilt-videoSearch`) and `returnDetails` for shot timestamps. A reviewer should rerun a "same objective, same answer" comparison across all `ai103-cs*` once every agent has finished.
- WebFetch budget ran out once mid-run (shared hourly limit); work resumed after the reset.

## Facts to double-check

- `ai103-cs4a-keyless-client`: the v1 API page says the identity needs Cognitive Services OpenAI User, while the Foundry RBAC page says not to use Cognitive Services roles in Foundry scenarios. The stem avoids the role ("already has the required role").
- `ai103-cs4a-fanart-moderation`: `result.categories_analysis` and `item.severity` attribute names come from the SDK sample pattern (the fetched quickstart shows the imports and `analyze_image`, not the loop).
- `ai103-cs4a-teaser-rework`: the Sora 2 page is inconsistent on durations (1–20 s vs 4/8/12 s); the question relies only on "input video up to five seconds", remix, and "jobs available for up to 24 hours".
- `ai103-cs4b-personal-data`: "Protected material for text detects known text such as lyrics or articles" is from general knowledge (not on a fetched page).
- `ai103-cs4b-email-spotlighting`: French keeps "spotlighting" in English (no Learn FR term verified).
