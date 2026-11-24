# QZ-ai-103-33-multimodal-responsible-ai — report

Quiz: `content/ai-103/quizzes/33-multimodal-responsible-ai.yaml`, 10 questions (positions 6–10: yesno_statements, single, single, dragdrop, multi). `npx tsx factory/check-quiz.ts ai-103 33-multimodal-responsible-ai` → 0 problem(s), 0 warning(s).

Objectives: 3.3.1 (q1, q4, q6, q7), 3.3.2 (q3, q8, q10), 3.3.3 (q2, q5, q9). The 18 mock questions of 3.3.x were read first; the quiz tests other decisions (default level Medium, Low on input, Annotate action, animated first frame, five-document limit, least-privilege tool, visible label vs Content Credentials, guardrail vs Analyze Image for generated images).

## Chapter out of date or wrong against current Learn (Nov. 2026)

1. **DALL-E is retired.** The image generation page says `dall-e-3` was retired on March 4, 2026 (existing deployments non-functional). The chapter still names "DALL-E and the GPT-image-1 series" as the models that produce Content Credentials, and lists `softwareAgent` "Azure OpenAI DALL-E".
2. **GPT-image-1 series is now limited access preview.** The same page lists GPT-Image-2.5-Sunburst / -Flare and GPT-Image-2 as GA, and GPT-Image-1.5, GPT-Image-1 and GPT-Image-1-Mini as limited access preview. The Content Credentials page (classic) names only DALL-E and GPT-image-1 series; I couldn't verify the `softwareAgent` value for GPT-Image-2.x (the `/azure/foundry/` version of the Content Credentials page failed to load). The quiz says only "an image generation model of Azure OpenAI in Foundry Models", which matches the page ("all AI-generated images from Azure OpenAI in Microsoft Foundry Models include Content Credentials").
   - Mock questions built on GPT-image-1 series (now preview): `ai103-3b-policy-manifest` (answer depends on "Azure OpenAI ImageGen"), `ai103-3b-policy-visible-label`. Worth a review.
3. **Spotlighting is for models only.** The guardrails overview lists Spotlighting (Preview) as "models only" (not agents). The chapter says only "Chat Completions only"; q10 uses the "agents" limit.
4. **Guardrail actions.** The overview names two actions: Annotate (models only) and Annotate and block (models and agents). The chapter says "can block or annotate"; the action names could be given exactly (q3 uses them).
5. **Default safety policies not in the chapter**, relevant to 3.3.3 "potentially inappropriate content": vision-enabled chat models have an extra prompt-side risk "Identification of individuals and inference of sensitive attributes"; image generation models have "Depictions of public figures", "Deceptive generation of political candidates", "Protected material – art and studio characters", "Profanity" and "Content credentials". Not tested.
6. **Content Understanding and guardrails.** The CU overview says "Guardrails can restrict field generation while preserving extracted source content. Analysis can therefore succeed with warnings even when some field values aren't returned." The chapter's "harmful content is also filtered during the analysis" is a little stronger than Learn; q5 s1 is worded on what Learn says (guardrails apply during analysis).
7. Groundedness detection (preview) in Azure OpenAI retires on April 30, 2027 (guardrails overview) — not in the chapter; mock `ai103-3b-inject-pipeline` uses it only as a distractor.

## Doubts

- q4: Learn says that for an animated image "the service will extract the first frame to do the analysis". The fix (extract frames in the app and analyze each one) is the logical consequence, not a documented procedure.
- q7: "prompt-side levels can be changed without approval" comes from the classic content filtering page ("Prompt filtering is configurable for everyone"; only completion-side No filters / Annotate only need approval). The new guardrails overview says only that turning outputs off needs approval.
- q6 s1: the image generation page gives the error code `contentFilter` and status `Failed`, but no HTTP status code.
- q1: the default guardrail is named Microsoft.DefaultV2 (guardrails overview); the Medium levels come from "Default Guardrail policies for Azure OpenAI".
- French: « autocollant » chosen for "sticker" (not in the glossary). AI terms used as in the chapter, none of them in `content/glossary.yaml`: « garde-fou », « niveau de blocage », « attaque par document », « attaque par invite utilisateur », « analyseur », « texte de remplacement ». Worth adding to the glossary.

## Pages fetched

Guardrails and controls overview in Microsoft Foundry; Default Guardrail policies for Azure OpenAI; Content filtering for Microsoft Foundry Models (classic); Quickstart: Analyze image content; Prompt Shields in Azure AI Content Safety; Content Credentials in Azure OpenAI (classic); How to Use Image Generation Models from OpenAI; What is Azure Content Understanding in Foundry Tools?
