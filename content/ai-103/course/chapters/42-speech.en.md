Azure Speech in Foundry Tools gives an agent ears and a voice: speech to text, text to speech, speech translation and, with the Voice Live API, a complete speech-to-speech loop around a model or a Foundry agent. Audio-capable models add a second path, where the model hears the audio itself. The exam asks which path fits the constraints (latency, cost, custom vocabulary, keyless authentication) and how a short Python or JSON configuration wires it.

<!-- section: stt-tts-workflows | objectives: 4.2.1 -->
## Speech to text and text to speech in an agent workflow

A voice interaction with an agent is a loop: capture audio, turn it into text, let the agent reason, turn the answer back into audio. Each half has several modes.

| Requirement | Speech to text mode | Access |
| --- | --- | --- |
| Live captions, dictation, a caller talking to an agent now | **Real-time**, with intermediate results while the person speaks | Speech SDK, Speech CLI, REST API for short audio |
| A voicemail or a meeting file, result needed quickly with predictable latency | **Fast transcription**, synchronous, faster than real time | REST API |
| Thousands of stored call recordings, results collected later | **Batch transcription**, asynchronous | REST API, Speech CLI |

Fast transcription offers a choice of models: **Azure LLM Speech** (LLM-powered, stronger contextual and multilingual recognition, custom prompting, speech translation) or **Azure Transcribe** (general-purpose, with diarization, phrase lists, language identification and timestamps; the default when enhanced mode isn't enabled).

Features that decide many answers:

| Need | Feature |
| --- | --- |
| Who said what in a multi-speaker recording | **Diarization**, up to 35 speakers (more returns an error) |
| Product names or jargon misrecognized, no training wanted | **Phrase list**: likely words and phrases sent with the request |
| Unknown or mixed spoken language | **Language identification** |
| Two sides of a support call recorded on two channels | **Multichannel transcription** (preview), up to two channels |

In an application, the Speech SDK (`azure-cognitiveservices-speech`) does both halves:

```text
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(subscription=key, endpoint=endpoint)
speech_config.speech_recognition_language = "en-US"

# Listen: one utterance from the default microphone
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)
result = recognizer.recognize_once_async().get()
if result.reason == speechsdk.ResultReason.RecognizedSpeech:
    user_text = result.text
elif result.reason == speechsdk.ResultReason.NoMatch:
    print("No speech could be recognized")

agent_reply = ask_agent(user_text)  # your call to the model or the Foundry agent

# Speak: the answer on the default speaker
speech_config.speech_synthesis_voice_name = "en-US-Ava:DragonHDLatestNeural"
audio_out = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_out)
spoken = synthesizer.speak_text_async(agent_reply).get()
if spoken.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print("Answer spoken")
```

- `recognize_once_async()` returns after one utterance. For a conversation, use `start_continuous_recognition()` with the events `recognizing` (intermediate text), `recognized` (final text of a phrase), `canceled` and `session_stopped`, then `stop_continuous_recognition()`.
- The source language is a locale (`en-US`, `de-DE`) in `speech_recognition_language`.
- The voice is chosen by name. Neural voices also speak English, and multilingual voices speak the language of the input text. Finer control (style, rate, pitch, pauses) is written in SSML. Long-form text goes to batch synthesis.

> **Exam trap.** The quickstarts use a key in environment variables "for learning only". For a production agent, Microsoft recommends Microsoft Entra ID authentication with a managed identity; when a key is unavoidable, keep it in Azure Key Vault and rotate it.

<!-- section: voice-agents | objectives: 4.2.2 -->
## Speech as an agent modality and custom speech models

Chaining speech to text, a model and text to speech yourself works, but you write the audio plumbing and the user feels the latency of three hops. The **Voice Live API** is a fully managed speech-to-speech API for real-time voice agents: the application streams audio in and receives audio out (and optionally avatar video), over a WebSocket, without deploying the generative model yourself.

| Requirement | Do it yourself | Voice Live API |
| --- | --- | --- |
| Choice of generative model and voice | Yes | Yes |
| Noise suppression, echo cancellation, interruption and end-of-turn detection | No | Yes |
| Low engineering cost | No | Yes |
| Low latency perceived by the user | No | Yes |

The events are compatible with the Azure OpenAI Realtime API: the client sends `session.update` (configuration, usually first), `input_audio_buffer.append` (audio) and `response.create`; the server sends `session.updated`, `conversation.item.created`, `response.done`. A session configuration:

```json
{
  "type": "session.update",
  "session": {
    "instructions": "You are the Contoso Travel booking assistant. Be brief.",
    "turn_detection": { "type": "azure_semantic_vad_multilingual" },
    "input_audio_noise_reduction": { "type": "azure_deep_noise_suppression" },
    "input_audio_echo_cancellation": { "type": "server_echo_cancellation" },
    "input_audio_transcription": {
      "model": "azure-speech",
      "phrase_list": ["Contoso Miles", "SkyFlex fare"]
    },
    "voice": { "name": "en-US-Ava:DragonHDLatestNeural", "type": "azure-standard" }
  }
}
```

| Setting | Values to know |
| --- | --- |
| `turn_detection.type` | `server_vad` (default, audio volume); `semantic_vad` (only `gpt-realtime` and `gpt-realtime-mini`); `azure_semantic_vad` (mainly English) and `azure_semantic_vad_multilingual`, both usable with all models |
| `input_audio_transcription.model` | `azure-speech` (works with non-multimodal models and agents; supports phrase lists and custom speech); `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `whisper-1` (only with `gpt-realtime` models; no phrase list) |
| `voice.type` | `azure-standard` or `azure-custom` (custom voice: limited access, needs the deployment's `endpoint_id`) |

**Voice for a Foundry agent.** Voice Live can front an agent of Foundry Agent Service instead of a bare model: the Python client (`azure-ai-voicelive`) connects with the agent name and the project name, and the agent keeps its instructions and tools.

```text
from azure.identity.aio import AzureCliCredential
from azure.ai.voicelive.aio import connect

async with connect(
    endpoint=voicelive_endpoint,
    credential=AzureCliCredential(),
    api_version="2026-01-01-preview",
    agent_name="travel-agent",
    project_name="contoso-travel",
) as connection:
    ...
```

Only `agent_name` and `project_name` are required; `agent_version` pins a version (the latest is used otherwise) and `conversation_id` resumes a conversation. The voice settings can be stored in the agent's metadata rather than sent by the client.

> **Exam trap.** Key-based authentication isn't supported when Voice Live connects to an agent: agent mode requires Microsoft Entra ID.

**Custom speech.** The base model (a Universal Language Model) fits most audio. Measure it first with the **word error rate (WER)** against human transcripts; train a custom model when WER stays high on domain vocabulary or particular audio conditions.

| Training data | Improves |
| --- | --- |
| Plain text, structured text | Domain vocabulary and phrasing |
| Audio with human-labeled reference transcripts | Specific audio conditions (noise, accents, phone line) |
| Pronunciation | Custom pronunciations of words |
| Display text formatting | Inverse text normalization, rewrites, profanity filtering |

Order of operations: create a project, upload test data, train, inspect and measure WER, **deploy to a custom endpoint**, then call it. Except for batch transcription, a custom model can be used only through a deployed endpoint (hosting is billed); batch transcription can use it without one. A deployed model stays fixed until you update it, and models expire, so plan the update.

```text
speech_config = speechsdk.SpeechConfig(subscription=key, endpoint=endpoint)
speech_config.endpoint_id = "<custom speech endpoint id>"
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)
```

In Voice Live, custom speech is set in `input_audio_transcription.custom_speech`, a dictionary from locale to custom model ID. It works only with the `azure-speech` transcription model, and the model must be on the same Foundry resource that calls Voice Live.

> **Exam tip.** A handful of product names misrecognized: phrase list, no training, no endpoint. A whole domain vocabulary or a noisy environment, measured by WER: custom speech, deployed to an endpoint.

<!-- section: audio-reasoning | objectives: 4.2.3 -->
## Multimodal reasoning from audio inputs

A transcript keeps the words and loses the rest. An audio-capable model hears the recording itself and reasons about it in one call: tone, hesitation, background sounds, and what was said.

| Path | How | Use it when |
| --- | --- | --- |
| Transcribe, then prompt a text model | Speech to text (or `gpt-4o-transcribe`), then the transcript in the prompt | The words are enough; transcripts must be stored, searched or audited |
| Audio in the prompt | An audio model such as `gpt-audio` or `gpt-audio-mini`, Chat Completions API, an `input_audio` part | Reason about one recording (complaint, spoken question), answer in text or audio |
| Live speech-to-speech | A `gpt-realtime` model through the Realtime API or Voice Live | A conversation with interruptions and low latency |
| Structured fields from recordings | A Content Understanding audio analyzer (`prebuilt-callCenter`, custom) | The same fields from every call: summary, sentiment, topics |

```text
completion = client.chat.completions.create(
    model="gpt-audio-mini",
    modalities=["text"],
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Is the caller angry? Quote the sentence that shows it."},
            {"type": "input_audio", "input_audio": {"data": encoded_wav, "format": "wav"}},
        ],
    }],
)
print(completion.choices[0].message.content)
```

The audio travels as base64 with its format. `modalities=["text", "audio"]` with an `audio` setting (voice, format) asks for a spoken answer, returned in `message.audio.data`, with its text in `message.audio.transcript`.

> **Exam trap.** "Detect frustration in the caller's voice" can't be answered from a transcript alone: the audio must reach a model that accepts audio. Conversely, "keep a searchable transcript of every call at the lowest cost" doesn't need an audio model: batch transcription does it.

<!-- section: speech-translation | objectives: 4.2.4 -->
## Translating speech

| Requirement | Use |
| --- | --- |
| Live spoken input translated into one or more languages, as text and optionally as synthesized speech | **Speech translation** in Azure Speech (`TranslationRecognizer`) |
| Stored files transcribed and translated with context and a custom prompt | Fast transcription with **Azure LLM Speech** |
| Text already transcribed, translated by a dedicated service with predictable output | **Azure Translator** in Foundry Tools |
| Translation adapted in tone or register, or combined with a summary | A language model prompted on the transcript |

```text
translation_config = speechsdk.translation.SpeechTranslationConfig(
    subscription=key, endpoint=endpoint)
