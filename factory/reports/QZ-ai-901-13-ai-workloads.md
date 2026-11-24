# QZ-ai-901-13-ai-workloads — doubts and notes

## Chapter out of date or incomplete against current Learn (chapters not edited)

- **Azure Vision is now legacy (vision section).** The chapter says "Among Foundry Tools, Azure Vision provides prebuilt image analysis, including reading text (OCR) and detecting faces" with no caveat. The current page "What is Azure Vision in Foundry Tools?" (`azure/ai-services/computer-vision/overview`) labels **Image Analysis (legacy)** and **OCR (legacy)**. It also says that Image Analysis 4.0 is deprecated and will retire on **September 25, 2028**, with a migration guide. Face is still listed without a notice. The quiz never uses Azure Vision as an answer.
- **Azure Language features retiring in 2029 (text analysis section).** Key phrase extraction, sentiment analysis and opinion mining, and summarization each carry a notice on their overview pages: "retires from Azure Language on March 31, 2029". The notices recommend directing new projects to Microsoft Foundry models. Language detection and NER pages carry no notice. The chapter presents Azure Language as the deterministic option for pipelines without mentioning this. That isn't wrong yet, but a sentence would help. The quiz tests the techniques themselves. Only Q2 (language detection, no notice) names Azure Language.
- **Document summarization is preview** ("Document (Preview)" on "What is summarization?"). The chapter doesn't mention it, and the quiz doesn't use it.
- **Learn's split of text analysis.** The training unit "Understand text analysis in Foundry" names only language detection and PII detection as Azure Language capabilities. It presents key phrases, entities, sentiment and summarization as tasks of a general-purpose model. The chapter's wording is compatible with this.
- **Video extraction pipeline.** The chapter's video row (transcription, key frames, shot detection) matches "Azure Content Understanding in Foundry Tools video overview". That page currently shows a preview banner for API `2026-06-01-preview`. The CU overview says `2025-11-01` is GA for documents, images, audio and video. Custom segmentation (`enableSegment` / `contentCategories`) is described there. Whether segmentation is GA isn't stated, so Q7 avoids it: the camera writes one file per hour.

## Unverified or weakly sourced facts used

- **Q7 (key frames, then a generated field, to count visitors).** The Learn video overview says that key frame extraction feeds field extraction and that a generative model fills the fields. Learn's information-extraction intro gives "estimate visitor volumes by analyzing video footage" as a scenario. No page shows a visitor-count schema on video. The audio/video unit shows an attendee count from a conference-room camera image.
- **Q5 (image-to-image to keep the same character in new poses).** The "Image generation models" unit lists text-to-image, image-to-image (GPT-Image-1.5), variations and editing (GPT-Image-1). Pose consistency isn't discussed. The answer rests on the existing image being the input, and the text-to-image distractor is wrong only because it lacks that input.
- **Q2.** The Learn training unit writes "ISO 6391 code" (typo). The language detection overview confirms ISO 639-1 plus a confidence score.

## Facts verified (pages fetched 2026-11-24)

- **Agent = model + instructions + tools.** Tools are callable capabilities such as searching, querying a database or calling an API ("Creating an agent"). Used in Q1, Q10.
- **Virtual agents as generative AI.** "Customer Support: … AI-powered virtual agents that can understand and respond to customer inquiries in natural language" is listed among generative AI use cases (module Introduction). Used in Q3.
- **PII detection** finds names, phone numbers, email and street addresses, and can redact them. **Sentiment** returns positive/neutral/negative labels with scores. **Key phrases** returns the main concepts. Used in Q6.
- **Speech.** Real-time transcription is for streams and live speakers. Batch transcription is asynchronous, for stored files, and runs best-effort. TTS needs the text and the voice. Neural voices give natural intonation. Custom voices are used with the text-to-speech API ("Speech recognition", "Speech synthesis"). Used in Q4, Q9.
- **Vision vs generation.** Vision-enabled models describe images and answer questions about them. Image-generation models create and edit images ("Multimodal models for image analysis", "Image generation models"). Used in Q8.

## Other notes

- **Mock overlap.** The bank has about 70 questions on 1.3.1–1.3.5 and covers nearly every recall decision. The quiz uses new scenarios and less-used decisions:
  - what language detection *returns*, where the bank asks which capability to use;
  - the "virtual agent" lure, which is still generative AI;
  - image-to-image to keep an existing character;
  - the PII + sentiment + key phrases combination;
  - counting visitors from video key frames;
  - "write a description from a photo", which needs a vision model even though content is created;
  - transcript vs data fields from the same recordings.
- **Q9 reuses known decisions.** It combines three of them (real-time captions, batch for archives, neural voice), each tested alone in the bank, into one three-part choice.
- **Reference titles.** They use the page H1, as the AI-901 bank does.
