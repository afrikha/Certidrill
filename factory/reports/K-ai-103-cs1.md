# K-ai-103-cs1 — report

3 case studies, 17 questions (prefix `ai103-cs1`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| ai103-cs1a-humongous | Insurance claims: Content Understanding + AI Search RAG + agent with MCP payments | 5.2.3 dropdown, 3.2.5 yesno, 5.1.2 single, 1.3.4 single, 2.2.5 dropdown, 3.3.2 single |
| ai103-cs1b-alpineski | Ski resort: Voice Live phone concierge + agent with OpenAPI tool and memory, EU data zone | 4.2.1 single, 4.2.2 single, 1.2.2 dragdrop, 2.2.3 single, 1.3.1 yesno, 2.2.2 single |
| ai103-cs1c-margiestravel | Travel publishing: GPT-Image with reference images, agent evaluation in GitHub Actions, structured outputs, Translator | 3.1.1 single, 2.1.4 multi, 1.2.4 dropdown, 4.1.1 dropdown, 4.1.3 single |

## Doubts and deviations

- Dropdown code blocks use `language: python` and `language: yaml` (the AZ-104 guide lists bash/powershell/json/bicep/kusto; the validator accepts them, and the AI-103 profile asks for Python).
- `ai103-cs1a-photo-injection` (3.3.2): Learn does not say whether Prompt Shields reads text inside images. The case states that the text read from photos is passed to the agent as text, and the answer is Prompt Shields document attack detection (off by default) with block. A reviewer may prefer a more explicit OCR step.
- Overlap with the parallel agents (cs3, sr1), found at the end:
  - Case C was first written for Lucerne Publishing, but `ai103-cs3a-lucerne` already existed. I renamed it Margie's Travel, and I removed my mask-edit and strictest-violence-filter questions, which duplicated `ai103-cs3a-region-edit` and `ai103-cs3a-blocking-level`. I also replaced Groundedness + Relevance, which duplicated `ai103-cs3c-rag-evaluators`, with Response Completeness + Task Adherence.
  - Still overlapping, and mine were written first: `ai103-cs3b-alpine` is also Alpine Ski House. `ai103-cs3b-peak-deployment` (Data Zone Provisioned) repeats the concierge target of `ai103-cs1b-deployment-types`, and `ai103-cs3b-agent-access` (Foundry Agent Consumer at agent scope) repeats `ai103-cs1a-portal-identity`. The reviewer should keep one of each.
  - The same decision with the same answer as series questions (not case studies): `ai103-cs1a-policy-search` vs `ai103-sr1-hybrid-parts-3`, `ai103-cs1a-payment-approval` vs `ai103-sr1-refund-approval-*`, and `ai103-cs1a-photo-injection` vs `ai103-sr1-tool-injection-1`.
- `ai103-cs1c-mascot-reference` (3.1.1): Learn confirms that the edit endpoint accepts up to 16 input images. It does not describe a "keep the character consistent" pattern in so many words.
- `ai103-cs1c-house-style`: adaptive custom translation (text translation 2026-06-06) is confirmed, but not whether it supports English–German specifically.
- `ai103-cs1b-staff-quota` relies on the 2026 quota change (quota tracked per subscription; Data Zone Standard deployments of the same model and version share one pool per data zone).
- Preview features in the questions: memory (MemorySearchPreviewTool, `{{$userId}}` + `x-memory-user-id`), `microsoft/ai-agent-evals@v3-beta`, Response Completeness, spotlighting (not used in an answer).
- Foundry roles use the 2026 names (Foundry User, Foundry Agent Consumer, Foundry Project Manager); the old Azure AI * names are no longer correct.
- The shared WebFetch budget ran out once (resumed at the next UTC hour).
