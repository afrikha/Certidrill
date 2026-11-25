Azure Speech dans Foundry Tools donne à un agent des oreilles et une voix : reconnaissance vocale, synthèse vocale, traduction vocale et, avec l'API Voice Live, une boucle complète de parole à parole autour d'un modèle ou d'un agent Foundry. Les modèles compatibles avec l'audio ouvrent une seconde voie, où le modèle entend lui-même l'audio. L'examen demande quelle voie convient aux contraintes (latence, coût, vocabulaire personnalisé, authentification sans clé) et comment une courte configuration Python ou JSON la met en place.

<!-- section: stt-tts-workflows | objectives: 4.2.1 -->
## Reconnaissance et synthèse vocales dans un flux d'agent

Une interaction vocale avec un agent est une boucle : capturer l'audio, le transformer en texte, laisser l'agent raisonner, retransformer la réponse en audio. Chaque moitié a plusieurs modes.

| Besoin | Mode de reconnaissance vocale | Accès |
| --- | --- | --- |
| Sous-titres en direct, dictée, un appelant qui parle à un agent maintenant | **Temps réel**, avec des résultats intermédiaires pendant que la personne parle | SDK Speech, Speech CLI, API REST pour l'audio court |
| Un message vocal ou un fichier de réunion, résultat attendu vite avec une latence prévisible | **Transcription rapide**, synchrone, plus rapide que le temps réel | API REST |
| Des milliers d'enregistrements d'appels stockés, résultats récupérés plus tard | **Transcription par lots**, asynchrone | API REST, Speech CLI |

La transcription rapide propose un choix de modèles : **Azure LLM Speech** (basé sur un LLM, meilleure reconnaissance contextuelle et multilingue, invite personnalisée, traduction vocale) ou **Azure Transcribe** (usage général, avec diarisation, listes d'expressions, identification de la langue et horodatages ; le modèle par défaut quand le mode amélioré n'est pas activé).

Les fonctionnalités qui décident de nombreuses réponses :

| Besoin | Fonctionnalité |
| --- | --- |
| Qui a dit quoi dans un enregistrement à plusieurs interlocuteurs | **Diarisation**, jusqu'à 35 interlocuteurs (au-delà, une erreur est renvoyée) ; en transcription par lots, audio mono uniquement |
| Noms de produits ou jargon mal reconnus, sans vouloir entraîner de modèle | **Liste d'expressions** : mots et expressions probables envoyés avec la requête |
| Langue parlée inconnue ou mélangée | **Identification de la langue** |
| Les deux côtés d'un appel au support enregistrés sur deux canaux | **Transcription multicanal** (préversion), jusqu'à deux canaux |

En transcription par lots, les canaux 0 et 1 sont transcrits par défaut (propriété `channels`), et l'identification de la langue ne fonctionne qu'avec les modèles de base : si la requête indique aussi un modèle personnalisé, le service se rabat sur les modèles de base. Quand vous avez besoin des deux, utilisez la reconnaissance vocale en temps réel.

Dans une application, le SDK Speech (`azure-cognitiveservices-speech`) fait les deux moitiés :

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

- `recognize_once_async()` rend la main après un seul énoncé. Pour une conversation, utilisez `start_continuous_recognition()` avec les événements `recognizing` (texte intermédiaire), `recognized` (texte définitif d'une phrase), `canceled` et `session_stopped`, puis `stop_continuous_recognition()`.
- La langue source est un paramètre régional (`en-US`, `de-DE`) dans `speech_recognition_language`.
- La voix se choisit par son nom. Les voix neuronales parlent aussi anglais, et les voix multilingues parlent la langue du texte d'entrée. Le contrôle fin (style, débit, hauteur, pauses) s'écrit en SSML. Les textes longs passent par l'API de synthèse par lots (GA, asynchrone, audio de plus de 10 minutes) ; l'API Long Audio sera mise hors service le 1er avril 2027.

> **Piège d'examen.** Les démarrages rapides placent une clé dans des variables d'environnement et demandent une méthode plus sûre en production. Microsoft recommande l'authentification Microsoft Entra ID avec une identité managée ; quand une clé est inévitable, conservez-la dans Azure Key Vault et faites-la tourner. Pour le SDK Speech, l'authentification Entra exige un **nom de domaine personnalisé** sur la ressource Speech (irréversible), le rôle Cognitive Services Speech User ou Cognitive Services Speech Contributor, et `SpeechConfig(token_credential=..., endpoint=...)` avec le point de terminaison du domaine personnalisé.

<!-- section: voice-agents | objectives: 4.2.2 -->
## La voix comme modalité d'agent et les modèles vocaux personnalisés

Enchaîner soi-même reconnaissance vocale, modèle et synthèse vocale fonctionne, mais vous écrivez toute la tuyauterie audio et l'utilisateur ressent la latence de trois appels. L'**API Voice Live** est une API de parole à parole entièrement managée pour les agents vocaux en temps réel : l'application envoie l'audio en flux et reçoit l'audio en retour (et éventuellement la vidéo d'un avatar), sur une connexion WebSocket, sans déployer elle-même le modèle génératif.

