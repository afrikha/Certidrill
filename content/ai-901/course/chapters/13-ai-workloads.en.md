An AI workload is a family of problems that AI solves in a recognizable way. The exam gives a scenario in one sentence and asks which workload, which technique or which capability it calls for. Learn what goes in and what comes out of each one.

<!-- section: workload-scenarios | objectives: 1.3.1 -->
## Recognizing a workload in a scenario

| Workload | What it does | Typical scenarios |
| --- | --- | --- |
| **Generative AI** | Creates new content (text, code, images) in answer to a prompt | Drafting product descriptions, answering customers in natural language, generating code, building quizzes for students |
| **Agentic AI** | An agent combines a model, instructions and tools to carry out tasks and take actions | An assistant that searches the expense policy, then files the claim; a support agent that looks up an order and updates it |
| **Text analysis** | Extracts meaning from written text | Finding dissatisfaction in reviews and support tickets, pulling medications out of clinical notes, summarizing contracts |
| **Speech** | Understands spoken input and produces spoken output | Dictating clinical notes, transcribing calls, captioning videos, voice assistants |
| **Computer vision** | Interprets images, video and camera feeds; visual generative AI creates new images | Detecting defects on an assembly line, highlighting anomalies in X-rays, spotting empty shelves, reading text in a photo |
| **Information extraction** | Turns unstructured content into structured, machine-readable data | Amounts from scanned receipts, fields from invoices and forms, insights from recorded calls, visitor counts from video footage |

> **Exam trap.** Generative AI answers; agentic AI acts. If the scenario only needs content to be produced from a prompt, it is generative AI. If the solution must use tools, such as searching a knowledge source or updating a system, it is agentic AI.

<!-- section: text-analysis-techniques | objectives: 1.3.2 -->
## Text analysis techniques

Take this review: "I had a fantastic meal at the diner in Seattle on Saturday. Our waiter, Pete, was friendly and efficient."

| Technique | What it returns | On the example |
| --- | --- | --- |
| **Key phrase extraction** (keyword extraction) | The main concepts of the text; useful to index and search documents | "fantastic meal", "diner", "waiter" |
| **Entity detection** (named entity recognition) | Items of a known category, sometimes with a subtype: person, location, organization, date and time, quantity | Pete (person), Seattle (location), Saturday (date) |
| **Sentiment analysis** | Whether the text is positive, negative or neutral, for the whole document or sentence by sentence | Positive |
| **Summarization** | A shorter text that keeps the most important information | "A customer enjoyed the food and the service at a Seattle diner." |

Two related techniques come from Azure Language in Foundry Tools: **language detection** returns the language of a text with a confidence score, and **PII detection** finds personal details such as names, phone numbers and addresses, and can redact them.

There are two ways to apply these techniques. A general-purpose model does them all from a prompt and can combine them in one conversation, but its wording can vary from one call to the next. Azure Language uses purpose-built analyzers that return structured, deterministic output, which suits automated pipelines.

<!-- section: speech-capabilities | objectives: 1.3.3 -->
## Speech recognition and speech synthesis

| | Speech recognition | Speech synthesis |
| --- | --- | --- |
| Also called | Speech-to-text (STT) | Text-to-speech (TTS) |
| Input | Spoken audio, from a microphone or an audio file | Text, and the voice to use |
| Output | Text | Audio, played on a speaker or written to a file |
| How it works | An acoustic model converts the audio into phonemes; a language model maps the phonemes to words | The text is broken into words, then phonetic sounds, then synthesized as audio with a voice, a speaking rate, a pitch and a volume |
| Features in Azure Speech | Real-time transcription of a stream; batch transcription of stored recordings, processed asynchronously | Predefined voices in many languages; neural voices with natural intonation; custom voices |
| Typical uses | Captions, call transcripts, dictation, voice commands | Reading messages aloud, spoken answers of an assistant, announcements |

Azure Speech also offers **speech translation**.

> **Exam trap.** Look at the direction. "Generate captions" or "transcribe a call" is recognition, even though no voice is produced. "Read the answer aloud" is synthesis. A neural voice is a synthesis feature; batch transcription is a recognition feature.

<!-- section: vision-capabilities | objectives: 1.3.4 -->
## Computer vision and image generation

The two families go in opposite directions:

| | Computer vision (image analysis) | Image generation |
| --- | --- | --- |
| Input | An image, usually with a text instruction | A text description, sometimes with an image to edit |
| Output | Text or structured data about the image | A new image |
| Capabilities | Describe the content of an image; answer questions about objects, text or scenes; read text in the image; interpret charts, diagrams, screenshots and documents | Text-to-image; image-to-image and editing of an existing image; variations |
| Models | Multimodal (vision-enabled) models that accept text and images in the same prompt | Image-generation models such as the GPT-Image-1 family or FLUX |

Video-generation models (Sora) create short videos from a text prompt, and can take an image as a starting point. Among Foundry Tools, Azure Vision provides prebuilt image analysis, including reading text (OCR) and detecting faces.

> **Exam trap.** A vision-enabled chat model reads images; it doesn't create them. An image-generation model creates images; it doesn't describe them. "Describe", "identify", "read" point to analysis; "create", "draw", "design" point to generation.

<!-- section: information-extraction-techniques | objectives: 1.3.5 -->
## Extracting information from text, images, audio and video

| Content | Techniques | Example of result |
| --- | --- | --- |
| **Text and documents** | Optical character recognition (OCR) reads printed and handwritten text; layout analysis finds paragraphs and tables; field extraction maps values to the fields of a schema | Vendor, date and total of an invoice |
| **Images** | A model describes the image, classifies it or fills in the fields you define | Type of chart, defects seen on a part, products on a shelf |
| **Audio** | Speech recognition transcribes the recording and separates the speakers; a model then generates fields such as a summary | Caller, callback number and requested actions of a voicemail |
| **Video** | Transcription of the speech, extraction of key frames and detection of shots; a model then describes each segment and fills in fields | Attendance, speakers and summary of a recorded meeting |

OCR alone returns text: it doesn't know that "1585.98" is the invoice total. **Field extraction** applies a schema, a list of the fields you want and their structure, and returns named values, usually as JSON. In Foundry, Azure Content Understanding does this for the four types of content.

<!-- section: key-points -->
## Key points

- Generative AI creates content; an agent adds tools and actions.
- Key phrases: main concepts. Entities: people, places, organizations, dates, quantities. Sentiment: positive, negative, neutral. Summarization: shorter text.
- Speech recognition: audio to text (real time or batch). Speech synthesis: text to audio (voices, neural voices).
- Image analysis: image to text, with a multimodal model. Image generation: text to image, with an image-generation model.
- Information extraction returns structured fields; OCR alone returns text.
