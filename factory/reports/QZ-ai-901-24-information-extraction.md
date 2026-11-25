# QZ-ai-901-24-information-extraction — report

File: `content/ai-901/quizzes/24-information-extraction.yaml` (10 questions, 2.4.1 ×3, 2.4.2 ×2, 2.4.3 ×3, 2.4.4 ×2). Check: 0 problem(s), 0 warning(s).

Pages fetched (Nov. 2026): training units 2-documents and 3-audio-video, prebuilt analyzers, image / audio / video overviews, Python client library readme (v1.1.0), REST quickstart, best practices, service quotas and limits.

## Chapter vs current Learn

- **Key authentication.** The Python readme recommends `DefaultAzureCredential` and says to use `AzureKeyCredential` with test resources only. The chapter presents the key as an equal option, and its only code sample uses a key. You could add one sentence or switch the sample to Entra ID.
- **Cognitive Services User role.** The readme says this role is required even for the resource Owner. The chapter doesn't say so, but a mock question (`ai901-2d-app-entra-role`) tests it.
- **Default model deployments.** Prebuilt analyzers need default model deployments mapped once per Foundry resource. Per the readme: gpt-4.1-mini plus text-embedding-3-large for the *Search analyzers, and gpt-4.1 plus text-embedding-3-large for invoice and receipt. Read and layout need none. The chapter only says "a generative model deployed in the Foundry resource", which is enough at AI-901 level.
- **Mock questions beyond the chapter.** Some mock questions test points the chapter doesn't teach:
  - the field methods `extract`, `generate` and `classify` (`extract` is for documents only, per the service limits page);
  - the base analyzers `prebuilt-document`, `-image`, `-audio` and `-video`;
  - `locales`, the sampling of about 1 frame per second, and `prebuilt-idDocument`.

  The chapter should cover these, or the mock questions should be checked against the study guide's depth.
- **Analyzers missing from the chapter.** `prebuilt-documentSearch` (recommended for RAG on documents) isn't in the chapter.
- **`prebuilt-callCenter`.** The chapter says "topics". The audio overview's example returns "categories", while the prebuilt analyzers page says "topics". The difference is minor.
- **Name of the video analyzer.** The video overview uses both `prebuilt-videoAnalysis` and `prebuilt-videoSearch`. The prebuilt analyzers page and the SDK use `prebuilt-videoSearch`, as the chapter does.

## Doubts / unverified

- **Q7 (photos of receipts, data sheets and invoices sent to document analyzers).** The service limits page lists JPEG among the formats of document analyzers. No page confirms JPEG analyzer by analyzer (`prebuilt-receipt`, `prebuilt-layout`, `prebuilt-invoice`).
- **Q9 (REST polling loop).** The loop only stops on `Succeeded`. The quickstart documents only `NotStarted`, `Running` and `Succeeded`, so failure handling was left out.
- **Q5.** It relies on a custom audio analyzer filling a spoken claim number with a generated field. This follows the voicemail example ("callback number") and the audio overview ("mentioned entities").
