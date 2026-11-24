Two Foundry building blocks understand images and video. A **multimodal model** (vision-enabled chat model) answers a prompt about one or more images: flexible and driven by instructions. **Azure Content Understanding** in Foundry Tools runs an **analyzer** that turns images, video, audio and documents into Markdown or into fields that follow your schema: repeatable and structured. Exam questions ask which one fits a need, how to configure it and how to read its output.

<!-- section: visual-context | objectives: 3.2.1 -->
## Analyzing visual context with multimodal models

Vision-enabled models include the GPT-4.1 series, the GPT-5 series, the o-series reasoning models, GPT-4.5 and the GPT-4o series. A text-only deployment, or an embedding model, can't read an image whatever the prompt says.

With the Responses API, an image is a content part of type `input_image` next to an `input_text` part:

```text
response = client.responses.create(
    model="vision-chat",                         # deployment name
    instructions="You inspect photos of delivery damage for Tailspin Toys.",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "Is the box damaged? Answer in one sentence."},
            {"type": "input_image", "image_url": "https://contoso.example/parcel.jpg"},
            {"type": "input_image",
             "image_url": f"data:image/jpeg;base64,{b64_photo}",
             "detail": "high"},
        ],
    }],
)
print(response.output_text)
```

| Image source | Use when |
| --- | --- |
| Public URL (`image_url`) | The image is reachable from the internet |
| Base64 data URL (`data:image/jpeg;base64,...`) | The image is local or private |
| `file_id` | The file was uploaded with the Files API |

The Chat Completions API takes the same image as a part of type `image_url` (`{"type": "image_url", "image_url": {"url": ...}}`).

The `detail` setting trades accuracy for tokens and latency:

| `detail` | Behavior |
| --- | --- |
| `auto` (default) | The model chooses from the image size |
| `low` | A low-resolution 512 x 512 version: fastest, fewest tokens, may miss small details |
| `high` | The low-resolution view plus detailed 512 x 512 segments: small text and fine details, more tokens |

With Chat Completions, supported formats are JPEG, PNG, WEBP and GIF (first frame only), up to 20 MB per image and 10 images per call; the Responses API accepts non-animated GIFs and up to 50 images per request, the whole request under 512 MB. Image URLs must be **publicly accessible**: a URL behind a private endpoint, a virtual network restriction or a firewall isn't read, even on a storage account in the same or a peered network. Set `max_output_tokens` (Responses) or `max_tokens` / `max_completion_tokens` (Chat Completions) high enough: a `finish_reason` of `length` means the answer was cut.

> **Exam trap.** A storage account that allows only private access can't serve its images to the model by URL. Read the blob in the application and send it as a **base64 data URL**.

<!-- section: captions | objectives: 3.2.2 -->
## Producing concise or detailed captions

Caption length and focus are controlled by the prompt and the request, not by a separate service.

| Need | Configuration |
| --- | --- |
| One short caption per photo for a gallery | Instruction "one sentence, at most 15 words", low `max_output_tokens`, `detail: "low"` often enough |
| A detailed description of a complex photo | Instruction listing what to cover (setting, people, actions, visible text), `detail: "high"` |
| Captions for several images in one call | Several `input_image` parts in one message, each preceded by an `input_text` label ("Image 1: ...") |
| Captions an application must store per image | Structured outputs: a JSON schema with an array of `{ "imageId", "caption" }` |
| Searchable descriptions for thousands of images | Content Understanding `prebuilt-imageSearch` (visual descriptions and insights for retrieval) |

Labeling each image lets the model and your code refer to "Image 2" without ambiguity.

> **Exam tip.** "Concise" and "detailed" are two prompts on the same deployment. A new model or an extra service is the wrong answer when only the length or level of detail changes.

<!-- section: visual-qa | objectives: 3.2.3 -->
## Question answering grounded in visual evidence

A grounded visual answer comes only from what the image shows, and says so when the image doesn't show it.

- **Instructions**: answer only from the provided images; quote visible text exactly; describe where the evidence is ("lower-left gauge"); if the answer isn't visible, reply that it can't be determined from the image.
- **Structured output** separates the answer from its evidence, so the application can display or check it:

```json
{
  "type": "json_schema",
  "name": "visual_answer",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "answer": { "type": "string" },
      "answerable": { "type": "boolean" },
      "evidence": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["answer", "answerable", "evidence"],
    "additionalProperties": false
  }
}
```

This object goes in `text.format` of a Responses request (`response_format` with a `json_schema` wrapper in Chat Completions).

- **`detail: "high"`** when the answer depends on small text, labels or gauges.
- **Many images**: index them first. An analyzer produces descriptions for a search index; the RAG flow retrieves the relevant images, or their descriptions, and sends them to the model with the question.

> **Exam trap.** Raising `temperature` or adding "be accurate" doesn't ground an answer. Grounding comes from restricting the source (the image), asking for the evidence, and allowing "can't determine".

<!-- section: alt-text | objectives: 3.2.4 -->
## Generating alt text and extended descriptions

