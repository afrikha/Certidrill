# Q-aif-c01-3a — report

51 questions in `content/aif-c01/questions/foundation/`, prefix `aifc01-3a-` (3.1.1: 11, 3.1.2–3.1.5: 10 each).
Types: single 39, multi 6, ordering 3, dragdrop 3 (target said single 39 / multi 7: one multi short, total kept at 51).
Difficulty: 20 easy / 23 medium / 8 hard. Validator: 0 problem(s).

## Facts checked and choices made (November 2026 AWS docs)

- **Continued pre-training**: the current Bedrock user guide lists only fine-tuning, reinforcement fine-tuning and
  distillation as customization methods (the fine-tuning page no longer mentions continued pre-training). Continued
  pre-training is used only as a concept (Well-Architected GENOPS05-BP01), never as a Bedrock feature.
- **DynamoDB vector search** became GA on 2026-08-05, and ElastiCache/MemoryDB also do vector search: none of them is
  used as a "not a vector store" distractor. MemoryDB (not in the guide's service list) is not used at all.
- **Latency-optimized inference** is still in preview: not used. Service tiers (Priority/Flex) not used (2.3.4 scope).
- **Knowledge bases** now come as Managed and Customer-managed; Managed KBs can schedule automatic syncs (2026-09),
  so the sync question states that no sync schedule is configured.
- **Provisioned Throughput page** still says custom models need PT, while the custom model deployment page offers
  on-demand inference for some customized models (Nova Lite/Micro/Pro, Nova 2 Lite, Llama 3.3 70B). Questions only say
  "Provisioned Throughput or an on-demand custom model deployment".
- Closed services (Clarify, Model Monitor, Kendra, Q Business, Q Developer, Bedrock Agents Classic) are never answers.

## Overlaps avoided with sibling batches

Rewritten after reading existing files: the modality question no longer uses a damaged-car photo (2a multimodal),
no hierarchical-chunking question (2a), no HR knowledge base question (2c), no "vector DB purpose" question (2a),
no continued pre-training / distillation / on-demand custom model scenario (3c), no few-shot scenario (3b).

## Notes

- Options are shuffled at display (`shuffle` default true), so file order of correct answers is not significant.
- The `dragdrop` (AWS matching) and `multi` stems carry the per-element scoring NOTE, as the writing guide requires,
  although the real AWS exam scores them all or nothing.
