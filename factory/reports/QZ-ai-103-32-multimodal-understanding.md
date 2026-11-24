# QZ-ai-103-32-multimodal-understanding — report

Quiz: `content/ai-103/quizzes/32-multimodal-understanding.yaml`, 10 questions (single ×7, yesno_statements ×1, dropdown ×1, multi ×1; positions 6–10: dropdown, single, multi, single, single). `npx tsx factory/check-quiz.ts ai-103 32-multimodal-understanding` → 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (q1, q6), 3.2.2 (q3), 3.2.3 (q8), 3.2.4 (q4), 3.2.5 (q2, q7), 3.2.6 (q9), 3.2.7 (q10), 3.2.8 (q5). The 38 mock questions of 3.2.x were read first; the quiz avoids their decisions (for example q10 answers "single-task per modality + app cross-check", the opposite of `ai103-3b-pro-mode-crosscheck`).

## Chapter out of date or wrong against current Learn (Nov. 2026)

1. **Pro mode (3.2.7).** The concept page `content-understanding/concepts/standard-pro-modes` now redirects to the quickstart and no longer mentions pro mode. Pro mode appears only in What's new, as part of `2025-05-01-preview` ("The `pro` mode (preview) is currently limited to documents"). The overview of the GA API `2025-11-01` mentions only agentic mode (not available in GA, preview in `2026-06-01-preview`). The chapter presents pro mode as a current option (table "Cross-check an invoice ... → Pro mode (documents)"). It should say that pro mode was a 2025 preview and that the current options are single-task analyzers, `contentCategories` routing and the preview agentic mode. The quiz never uses pro mode or agentic mode as an answer.
   - Mock questions that test a preview feature as the answer: `ai103-3b-pro-mode-crosscheck` (pro mode), `ai103-3b-pro-mode-facts` (statements about pro mode), `ai103-3b-agentic-mode` (`"workflow": "agentic"`, preview only). Worth a review.
2. **`contentCategories` is not available for image analyzers.** The analyzer reference lists `contentCategories` and `enableSegment` for document and video analyzers only, and only `returnDetails` for image analyzers. The chapter says routing "classifies a file or its segments" without this limit; worth one sentence (q7 and q10 use it).
3. **Custom analyzers derive only from the four base analyzers** (`prebuilt-document`, `-image`, `-audio`, `-video`), per the prebuilt analyzers page. The chapter doesn't say this; q7 and q9 use it as a trap (`prebuilt-imageSearch` / `prebuilt-videoSearch` can't be extended).
4. **Image limits differ between APIs.** The vision page (Chat Completions) says GIF "first frame only", 20 MB, 10 images per chat call; the Responses page says "non-animated GIF", up to 50 images, under 512 MB. The chapter gives only the Chat Completions rule. The quiz doesn't test GIF or limits.
5. **Vision-enabled models.** Learn lists o-series, GPT-5 series, GPT-4.1 series, GPT-4.5 and GPT-4o series; the chapter omits GPT-4.5 (minor). The vision page still mentions GPT-4 Turbo with Vision in places (Learn inconsistency).
6. **French chapter:** « même sur un compte de stockage du même réseau ou d'un réseau appairé » — the writing guide asks for « peering », not « appairé » (« d'un réseau virtuel connecté par peering »).

## Learn inconsistencies noticed (not chapter errors)

- The Image Analysis migration page still says "Azure Content Understanding image solutions are in preview", while the CU overview says the GA API `2025-11-01` covers images. It also says to plan the transition by September 25, 2026 (date passed).
- The analyzer reference says `extract` "requires `estimateSourceAndConfidence`" while the property elsewhere is `estimateFieldSourceAndConfidence`; it doesn't say "documents only" (the overview does). The chapter follows the overview, and so do q5 and q7.
- The video overview calls the prebuilt video analyzer both `prebuilt-videoAnalysis` and `prebuilt-videoSearch`. The prebuilt analyzers page lists only `prebuilt-videoSearch`.
- Several pages now live under `/azure/foundry/...` as well as `/azure/ai-foundry/...` (the latter often titled "(classic)"). References use the URLs that were fetched.

## Doubts

- q3 (3.2.2): "minimize development effort" separates `prebuilt-imageSearch` from a chat model with a prompt you write; both work, so the answer depends on that constraint (it's stated, and it's the chapter's table row).
- q6: the `detail` slot depends on "always examine fine details, whatever the image size" to exclude `auto` (Learn: `auto` lets the model choose from the image size).
- q2: Content Understanding Studio vs the Foundry playground relies on the comparison page ("Create custom analyzers: Studio ✓, Foundry (new) ✗").

## Pages fetched

How to use vision-enabled chat models; Use the Azure OpenAI Responses API; What is Azure Content Understanding in Foundry Tools?; What's new in Content Understanding?; CU prebuilt analyzers; CU analyzer reference; CU image overview; CU video overview; Content Understanding Studio and Microsoft Foundry; Alternative text (alt text); Graphics, Design, and Media; Accessibility Guidelines and Requirements; What is Image Analysis?; Migrate from Azure Vision in Foundry Tools - Image Analysis.
