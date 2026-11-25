La vision dans Foundry va dans deux sens : un modèle multimodal lit une image et répond en texte, et un modèle génératif crée une image ou une vidéo à partir d'une description. L'examen vérifie que vous choisissez le bon type de modèle, que vous savez où le tester dans le portail, et que vous savez lire le code qui envoie une image ou enregistre une image générée.

<!-- section: image-analysis | objectives: 2.3.1 -->
## Interpréter des images dans une invite

Un **modèle multimodal** comprend plusieurs types de données en même temps. Les modèles compatibles avec la vision comme GPT-4.1, GPT-4.1-mini ou la série GPT-5 acceptent du texte et des images dans la même invite et répondent en langage naturel, sans pipeline de vision séparé. Ils peuvent :

- décrire le contenu d'une image ;
- répondre à des questions sur les objets, le texte ou la scène qu'elle montre ;
- dégager le sens de graphiques, diagrammes, captures d'écran, documents et photos ;
- suivre une instruction en texte portant sur l'image, comme « list the visible defects in three bullet points ».

GPT-4.1 et GPT-4.1-mini sont dépréciés : seuls les abonnements qui les ont déjà déployés peuvent créer de nouveaux déploiements, et leur mise hors service est prévue le 14 avril 2027.

Pour le tester dans le portail Foundry :

1. Déployez un modèle compatible avec la vision depuis le catalogue de modèles.
2. Dans le terrain de jeu de modèles, écrivez éventuellement des **Instructions** comme « You help people identify vintage computer hardware. »
3. Chargez une image dans le volet de conversation et saisissez une invite comme « What can you tell me about this? »

L'invite a deux parties envoyées ensemble : une instruction en texte et une ou plusieurs images. Dans le code, une image est fournie sous forme d'URL ou de données d'image encodées en base64.

| Scénario | Pourquoi un modèle multimodal convient |
| --- | --- |
| Une application de support analyse des photos envoyées par des clients | La question change à chaque photo |
| Un outil d'apprentissage explique un diagramme ou un graphique en langage simple | La réponse est du texte libre |
| Un agent examine des captures d'écran et des documents chargés | Compréhension de l'image et raisonnement en un seul appel |

> **Piège d'examen.** Le modèle doit être compatible avec la vision. Un déploiement d'un modèle limité au texte, ou d'un modèle d'embedding, ne peut pas interpréter une image, quoi que dise l'invite.

<!-- section: image-generation | objectives: 2.3.2 -->
## Créer des sorties visuelles avec des modèles génératifs

Les modèles de génération d'images font l'inverse de l'analyse d'images : ils produisent une image qui correspond à une description en texte.

| Modèle | Usage |
| --- | --- |
| **GPT-Image-2.5** (Sunburst, Flare) | Disponibilité générale. Sunburst est le plus performant, pour la génération et la modification précise ; Flare est le plus rapide, optimisé pour la vitesse et le coût |
| **GPT-Image-2** | Disponibilité générale. Génération en haute résolution, modification améliorée, préservation des visages ; latence et coût plus élevés |
| **GPT-Image-1.5** | Création haute fidélité et modification précise, pour l'image de marque, le marketing et le design |
| **GPT-Image-1** | Génération à usage général : texte vers image, variantes et modification. En préversion, avec une date de mise hors service au 28 octobre 2026 |
| **GPT-Image-1-Mini** | Plus léger et moins cher : expérimentations, outils internes, gros volumes |
| **FLUX** (Black Forest Labs) | Une famille partenaire pour des images photoréalistes et de styles variés |
| **Sora** | Génération de vidéos à partir de texte, et à partir d'une image comme point de départ. Sora 2, le modèle listé dans le catalogue, est en préversion |

Les modèles GPT-Image-1 (1, 1.5 et Mini) sont disponibles en accès limité : vous demandez l'accès avant de les déployer. DALL-E 3 a été mis hors service le 4 mars 2026.

Pour générer une image dans le portail, déployez un modèle de génération d'images : dans le catalogue de modèles, filtrez les tâches d'inférence sur **Text to image**. Le terrain de jeu d'images s'ouvre ; décrivez l'image voulue, avec son sujet, son style et ses couleurs, par exemple « A modern flat illustration of a robot holding a potted plant, pastel colors ». Une description précise donne un résultat plus proche de l'intention.