translation_config.speech_recognition_language = "en-US"
translation_config.add_target_language("fr")
translation_config.voice_name = "fr-FR-DeniseNeural"

recognizer = speechsdk.translation.TranslationRecognizer(
    translation_config=translation_config)
recognizer.synthesizing.connect(lambda evt: play(evt.result.audio))
result = recognizer.recognize_once_async().get()
if result.reason == speechsdk.ResultReason.TranslatedSpeech:
    print(result.text)
    print(result.translations["fr"])
```

- The source is a locale (`en-US`); targets are language codes (`fr`, `de`, `zh-Hans`), and `result.translations` is a dictionary keyed by those codes.
- `voice_name` adds a spoken translation, delivered as audio through the `synthesizing` event. This event-based synthesis works with a single target language whose voice matches it. To speak several translations, add several targets and synthesize each text yourself with a `SpeechSynthesizer` and a voice per language.
- Custom speech models also work with speech translation, for the recognition half.

> **Exam trap.** Neither `SpeechRecognizer` nor `SpeechConfig` translates, and `SpeechConfig` has no target language: translation needs `SpeechTranslationConfig` and `TranslationRecognizer`. Sending the transcript to Azure Translator is a second call, justified only when the text needs Translator features.

<!-- section: key-points -->
## Key points

- Real-time recognition for live audio, fast transcription for a file now, batch transcription for large stored volumes.
- Phrase list for a few terms; custom speech, measured by WER and deployed to an endpoint (`endpoint_id`), for a domain or an acoustic environment.
- Voice Live: managed speech-to-speech over WebSocket, `session.update`, noise suppression, echo cancellation, semantic end-of-turn detection; it can front a Foundry agent, with Microsoft Entra ID only.
- Audio-capable models reason on the audio itself; transcripts are cheaper when the words suffice.
- Speech translation: `SpeechTranslationConfig`, `add_target_language`, `TranslationRecognizer`, `result.translations`, `voice_name` for spoken output.
