Azure Content Understanding in Foundry Tools turns unstructured content, such as documents, images, audio and video, into structured data that an application can store, search or process. The exam asks which analyzer fits a type of content, what a schema is for, and how a short client application gets its results.

<!-- section: documents-and-forms | objectives: 2.4.1 -->
## Extracting information from documents and forms

Content Understanding always works in three steps: you submit the content; the service analyzes it with optical character recognition (OCR), speech recognition and generative AI models; it returns a structured result, in Markdown and in JSON.

Three notions carry the whole service:

| Notion | Meaning |
| --- | --- |
| **Analyzer** | The unit that takes the content, applies the analysis and produces the result. It is prebuilt or custom, and it applies the same logic to every file |
| **Schema** | The list of the fields to extract and how they are structured. Fields can be nested: an `Items` collection where each item has a description, a unit price, a quantity and a line total |
| **Field** | A named value in the result, with its type and, for documents, a confidence score between 0 and 1 |

The schema is applied **semantically**: "Invoice No.", "Invoice #" or an unlabeled number at the top of the page can all fill the invoice number field, because the analyzer looks for the meaning, not for a fixed label or position.

| Analyzer | Returns | Use it for |
| --- | --- | --- |
| `prebuilt-read` | The text: words and paragraphs (OCR) | Reading printed or handwritten text |
| `prebuilt-layout` | The text and its structure: paragraphs, tables, sections | Keeping the layout of a document |
| `prebuilt-invoice` | Invoice fields: vendor, customer, dates, items, totals | Invoices, without defining a schema |
| `prebuilt-receipt` | Receipt fields | Sales receipts, expense claims |
| Custom analyzer | The fields of your own schema | A form or a document type that no prebuilt analyzer covers |

In the Foundry portal, the Content Understanding playground lets you pick an analyzer, run it on a sample or on your own file, and read the result: the extracted fields, the Markdown version of the content and the raw JSON.

> **Exam trap.** OCR and layout analyzers return what is written, not what it means: the text of an invoice, but not "the total is 1585.98". To get named values, use an analyzer with a schema, prebuilt (`prebuilt-invoice`) or custom. Field extraction relies on a generative model deployed in the Foundry resource; the read and layout analyzers don't need one.

<!-- section: images | objectives: 2.4.2 -->
## Extracting information from images

For an image, there is often no text to read: the analyzer looks at the picture itself. You define a schema whose fields have a name, a description and a type, and a generative model fills them in from what it sees.

| Scenario | Fields of the schema |
| --- | --- |
| A photo of a meeting room | Location, in-person attendees, remote attendees, total attendees |
| A chart from a business report | Type of chart, title, trend |
| A part on a production line | Defect present, type of defect |
| A shelf in a store | Products detected, count, empty slots |

The prebuilt analyzer `prebuilt-imageSearch` generates a description of the image, useful to make a collection of images searchable.

> **Exam trap.** Image analyzers aren't meant for images that are mostly text. For a scanned form or a photographed receipt, the main content is text: use a document analyzer.

<!-- section: audio-and-video | objectives: 2.4.3 -->
## Extracting information from audio and video

| | Audio | Video |
| --- | --- | --- |
| Content extraction | Transcription of the speech, with the speakers separated | Transcription of the speech, key frames and shot detection |
| Field extraction | Fields generated from the transcript: summary, topics, sentiment | Description of each segment and fields generated from the images and the speech |
| Prebuilt analyzers | `prebuilt-audioSearch`: transcript and summary; `prebuilt-callCenter`: agent and customer roles, summary, sentiment, topics | `prebuilt-videoSearch`: segments with transcript and description |
| Typical uses | Voicemail and call analysis, meeting recordings, podcasts | Recorded meetings, training videos, media libraries |

A schema for voicemail could ask for the caller, a summary of the message, the requested actions, the callback number and other contact details. For the message "Hi, this is Ava from Contoso... call me back on 555-12345", the analyzer returns the caller "Ava from Contoso" and the callback number "555-12345" as separate fields, in addition to the transcript.

For a recorded meeting, a schema can ask for the attendance, who spoke and what they said, a summary of the discussion and the list of assigned actions.

> **Exam tip.** Speech recognition alone gives a transcript. Content Understanding gives the transcript and the fields of a schema. If the question wants "the callback number" or "a summary of each call" as data, the answer is a Content Understanding audio analyzer.

<!-- section: client-app | objectives: 2.4.4 -->
## A lightweight application with Content Understanding

The Python SDK is the `azure-ai-contentunderstanding` package. The client needs the endpoint of the Foundry resource (`https://<resource>.services.ai.azure.com/`) and a credential: a key, or Microsoft Entra ID with `DefaultAzureCredential`.

```text
from azure.ai.contentunderstanding import ContentUnderstandingClient
from azure.core.credentials import AzureKeyCredential

client = ContentUnderstandingClient(endpoint=endpoint, credential=AzureKeyCredential(key))

poller = client.begin_analyze(
    analyzer_id="prebuilt-invoice",
    inputs=[{"url": "https://<host>/invoice.pdf"}],
)
result = poller.result()

for content in result.contents:
    print(content.markdown)
    print(content.fields)
```

| Element | Role |
| --- | --- |
| `analyzer_id` | The analyzer to run: a prebuilt identifier or the name of a custom analyzer |
| `inputs` | The content to analyze, here the URL of a file |
| `begin_analyze(...)` | Starts the analysis and returns a poller immediately |
| `poller.result()` | Waits until the analysis is finished and returns the result |
| `content.markdown` | The content as Markdown: the text of a document, the transcript of a recording |
| `content.fields` | The extracted fields, each with its type, its value and, for documents, its confidence |

The analysis is **asynchronous**: the service accepts the request, works, and makes the result available later. The SDK hides the waiting behind `poller.result()`. An application that calls the REST API directly must poll the URL returned in the `Operation-Location` header until the status is `Succeeded`.

The same code handles every type of content: to analyze a recording instead of an invoice, change `analyzer_id` to `prebuilt-audioSearch` and give the URL of an audio file.

> **Exam trap.** `begin_analyze` doesn't return the fields; it returns a poller. The fields are available only after `poller.result()`. A code completion question that reads `fields` straight after `begin_analyze` is missing that step.

<!-- section: key-points -->
## Key points

- Content Understanding: content in, structured Markdown and JSON out, for documents, images, audio and video.
- Analyzer: prebuilt or custom. Schema: the fields you want and their structure, matched by meaning.
- `prebuilt-read` and `prebuilt-layout` return text and structure; `prebuilt-invoice` and `prebuilt-receipt` return fields.
- Images: fields generated from what the picture shows; mostly-text images go to a document analyzer.
- Audio and video: transcript plus generated fields such as a summary; `prebuilt-audioSearch`, `prebuilt-callCenter`, `prebuilt-videoSearch`.
- Client: `ContentUnderstandingClient`, `begin_analyze(analyzer_id=..., inputs=...)`, `poller.result()`, then `contents`, `markdown` and `fields`.
