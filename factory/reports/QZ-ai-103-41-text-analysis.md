# QZ-ai-103-41-text-analysis — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- **PII options, section sentiment-safety.** The chapter says "Text PII detection (GA) also supports a confidence threshold, excluded values, entity synonyms and the `syntheticReplacement` redaction policy". The Learn page "Identify and extract Personally Identifiable Information (PII) from text" (fetched 2026-11-24) says otherwise: `redactionPolicies` came with `2025-11-15-preview`, `syntheticReplacement` is **preview only**, and `confidenceScoreThreshold` is **preview** (`2025-11-15-preview`). The page gives no API version for `valueExclusionPolicy` and `entitySynonyms`. The current GA text API is `2026-05-01`. The Language overview also flags synthetic replacement (PII anonymization) as preview. The quiz doesn't use any of these options.
- **Guardrail controls.** The chapter says that the guardrails of a deployment include a PII filter on outputs, along with protected material and groundedness, and doesn't mark any of them as preview. The page "Guardrails and controls overview in Microsoft Foundry" marks **Personally identifiable information** and **Groundedness** as **preview**, and says groundedness detection in Azure OpenAI **retires on April 30, 2027**. q3 uses the PII filter only as a wrong option, and its explanation says "(preview)".
- **Adaptive custom translation.** The chapter says "5 to 10,000 prealigned segment pairs (500 characters maximum per pair)". The page "Foundry Tools adaptive custom translation" says each segment must be **250 characters or fewer**. It also says the dataset API is **v1.0 preview** and that only the playground is GA. The quiz doesn't use adaptive datasets as an answer (q8 uses `adaptiveDatasetId` as a distractor).
- **Translator 2026-06-06, removed operations.** The migration page says that Detect, BreakSentence, Dictionary Lookup and Dictionary Examples were **removed** (Detect: use Azure Language detection). The chapter doesn't say this, and it could be added to the translation section. q2 uses this fact in an explanation.
- **Structured outputs page.** The page lists cases where structured outputs aren't supported: bring-your-own-data, Assistants or Foundry Agents Service, `gpt-audio` and `gpt-audio-mini`. The chapter doesn't mention them. The 100-property and five-level nesting limits are still on the page, unchanged.
- **Fine-tuning page.** `…/openai/concepts/fine-tuning-considerations` is now titled "Training in Microsoft Foundry". It no longer says to try prompt engineering first. It still lists reasons to train: style and format, fewer prompt examples, lower cost and latency. It also says that training "doesn't replace retrieval for current information". The chapter's advice to fine-tune last now comes from the chapter itself, not from this page.

## Mock bank: preview features used as answers (other agents' files, not edited)

- `ai103-4a-pii-tuning`: `confidenceScoreThreshold` is a correct answer, but it's preview-only per the redact-text-pii page.
- `ai103-4a-pii-request`: `entityMask` / `redactionPolicies` are a correct answer, under `2025-11-15-preview`. The page doesn't say whether the GA version supports them.
- `ai103-cs4b-personal-data`: the PII guardrail control (preview) is the correct answer. Its explanation does say preview.
- `ai103-cs1c-house-style`: adaptive custom translation is the correct answer, and its dataset API is preview.

## Facts not verified, so left out or worked around

- Whether `categoriesAnalysis` is empty or missing when `haltOnBlocklistHit` stops the analysis: the quickstart doesn't say. q6's code reads it with `.get("categoriesAnalysis", [])`, so the reasoning works either way.
- `offset` and `length` of a NER entity: not shown in the fetched SDK examples, so they aren't used as options in q4.
- The NER categories page doesn't say whether the `Product` category is GA or preview. It lists Product with no language restriction, and Product is a standard category of prebuilt NER.
- Request limits for NMT and LLM (1,000 / 50 elements): the translate reference links to the service-limits page, which I didn't fetch. The quiz doesn't use them.
- Whether `profanityAction` works with an LLM target: not documented. q8 applies it only to the French NMT target.

## Design notes

- The bank already has 46 questions on 4.1.x, so the quiz looks for decisions the bank doesn't test: the `refusal` check (q1), source-language autodetection in a single request (q2), redaction placed before the model rather than a filter on the output (q3), NER code in the Python SDK (q4), comparison on an expert test set (q5), reading `blocklistsMatch` when `haltOnBlocklistHit` is true (q6), nested `additionalProperties` and key order (q7), Custom Translator category ID in `deploymentName` plus `referenceTextPairs` plus `profanityAction` (q8), instructions and examples for audience and level of detail (q9), and fine-tuning while keeping grounding (q10).
- Some decisions overlap with the bank, though the trigger, the distractors or the combination differ: few-shot examples (q9 vs `ai103-4a-abbreviations`), fine-tuning as the answer (q10 vs `ai103-4a-prompt-overhead`, where cost is what decides).
- q9: the correct options reuse the stem's themes ("legal", "level of detail"), as the distractors do (maxLength / max_output_tokens are about length, Protected material is about policy).
