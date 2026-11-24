# QZ-ai-103-52-document-extraction — doubts and notes

Quiz: `content/ai-103/quizzes/52-document-extraction.yaml` (10 questions; checker: 0 problem, 0 warning).

## Chapter out of date or incomplete against current Learn (chapter not edited)

- **Confidence and grounding are no longer extract-only.** "What's new" (July 2026, preview and GA) and the analyzer reference: `estimateFieldSourceAndConfidence` is supported by document analyzers "for all document field types (`extract`, `classify`, and `generate` methods)". The chapter's table is compatible, but its exam trap and key points read as if source/confidence were tied to `extract`. Q10 s2 tests a `classify` field with confidence.
- **Field-level `estimateSourceAndConfidence`.** Learn has a per-field property (must be true for `extract` fields, overrides the analyzer-level setting). The chapter only shows the analyzer-level `estimateFieldSourceAndConfidence`. Learn's own sample sets only the analyzer-level one for `extract` fields; the quiz follows the chapter.
- **`extract` is documents only.** Learn (best practices): "`extract` is only supported for document analyzers." The chapter says "(documents only)" in a table cell only; Q7 builds on it (audio analyzer). Worth an explicit exam trap.
- **Source location only for rendered files.** Document elements page: `source` appears only for rendered files (PDF/image), not DOCX. Not in the chapter (not tested).
- **New or missing items:** `prebuilt-digitalParse` (content extraction of digital files, no model; Learn says to use `prebuilt-read`/`prebuilt-layout` for scanned files), `prebuilt-callCenter`, `segmentPerPage`, `chartFormat`, `annotationFormat`, `locales` (audio/video), built-in RBAC roles Cognitive Service Content Understanding Owner/Contributor/Reader (May 2026), page limit raised from 300 to 2,000 pages for asynchronous PDF/TIFF (Oct 2026), automatic normalization of dates and numbers. Preview only (not to be tested): `config.workflow: "agentic"`, synchronous Read/Layout, in-page segmentation (`allowInPageSegments`), signature detection — all `2026-06-01-preview`.
- **Video classification.** Learn: for video only segmentation is supported, with a single `contentCategories` entry and `enableSegment: true`. Not in the chapter.
- **Risk level example.** Learn's best practices give "risk level" as a `generate` example; the chapter says "use `generate` or `classify`". Q10's exhibit uses `classify` with an `enum` for RenewalRisk, which is valid but only appears in the exhibit (not the decision).
- `prebuilt-analyzer-completion-mini` is the default alias of the `prebuilt-*Search` analyzers (Learn); the chapter lists the alias without saying which analyzers use it.
- Latest GA API is still `2025-11-01` (chapter correct).

## Unverified or weakly sourced facts

- **Q8 (guardrails).** Learn (Model deployment options page) says guardrails of the deployment "can return warnings, restrict field extraction, or prevent analysis from completing" and that "you can adjust the blocking threshold". The exact empty-field symptom in the stem is an inference from "restrict field extraction". The "Guardrails in Content Understanding" page was not fetched.
- **Q5 (`enableSegment` false).** Learn: false treats the file as a single document; true returns categories for segments. That segmentation could split a 40-page contract is an inference from "treat the entire input file as multiple documents combined together".
- **Q9 (`modelDeployments`).** Learn's example uses aliases as keys; whether model names can be keys isn't stated (the quiz uses the alias).
- Whether base analyzers (`prebuilt-image`, `prebuilt-audio`...) can be called directly isn't stated on Learn ("primarily as a parent"); the quiz never relies on it.

## Mock-exam overlap avoided

Not repeated: analyzer vs multimodal prompt, ad hoc diagram prompt, `prebuilt-read` for faxes, `prebuilt-layout` without models, domain prebuilt matching, local binary analysis, details/confidence settings, copy of a prebuilt, field description labels, `supportedModels`, `models` deployment-name fix, PO schema with `enum`/`items`, loan bundle classifier (`enableSegment` true + `other`), output per consumer, SDK/REST steps ordering, documentSearch facts/code, figure analysis formats, table-aware chunks, audio/video search, RAG flow ordering. New decisions: `prebuilt-imageSearch`, which stage needs a model, category without `analyzerId`, `enableFigureDescription`, `enableSegment` false, two-level grounding in one call, audio analyzer (`prebuilt-audio`, `generate` instead of `extract`, `boolean`), guardrail thresholds, per-request `modelDeployments`, `omitContent` effect.