Microsoft's accessibility guidance for alt text (Microsoft Writing Style Guide) gives the rules the prompt must encode:

| Rule | In the prompt |
| --- | --- |
| Convey the image's **purpose**, concisely; it requires judgment, not every detail | "Describe what the image means in this context" and pass the surrounding text |
| At most **150 characters** | A length limit, checked again in code |
| Don't start with "Image" (screen readers already announce it); say what it is: photograph, diagram, chart, screenshot | Explicit instruction |
| Don't repeat the surrounding text or the caption; don't use the file name | Pass the caption so the model avoids it |
| Include embedded text if the page doesn't already contain it | "Include visible text that matters" |
| Decorative images need no alt text: in web content, use a null `alt=""` | A field `isDecorative` |
| A complex image (chart, diagram) gets a **detailed description** in the surrounding text or in linked content | A separate `longDescription` field |

Video content needs closed captions and audio descriptions, and a video thumbnail needs alt text.

A schema with `altText`, `isDecorative` and `longDescription` returns everything in one call; the application enforces the length limit and routes doubtful cases to a human reviewer.

> **Exam trap.** A detailed caption is not alt text. For a chart, the alt text names the chart and its key message in one sentence, and the data goes in an **extended description**.

<!-- section: content-understanding-images | objectives: 3.2.5 -->
## Extracting visual characteristics with Content Understanding

Content Understanding is a Foundry Tool of the Foundry resource. The current GA API is `2025-11-01`; `2026-06-01-preview` adds preview features. An **analyzer** combines content extraction settings, a **field schema** and the model deployments it uses (you bring your own Foundry LLM and embedding deployments).

```json
{
  "analyzerId": "shelfAudit",
  "description": "Photos of store shelves taken by Northwind field staff",
  "baseAnalyzerId": "prebuilt-image",
  "config": { "returnDetails": true },
  "fieldSchema": {
    "name": "ShelfFields",
    "fields": {
      "productFacings": {
        "type": "number",
        "method": "generate",
        "description": "Number of visible Northwind cereal boxes facing the aisle"
      },
      "shelfCondition": {
        "type": "string",
        "method": "classify",
        "description": "Overall state of the shelf",
        "enum": ["Full", "PartiallyEmpty", "Empty"]
      }
    }
  },
  "models": { "completion": "gpt-5.2" }
}
```

| Property | Meaning |
| --- | --- |
| `analyzerId` | The name used in calls (letters, numbers, dots, underscores) |
| `description` | Context the model uses during field extraction |
| `baseAnalyzerId` | `prebuilt-image`, `prebuilt-video`, `prebuilt-audio` or `prebuilt-document`: custom analyzers can derive only from these four base analyzers |
| `fieldSchema` | Fields with `type` (`string`, `number`, `boolean`, `date`, `object`, `array`), `description` and `method` |
| `models` | Catalog model names (for example `gpt-5.2`), not deployment names |

Field methods: `generate` (free value, such as a description or a count), `classify` (one value of an `enum`), `extract` (value as it appears, **documents only**).

```bash
curl -X PUT "https://{endpoint}/contentunderstanding/analyzers/shelfAudit?api-version=2025-11-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  -d @shelfAudit.json

curl -X POST "https://{endpoint}/contentunderstanding/analyzers/shelfAudit:analyze?api-version=2025-11-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  -d '{"inputs":[{"url":"https://contoso.example/shelf-042.jpg"}]}'
```

Creating returns `201 Created` and analyzing returns `202 Accepted`, both with an `Operation-Location` header: poll it until `status` is `Succeeded`.

Content Understanding Studio is where custom analyzers are authored; the Content Understanding playground in Foundry runs supported prebuilt analyzers but can't create custom ones.

> **Exam trap.** Image analyzers aren't optimized for analysis based mainly on text in the image. To read and extract text from scanned forms or receipts, use a document analyzer (`prebuilt-document`, `prebuilt-read`, `prebuilt-layout`).

<!-- section: video-analysis | objectives: 3.2.6 -->
## Processing and interpreting video segments

A video analyzer runs in two stages.

**Content extraction**: a transcript in WEBVTT format (with speaker diarization, and multilingual transcription when no locale is set), key frames that represent each shot, and shot detection. With `"returnDetails": true`, the result also gives sentence-level timestamps and the shot boundaries in `cameraShotTimesMs`.

**Field extraction and segmentation**: the generative model fills your fields for each segment.

| `enableSegment` | Behavior | Example |
| --- | --- | --- |
| `false` | The whole video is one segment | Brand-safety check of an ad, a summary of the full video |
| `true` | The model splits the video according to a natural-language description in `contentCategories` | One segment per news story, ads separated from programs |

```json
{
  "analyzerId": "newsSegments",
  "baseAnalyzerId": "prebuilt-video",
  "config": {
    "returnDetails": true,
    "enableSegment": true,
    "contentCategories": {
      "news-story": {
        "description": "Each distinct news story, no overlap. Ignore ads and promotions.",
        "analyzerId": "newsStoryAnalyzer"
      }
    }
  },
  "models": { "completion": "gpt-5.2" }
}
```

