Text analysis in Foundry combines two approaches. A **language model** with a prompt and a JSON schema extracts, classifies, summarizes and translates almost anything, in the shape your application needs. **Foundry Tools** (Azure Language, Azure AI Content Safety, Azure Translator) do one task with a predictable, documented output. Exam questions give constraints (a fixed output schema, PII to redact, a formal tone in Spanish, a compliance summary) and ask which one to use and how to call it.

<!-- section: extraction-prompting | objectives: 4.1.1 -->
## Extracting entities, topics, summaries and structured JSON

**Structured outputs** make a model follow a JSON schema you supply. The older **JSON mode** guarantees valid JSON but not adherence to a schema.

```text
from pydantic import BaseModel
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://ai.azure.com/.default"
)
client = OpenAI(
    base_url="https://contoso-ai.openai.azure.com/openai/v1/",
    api_key=token_provider,
)

class Ticket(BaseModel):
    product: str
    topics: list[str]
    customer_name: str | None
    summary: str

response = client.responses.parse(
    model="text-analysis",               # deployment name
    instructions="Extract the fields from the support email. Use null when absent.",
    input=email_text,
    text_format=Ticket,
)
ticket = response.output_parsed
```

| API | How the schema is passed | Result |
| --- | --- | --- |
| Responses | `text_format=Model` with `responses.parse`, or `text={"format": {"type": "json_schema", "name": ..., "schema": ..., "strict": True}}` | `response.output_parsed` |
| Chat Completions | `response_format=Model` with `client.beta.chat.completions.parse`, or `{"type": "json_schema", "json_schema": {...}}` | `completion.choices[0].message.parsed` |

Schema rules in strict mode:

- Every field is **required**; emulate an optional field with a null union (`"type": ["string", "null"]`).
- `additionalProperties: false` on every object; the root object can't be `anyOf`.
- Up to 100 object properties and five levels of nesting; keys come back in schema order.
- Not supported: `minLength`, `maxLength`, `pattern`, `format`, `minimum`, `maximum`, `minItems`, `maxItems` and similar constraints. Validate those in code.
- Not compatible with parallel function calls (set `parallel_tool_calls` to `false`).
- Check the `refusal` field: a model that declines returns a refusal instead of the schema.
- Not supported with bring-your-own-data scenarios, Assistants or Foundry Agent Service, or `gpt-audio` and `gpt-audio-mini`.

**Azure Language in Foundry Tools** classifies its features in two groups:

| Group | Features |
| --- | --- |
| Core: recommended for new development | PII detection (text, conversation, document), language detection, named entity recognition (prebuilt and custom), Text Analytics for health |
| Legacy: supported for existing implementations | Key phrase extraction, sentiment analysis and opinion mining, summarization (text, conversation, call center), entity linking, custom text classification, CLU, custom question answering |

```text
from azure.ai.textanalytics import TextAnalyticsClient
from azure.identity import DefaultAzureCredential

language = TextAnalyticsClient(endpoint=language_endpoint, credential=DefaultAzureCredential())

entities = language.recognize_entities([email_text])[0]
for entity in entities.entities:
    print(entity.text, entity.category, entity.confidence_score)
```

| Requirement | Choice |
| --- | --- |
| Fields specific to your business (product, issue type, promised date) in one JSON object | Model with structured outputs |
| Topics and a summary in your own format | Model with structured outputs |
| Standard entity categories (person, location, organization) with confidence scores | Azure Language NER |
| An agent that calls language features as a tool | The Azure Language MCP server (preview) from the Foundry Tool Catalog |

> **Exam trap.** "The output must always match this JSON schema" is **structured outputs** with `strict` set to true, not JSON mode and not a prompt saying "answer in JSON".

<!-- section: sentiment-safety | objectives: 4.1.2 -->
## Detecting sentiment, tone, safety issues and sensitive content

| Signal | Tool | Output |
| --- | --- | --- |
| Sentiment (positive, neutral, negative) | Azure Language sentiment analysis, or a model | Labels at sentence and document level, confidence scores 0 to 1 |
| Opinion about each aspect ("battery great, screen dim") | Azure Language opinion mining (aspect-based sentiment), or a model with a schema | Sentiment per product attribute |
| Tone (formal, sarcastic, urgent, threatening) | A model with an `enum` field in the schema | One label from your list, plus a reason |
| Harmful content (hate, sexual, violence, self-harm) | Content Safety text API, or the guardrails of a deployment | Severity per category |
| Terms your policy forbids | Content Safety blocklists | `blocklistsMatch` |
| Personal data (names, phone numbers, account numbers) | Azure Language PII detection | Entities with categories and a redacted text |