| Besoin | Le faire soi-même | API Voice Live |
| --- | --- | --- |
| Choix du modèle génératif et de la voix | Oui | Oui |
| Suppression du bruit, annulation de l'écho, détection des interruptions et de la fin de tour | Non | Oui |
| Faible coût d'ingénierie | Non | Oui |
| Faible latence ressentie par l'utilisateur | Non | Oui |

Les événements sont compatibles avec l'API Realtime d'Azure OpenAI : le client envoie `session.update` (la configuration, en général en premier), `input_audio_buffer.append` (l'audio) et `response.create` ; le serveur envoie `session.updated`, `conversation.item.created`, `response.done`. Une configuration de session :

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

| Paramètre | Valeurs à connaître |
| --- | --- |
| `turn_detection.type` | `server_vad` (par défaut, volume audio) ; `semantic_vad` (uniquement `gpt-realtime` et `gpt-realtime-mini`) ; `azure_semantic_vad` (surtout l'anglais) et `azure_semantic_vad_multilingual`, utilisables avec tous les modèles |
| `input_audio_transcription.model` | `azure-speech` (fonctionne avec les modèles non multimodaux, les agents et les modèles temps réel comme `gpt-realtime` ; prend en charge les listes d'expressions et la reconnaissance vocale personnalisée) ; `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`, `whisper-1` (uniquement avec `gpt-realtime` et `gpt-realtime-mini` ; pas de liste d'expressions) |
| `voice.type` | `azure-standard` ou `azure-custom` (voix personnalisée : accès limité, demande l'`endpoint_id` du déploiement) |

**La voix d'un agent Foundry.** Voice Live peut se placer devant un agent de Foundry Agent Service au lieu d'un modèle nu : le client Python (`azure-ai-voicelive`) se connecte avec le nom de l'agent et le nom du projet, et l'agent conserve ses instructions et ses outils.

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

Seuls `agent_name` et `project_name` sont obligatoires ; `agent_version` fige une version (sinon la plus récente est utilisée) et `conversation_id` reprend une conversation. Les paramètres vocaux peuvent être stockés dans les métadonnées de l'agent au lieu d'être envoyés par le client. L'appelant a besoin du rôle Foundry User (anciennement Azure AI User).

> **Piège d'examen.** L'authentification par clé n'est pas prise en charge quand Voice Live se connecte à un agent : le mode agent exige Microsoft Entra ID.

**Reconnaissance vocale personnalisée (custom speech).** Le modèle de base (un modèle de langage universel) convient à la plupart des audios. Mesurez-le d'abord avec le **taux d'erreurs de mots (WER)** par rapport à des transcriptions humaines ; entraînez un modèle personnalisé quand le WER reste élevé sur un vocabulaire métier ou dans des conditions audio particulières.

| Données d'entraînement | Améliorent |
| --- | --- |
| Texte brut, texte structuré | Le vocabulaire et les tournures du domaine |
| Audio avec transcriptions de référence étiquetées par des humains | Des conditions audio précises (bruit, accents, ligne téléphonique) |
| Prononciation | La prononciation personnalisée de certains mots |
| Mise en forme du texte affiché | La normalisation inverse du texte, les réécritures, le filtrage des grossièretés |

Ordre des opérations : créer un projet, charger des données de test, entraîner, inspecter et mesurer le WER, **déployer sur un point de terminaison personnalisé**, puis l'appeler. Sauf pour la transcription par lots, un modèle personnalisé ne s'utilise qu'à travers un point de terminaison déployé (l'hébergement est facturé) ; la transcription par lots peut s'en servir sans point de terminaison. Un modèle déployé reste figé jusqu'à ce que vous le mettiez à jour, et les modèles expirent : planifiez la mise à jour.

```text
speech_config = speechsdk.SpeechConfig(subscription=key, endpoint=endpoint)
speech_config.endpoint_id = "<custom speech endpoint id>"
recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)
```

Dans Voice Live, la reconnaissance vocale personnalisée se règle dans `input_audio_transcription.custom_speech`, un dictionnaire qui associe un paramètre régional à l'ID d'un modèle personnalisé. Elle ne fonctionne qu'avec le modèle de transcription `azure-speech`, et le modèle doit se trouver sur la ressource Foundry qui appelle Voice Live.

> **Conseil d'examen.** Quelques noms de produits mal reconnus : liste d'expressions, sans entraînement ni point de terminaison. Tout un vocabulaire métier ou un environnement bruyant, mesuré par le WER : reconnaissance vocale personnalisée, déployée sur un point de terminaison.

<!-- section: audio-reasoning | objectives: 4.2.3 -->
## Raisonnement multimodal à partir d'entrées audio

Une transcription garde les mots et perd le reste. Un modèle compatible avec l'audio entend l'enregistrement lui-même et raisonne dessus en un seul appel : le ton, les hésitations, les bruits de fond, et ce qui a été dit.

| Voie | Comment | À utiliser quand |
| --- | --- | --- |
| Transcrire, puis interroger un modèle de texte | Reconnaissance vocale (ou `gpt-4o-transcribe`), puis la transcription dans l'invite | Les mots suffisent ; les transcriptions doivent être stockées, recherchées ou auditées |
| L'audio dans l'invite | Un modèle audio comme `gpt-audio` ou `gpt-audio-mini`, API Chat Completions, une partie `input_audio` | Raisonner sur un enregistrement (une réclamation, une question orale), répondre en texte ou en audio |
| Parole à parole en direct | Un modèle `gpt-realtime` via l'API Realtime ou Voice Live | Une conversation avec interruptions et faible latence |
| Des champs structurés à partir d'enregistrements | Un analyseur audio de Content Understanding (`prebuilt-callCenter`, personnalisé) | Les mêmes champs pour chaque appel : résumé, sentiment, sujets |

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

L'audio voyage en base64 avec son format. `modalities=["text", "audio"]` avec un paramètre `audio` (voix, format) demande une réponse parlée, renvoyée dans `message.audio.data`, avec son texte dans `message.audio.transcript`. Les sorties structurées ne sont pas prises en charge avec `gpt-audio` et `gpt-audio-mini` : quand les champs doivent suivre un schéma JSON, envoyez la réponse du modèle (ou une transcription) à un modèle de texte avec sorties structurées dans une seconde étape.

> **Piège d'examen.** « Détecter la frustration dans la voix de l'appelant » ne se résout pas avec une transcription seule : l'audio doit atteindre un modèle qui accepte l'audio. À l'inverse, « conserver une transcription consultable de chaque appel au coût le plus bas » ne demande pas de modèle audio : la transcription par lots suffit.

<!-- section: speech-translation | objectives: 4.2.4 -->
## Traduire la parole

| Besoin | Utilisez |
| --- | --- |
| Une parole en direct traduite dans une ou plusieurs langues, en texte et éventuellement en voix synthétisée | La **traduction vocale** d'Azure Speech (`TranslationRecognizer`) |
| Des fichiers stockés transcrits et traduits avec le contexte et une invite personnalisée | La transcription rapide avec **Azure LLM Speech** |
| Un texte déjà transcrit, traduit par un service dédié au résultat prévisible | **Azure Translator** dans Foundry Tools |
| Une traduction adaptée au ton ou au registre, ou combinée à un résumé | Un modèle de langage interrogé sur la transcription |
| Une conversation en direct en plusieurs langues, sans langue d'entrée à définir, de parole à parole avec une voix naturelle | **Live Interpreter** dans la traduction vocale |

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

- La source est un paramètre régional (`en-US`) ; les cibles sont des codes de langue (`fr`, `de`, `zh-Hans`), et `result.translations` est un dictionnaire indexé par ces codes.
- `voice_name` ajoute une traduction parlée, livrée sous forme audio par l'événement `synthesizing`. Cette synthèse par événement fonctionne avec une seule langue cible, dont la voix doit correspondre. Pour faire parler plusieurs traductions, ajoutez plusieurs cibles et synthétisez vous-même chaque texte avec un `SpeechSynthesizer` et une voix par langue.
- Les modèles de reconnaissance vocale personnalisée fonctionnent aussi avec la traduction vocale, pour la partie reconnaissance.
- **Live Interpreter** identifie en continu la langue parlée (changements de langue dans une même session) et conserve le style et le ton de l'interlocuteur. En Python, il utilise le même `TranslationRecognizer`, avec un `AutoDetectSourceLanguageConfig()` vide (détection en plage ouverte) et le point de terminaison universel v2 ; `voice_name = "personal-voice"` exige l'accès à la voix personnelle.

> **Piège d'examen.** Ni `SpeechRecognizer` ni `SpeechConfig` ne traduisent, et `SpeechConfig` n'a pas de langue cible : la traduction demande `SpeechTranslationConfig` et `TranslationRecognizer`. Envoyer la transcription à Azure Translator est un second appel, justifié seulement quand le texte a besoin des fonctionnalités de Translator.

<!-- section: key-points -->
## Points clés

- Reconnaissance en temps réel pour l'audio en direct, transcription rapide pour un fichier tout de suite, transcription par lots pour de gros volumes stockés.
- Liste d'expressions pour quelques termes ; reconnaissance vocale personnalisée, mesurée par le WER et déployée sur un point de terminaison (`endpoint_id`), pour un domaine ou un environnement acoustique.
- Voice Live : parole à parole managée sur WebSocket, `session.update`, suppression du bruit, annulation de l'écho, détection sémantique de la fin de tour ; il peut se placer devant un agent Foundry, avec Microsoft Entra ID uniquement.
- Les modèles compatibles avec l'audio raisonnent sur l'audio lui-même ; les transcriptions coûtent moins cher quand les mots suffisent.
- Traduction vocale : `SpeechTranslationConfig`, `add_target_language`, `TranslationRecognizer`, `result.translations`, `voice_name` pour une sortie parlée.
