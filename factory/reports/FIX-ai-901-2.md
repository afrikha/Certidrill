# FIX-ai-901-2 — chapters 22 to 24 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-901 22-text-speech 23-vision-image-generation 24-information-extraction` 0 problems; `content:validate --cert ai-901` 0 problems, 0 warnings (473 files, 8 chapters); `check-quiz ai-901 …` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed, no section marker changed.

## 22-text-speech

| Finding | Learn | Change |
| --- | --- | --- |
| "Predictable cost" in the spoken-prompts decision table | Not on Learn: neither "Batch transcription overview" nor the training unit "Speech recognition" mentions cost. Both say batch transcription is for large amounts of stored audio, with results retrieved asynchronously | Row now reads "Transcribe large volumes of stored recordings, in batch" (FR « Transcrire de gros volumes d'enregistrements stockés, par lots ») |
| The audio quickstart uses a preview API version | Confirmed: "Quickstart: Get started with Azure OpenAI audio generation" (updated 2026-10-23) uses `AzureOpenAI(..., api_version="2025-01-01-preview")`. The page doesn't call the feature preview. `gpt-audio` and `gpt-audio-mini` are GA in the "Model retirement schedule" (2026-11-18). The request, `modalities`, `audio`, `input_audio` and the output formats match the chapter | None. The chapter doesn't show how the audio client is created |
| Azure Language capabilities | QZ report: the chapter matches the training units | None |

## 23-vision-image-generation

| Finding | Learn | Change |
| --- | --- | --- |
| Image-model table out of date | "Azure OpenAI image generation models" (`how-to/dall-e`, updated 2026-11-10): GPT-Image-2.5-Sunburst, GPT-Image-2.5-Flare and GPT-Image-2 are "Generally Available". GPT-Image-1.5, GPT-Image-1 and GPT-Image-1-Mini are "Limited access preview", and "GPT-image-1 series models are available in limited access". Sunburst: "Most capable model for image generation and editing". Flare: "Fastest model…", "Optimized for speed and cost". GPT-Image-2: high resolution, improved editing, face preservation, "higher latency and cost". `dall-e-3` retired on March 4, 2026. **"Model retirement schedule" (2026-11-18)**: gpt-image-1 Preview with a retirement date of 2026-10-28; gpt-image-1.5 and gpt-image-1-mini **GA**; gpt-image-2 GA | Rows added for GPT-Image-2.5 (Sunburst, Flare) and GPT-Image-2. GPT-Image-1.5 is no longer "the most advanced of the family". GPT-Image-1 row: preview, retirement date October 28, 2026. New sentence: the GPT-Image-1 models are in limited access, and DALL-E 3 was retired. The status of 1.5 and Mini isn't stated, because the two pages disagree (see "For a human decision") |
| Video generation is preview | Confirmed: "Video generation with Sora 2 (preview)" says it "is currently in preview". "Foundry Models sold by Azure" (2026-10-29) lists only `sora-2`, "in preview". The training unit still lists Sora 1 with no status. Neither docs page nor the retirement schedule mentions Sora 1 | Sora row: "Sora 2, the model listed in the catalog, is in preview". Key point: "Sora (preview)". The video paragraph is kept (see "For a human decision") |
| `images.generate` vs the Responses API image tool; which deployment goes in `model` | "Use the Azure OpenAI Responses API": the tool is supported by gpt-image-1-series models and "you can call it from a set of compatible chat and reasoning models". The gpt-image deployment goes in the `x-ms-oai-image-generation-deployment` header. The training unit's sample puts a gpt-image deployment in `model`, which contradicts this. The `images.generate` call, `n` from 1 to 10 and base64-only output are confirmed on `how-to/dall-e` | Responses API paragraph: new sentence on `model` and the header |
| Image playground steps ("Deploy a vision-enabled model") | Training-unit slip, as the QZ report says. The chapter already says image-generation model | None |
| GPT-4.1 family still current | **Partly wrong.** "Model retirement schedule" (2026-11-18): gpt-4.1 and gpt-4.1-mini 2025-04-14 are **Deprecated**, retiring on 2027-04-14. "Foundry Models lifecycle and support policy": a deprecated model is "No longer available to new customers"; only subscriptions that have already deployed it can create deployments | image-analysis section: one sentence. The examples GPT-4.1 / GPT-4.1-mini stay, because the training unit uses them (see "For a human decision") |
| FLUX | "Foundry Models sold by Azure": FLUX.1-Kontext-pro and FLUX-1.1-pro have no preview label. FLUX.2-flex and FLUX.2-pro are marked preview | None (the chapter names only the family) |

## 24-information-extraction

| Finding | Learn | Change |
| --- | --- | --- |
| Key authentication | Confirmed (Python readme, v1.1.0): "API key authentication is less secure and is only recommended for testing purposes with test resources". `DefaultAzureCredential` is for production | Credential sentence: Entra ID first, and the key only for testing. The code sample is unchanged (key) |
| Cognitive Services User role | Confirmed (readme): required "to enable API calls for setting default model deployments", "even if you are the owner of the resource" | client-app: one sentence |
| Default model deployments | Confirmed: "one-time setup per Microsoft Foundry resource" (readme). `prebuilt-read` and `prebuilt-layout` don't "require a language model or embedding model" ("Prebuilt analyzers", 2026-10-29) | Exam trap of 2.4.1: generative and embedding models mapped once per resource. Model names not given |
| Field methods | Confirmed: `extract` (values "as they appear in the content"), `generate`, `classify` (fixed set of categories) in "What is an analyzer? Configuration and reference". `extract` is for documents only ("Service quotas and limits", 2026-11-11) | 2.4.1: one sentence; key-point bullet |
| Base analyzers | Confirmed (`baseAnalyzerId`: `prebuilt-document`, `-image`, `-audio`, `-video`) | Same 2.4.1 sentence |
| `prebuilt-documentSearch` missing | Confirmed: "Recommended for document ingestion in RAG workflows"; returns layout, figure descriptions, a summary and chunked output | Analyzer table: new row |
| `prebuilt-idDocument` (tested by the bank) | Confirmed ("Prebuilt analyzers": driver licenses, ID cards, passports…) | Analyzer table: new row |
| `locales`, frame sampling | Confirmed: `locales` = "List of locale and language codes for language-specific processing, primarily for transcription" (prebuilt-audio, prebuilt-video, prebuilt-callCenter). Video: "approximately one frame per second, which might miss quick movements or brief events" (service limits) | 2.4.3: one short paragraph |
| `prebuilt-callCenter` "topics" vs "categories" | "Prebuilt analyzers" says topics (no mention of categories) | None |
| Video analyzer name | `prebuilt-videoSearch` on "Prebuilt analyzers" and in the readme | None |
| Q7: JPEG for document analyzers | Confirmed: service limits list `.jpg`, `.jpeg`, `.jpe` for documents (not checked analyzer by analyzer) | None |

## Mock-exam bank questions changed

- `ai901-2c-imagegen-model-for-illustration` (2.3.2, single): the correct option was GPT-Image-1, which is preview on both Learn pages and past its listed retirement date. It is now **GPT-Image-2** (GA). The explanation was updated (EN + FR) and the reference "Azure OpenAI image generation models" added.
- `ai901-2c-imagegen-family-yn` (2.3.2): s2 was about GPT-Image-1 and is now about GPT-Image-2 (still No: GPT-Image-2 supports editing with inpainting and variations). The stem now says "the GPT-Image models" instead of "the GPT-Image-1 family". Explanation updated (EN + FR), reference added. s3 (GPT-Image-1-Mini) is unchanged (see "For a human decision").
- `ai901-2c-visualgen-deployments-scenario-yn` (2.3.2): s1 (Yes) relied on a GPT-Image-1 deployment. It is now GPT-Image-2 in the stem, s1 and the explanation. The training-unit reference was replaced by "Azure OpenAI image generation models", which names GPT-Image-2.

Ids, types, objectives, difficulties and `status: draft` are unchanged.

## Checked and left unchanged

- 2.2.x (54 questions): nothing contradicts the verified pages. No question relies on cost.
- 2.3.3: `visionapp-image-tool-multi` and `visionapp-analysis-code` (image tool and `image_generation_call`) don't say which deployment goes in `model`, so they agree with the responses page. `visionapp-caption-call` and `visionapp-requirements-yn` mention GPT-Image-1 only in a distractor or a No statement, so the retirement doesn't change their answers. `vision-model-for-photos` has GPT-Image-1-Mini as a distractor.
- 2.4.x: `ai901-2d-app-entra-role` (Cognitive Services User, even for the Owner) agrees with the readme. `img-yn-methods`, `img-multi-true`, `av-yn-details` (`extract` is for documents only), `av-locale`, `av-frame-sampling` and the `prebuilt-document` base analyzer questions all agree with the pages fetched.
- Quiz files: none changed. All three still agree with the corrected chapters (Q9 of quiz 23 already uses `gpt-image-2`).

## For a human decision

1. **Video generation (Sora) is preview only.** The official training unit "Video generation models" teaches it for this study-guide objective (2.3.2 "Create new visual outputs"), and there is no GA video model to rewrite to. So I kept the course paragraph, labeled it preview, and changed no Sora question. The owner should decide whether these questions stay:
   - `ai901-2c-videogen-async-job-sentences`, `-facts-yn`, `-model-family`, `-playground-settings`, `-responsible-ai`, `-sora2-audio-remix`, `-sora2-inputs-multi`;
   - `ai901-2c-visionapp-video-rest-yn`;
   - s3 of `visualgen-basics-yn` and of `visualgen-deployments-scenario-yn`, and t2 of `visualgen-playground-match`.

   Also, `videogen-facts-yn` s2 (Yes) is about **Sora 1**. Only the training unit lists Sora 1; the docs and the retirement schedule don't, so its status isn't confirmed.
2. **GPT-Image-1.5 and GPT-Image-1-Mini: Learn disagrees.** `how-to/dall-e` (2026-11-10) says "Limited access preview"; "Model retirement schedule" (2026-11-18, more recent) says GA. Left unchanged:
   - `ai901-2c-imagegen-drafts-and-finals` (answer: Mini for drafts, 1.5 for finals). If preview status is confirmed, it can be rewritten with GPT-Image-2.5-Flare (speed and cost) and GPT-Image-2.5-Sunburst (most capable, editing precision).
   - `ai901-2c-imagegen-edit-product-photo` (answer GPT-Image-1.5; GPT-Image-2 would be the GA alternative).
   - `imagegen-family-yn` s3 and `imagegen-portal-steps` ("such as gpt-image-1-mini").

   The training unit also still recommends "starting with the GPT-Image-1 family, especially GPT-Image-1.5".
3. **GPT-4.1 and GPT-4.1-mini are deprecated** (new customers can't deploy them; retirement on 2027-04-14). The training units and many questions use them as the vision-enabled model. Deprecated isn't preview or retired, so no question was changed.
   - In scope: `vision-model-for-photos`, `vision-models-catalog-yn`, `vision-playground-inputs-yn`, `visionapp-caption-call`, `visionapp-deployment-name`, `visualgen-deployments-scenario-yn`, plus distractors.
   - The Content Understanding readme also requires gpt-4.1 for `prebuilt-invoice` and `prebuilt-receipt`, which is odd for new subscriptions. Not mentioned in chapter 24.
4. GPT-Image-2 isn't in the readme's list of models for the Responses API image tool (gpt-image-1 series, gpt-image-2.5). The chapter doesn't say which image models the tool supports.

## French terms not settled (not in the glossary)

- « préversion » (glossary) used for preview. « dépréciés » (Deprecated lifecycle stage) and « mise hors service » / « mis hors service » (retirement) are not in the glossary.
- « disponibilité générale » (GA), « accès limité » (limited access), « préservation des visages » (face preservation), « indexation vectorielle », « segments » for chunks, « génération augmentée de récupération (RAG) », « pièces d'identité », « déploiements de modèles par défaut », « analyseur de base » (base analyzer).
- `locales` is kept as the property name. The bank (`av-locale`) uses « paramètre régional » in prose.
