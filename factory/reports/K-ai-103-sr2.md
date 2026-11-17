# K-ai-103-sr2 — report

5 Yes/No series (15 questions), one Yes per series, Yes position varied (2, 3, 1, 3, 2). Objectives chosen to avoid those of ai103-sr1 (1.3.4, 1.4.1, 2.2.5, 3.1.3, 4.1.3, 5.1.2).

| Series | Domain | Objective | Topic |
| --- | --- | --- | --- |
| ai103-sr2-nightly-batch | planning | 1.3.1 | Global Batch job vs raising TPM of the live deployment vs reserved provisioned deployment |
| ai103-sr2-fabrication-eval | generative | 2.1.4 | Groundedness (context + response) vs Relevance vs Similarity with context as ground truth |
| ai103-sr2-claim-image-injection | vision | 3.3.2 | OCR (`prebuilt-read`) + Prompt Shields `documents` vs user-prompt shield only vs Content Safety image harm analysis |
| ai103-sr2-transcript-pii | text | 4.1.2 | PII detection with the right `piiCategories` vs missing CreditCardNumber vs Content Safety blocklist |
| ai103-sr2-scanned-manuals | extraction | 5.1.4 | `imageAction` + OCR + Text Merge vs skills without `imageAction` vs multimodal image embeddings |

Difficulty: 5 easy, 7 medium, 3 hard.

## Doubts and notes

- Batch: the Learn page says jobs aren't expired after 24 h but its status table still defines `expired`; the series only relies on "24-hour target turnaround", "50 % less than Global Standard" and "separate enqueued token quota". The scenario states that the model is available for Global Batch, so no model name is given. `endpoint="/chat/completions"` with `"url": "/v1/chat/completions"` in the JSONL lines is copied from the page as written.
- PII: the entity-categories page says each category is retrieved by naming it in `piiCategories`, and the how-to says that without `default` only the listed categories are returned; the Yes solution therefore lists the three categories explicitly instead of relying on the default set. `characterMask` as default redaction policy comes from the how-to (redaction policies documented from 2025-11-15-preview; GA 2026-05-01 also listed). Conversation PII is preview (2026-11-15-preview), so it is not used.
- Image injection: `prebuilt-read` OCR on JPEG/PNG is implied by "for scanned or image-based documents, use prebuilt-read" on the prebuilt analyzers page; supported formats weren't checked on the service-limits page. Prompt Shields `documents` is documented as required; the No solution says only that the description is sent in `userPrompt`.
- Content Safety blocklist limit (10,000 terms in total) from the blocklist how-to.
- Scanned manuals: the Azure AI Vision multimodal embeddings skill reference page was not fetched (WebFetch budget briefly exhausted); the explanation only states that it produces vectors, not text.
- French: "craquage de documents", "attaque par document", "vérité terrain" follow the ai-103 course chapters, not rechecked on fr-fr pages.