Sentiment analysis and opinion mining **retire from Azure Language on March 31, 2029**: Microsoft directs new projects to models in Microsoft Foundry. Tone has no dedicated API: it's a classification you define for a model.

```json
{
  "text": "Your product is a scam and I will make you pay for it.",
  "categories": ["Hate", "Violence"],
  "blocklistNames": ["fabrikam-banned-terms"],
  "haltOnBlocklistHit": false,
  "outputType": "EightSeverityLevels"
}
```

This body goes to `POST {endpoint}/contentsafety/text:analyze?api-version=2024-09-01`. `outputType` is `FourSeverityLevels` (0, 2, 4, 6) or `EightSeverityLevels` (0 to 7). With `haltOnBlocklistHit` set to true, a blocklist match stops the harm analysis. The response lists `blocklistsMatch` and `categoriesAnalysis` (category and severity).

**PII detection** covers text, conversations (chats, transcripts) and documents:

```text
pii = language.recognize_pii_entities([email_text])[0]
print(pii.redacted_text)
for entity in pii.entities:
    print(entity.category, entity.confidence_score)
```

Text PII detection (GA) also supports a confidence threshold, excluded values, entity synonyms and the `syntheticReplacement` redaction policy, which replaces detected values with realistic fake ones. On a model deployment, the guardrails include a **Personally identifiable information** control (preview) that scans model outputs, beside protected material (text and code) and groundedness (preview). Groundedness detection in Azure OpenAI retires on April 30, 2027.

> **Exam trap.** Content Safety detects **harm**; it doesn't detect personal data. To find and redact phone numbers or account numbers, use Azure Language **PII detection**.

<!-- section: translation | objectives: 4.1.3 -->
## Translating text with Azure Translator or LLM-powered flows

**Azure Translator in Foundry Tools** is a neural machine translation (NMT) service.

| Feature | Use |
| --- | --- |
| Text translation v3 (GA) | Real-time text translation; dynamic dictionary and "prevent translation" markup |
| Text translation `2026-06-06` (GA, latest) | Same operation with a choice of engine: NMT by default, or a Foundry LLM deployment; tone, gender and adaptive custom translation |
| Document translation, asynchronous | Batches of complex files with structure and format preserved; source and target Blob containers |
| Document translation, synchronous | One file, optional glossary, no Blob storage; the translated file comes back in the response |
| Custom Translator | Custom NMT models for domain and industry terminology and style |

```json
{
  "inputs": [
    {
      "text": "The doctor is available next Monday. Do you want to book an appointment?",
      "language": "en",
      "targets": [
        {
          "language": "es",
          "deploymentName": "gpt-translation",
          "tone": "formal",
          "gender": "female"
        },
        { "language": "fr" }
      ]
    }
  ]
}
```

This body goes to `POST https://api.cognitive.microsofttranslator.com/translate?api-version=2026-06-06`, or to `https://{resource}.cognitiveservices.azure.com/translator/text/translate?api-version=2026-06-06`. The response is an array `value` with `translations` per target, and `detectedLanguage` when `language` was omitted.

| Target property | Values |
| --- | --- |
| `deploymentName` | `general` (default, NMT), the name of your LLM deployment, or the category ID of a Custom Translator model |
| `tone` | `formal`, `informal`, `neutral` (LLM) |
| `gender` | `female`, `male`, `neutral` (LLM) |
| `referenceTextPairs` / `adaptiveDatasetId` | Up to five source and target examples, or an adaptive dataset index: few-shot translation in your style. If pairs are provided, the dataset ID is ignored |
| `allowFallback` | Default true: if the chosen model doesn't support the language pair, the service falls back to a general system; false returns an error |
| `profanityAction` | `NoAction` (default), `Marked`, `Deleted` |

Other facts:

