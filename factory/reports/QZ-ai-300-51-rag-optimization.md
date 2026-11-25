# QZ-ai-300-51-rag-optimization — notes

Quiz `content/ai-300/quizzes/51-rag-optimization.yaml`, 10 questions (5.1.1 ×3, 5.1.2 ×2, 5.1.3 ×2, 5.1.4 ×3). Formats at positions 6–10: hotarea, yesno_statements, dropdown, multi, single. `check-quiz` reports 0 problems and 0 warnings.

## Pages fetched (learn.microsoft.com, 2026-11-24)

Chunk Documents (Foundry IQ); Text Split skill; Azure OpenAI Embedding skill; Configure Vectorizer; Create a Vector Query; Create a Hybrid Query; Semantic Ranking Overview; Update or Rebuild an Index; Embedding model migration best practices guide; RAG evaluators; See Evaluation Results (Compare view); Architecture Center RAG information-retrieval and generate-embeddings phases; RBAC for Azure OpenAI (classic); training unit "Design evaluation experiments".

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Product name.** Several Azure AI Search pages are now titled "… Foundry IQ (Azure AI Search)" (chunking, semantic ranking, rebuild an index, embedding migration). The chapter calls it "Azure AI Search, the retrieval engine of Microsoft Foundry". The quiz keeps "Azure AI Search", like the bank. The reference titles copy the current page titles.
- **Threshold exam trap (section retrieval-tuning).** The chapter says a 0.8 `threshold` on a hybrid query "would remove everything" because the fused score is RRF. But Learn says a `vectorSimilarity` threshold filters the vector results *before* fusion. Learn only says that hybrid queries "aren't conducive to minimum thresholds" because RRF ranges are small and volatile. "Remove everything" is true of a 0.8 cut-off on the fused `@search.score`, not of a `vectorSimilarity` threshold. The trap should be reworded. The quiz doesn't use thresholds; the feature is still preview, `2026-08-01-preview`.
- **Embedding model migration.** There's a new Learn page ("Embedding model migration best practices guide in Foundry IQ (Azure AI Search)") that the chapter doesn't cover. Its main points:
  - Built-in indexer pipelines must rebuild a separate index from the source data.
  - The second-vector-field approach is for push ingestion only.
  - A vector field's dimensions can't change.
  - Equal dimensions don't make two models compatible, and changing a vectorizer doesn't regenerate vectors.
  - Raw vector scores aren't comparable across models.
  - `Cohere-embed-v3-*` was deprecated on 15 Nov 2026 and retires on 15 Feb 2027 (replacements `Cohere-embed-v5-fast` / `-pro`).

  Worth a paragraph in the embedding-models section. Q7 is based on this page.
- **Compare view legend.** The chapter lists only ImprovedStrong, ImprovedWeak and Inconclusive. Learn also lists DegradedStrong, DegradedWeak, ChangedStrong and ChangedWeak (desired direction neutral), with the same p-value bands. Q10 uses DegradedWeak.
- **Overlap rule.** The Text Split skill page itself doesn't state the "less than half of `maximumPageLength`" rule; the chunking page does. The Text Split `unit` parameter (`azureOpenAITokens`) is preview.
- **API versions.** The vector query page gives `2026-04-01` as the latest GA version. The chunking page says Content Understanding semantic chunking is "generally available in Search REST API `2026-10-01`". Check whether `2026-10-01` is now the current GA version and whether the chapter's examples should move to it.
- **Embedding skill.** Learn recommends a deployment for the skill that is separate from the query vectorizer's deployment (same model). The chapter doesn't say so; the bank covers it (ai300-5a-separate-embed-deployments).
- **HNSW.** The Architecture Center doesn't explicitly say that a higher `efSearch` improves recall at a latency cost (already flagged in C-ai-300-4). The quiz doesn't use it.
- **RBAC page.** The Azure OpenAI RBAC page is now labeled "(classic)" and isn't available for the new Foundry portal. The role names used in Q3 come from the embedding skill page (Cognitive Services OpenAI User) and that classic page.

## Not verified, or inferred

- Q9 options say "reset and rerun the indexer" after a skillset change. This is standard practice, but no fetched page states it (the rebuild page doesn't cover indexer resets).
- Q8: "the text query keeps an implicit weight of 1.0". This is inferred from "weight applies to vectors only" plus the default of 1.0 (the bank report Q-ai-300-5a makes the same reading).
- Q10: the team measured the token figures itself. The quiz doesn't claim that the Compare view shows tokens.

## Design notes

- No preview feature is a correct answer. Threshold, `maxTextRecallSize`, Response Completeness and the Text Split `unit` are avoided.
- The bank already covers many decisions: sentences → pages with overlap, overlap 300, kind text + k 50 + semantic, weight 2.0 + preFilter, MRR, Retrieval evaluator, Inconclusive → more rows, re-embed into kb-v2. The quiz tests other decisions:
  - recommended character values and the half rule;
  - `holes`;
  - the skill identity's role;
  - HyDE;
  - adding a vectorizer of the same model;
  - NDCG/Fidelity/groundedness diagnosis;
  - built-in indexer migration traps;
  - weight 0.5 + top 5 after semantic ranking;
  - overlap + decomposition;
  - criteria-based promotion with Degraded/Inconclusive results.
- French: « segmentation », « bloc », « incorporation », « classeur sémantique », « reclassement », « ancrage », as in the chapter. « ingestion par envoi (push) » for push ingestion isn't checked against fr-fr.
