Agents and RAG pipelines reason well only on clean input: text in reading order, tables kept as tables, figures described, and named values you can trust. Azure Content Understanding in Foundry Tools produces that input from documents, images, audio and video, through analyzers that return Markdown, JSON fields, or both. The exam asks which analyzer to use, how to define a custom one, and how its output feeds downstream reasoning.

<!-- section: multimodal-pipeline | objectives: 5.2.1 -->
## Multimodal pipelines: OCR, layout and field extraction

Content Understanding is a Foundry service: it needs a Foundry resource. An analysis runs through stages that the analyzer configuration turns on or off:

| Stage | What it does | Configured by |
| --- | --- | --- |
| Content extraction | OCR, selection marks, barcodes, formulas, layout (paragraphs, tables, figures, sections, reading order); transcription for audio and video | `enableOcr`, `enableLayout`, `enableFormula`, `enableBarcode` (all `true` by default) |
| Segmentation and classification | Splits a file into logical sections and classifies each one, optionally routing it to another analyzer | `contentCategories`, `enableSegment` |
| Field extraction | Fills the fields of a schema, using a generative model | `fieldSchema`, `models` |
| Confidence and grounding | A score from 0 to 1 and the source location (page, bounding box) for each field value; document analyzers, all field methods | `estimateFieldSourceAndConfidence`, or `estimateSourceAndConfidence` on a field (overrides the analyzer setting) |

Field extraction has three methods:

| `method` | Value is | Example |
| --- | --- | --- |
| `extract` | Copied as it appears in the content (documents only); requires source and confidence estimation | Invoice number, due date |
| `generate` | Produced by the model from the content | A one-sentence summary, the payment terms in plain words |
| `classify` | Chosen from a predefined set | Document type, priority |

Prebuilt analyzers cover the common cases:

| Analyzer | Returns | Model needed |
| --- | --- | --- |
| `prebuilt-read` | Words, paragraphs, formulas, barcodes (OCR) | No |
| `prebuilt-layout` | Text plus tables, figures, sections, hyperlinks | No |
| `prebuilt-digitalParse` | Content of digital files read from their internal structure (not for scanned files: use `prebuilt-read` or `prebuilt-layout`) | No |
| `prebuilt-invoice`, `prebuilt-receipt`, `prebuilt-contract`, `prebuilt-idDocument`... | Domain fields without writing a schema | Yes |
| `prebuilt-documentSearch`, `prebuilt-imageSearch`, `prebuilt-audioSearch`, `prebuilt-videoSearch` | Markdown and descriptions for RAG | Yes |
| `prebuilt-document`, `prebuilt-image`, `prebuilt-audio`, `prebuilt-video` | Base analyzers to derive custom analyzers from | Through the custom analyzer |

The service needs a chat completion model and an embedding model deployed in the Foundry resource. Prebuilt analyzers refer to them through aliases (`prebuilt-analyzer-completion`, `prebuilt-analyzer-completion-mini` for the `prebuilt-*Search` analyzers, `prebuilt-analyzer-embedding`) mapped to your deployments as resource defaults, or per request with `modelDeployments`. You pay Content Understanding meters plus the tokens of the connected deployments, and the guardrails of those deployments apply. Built-in roles: Cognitive Service Content Understanding Owner, Contributor and Reader.

| Requirement | Choose |
| --- | --- |
| Same fields from thousands of documents, with confidence for human review | A Content Understanding analyzer with a schema |
| Text and tables only, no generative model, lowest cost | `prebuilt-read` or `prebuilt-layout` |
| A one-off question about one image or document | A prompt to a multimodal model |

> **Exam trap.** A multimodal model prompt returns an answer, not a repeatable schema with a confidence score and a source location per value. When the requirement says "route low-confidence values to a reviewer" or "show where each value comes from", the answer is an analyzer with `estimateFieldSourceAndConfidence`.

<!-- section: grounded-representations | objectives: 5.2.2 -->
## Clean, grounded representations for agents and RAG

A RAG index is only as good as the text it chunks. Raw PDF text loses table structure, mixes columns and ignores charts. The RAG analyzers produce a representation built for retrieval:

| Analyzer | Output for downstream reasoning |
| --- | --- |
| `prebuilt-documentSearch` | Markdown with layout (paragraphs, tables, figures), figure descriptions, charts as chart.js and diagrams as mermaid.js, handwritten annotations, a one-paragraph summary, and chunks ready for embedding |
| `prebuilt-imageSearch` | A description of the image and its visual content |
| `prebuilt-audioSearch` | Transcript and a one-paragraph summary of the conversation |
| `prebuilt-videoSearch` | Per-segment transcripts and descriptions, with automatic scene or topic segmentation |

A typical flow: analyze each file, keep `contents[].markdown` (and the summary or fields), chunk and embed it, index it in Azure AI Search with metadata such as file name and page, then let the agent's knowledge tool retrieve it. Because the Markdown keeps headings and tables, chunks follow the document's sections and a table row stays with its header.

Settings that change the representation:

| Setting | Effect |
| --- | --- |
| `tableFormat` | `html` (default) or `markdown` for extracted tables |
| `enableFigureDescription` | Natural-language descriptions of figures (default `false`) |
| `enableFigureAnalysis` | Chart data and diagram components (default `false`) |
| `returnDetails` | Adds confidence, bounding boxes, spans and metadata; larger responses |
| `omitContent` | Returns only fields or subanalyzer results, without the content object |

Grounding works at two levels. For RAG, every chunk keeps a link to its file and page, so the agent can cite it. For fields, `estimateFieldSourceAndConfidence` returns the page and bounding box of each value, so a reviewer or an application can trace a value to its origin, and high scores allow straight-through processing.