Each segment is then analyzed by `newsStoryAnalyzer`, whose field schema holds the per-story fields (topic, people named, location). A video analyzer supports **one** content category object. Segmentation uses the generative model and consumes tokens even when no field is defined. The ready-made `prebuilt-videoSearch` analyzer gives transcripts and segment summaries with automatic scene detection, in Markdown ready for a vector store.

Limits to keep in mind: about **one frame per second** is sampled, frames are resized to 512 pixels square (small text and distant objects can be lost), and only speech is transcribed (not music or sound effects).

> **Exam trap.** Multimodal chat models take images, not video files. To ask a chat model about a video, the application must extract frames itself; for per-scene fields, transcripts and timestamps, use a Content Understanding video analyzer.

<!-- section: cu-pipelines | objectives: 3.2.7 -->
## Single-task and pro-mode pipelines

**Single-task** pipelines are what most analyzers do: one analyzer, one input file, one pass of content extraction then field extraction (`extract`, `classify`, `generate`). A prebuilt analyzer (`prebuilt-read`, `prebuilt-layout`, `prebuilt-imageSearch`) or a custom analyzer each performs one task. Pipelines are composed by **routing**: `contentCategories` classifies a file or its segments and sends each category to the analyzer named in its `analyzerId`, in a single run. Only document and video analyzers support `contentCategories` (and `enableSegment`); an image analyzer doesn't.

**Pro mode** was introduced, in preview, with the API `2025-05-01-preview`; the release notes of the GA API `2025-11-01` don't list it. The default mode of every analyzer is **standard**. Pro mode adds **reasoning**, **several input documents** in one analysis, and an **external knowledge base** (reference data) for linking, enrichment and validation. It targets tasks that used to need custom code or a human: aggregating a schema across files, validating results across documents, using reference data to produce the output. Pro mode is limited to **documents**.

| Requirement | Pipeline |
| --- | --- |
| Fields from each photo or each video segment | Single task (standard) |
| Mixed files routed to the right analyzer | Classification with `contentCategories` |
| Cross-check an invoice against a purchase order and a supplier list | Pro mode (documents, `2025-05-01-preview`) |
| Multistep calculation or validation inside one document | Agentic mode (preview) |

In the current preview API (`2026-06-01-preview`), multistep reasoning over a document is called **agentic mode**: set `config.workflow` to `"agentic"` on a document analyzer (one input file per request for now); `"default"`, or no `workflow`, lets the service pick a standard workflow. The Foundry (classic) experience that created standard and pro mode tasks is retired.

> **Exam trap.** Reasoning across files and reference data is a document capability. For images or video, design a single-task analyzer per modality and do the cross-checking in your application or an agent.

<!-- section: objects-regions | objectives: 3.2.8 -->
## Identifying objects, components and regions

| Need | Best fit |
| --- | --- |
| Name and count the objects in a photo, flexible questions | Multimodal model, with structured output (list of objects, count, position described in words) |
| The same fields on every image: count of products, defect type, component present or missing | Content Understanding image analyzer (`generate` for counts, `classify` for states) |
| Which part of a video shows the product, with start and end times | Content Understanding video analyzer with segmentation |
| The source region of each value extracted from a document | Document analyzer with `estimateFieldSourceAndConfidence` (grounding and 0 to 1 confidence) |
| Pixel bounding boxes of objects | Azure Vision Image Analysis 4.0 (Detect objects, dense captions): deprecated, retires on September 25, 2028 |

Microsoft's migration guidance for Image Analysis points to two replacements: **GPT models in Foundry** for flexible, custom vision solutions, and **Content Understanding** for a managed generative solution that returns structured insights in a predefined or user-defined format.

Write component fields precisely: "Is the motor's safety cover present? Present, Missing or NotVisible" (`classify`) beats "describe the motor".

> **Exam trap.** A requirement for exact pixel coordinates isn't met by a chat model's description ("in the upper-left corner"). Read the requirement: positions described in words, a classification per component, or true bounding boxes lead to different answers.

<!-- section: key-points -->
## Key points

- Multimodal model = prompt-driven image understanding; Content Understanding = analyzers with a schema, for repeatable structured output.
- Images: `input_image` (Responses) or `image_url` (Chat Completions); public URL, base64 data URL or `file_id`; private images go as base64.
- `detail`: `low` for speed and cost, `high` for small text, `auto` by default.
- Captions and alt text are prompts plus schemas; alt text: purpose, 150 characters maximum, no "Image of", `alt=""` for decorative images, long description for charts.
- Grounded visual answers: restrict to the image, return evidence, allow "can't determine".
- Analyzer = `baseAnalyzerId` + `config` + `fieldSchema` + `models`; methods `generate`, `classify`, `extract` (documents only).
- Video: WEBVTT transcript, key frames, shots; `enableSegment` + one `contentCategories`; about 1 frame per second.
- Pro mode (preview, `2025-05-01-preview`): reasoning, several documents, reference data, documents only; agentic mode in the current preview. `contentCategories`: document and video analyzers only.
