# QZ-ai-901-22-text-speech — doubts and notes

File: `content/ai-901/quizzes/22-text-speech.yaml`, 10 questions. Objectives: 2.2.1 ×3 (Q2, Q4, Q6), 2.2.2 ×3 (Q3, Q7, Q10), 2.2.3 ×4 (Q1, Q5, Q8, Q9). Formats: single ×4, yesno ×3, dragdrop, hotarea, dropdown. Check: `0 problem(s), 0 warning(s)`.

## Chapter vs current Learn (chapter not edited)

- **"Predictable cost" (spoken-prompts decision table).** The chapter says Azure Speech fits "Transcribe large volumes of audio with predictable cost, or in batch". None of the Learn pages I fetched mentions cost. The batch part is supported: the Speech recognition unit says batch transcription is for stored recordings, reached through a SAS URI, with asynchronous results. Q10 rests only on the batch part.
- **The audio quickstart uses a preview API version.** The chapter's audio request matches "Quickstart: Get started with Azure OpenAI audio generation". That quickstart's client is `AzureOpenAI(..., api_version="2025-01-01-preview")`, not the `/openai/v1/` `OpenAI` client the chapter uses for text. The models (`gpt-audio`, `gpt-audio-mini`) are not labeled preview. The chapter doesn't show how to create the client for audio, and the quiz doesn't depend on it (Q7 says `client` is an `AzureOpenAI` object).
- **Azure Language capabilities.** The training unit "Understand text analysis in Foundry" shows only language detection and PII detection as Azure Language features. It lists sentiment, key phrases, NER and summarization under general-purpose models. The chapter matches this. The Language MCP unit still mentions NER and sentiment through the MCP server. The quiz uses only `detect_language` and `recognize_pii_entities`.
- The rest of the chapter matches the fetched pages: endpoints, `.env` loading, `[0]`, the 0–1 confidence score, the Speech objects, `recognized` as final results, the playground paths, and the MCP tool with no separate Language resource.

## Facts used beyond a single sentence of Learn

- **Q3: MP3 output with WAV input.** The quickstart lists mp3 among the supported output formats (wav, mp3, flac, opus, pcm16, aac). The `input_audio` format of the sample is "wav". The page doesn't list the supported input formats, so the question only declares WAV as the input.
- **Q4 s3: same codes at every run.** This rests on "structured, deterministic output" ("Understand text analysis in Foundry").
- **Q7 s2: no audio without `modalities`.** This comes from the chapter's table and the quickstart. The quickstart's follow-up request omits `modalities` and `audio` and reads `message.content`. The page doesn't state "text only by default" in one sentence.
- **Q9 p2: the voice-name line has no effect on recognition.** This follows from the chapter's exam trap: an application that transcribes a voicemail doesn't need a voice name. No Learn sentence states it.

## Overlap with the mock bank

The bank has 54 questions on 2.2.1–2.2.3 and covers almost every single decision in the chapter. The quiz uses angles the bank doesn't ask:
- the two `format` fields (input vs output);
- one `detect_language` call on a list, plus determinism;
- adding synthesis to an existing recognition app;
- Language vs model when the capability is the same and only the output form differs;
- a text-only audio request with a custom deployment name;
- a mixed recognizer/synthesizer program (what `notes.wav` contains);
- a line-selection fix of a voicemail app;
- a three-tool pipeline (batch transcription, audio model, PII).

Three stems were first refused by the similarity checker (0.48–0.59), against `ai901-2a-deployment-facts-yn`, `ai901-2b-audio-yn-request-code` and `ai901-2c-speech-continuous-code-yn`, because of the Yes/No boilerplate. I lengthened their scenarios.

## French

- « module de reconnaissance » for `SpeechRecognizer` in explanations.
- « terrain de jeu Language » / « terrain de jeu des agents ».
- « réponse parlée » and « texte masqué », as in chapter 22.
- Playground names (Azure Speech - Speech to Text / Text to Speech) and portal labels stay in English.

## Pages fetched (2026-11-24)

Training units:
- Create a client application that analyzes text
- Understand text analysis in Foundry
- Use Azure Language with an agent
- Speech recognition
- Speech synthesis

Docs:
- Quickstart: Get started with Azure OpenAI audio generation
