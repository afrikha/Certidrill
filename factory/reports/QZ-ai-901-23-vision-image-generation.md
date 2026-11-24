# QZ-ai-901-23-vision-image-generation — doubts and notes

File: `content/ai-901/quizzes/23-vision-image-generation.yaml`, 10 questions.

- Objectives: 2.3.1 ×4 (Q2, Q3, Q7, Q10), 2.3.2 ×2 (Q1, Q5), 2.3.3 ×4 (Q4, Q6, Q8, Q9).
- Formats: single ×5, multi, dragdrop, yesno, dropdown, hotarea.
- Check: `0 problem(s), 0 warning(s)`.

## Chapter and mock bank vs current Learn (nothing edited)

- **The GPT-Image-1 family is "Limited access preview".** The "Models and capabilities" table of "Azure OpenAI image generation models" (`how-to/dall-e`) gives:

  | Model | Availability |
  | --- | --- |
  | GPT-Image-2 | Generally Available |
  | GPT-Image-1.5 | Limited access preview |
  | GPT-Image-1 | Limited access preview |
  | GPT-Image-1-Mini | Limited access preview |

  The same page lists GPT-Image-2.5 (Sunburst / Flare) and says `dall-e-3` retired on 2026-03-04.
  - The chapter's table follows the training unit "Image generation models", which calls GPT-Image-1.5 "the latest and most advanced". Neither mentions GPT-Image-2 or the preview status. The chapter's table is out of date.
  - **Mock-exam questions whose correct answer is a preview model:**
    - `ai901-2c-imagegen-drafts-and-finals` (GPT-Image-1-Mini / GPT-Image-1.5)
    - `ai901-2c-imagegen-edit-product-photo` (GPT-Image-1.5)
    - `ai901-2c-imagegen-model-for-illustration` (GPT-Image-1)
    - `ai901-2c-imagegen-family-yn` (statements about the family)
  - In the quiz, the correct answers are a model kind ("an image-generation model of the GPT-Image family", Q1) or the GA `gpt-image-2` (Q9). Q9 names `gpt-image-2`, which the chapter doesn't list. The learner only needs to recognize the GPT-Image family.
- **Video generation is preview only.**
  - "Foundry Models sold by Azure" lists only `sora-2`, "in preview". Sora 1 isn't listed anymore. The "Video generation with Sora 2 (preview)" page doesn't mention Sora 1. The training unit still presents Sora 1 (no preview label) and Sora 2 (public preview).
  - The chapter's video paragraph (video playground, asynchronous job, MP4, responsible AI limits) therefore teaches a preview feature. The quiz uses Sora only in distractors.
  - **Mock-exam questions whose correct answer is a Sora feature:**
    - `ai901-2c-videogen-*` (7 questions)
    - `ai901-2c-visionapp-video-rest-yn`
    - the Sora items of `ai901-2c-visualgen-*`
  - Their status should be reviewed against the rule "never a preview feature as the answer".
- **`images.generate` isn't in the training unit.** The unit's code generates an image with `client.responses.create(..., tools=[{"type": "image_generation"}])`. It reads the result from the output item `image_generation_call`. It sets `MODEL_NAME` to a gpt-image deployment, e.g. "gpt-image-1".
  - In the OpenAI design, the image_generation tool is called from a GPT chat model, not from a gpt-image deployment. The unit's sample may therefore be wrong on that point, but I didn't verify this on another Learn page.
  - The chapter's `images.generate(model, prompt, n, size)` snippet with `result.data[0].b64_json` matches the docs page (`how-to/dall-e`, which uses `AzureOpenAI` with `api_version="2025-04-01-preview"`). The chapter uses the `OpenAI` client with the `/openai/v1/` base URL instead.
  - Q4, Q6 and Q8 use `images.generate`. No quiz question uses the Responses API image tool.
- **Image playground steps.** The training unit says "Deploy a vision‑enabled model" to generate images in the playground. This looks like a slip for an image-generation model, and the chapter correctly says an image-generation model. The unit doesn't show the **Text to image** catalog filter either; it comes from the lab, as noted in the Q-ai-901-2c report. The quiz doesn't test the portal steps of generation.
- **GPT-4.1 family.** Per "Model deprecations and retirements", gpt-4.1-mini 2025-04-14 retires on April 14, 2027. It is still current in November 2026, so Q3, Q7, Q9 and Q10 can use it.

## Facts used beyond the chapter text

- **Q4: `n` and `result.data`.** One `b64_json` per item and `n` from 1 to 10 come from the docs page. The chapter only names `n` as "number of images".
- **Q6: no URL option.** The distractor "URL of a PNG file" is wrong because GPT-Image models return base64 only and `response_format` isn't supported (docs page).
- **Q8: the data URL.** The form `f"data:image/jpeg;base64,{...}"` isn't in the chapter. The chapter only says "base64-encoded image data". The image-generation unit mentions a "base64 data URL". It appears only in the code, not as a slot.
- **Q2: GPT-5.1 is vision-enabled.** The vision unit names "GPT-5 series (for example, GPT-5.1, GPT-5.2)" as multimodal models with image input.
- **Q2 distractor `gpt-4o-mini-tts`.** It comes from the audio quickstart's model table (text to speech).

## Overlap with the mock bank

The bank has 54 questions on 2.3.1–2.3.3. The quiz uses angles the bank doesn't ask:
- an embedding deployment diagnosed as the cause of a failure;
- a vision-enabled deployment that receives the URL only as text (Q10, the converse trap);
- `n=4` and iterating over `result.data`;
- send/receive pairs for both APIs;
- an analyze-then-generate round trip (encode, then decode);
- deployment names that contradict their model (hotarea).

## French

- « modèle compatible avec la vision », « modèle de génération d'images », « modèle d'embedding », « élément `input_text` / `input_image` », « illustration en aplat » (flat illustration), as in chapter 23.

## Pages fetched (2026-11-24)

Training units:
- Multimodal models for image analysis
- Image generation models
- Video generation models

Docs:
- Azure OpenAI image generation models (fetched twice for the status wording)
- Video generation with Sora 2 (preview)
- Foundry Models sold by Azure (first 100,000 characters)
- Model deprecations and retirements

The page `openai/concepts/models` failed to load (client error).
