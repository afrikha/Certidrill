Pour le texte et la parole, Foundry vous donne deux sortes de briques : des modèles à usage général que vous pilotez avec une invite, et des Foundry Tools (Azure Language, Azure Speech) qui accomplissent une tâche avec un résultat prévisible. L'examen demande laquelle convient à un besoin et ce qu'un court extrait Python en fait.

<!-- section: text-analysis-app | objectives: 2.2.1 -->
## Une application légère qui analyse du texte

| | Modèle à usage général | Azure Language dans Foundry Tools |
| --- | --- | --- |
| Appelé avec | L'API Responses (package `openai`) | Le SDK Azure Language (package `azure-ai-textanalytics`), classe `TextAnalyticsClient` |
| Vous fournissez | Une invite qui décrit l'analyse | Un appel de méthode : `detect_language`, `recognize_pii_entities` |
| Sortie | Du texte libre ; la formulation peut varier d'un appel à l'autre | Structurée et déterministe : une langue avec son code ISO et un score de confiance ; un texte masqué et une liste d'entités avec catégorie et score de confiance |
| Adapté pour | Résumé, sentiments, expressions clés, entités, classification, traduction, combinés dans une même conversation | Des valeurs régulières sur lesquelles un pipeline automatisé peut s'appuyer |
| Point de terminaison | `https://<resource>.openai.azure.com/openai/v1/` | `https://<resource>.cognitiveservices.azure.com/` |

Avec un modèle, l'application est le client de conversation du chapitre précédent, avec une instruction comme « Summarize this review in one short paragraph ». Avec Azure Language :

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

- Chaque méthode prend une **liste** de textes et renvoie un résultat par texte, d'où le `[0]`.
- Le score de confiance est un nombre compris entre 0 et 1.
- Le point de terminaison et la clé de la ressource Foundry sont en général conservés dans un fichier `.env` et lus avec `load_dotenv()` et `os.getenv()`, pas écrits dans le code.

Un agent peut utiliser les mêmes fonctionnalités : ajoutez l'outil **Azure Language in Foundry Tools** à l'agent dans le terrain de jeu. Il se connecte au serveur MCP Azure Language, et aucune ressource Azure Language distincte n'est nécessaire.

> **Piège d'examen.** « L'application doit renvoyer chaque fois le même résultat structuré », un code de langue ou un texte masqué par exemple, désigne Azure Language. « L'application doit résumer, ou répondre librement » désigne un modèle. Les deux peuvent détecter des sentiments ou des entités ; c'est la forme de la sortie qui décide.

<!-- section: spoken-prompts | objectives: 2.2.2 -->
## Répondre à des invites vocales avec un modèle multimodal

Un modèle multimodal compatible avec l'audio, comme `gpt-audio` ou `gpt-audio-mini`, accepte de l'audio dans l'invite et peut répondre par du texte, de l'audio ou les deux. Le modèle comprend l'enregistrement et raisonne dessus en un seul appel : il n'y a pas d'étape de transcription séparée.

Dans le portail Foundry, déployez le modèle, ouvrez-le dans le terrain de jeu de conversation, puis enregistrez une invite vocale ou joignez un fichier audio. Dans le code, la requête passe par l'API Chat Completions et l'audio est une partie du message utilisateur :

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

| Élément | Rôle |
| --- | --- |
| `model` | Le nom du déploiement du modèle compatible avec l'audio |
| `modalities` | Ce que le modèle renvoie : `["text", "audio"]` demande une réponse parlée et son texte ; sans lui, la réponse est en texte seul |
| `audio` | La voix et le format audio de la réponse parlée |
| `input_audio` | L'invite vocale : le contenu du fichier audio encodé en base64, avec son format |
| `message.audio.transcript` | Le texte de la réponse parlée |
| `message.audio.data` | La réponse parlée elle-même, en base64, à décoder puis enregistrer ou lire |

| Besoin | Utilisez |
| --- | --- |
| Comprendre une question posée à l'oral et y répondre, en un seul appel | Un modèle multimodal |
| Transcrire de gros volumes d'audio à coût prévisible, ou par lots | Azure Speech |
| Une voix précise ou personnalisée en sortie | Azure Speech |

<!-- section: speech-app | objectives: 2.2.3 -->
## Une application légère avec Azure Speech

Azure Speech dans Foundry Tools fournit une API de reconnaissance vocale (speech-to-text) et une API de synthèse vocale (text-to-speech). Vous pouvez essayer les deux dans les terrains de jeu Azure Speech du portail Foundry : chargez ou enregistrez de l'audio pour obtenir sa transcription, ou choisissez une voix, réglez la vitesse et la hauteur, et écoutez un texte. Dans une application, vous utilisez le SDK Speech (package `azure-cognitiveservices-speech`).

| Objet | Rôle |
| --- | --- |
| `SpeechConfig` | La connexion : point de terminaison et clé de la ressource Foundry ; aussi la voix pour la synthèse |
| `AudioConfig` | L'**entrée** audio : le microphone par défaut ou un fichier audio |
| `SpeechRecognizer` | La reconnaissance vocale : de l'audio vers le texte |
| `AudioOutputConfig` | La **sortie** audio : le haut-parleur par défaut ou un fichier |
| `SpeechSynthesizer` | La synthèse vocale : du texte vers l'audio |

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

- L'événement `recognized` fournit le texte définitif de chaque phrase.
- La voix se choisit par son nom avec `speech_synthesis_voice_name`.
- La reconnaissance est **en temps réel** quand l'application envoie l'audio en flux et reçoit le texte au fil de la parole. La **transcription par lots** traite des enregistrements stockés de façon asynchrone : vous indiquez les fichiers et récupérez les résultats plus tard.

> **Piège d'examen.** `SpeechRecognizer` va avec `AudioConfig` (une entrée), `SpeechSynthesizer` avec `AudioOutputConfig` (une sortie). Une application qui lit un texte à voix haute n'a pas besoin d'un `SpeechRecognizer`, et une application qui transcrit un message vocal n'a pas besoin d'un nom de voix.

<!-- section: key-points -->
## Points clés

- Analyse de texte avec un modèle : API Responses et une invite ; sortie souple, en texte libre.
- Analyse de texte avec Azure Language : `TextAnalyticsClient`, `detect_language`, `recognize_pii_entities` ; sortie structurée et déterministe.
- Invite vocale envoyée à un modèle multimodal : une partie `input_audio` dans le message utilisateur ; `modalities` et `audio` commandent une réponse parlée.
- SDK Azure Speech : `SpeechConfig` avec `AudioConfig` et `SpeechRecognizer` pour reconnaître ; `AudioOutputConfig` et `SpeechSynthesizer` pour synthétiser.
- Transcription en temps réel pour l'audio en direct, transcription par lots pour les enregistrements stockés.
