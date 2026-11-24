# QZ-ai-901-12-model-components — doubts and notes

## Chapter out of date or wrong against current Learn (chapters not edited)

- **Throttling and max output tokens (wrong).** The deployment-options section says that "a higher maximum of output tokens consume[s] more of the limit". It gives lowering max output tokens as the first remedy.
  - The current page "Manage Azure OpenAI in Microsoft Foundry Models quota" (`azure/foundry/openai/how-to/quota`) says the opposite: "Token rate-limit calculations use actual input and generated tokens rather than the maximum output-token value configured in the request. Setting a higher output-token limit doesn't reserve that number of tokens against the TPM limit."
  - Its recommendations are: reduce prompt size, limit the output the scenario needs, retry with backoff, check the deployment-level TPM allocation, smooth spikes, use batch, or use PTU.
  - The training unit "Using a generative AI model" still says max output tokens "affects token consumption and throttling behavior".
  - The bank question `ai901-1c-throttling-remedies` (correct option "Lower the max output tokens value") is affected.
  - The quiz avoids the point. Q10 relies only on the TPM limit, deployment names and Batch.
- **Sora is preview.** The chapter table gives Sora as the video-generation example. "Foundry Models sold by Azure" says of sora-2: "It's in preview." The bank questions `ai901-1b-model-drag-media` (Sora 2 as a correct item) and `ai901-1b-model-yn-variants` (Sora 2 statement = Yes) test a preview model as the answer. In the quiz, video generation is only a distractor (Q6).
- **"GPT-5 chat models".** The models page shows `gpt-5-chat (2025-08-07)` as retired on June 29, 2026. The training unit still lists "GPT-5.x chat". The chapter example may need to say GPT-5.x. The training unit also says that the GPT-5 family requires registration.
- **Image models.** The page now lists gpt-image-1, -1-mini, -1.5, gpt-image-2 and gpt-image-2.5 variants. The chapter's "GPT-Image-1 family" is incomplete but not wrong.

## Unverified or weakly sourced facts used

- **Q4 s2 (SLMs predict the next token like LLMs).** No fetched page states this. The LLM unit only calls SLMs "their more compact relations". It is the chapter's statement and general knowledge: Phi-4 is a decoder transformer.
- **Q6 t3 (SLM for high volume at lowest cost and latency).** This is the chapter's table. The fetched Learn pages don't describe mini/nano or SLMs as cheaper or faster. They only say a lightweight application "may run best on a small language model" and that gpt-4o-mini is "fast, inexpensive". The item is worded "Small language model (SLM)", not mini/nano.
- **Q1 (non-deterministic output).** The explicit sentence "you're likely to get a different response" appears only on the *classic* page about reproducible output, which is a preview feature. Q1 cites "Large language models (LLMs)" (next most probable token) and "Prompt engineering techniques" (temperature controls randomness) instead.

## Facts verified

- **Top P vs temperature (Q3).** "alter one of these two parameters at a time, not both", on "Prompt engineering techniques". The same page gives the temperature range as 0–2.
- **Deployment types (Q8, Q10).** Checked on the current page (`azure/foundry/foundry-models/concepts/deployment-types`): Standard (within the Azure geography, pay per token, low-to-medium bursty volume), Data Zone Batch (50 % discount, 24-hour target), Data Zone Provisioned, Regional Provisioned, and Global Batch (no real-time SLA). None is marked preview.
- **Deployment-level quota (Q10).** Quota approved but "not allocated to the specific deployment receiving traffic" can still produce 429s.
- **Language detection (Q2).** It belongs to "Azure Language in Foundry Tools", whose analyzers return "structured, deterministic output".
- **Foundry Tool instead of a catalog model.** For a well-defined task: confirmed by the "Generative AI models" unit.

## Other notes

- **Mock overlap avoided.** The quiz doesn't repeat these bank decisions: Batch for a nightly job, EU → Data Zone Standard, Provisioned for a constant volume, deployment name in `model`, truncation → raise max output tokens, temperature for consistency, the throttling multi, and the code dropdown. Q8 combines Standard, Data Zone Batch and Data Zone Provisioned, which the bank never asks as answers to choose. Q5 tests "short answers come from instructions", not "raise the cap".
- **Positions 8 and 9 swapped.** After a first draft, they were swapped so that the deployment-type dropdown, the harder of the two, comes later.
- **Reference titles.** They use the page H1, as the AI-901 bank does.