- An LLM engine requires a **Microsoft Foundry resource**, and isn't available when the Translator resource uses a **private endpoint**.
- Limits per request: NMT 1,000 array elements of up to 50,000 each; LLM 50 elements of up to 5,000 each.
- Billing: NMT per source character; LLM per input and output token, at Azure OpenAI prices.
- Adaptive custom translation builds a bilingual index in minutes from 5 to 10,000 prealigned segment pairs (250 characters maximum per segment; longer segments are rejected). Its playground is GA; its dataset API (v1.0) is in preview.
- Version `2026-06-06` removed the Detect, BreakSentence, Dictionary Lookup and Dictionary Examples operations: detect a language with Azure Language language detection, or omit `language` in the translate request.

An **LLM-powered translation flow** without Translator is a prompt: target language, glossary, tone and "keep product names, codes and placeholders unchanged" in the instructions, and a structured output when several languages come back together.

| Requirement | Choice |
| --- | --- |
| High volume, lowest cost per character, predictable output | Translator, NMT |
| Formal or informal register, or gendered forms | Translator `2026-06-06` with an LLM deployment |
| Match the style of approved past translations | `referenceTextPairs` or an adaptive dataset |
| Translate Word or PDF files keeping their layout | Document translation |
| Translate and summarize in one step | A model prompt with structured output |

> **Exam trap.** `tone` and `gender` apply only when the target uses an **LLM deployment**. With the default `general` engine (NMT), they can't change the result.

<!-- section: domain-customization | objectives: 4.1.4 -->
## Customizing outputs for domain tasks

Domain tasks such as **compliance summarization** (what a contract, a call or a policy change means for a regulation) and **domain extraction** (clauses, dosages, part numbers) are mostly solved without training:

1. **Instructions** that define the role, the audience and the rules: "Summarize for the Woodgrove compliance team. Cite the clause number for every obligation. Don't give legal advice."
2. **Domain vocabulary**: definitions and abbreviations in the instructions, a glossary for translation.
3. **Few-shot examples**: one or two input and output pairs showing the expected level of detail.
4. **A schema** with domain `enum` values, so the output can feed a workflow.
5. **Grounding**: put the reference text (the regulation, the policy) in the prompt or retrieve it with RAG, and require citations.
6. **Evaluation**: a test set of real documents checked by domain experts before changing the prompt or the model.

```json
{
  "type": "object",
  "properties": {
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "clause": { "type": "string" },
          "obligation": { "type": "string" },
          "riskLevel": { "type": "string", "enum": ["Low", "Medium", "High"] }
        },
        "required": ["clause", "obligation", "riskLevel"],
        "additionalProperties": false
      }
    },
    "requiresLegalReview": { "type": "boolean" }
  },
  "required": ["obligations", "requiresLegalReview"],
  "additionalProperties": false
}
```

| Symptom | Fix |
| --- | --- |
| The output format varies | Structured outputs with `strict` set to true |
| Domain terms are misused | Definitions and few-shot examples in the instructions |
| Claims don't appear in the source | Grounding with the source text and mandatory citations |
| Wrong category labels | An `enum` with a one-line definition per value |
| Prompting is consistent but can't reach the required style or behavior | Fine-tuning a model, after the prompt-based options |

A Foundry Tool can stay in the pipeline next to the model: Azure Language PII detection redacts the document before it goes to the model, and Translator brings foreign-language contracts into the working language first.

> **Exam trap.** Fine-tuning is not the first answer for "use our terminology" or "always return these fields". Instructions, examples, a strict schema and grounding come first; they're cheaper and change in minutes.

<!-- section: key-points -->
## Key points

- Structured outputs (`strict`) enforce a JSON schema; JSON mode only guarantees valid JSON. All fields required, `additionalProperties: false`.
- `responses.parse` with `text_format` returns `output_parsed`; Chat Completions uses `response_format` and `message.parsed`.
- Azure Language core: PII, NER, language detection, Text Analytics for health; key phrases, sentiment and summarization are legacy; sentiment retires March 31, 2029.
- Tone = a model classification; harm = Content Safety (severities, blocklists); personal data = Azure Language PII detection.
- Translator `2026-06-06`: `inputs` and `targets`; `deploymentName` `general` = NMT; `tone` and `gender` need an LLM deployment and a Foundry resource; no LLM with a private endpoint.
- Document translation: asynchronous with Blob containers, or synchronous for one file.
- Domain outputs: instructions, vocabulary, examples, schema with `enum`, grounding, evaluation; fine-tuning last.
