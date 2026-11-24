For text and speech, Foundry gives you two kinds of building blocks: general-purpose models that you drive with a prompt, and Foundry Tools (Azure Language, Azure Speech) that do one task with a predictable result. The exam asks which one fits a need and what a short Python snippet does with it.

<!-- section: text-analysis-app | objectives: 2.2.1 -->
## A lightweight application that analyzes text

| | General-purpose model | Azure Language in Foundry Tools |
| --- | --- | --- |
| Called with | The Responses API (`openai` package) | The Azure Language SDK (`azure-ai-textanalytics` package), class `TextAnalyticsClient` |
| You provide | A prompt that describes the analysis | A method call: `detect_language`, `recognize_pii_entities` |
| Output | Free text; the wording can vary between calls | Structured and deterministic: a language with its ISO code and a confidence score; a redacted text and a list of entities with category and confidence score |
| Good for | Summarizing, sentiment, key phrases, entities, classification, translation, combined in one conversation | Consistent values that an automated pipeline can rely on |
| Endpoint | `https://<resource>.openai.azure.com/openai/v1/` | `https://<resource>.cognitiveservices.azure.com/` |

With a model, the application is the chat client of the previous chapter with an instruction such as "Summarize this review in one short paragraph". With Azure Language:

```text
from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient

client = TextAnalyticsClient(endpoint=endpoint, credential=AzureKeyCredential(key))

language = client.detect_language(["Bonjour, je voudrais un billet."])[0]
print(language.primary_language.name, language.primary_language.iso6391_name)

pii = client.recognize_pii_entities(["Call Maria Garcia on 020 7946 0958."])[0]
print(pii.redacted_text)
for entity in pii.entities:
    print(entity.text, entity.category, entity.confidence_score)
```

- Each method takes a **list** of texts and returns one result per text, hence the `[0]`.
- The confidence score is a number between 0 and 1.
- The endpoint and the key of the Foundry resource are usually kept in a `.env` file and read with `load_dotenv()` and `os.getenv()`, not written in the code.

An agent can use the same capabilities: add the **Azure Language in Foundry Tools** tool to the agent in the playground. It connects to the Azure Language MCP server, and no separate Azure Language resource is needed.

> **Exam trap.** "The application must return the same structured result every time", a language code or a redacted text for example, points to Azure Language. "The application must summarize, or answer in free form" points to a model. Both can detect sentiment or entities; the form of the output decides.

<!-- section: spoken-prompts | objectives: 2.2.2 -->
## Responding to spoken prompts with a multimodal model

An audio-enabled multimodal model, such as `gpt-audio` or `gpt-audio-mini`, accepts audio in the prompt and can answer with text, audio or both. The model understands the recording and reasons about it in a single call: there is no separate transcription step.

In the Foundry portal, deploy the model, open it in the chat playground, then record a spoken prompt or attach an audio file. In code, the request goes through the Chat Completions API and the audio is one part of the user message:

```text
completion = client.chat.completions.create(
    model="gpt-audio-mini",
    modalities=["text", "audio"],
    audio={"voice": "alloy", "format": "wav"},
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Answer the question asked in this recording."},
            {"type": "input_audio", "input_audio": {"data": encoded_audio, "format": "wav"}},
        ],
    }],
)
print(completion.choices[0].message.audio.transcript)
```

| Element | Role |
| --- | --- |
| `model` | The deployment name of the audio-enabled model |
| `modalities` | What the model returns: `["text", "audio"]` asks for a spoken answer and its text; without it, the answer is text only |
| `audio` | The voice and the audio format of the spoken answer |
| `input_audio` | The spoken prompt: the content of the audio file encoded in base64, with its format |
| `message.audio.transcript` | The text of the spoken answer |
| `message.audio.data` | The spoken answer itself, in base64, to decode and save or play |

| Need | Use |
| --- | --- |
| Understand a spoken question and answer it, in one call | A multimodal model |
| Transcribe large volumes of stored recordings, in batch | Azure Speech |
| A specific or custom voice for the output | Azure Speech |

<!-- section: speech-app | objectives: 2.2.3 -->
## A lightweight application with Azure Speech

Azure Speech in Foundry Tools provides a speech-to-text API and a text-to-speech API. You can try both in the Azure Speech playgrounds of the Foundry portal: upload or record audio to get its transcription, or choose a voice, adjust speed and pitch, and listen to a text. In an application you use the Speech SDK (`azure-cognitiveservices-speech` package).

| Object | Role |
| --- | --- |
| `SpeechConfig` | The connection: endpoint and key of the Foundry resource; also the voice for synthesis |
| `AudioConfig` | The audio **input**: the default microphone or an audio file |
| `SpeechRecognizer` | Speech recognition: audio to text |
| `AudioOutputConfig` | The audio **output**: the default speaker or a file |
| `SpeechSynthesizer` | Speech synthesis: text to audio |

```text
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(subscription=key, endpoint=endpoint)

# Speech recognition: microphone -> text
audio_in = speechsdk.audio.AudioConfig(use_default_microphone=True)
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_in)
recognizer.recognized.connect(lambda evt: print(evt.result.text))
recognizer.start_continuous_recognition()
input("Press Enter to stop...")
recognizer.stop_continuous_recognition()

# Speech synthesis: text -> speaker
speech_config.speech_synthesis_voice_name = "en-US-Ava:DragonHDLatestNeural"
audio_out = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_out)
synthesizer.speak_text_async("Your order has shipped.").get()
```

- The `recognized` event delivers the final text of each phrase.
- The voice is chosen by name with `speech_synthesis_voice_name`.
- Recognition is **real time** when the application streams audio and receives the text as it is spoken. **Batch transcription** processes stored recordings asynchronously: you point to the files and collect the results later.

> **Exam trap.** `SpeechRecognizer` goes with `AudioConfig` (an input), `SpeechSynthesizer` with `AudioOutputConfig` (an output). An application that reads a text aloud doesn't need a `SpeechRecognizer`, and an application that transcribes a voicemail doesn't need a voice name.

<!-- section: key-points -->
## Key points

- Text analysis with a model: Responses API and a prompt; flexible, free-form output.
- Text analysis with Azure Language: `TextAnalyticsClient`, `detect_language`, `recognize_pii_entities`; structured, deterministic output.
- Spoken prompt to a multimodal model: an `input_audio` part in the user message; `modalities` and `audio` control a spoken answer.
- Azure Speech SDK: `SpeechConfig` plus `AudioConfig` and `SpeechRecognizer` to recognize; `AudioOutputConfig` and `SpeechSynthesizer` to synthesize.
- Real-time transcription for live audio, batch transcription for stored recordings.
