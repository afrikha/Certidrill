# QZ-dp-420-32-agent-memory — end-of-chapter quiz, DP-420, chapter 32-agent-memory

File: `content/dp-420/quizzes/32-agent-memory.yaml` (10 questions, EN + FR, draft).
Check: `npx tsx factory/check-quiz.ts dp-420 32-agent-memory` → 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (q1, q3, q8, q10), 3.2.2 (q2, q5, q7), 3.2.3 (q4, q6, q9). Positions 6–10: single, dropdown (Python), multi, dragdrop, yesno.
Mock-exam questions of 3.2.x read first (25 bank + case-study questions); the quiz tests other decisions: GUID partition key drawback, recency vs vector for latest turns, quantizedFlat at ~30k vectors, last-thread summary, TTL override in both directions and immediate invisibility, context-window semantic cache key, summary + uncovered turns (`>` / ASC), Sharded DiskANN per user, retrieval method per prompt context, cross-container TTL/partition design.

## Pages fetched (2026-11-24)

gen-ai/agentic-memories, time-to-live, gen-ai/semantic-cache, gen-ai/sharded-diskann, vector-search, gen-ai/agent-memory-toolkit.

## Doubts / inferences

- q8 option c: that `vectorIndexShardKey` applies only to DiskANN is inferred from the Sharded DiskANN page (the option is described for DiskANN indexes only); the page doesn't say explicitly that quantizedFlat rejects it. The option is wrong anyway on volume (quantizedFlat guidance is 50,000 vectors or fewer).
- Sharded DiskANN: the page states no preview/GA status.
- q7 uses a `coveredUpTo` property defined in the stem (not a Learn name).
- q3: Learn gives 50,000 vectors as a "general guideline"; the stem asks for "the guidance for this volume" (30,000, stable) to keep a single answer.

## Chapter / mock-exam vs current Learn

- **Preview as correct answer (mock exam)**: the Agent Memory Toolkit is preview (Learn: "This feature is currently in preview"). `dp420-3b-sem-item-type` and `dp420-3b-mem-toolkit-storage` make toolkit-specific behavior the correct answer. The chapter correctly labels the toolkit preview.
- **Hierarchical partition keys + vector search**: vector-search and sharded-diskann pages say accounts using vector search on HPK containers must contact cosmossearch@microsoft.com to be configured. The chapter recommends `["/tenantId", "/threadId"]` with embeddings on turns and `vectorIndexShardKey` on the first HPK level, without this note; several mock questions (e.g. `dp420-3b-mem-pk-tenant-thread`, `dp420-3b-mem-forget-user-hpk`) use HPK memory containers. Worth a sentence in the chapter.
- TTL: Learn says expiry counts from the item's "last modified time"; the chapter says `_ts` (equivalent in practice, but `_ts` isn't named on the TTL page).
- quantizedFlat and diskANN fall back to a full scan below 1,000 vectors (vector-search page); not in the chapter (not needed for the exam, noted only).