La génération de vidéos fonctionne de la même façon dans le terrain de jeu vidéo, où vous réglez aussi les dimensions et la durée. Comme elle prend plusieurs minutes, elle s'exécute sous forme de **travail asynchrone** via l'API : créer le travail, interroger son état jusqu'à ce qu'il soit `completed`, puis télécharger le fichier MP4.

Les modèles Sora appliquent des restrictions d'IA responsable, comme des limites sur les personnes réelles et les personnages protégés par le droit d'auteur.

> **Piège d'examen.** « Créer », « dessiner » ou « concevoir » une image appelle un modèle de génération d'images, pas un modèle de conversation compatible avec la vision. « Décrire » ou « lire » une image appelle un modèle multimodal. Sora génère des vidéos ; la famille GPT-Image génère des images fixes.

<!-- section: vision-app | objectives: 2.3.3 -->
## Une application légère dotée de fonctionnalités de vision

Les deux sortes d'application utilisent le package `openai` et un client créé avec le point de terminaison et la clé de la ressource Foundry :

```text
from openai import OpenAI

client = OpenAI(
    base_url="https://<resource>.openai.azure.com/openai/v1/",
    api_key=key,
)
```

**Analyser une image.** Le message utilisateur contient deux éléments de contenu, l'un de type `input_text` et l'autre de type `input_image` :

```text
response = client.responses.create(
    model="my-vision-deployment",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "What is in this image?"},
            {"type": "input_image", "image_url": image_url},
        ],
    }],
)
print(response.output_text)
```

**Générer une image.** L'application envoie une invite au déploiement d'un modèle de génération d'images et reçoit l'image sous forme de texte base64, qu'elle décode et enregistre :

```text
import base64

result = client.images.generate(
    model="my-image-deployment",
    prompt="A vintage PC with a CRT monitor",
    n=1,
    size="1024x1024",
)
with open("output.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

| | Analyse d'images | Génération d'images |
| --- | --- | --- |
| Déploiement | Un modèle multimodal compatible avec la vision | Un modèle de génération d'images |
| Appel | `responses.create` | `images.generate` |
| Entrée | Des éléments `input_text` et `input_image` | `prompt`, nombre d'images `n`, `size` |
| Sortie | Du texte dans `output_text` | Une image base64 dans `b64_json`, à décoder avec `base64.b64decode` |

L'encodage base64 transforme des données binaires, comme une image, en texte qui peut voyager dans du JSON. C'est pourquoi une image locale est encodée en base64 avant d'être envoyée, et pourquoi une image générée doit être décodée avant d'être écrite dans un fichier.

Une image peut aussi être générée via l'API Responses : la requête ajoute l'outil `{"type": "image_generation"}`, et l'image base64 revient dans un élément de sortie de type `image_generation_call`. Dans ce cas, `model` est le déploiement d'un modèle de conversation ou de raisonnement compatible, et le déploiement du modèle de génération d'images est indiqué dans l'en-tête `x-ms-oai-image-generation-deployment`.

> **Conseil d'examen.** Dans les deux extraits, `model` est le nom que vous avez donné au déploiement, pas le nom du modèle dans le catalogue. Un déploiement de GPT-4.1-mini nommé `my-vision-deployment` s'appelle avec `model="my-vision-deployment"`.

<!-- section: key-points -->
## Points clés

- Image en entrée, texte en sortie : un modèle multimodal compatible avec la vision ; l'invite combine du texte et une ou plusieurs images.
- Texte en entrée, image en sortie : un modèle de génération d'images (famille GPT-Image, FLUX) ; texte en entrée, vidéo en sortie : Sora (préversion), sous forme de travail asynchrone.
- Portail : chargez une image dans le terrain de jeu de modèles pour l'analyser ; utilisez le terrain de jeu d'images pour générer.
- Code d'analyse : `responses.create` avec `input_text` et `input_image` ; résultat dans `output_text`.
- Code de génération : `images.generate` avec `prompt` ; résultat en base64, décodé et enregistré dans un fichier.
- Les images voyagent sous forme d'URL ou de données base64.
