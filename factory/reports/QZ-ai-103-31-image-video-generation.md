# QZ-ai-103-31-image-video-generation

Quiz `content/ai-103/quizzes/31-image-video-generation.yaml`: 10 questions (3.1.1 ×3, 3.1.2 ×1, 3.1.3 ×2, 3.1.4 ×1, 3.1.5 ×3), positions 6–10 = dragdrop, multi, ordering, dropdown, hotarea. `check-quiz`: 0 problem(s), 0 warning(s). Pages fetched on 2026-11-24.

## Conflict: Sora 2 is preview (objectives 3.1.2 and 3.1.4)

- "Sora 2 video generation overview (preview)": "Sora 2 video generation is currently in preview." The models page lists `sora-2` as the only video model, "in preview". The task forbids a preview feature as the answer, but 3.1.2 and 3.1.4 must each be tested and have no GA implementation in Foundry.
- Handling: q7 (3.1.2) has GA image-side answers (gpt-image-2 `size="1280x720"`, a prompt without people); the deciding facts (input_reference must match `size`, faces rejected) are Sora 2 preview rules. q9 (3.1.4) tests the `videos.remix` job flow, which is preview by nature. Both questions must be rechecked when Sora 2 changes status or behavior. The whole mock-exam bank for 3.1.2/3.1.4 has the same dependency.

## Chapter out of date or incomplete against current Learn (chapter not edited)

- **GPT-image-1, GPT-image-1.5 and GPT-image-1-mini are "Limited access preview"** in the model table of "How to Use Image Generation Models from OpenAI"; the chapter writes "Limited access (application form)" without "preview". GPT-image-2, GPT-image-2.5-Sunburst and GPT-image-2.5-Flare are GA. The quiz uses the 1-series only as distractors. Note: several mock questions have a 1-series model as the correct answer (for example ai103-3a-face-fidelity with gpt-image-1.5).
- **Responses API image_generation tool**: supported image models listed as gpt-image-1, gpt-image-1-mini, gpt-image-1.5, gpt-image-2.5-flare, gpt-image-2.5-sunburst (gpt-image-2 isn't listed); "multi-turn editing and streaming" are not supported. The chapter doesn't say which models the tool supports.
- **2.5 models**: size rules (multiples of 16, aspect ratio 1:3 to 3:1, edge ≤ 3,840 px, 655,360–8,294,400 pixels, "resolutions above 2560x1440 are experimental") and quality values `low`…`max`, `auto` are only in the comparison table. The chapter doesn't mention the experimental range or the pixel-count bounds (used in q6 and q10).
- **gpt-image-2 pixel count**: Learn adds "total pixel count between 655,360 and 8,294,400" and "If size=auto, the generated image might have dimensions that don't satisfy these constraints"; not in the chapter (used in q4 s3 and q7).
- **Transparent background**: Learn is inconsistent ("GPT-image-1 only" in code comments and the edit section; "GPT-image-1 and GPT-image-2 also support … background" in the C# callout). No quiz answer relies on it for gpt-image-2.
- **Streaming**: documented for "gpt-image-1-series and gpt-image-2"; not stated for the 2.5 models. `partial_images` range is "1-3" in one place and "between 0 and 3" in another.
- **Face preservation**: ✅ for GPT-image-2, 1.5 and 1; the 2.5 cells are empty (not "no"). `input_fidelity` is only said to be unsupported on gpt-image-1-mini.
- **Default quota**: 5 images/min is listed for the GPT-image-1 series and GPT-image-2, not for the 2.5 models.
- **Role**: the page mentions both "Cognitive Services User" (SDK setup) and "Cognitive Services OpenAI User" (401 troubleshooting); the chapter gives only the second.

## Facts inferred, not stated on Learn

- q3: that `n=10` counts as ten images against the images-per-minute quota is inferred from the quota unit ("Default quota (images/min)").
- q9: Learn shows `videos.remix` returning a video job but no code to poll or download a remix; that the remix has its own ID to poll and download comes from the chapter and the API object model.
- q10: "above 2560x1440" is ambiguous (per edge or pixel count); the sizes chosen (2048x1152, 3072x1728) are below or above on both edges and in pixels.