> **Exam tip.** "The agent must answer questions about charts in the annual report" points to figure descriptions and chart extraction (`prebuilt-documentSearch`, or `enableFigureDescription` and `enableFigureAnalysis` in a custom analyzer). OCR alone returns the chart's labels, not what it shows.

<!-- section: custom-analyzers | objectives: 5.2.3 -->
## Implementing analyzers for structured and Markdown output

A custom analyzer derives from a base analyzer and adds configuration and a field schema:

```json
{
  "analyzerId": "fabrikamClaimAnalyzer",
  "description": "Extracts claim data from Fabrikam insurance claim forms",
  "baseAnalyzerId": "prebuilt-document",
  "config": {
    "returnDetails": true,
    "enableOcr": true,
    "enableLayout": true,
    "tableFormat": "markdown",
    "estimateFieldSourceAndConfidence": true
  },
  "fieldSchema": {
    "name": "ClaimFields",
    "fields": {
      "PolicyNumber": { "type": "string", "method": "extract", "description": "Policy number, labeled Policy No. or Policy #" },
      "IncidentDate": { "type": "date", "method": "extract", "description": "Date of the incident" },
      "Damages": {
        "type": "array",
        "method": "generate",
        "description": "Each damaged item listed in the damages table",
        "items": {
          "type": "object",
          "properties": {
            "Item": { "type": "string" },
            "EstimatedCost": { "type": "number" }
          }
        }
      },
      "Summary": { "type": "string", "method": "generate", "description": "One-sentence summary of the incident" }
    }
  },
  "models": { "completion": "prebuilt-analyzer-completion", "embedding": "prebuilt-analyzer-embedding" }
}
```

| Property | Rule |
| --- | --- |
| `baseAnalyzerId` | Only `prebuilt-document`, `prebuilt-image`, `prebuilt-audio` or `prebuilt-video` |
| `description` (analyzer and field) | Used by the model as context: a field description is a mini-prompt, so be specific |
| `type` | `string`, `number`, `boolean`, `date`, `object`, `array`; `object` has `properties`, `array` has `items` |
| `method` | `extract`, `generate`, `classify`; if omitted, the service chooses |
| `models` | Foundry model names or aliases, not deployment names; they must be among the base analyzer's supported models |

Create the analyzer, then analyze with it (API version `2025-11-01`, GA):

```text
PUT  {endpoint}/contentunderstanding/analyzers/fabrikamClaimAnalyzer?api-version=2025-11-01
POST {endpoint}/contentunderstanding/analyzers/fabrikamClaimAnalyzer:analyze?api-version=2025-11-01
     body: { "inputs": [ { "url": "https://<storage>/claims/claim-0042.pdf" } ] }
GET  the Operation-Location URL until the status is Succeeded
```

The analysis is asynchronous. The result has a `contents` list whose entries carry `markdown` and `fields`; with confidence estimation, each field also carries its confidence and source. In Python, `ContentUnderstandingClient.begin_analyze(analyzer_id=..., inputs=[...])` returns a poller, and `poller.result()` returns that result. Asynchronous analysis of a PDF or TIFF file accepts up to 2,000 pages by default.

Choose the output to fit the consumer:

| Downstream consumer | Output |
| --- | --- |
| A RAG index or an agent reading the document | Markdown (`contents[].markdown`), no schema needed |
| A workflow that writes to a database or calls an API | JSON fields from the schema, with confidence |
| A file that bundles several document types | `contentCategories` with `enableSegment`: each segment is classified and can be routed to its own analyzer |
| Only the fields, smaller responses | `omitContent: true` |

A classifier analyzer lists categories, each with a description and optionally the `analyzerId` that processes it:

```json
{
  "config": {
    "enableSegment": true,
    "contentCategories": {
      "claimForm": { "description": "Insurance claim form filled by the customer", "analyzerId": "fabrikamClaimAnalyzer" },
      "repairInvoice": { "description": "Invoice from a repair shop", "analyzerId": "prebuilt-invoice" },
      "other": { "description": "Any other page" }
    }
  }
}
```

Include an `other` category: without it, every page is forced into one of your categories. A category without `analyzerId` is classified but not analyzed. Classification works per page (the smallest unit), with up to 200 categories, and no training data. A video analyzer accepts only one `contentCategories` entry: for video, categories drive segmentation.

> **Exam trap.** `models` takes model names or aliases mapped to deployments, not your deployment name, and `extract` fields need source and confidence estimation. `extract` is supported only by document analyzers: an audio, video or image analyzer uses `generate` or `classify`. Confidence and source aren't limited to `extract`: document analyzers return them for `generate` and `classify` fields too. A question that sets `"method": "extract"` for a value that isn't written in the document (a summary, a risk level) has the wrong method: use `generate` or `classify`.

<!-- section: key-points -->
## Key points

- Content Understanding stages: content extraction (OCR, layout), segmentation and classification, field extraction, confidence and grounding.
- `prebuilt-read` and `prebuilt-layout` need no generative model; field extraction and RAG analyzers use completion and embedding deployments mapped through aliases.
- `prebuilt-documentSearch` gives RAG-ready Markdown with figure descriptions, summary and chunks.
- Custom analyzer: `baseAnalyzerId`, `config`, `fieldSchema` with `type`, `method` (`extract`, `generate`, `classify`) and `description`, `models`.
- `estimateFieldSourceAndConfidence` adds confidence and source location per value, for every field method of a document analyzer: the basis for human review and citations. `extract` is for document analyzers only.
- Analysis is asynchronous: poll `Operation-Location`, or `begin_analyze` then `poller.result()`.
