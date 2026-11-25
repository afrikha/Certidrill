# FIX-ai-901-1 — chapters 11, 12, 13 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-901 11-responsible-ai 12-model-components 13-ai-workloads 21-generative-apps-agents` 0 problems; `content:validate --cert ai-901` 0 problems, 0 warnings; `check-quiz ai-901 …` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed.

## 11-responsible-ai

| Finding | Learn | Change |
| --- | --- | --- |
| Fairness > Evaluation: "safety evaluators scan … for bias and unfairness" could mislead | Confirmed (risk-safety-evaluators, updated 2026-09-29): `builtin.hate_unfairness` measures hateful language and unfair *representations* of groups, 0-7 severity, default threshold 3, pass/fail | Evaluation bullet: names the evaluator, says it judges the content of each answer, not comparable outcomes, so outcomes by group are still compared. FR now uses « évaluateur de risque et de sécurité » (bank and quiz term) instead of « évaluateurs de sécurité » |
| Default guardrails detail missing | Confirmed (Default Guardrail policies for Azure OpenAI): default policies for all models except transcription models; text: hate and fairness, violence, sexual, self-harm at Medium on prompts and completions; user prompt attack (jailbreak) listed for prompts. The page doesn't mention document (indirect) attacks, so they aren't stated | Generated-content bullet: one sentence |
| Inclusiveness covers languages and skill levels; traceability counts as accountability; dropping columns doesn't make a model fair | Sourcing notes only, nothing contradicts the chapter | None |
| Content Credentials not in the chapter | The current default-policies page only lists a "Content credentials" row for image generation; the content-credentials page could not be fetched | None (not added without a fetched page) |
| Preview evaluators (prohibited actions, sensitive data leakage) | Confirmed preview, agent targets only | None (the chapter doesn't use them) |

## 12-model-components

| Finding | Learn | Change |
| --- | --- | --- |
| Throttling: "a higher maximum of output tokens consumes more of the limit"; first remedy "lower max output tokens" | **Wrong.** Quota page (updated 2026-08-13): rate limits use actual input and generated tokens, not the configured max output tokens; a higher cap reserves nothing. Remedies: shorter prompts, limit generated output, retry with backoff, check per-deployment TPM, smooth spikes, batch, PTU. The training unit "Using a generative AI model" still says max tokens affects throttling (the more specific, more recent quota page is followed) | Throttling paragraph rewritten; Max output tokens row ("only the tokens actually generated count toward the TPM limit") |
| Sora is preview | Confirmed: "Foundry Models sold by Azure" (sora-2 "It's in preview"); "Video generation with Sora 2 (preview)"; the classic page says Sora 1 is preview too. No GA video model exists | Video row: "Sora 2 (preview)" |
| "GPT-5 chat models" | Confirmed retired: every `gpt-5-chat` and `gpt-5.x-chat` version is retired (May 13 or June 29, 2026); only `gpt-chat-latest` (preview) remains | Removed from the chat row (GPT-4.1, Claude, Mistral Large stay) |
| Image models | The retirement schedule (updated 2026-11-18) lists gpt-image-1 as Preview with retirement date 2026-10-28; gpt-image-1-mini and gpt-image-1.5 are GA (also gpt-image-2, -2.5 variants) | Image row: "GPT-Image-1 family (GPT-Image-1.5, GPT-Image-1-Mini), FLUX" |
| Q4 s2, Q6 t3, Q1 sourcing | Notes only | None |

## 13-ai-workloads

| Finding | Learn | Change |
| --- | --- | --- |
| Azure Vision is legacy | Confirmed (What is Azure Vision in Foundry Tools?): Image Analysis (legacy), OCR (legacy); Image Analysis 4.0 deprecated, retires September 25, 2028; Face has no notice | Vision section: one sentence |
| Azure Language features retiring | Confirmed on the three overview pages: key phrase extraction, sentiment analysis and opinion mining, summarization retire from Azure Language on March 31, 2029; new projects directed to Foundry models | Text-analysis section: one sentence |
| Document summarization is preview | Confirmed ("Document summarization (Preview)") | None (the chapter doesn't mention it) |
| Sora | See chapter 12 | Video sentence: "Sora 2, the video-generation model of Foundry, is in preview" |
| GPT-Image-1 | See chapter 12 | Models row: "GPT-Image-1 family (GPT-Image-1.5, GPT-Image-1-Mini)" |
| Video segmentation GA status, Q7/Q5/Q2 sourcing | Notes only | None |

## 21-generative-apps-agents

| Finding | Learn | Change |
| --- | --- | --- |
| Creating a project: "you name the Foundry resource and choose the subscription, resource group and region" | Wrong for the current portal (Create a project for Microsoft Foundry, updated 2026-11-06): **New Foundry** toggle, project name > **Create new project**, project name; **Advanced options** for resource group and location; the Foundry resource is created automatically; the first project is the default one | Step 1 rewritten |
| `extra_body` agent reference has several forms | Three Learn forms: training unit "Creating an agent" `extra_body={"agent": {..., "type": "agent_reference"}}`; migration guide (2026-10-06) `extra_body={"agent_reference": {...}}`; SDK quickstart (2.3.0+, 2026-09-04) and "Build with agents, conversations, and responses" (2026-11-19) `project.get_openai_client(agent_name=...)` with no `extra_body`. No page says which key is current or deprecated | Code unchanged (training form, stated as such). One sentence on the bound client `get_openai_client(agent_name=...)`; table row, exam tip and key point mention it. The `"agent"` vs `"agent_reference"` key is flagged below |
| Chat client `base_url` (`/openai/v1/` vs `/openai`) | Both on Learn; the image-generation unit uses `/openai/v1/` | None |
| Max output tokens and throttling | See chapter 12 | Fixed in chapter 12 |
| Home page "shows the project endpoint, the API key and the Azure OpenAI endpoint" | The create-project page mentions the endpoint and key only; nothing contradicts the Azure OpenAI endpoint | None |

## Mock-exam bank questions changed (11)

- `foundry/ai901-2a-throttling-max-tokens` (2.1.2): the correct option "Lower the max output tokens value" became "Remove unneeded text from each prompt"; distractor c "Add more examples" (the opposite of the answer) became "Lower the top P value". Explanation and reference (quota page) rewritten. Why: the quota page.
- `concepts/ai901-1c-throttling-remedies` (1.2.3): correct option b "Lower the max output tokens value" became "Spread the requests evenly over time instead of sending them in bursts" (quota page: avoid sharp spikes). Answer b + d unchanged; explanation rewritten; quota page added to references. Its correct pair now differs from the single above.
- `concepts/ai901-1d-video-text-to-video` (1.3.4, single, 1): Sora (preview) was the answer. Rewritten: a still picture for each storyboard scene from a text description → FLUX; Sora 2 is now a distractor described as preview.
- `concepts/ai901-1d-video-remix-audio` (1.3.4, single, 3): Sora 2 remix/audio was the answer. Rewritten as a code question on the image-generation unit's Responses API sample: `item.result` of the `image_generation_call` output holds the image as base64 text.
- `concepts/ai901-1d-yn-video-generation` (1.3.4, Yes/No, 2): Sora statements rewritten for Azure OpenAI image generation: s1 job ID to poll (No, that is the video flow), s2 the request names the image deployment (Yes), s3 default guardrails apply to prompts and generated images (Yes). Same answer pattern No/Yes/Yes.
- `concepts/ai901-1b-model-drag-media` (1.2.2): target t1 (video clip → Sora 2) removed; two targets remain (stem says "two features"); Sora 2 stays as a distractor item with a preview explanation.
- `concepts/ai901-1b-model-yn-variants` (1.2.2): s1 "Sora 2 can generate a video from an image" (Yes) became "GPT-4.1 accepts images as well as text in the same prompt" (Yes); s3 now compares GPT-Image-1-Mini with GPT-Image-1.5 instead of the retired GPT-Image-1 (still No). Video reference replaced by "Multimodal models for image analysis".
- `concepts/ai901-1d-dd-model-types` (1.3.4): slot m3 "Sora 2 → video-generation model" became "text-embedding-3-small → embedding model" (new option in every slot; video stays as a distractor option).
- `concepts/ai901-1d-yn-imagegen-family` (1.3.4): s2 "GPT-Image-1 can edit an existing image" became GPT-Image-1.5 (still Yes); explanation updated.
- `concepts/ai901-1d-yn-two-deployments` (1.3.4): img1 is now GPT-Image-1.5; s3 "create a variation" became "edit an existing product picture" (Learn lists variations for GPT-Image-1 only); explanation says Sora 2 is preview; video reference replaced by the image-generation unit.
- `concepts/ai901-1d-multi-vision-tasks` (1.3.4): distractor explanation's example GPT-Image-1 → GPT-Image-1.5.

Checked and left unchanged: the agent-client questions with `extra_body={"agent": …}` (`ai901-2b-client-extra-body`, `-dd-get-agent`, `-dd-send-read`, `-dd-role-name` and others; they follow the training unit, see below), `ai901-2b-client-prebound-agent` (already the bound-client form), the portal-order questions (`ai901-2a-portal-steps-order`, `ai901-2b-agent-order-create-test`, `ai901-2a-resource-project-dd`; "create a project" stays true), the other TPM and max-tokens questions (`ai901-1c-tokens-tpm-dd`, `-deploy-basics-yn`, `-deploy-settings-drag`, `-param-max-tokens-truncated`, `ai901-2a-deployment-settings-dd`, `-max-output-tokens-code`), the text-analysis questions (`ai901-1c-ta-*`; they test techniques, and the 2029 retirement isn't in effect), the Azure Vision mentions (legacy, not retired), the fairness and evaluator questions (`ai901-1a-fair-*`, `-rel-dd-block-or-measure`), and questions where Sora, GPT-Image-1 or o3-mini appear only as distractors (`ai901-1b-model-on-device`, `-semantic-search`, `-spoken-input`, `-support-photos`, `-planning-agent`, `-yn-outputs`, `ai901-1d-imagegen-high-fidelity`, `-imagegen-mini-volume`).

## Quiz files

None changed. The quiz 13 Q5 explanation ("supported by the GPT-Image-1 family") stays true with the chapter's wording. check-quiz 0/0.

## For a human decision

- **Sora in the AI-901 training path.** Objective 1.3.4 doesn't name video generation, so the six bank items with Sora as the answer were rewritten (FIX-AGENT rule). The official module "get-started-vision-azure" still has a unit "Video generation models", which labels Sora 2 "public preview" and Sora 1 without a label (the docs say both are preview). If the owner wants preview video coverage back, it is a decision to take.
- **`extra_body` key.** The training unit uses `"agent"`, the migration guide `"agent_reference"`, and the newest docs `get_openai_client(agent_name=...)`. Which form the exam shows, and whether `"agent"` still works with the current SDK, isn't settled on Learn. Chapter code and bank code keep the training form.
- **GPT-Image-1.** The retirement schedule shows it as Preview with a past retirement date (2026-10-28) but not as "Retired", and "Foundry Models sold by Azure" still lists it without a label; the training unit still teaches it. The bank answers now use GPT-Image-1.5; GPT-Image-1 remains as a distractor in `ai901-1b-model-planning-agent` and `-spoken-input`.
- **Retired distractors.** o3-mini, o3 and o4-mini were deprecated with retirement on 2026-11-19 (schedule); o3-mini is still a distractor in `ai901-1b-model-drag-media`, `-spoken-input` and `-support-photos`. GPT-4.1 / 4.1-mini are deprecated (retire 2027-04-14) and still answers in many questions; nothing contradicts them today.
- **Training unit vs quota page on max tokens.** "Using a generative AI model" and "Generative AI models" still say max output tokens affects throttling. The chapter and bank now follow the quota page; an exam item built from the training unit could still expect "lower max tokens".
- **Overlap.** `ai901-1d-video-remix-audio` (result is base64) and `ai901-1d-yn-video-generation` s1 (no job ID to poll) rest on the same fact from different angles.

## French terms not settled (not in the glossary)

- « préversion » (preview), « hérité (legacy) », « bouton bascule » (toggle), « délai d'attente croissant (backoff) », « projet par défaut », « encodée en texte base64 », « ID de travail »; « évaluateur de risque et de sécurité » and « garde-fous (filtres de contenu) » follow the bank, not the glossary (no AI terms there yet).
