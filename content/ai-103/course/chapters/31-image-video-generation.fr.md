Foundry sert des modèles d'images (la série GPT-image) et un modèle vidéo (Sora 2) via l'API v1 compatible OpenAI de la ressource Foundry. Les questions d'examen demandent de choisir la bonne opération (générer ou modifier, créer ou remixer), de compléter un court appel Python et de choisir le paramètre qui répond à une contrainte : un arrière-plan transparent, des visages préservés, une faible latence, une première image imposée, une modification qui ne doit pas toucher le reste de l'image.

<!-- section: image-generation | objectives: 3.1.1 -->
## Générer des images à partir d'invites de texte et de médias de référence

DALL-E 3 a été mis hors service le 4 mars 2026 : ses déploiements ne fonctionnent plus. La génération d'images utilise désormais un modèle `gpt-image`.

| Modèle | Accès | À retenir |
| --- | --- | --- |
| `gpt-image-1`, `gpt-image-1.5` | Accès limité (formulaire de demande) | Tailles `1024x1024`, `1024x1536`, `1536x1024` ; qualité par défaut `high` ; 1.5 a une meilleure latence que 1 |
| `gpt-image-1-mini` | Accès limité | Moins cher et plus rapide ; qualité par défaut `medium` ; pas de `input_fidelity`, pas de préservation des visages |
| `gpt-image-2` | Généralement disponible | `WIDTHxHEIGHT` personnalisé : côtés multiples de 16 px, grand côté jusqu'à 3 840 px, rapport d'aspect jusqu'à 3:1, de 655 360 à 8 294 400 pixels au total ; réalisme, latence et coût plus élevés |
| `gpt-image-2.5-sunburst` / `gpt-image-2.5-flare` | Généralement disponible | Tailles personnalisées avec les mêmes règles de côtés, de rapport d'aspect (1:3 à 3:1) et de nombre de pixels ; au-delà de `2560x1440`, c'est expérimental. Sunburst : fidélité et précision de modification maximales. Flare : le plus rapide, optimisé pour la vitesse et le coût |

Points communs à tous : entrée texte et image, 1 à 10 images par requête (`n`), une invite de 4 000 caractères au plus, et une sortie **uniquement en base64** (`b64_json`). Il n'y a pas de sortie sous forme d'URL, et `response_format` n'est pas pris en charge.

```text
import base64
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://ai.azure.com/.default"
)
client = OpenAI(
    base_url="https://contoso-ai.openai.azure.com/openai/v1/",
    api_key=token_provider,
)

result = client.images.generate(
    model="image-gen",                  # deployment name
    prompt="Studio photo of a ceramic mug on a walnut desk, soft daylight",
    size="1536x1024",
    quality="medium",
    n=2,
)
for i, item in enumerate(result.data):
    with open(f"mug-{i}.png", "wb") as f:
        f.write(base64.b64decode(item.b64_json))
```

Avec l'authentification sans clé, l'identité appelante a besoin du rôle **Cognitive Services OpenAI User** sur la ressource. Une génération prend en général 10 à 30 secondes. Le quota par défaut de la série GPT-image-1 et de GPT-image-2 est de 5 images par minute.

**Médias de référence.** L'opération `generations` ne prend que du texte. Pour partir d'images existantes (photos de produit, logo, planche de personnage), appelez l'opération **edits** (`images.edit`, `POST .../images/edits`, `multipart/form-data`) : elle accepte jusqu'à 16 images d'entrée, PNG ou JPG, de moins de 50 Mo chacune, et l'invite indique comment les combiner (« place this bottle on the beach scene »).

**Depuis un modèle de conversation.** L'API Responses propose l'outil `{"type": "image_generation"}` : un modèle de conversation ou de raisonnement décide de dessiner, le déploiement d'images est indiqué dans l'en-tête `x-ms-oai-image-generation-deployment`, et l'image revient en base64 dans le `result` d'un élément de sortie de type `image_generation_call`. L'outil prend en charge la série GPT-image-1 et les modèles GPT-image-2.5 (Learn n'y cite pas `gpt-image-2`), mais pas la modification en plusieurs tours. Il ne fait pas de streaming ; pour diffuser des images partielles, appelez directement l'API d'images avec `stream=True` et `partial_images`.

> **Piège d'examen.** « Utiliser nos trois photos de produit pour créer une image d'ambiance » est un appel **edit** avec plusieurs images d'entrée, pas `images.generate` : l'opération de génération n'a pas d'entrée image.

<!-- section: video-generation | objectives: 3.1.2 -->
## Générer des vidéos à partir d'invites de texte et de médias de référence

La génération de vidéos utilise le modèle `sora-2` (préversion). Sora 2 produit des vidéos **avec audio**, est facturé à la seconde et accepte trois modes d'entrée : texte seul, image plus texte, et une vidéo générée plus texte.

La génération est un **travail asynchrone** : le créer, l'interroger, puis télécharger le résultat.

```text
import time

video = client.videos.create(
    model="sora-2",                     # deployment name
    prompt="Slow dolly shot of a bakery counter at dawn, warm light",
    size="1280x720",
    seconds=8,
    input_reference=open("first-frame.png", "rb"),   # optional
)
while video.status not in ["completed", "failed", "cancelled"]:
    time.sleep(20)
    video = client.videos.retrieve(video.id)

if video.status == "completed":
    content = client.videos.download_content(video.id, variant="video")
    content.write_to_file("bakery.mp4")
```

| Paramètre | Valeurs |
| --- | --- |
| `size` | `720x1280` (portrait, par défaut) ou `1280x720` (paysage) |
| `seconds` | `4` (par défaut), `8`, `12` |
| `input_reference` | Une image (JPEG, PNG ou WebP) servant d'ancre visuelle pour la **première image** de la vidéo ; sa résolution doit correspondre exactement à `size` |

Les faits sur les travaux que l'examen apprécie :

- États : `queued`, `in_progress`, `completed`, `failed`, `cancelled`. Un travail en échec s'explique dans `failure_reason` ; une invite bloquée par le filtrage de contenu ne renvoie aucune vidéo.
- Un travail prend 1 à 5 minutes, selon la résolution et la durée.
- Deux travaux de création peuvent s'exécuter en même temps ; attendez que l'un se termine avant d'en lancer un troisième.
- Un travail reste disponible 24 heures ; ensuite, il faut en créer un nouveau.
- Rédigez l'invite en anglais ou dans une autre langue en écriture latine pour de meilleurs résultats.

Restrictions de contenu de l'API Sora 2 : uniquement du contenu adapté à un public de moins de 18 ans, pas de personnages ni de musique protégés par le droit d'auteur, pas de personnes réelles (personnalités publiques comprises), et les images d'entrée contenant des visages humains sont refusées.

> **Piège d'examen.** `videos.create` répond immédiatement avec un travail `queued`, pas avec une vidéo. Un code qui télécharge juste après `create`, sans interroger l'état jusqu'à `completed`, échoue.

<!-- section: image-editing | objectives: 3.1.3 -->
## Modifier des images : inpainting, masques et modifications guidées par l'invite

L'opération edits modifie une image existante. Tous les modèles `gpt-image` la prennent en charge.

| Exigence | Technique |
| --- | --- |
| Remplacer seulement le ciel, garder tous les autres pixels | **Inpainting** : image + masque + invite |
| Changer le style ou l'ambiance de toute l'image | Modification guidée par l'invite : image + invite, sans masque |
| Combiner plusieurs images en une nouvelle | Modification avec plusieurs images d'entrée |
| Garder le visage d'une personne reconnaissable d'une modification à l'autre | `input_fidelity` réglé sur high, avec un modèle qui préserve les visages (pas `gpt-image-1-mini`) |
| Une image entièrement nouvelle | `images.generate`, pas une modification |

Règles du masque :

- Le masque est un PNG de **mêmes dimensions** que l'image d'entrée.
- Les **pixels entièrement transparents** (alpha = 0) délimitent la zone à modifier ; les pixels opaques sont conservés.
- L'invite décrit le résultat voulu, par exemple ce qui doit remplacer l'objet masqué.

```text
result = client.images.edit(
    model="image-gen",
    image=open("living-room.png", "rb"),
    mask=open("sofa-mask.png", "rb"),     # transparent where the sofa is
    prompt="Replace the sofa with a green velvet armchair",
    size="1024x1024",
)
with open("living-room-edited.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

Sans masque, le modèle peut changer n'importe quelle partie de l'image : la modification suit l'invite, pas une région. Chaque modification produit une nouvelle image ; une étape de revue entre deux modifications (humaine ou automatisée) évite la dérive au fil des itérations.

> **Piège d'examen.** « Changer uniquement l'étiquette du produit et laisser le reste de la photo intact » exige un **masque**. Une nouvelle génération, ou une modification sans masque, reconstruit toute l'image et peut altérer l'arrière-plan, l'éclairage ou le produit lui-même.

<!-- section: video-editing | objectives: 3.1.4 -->
## Modifier des vidéos générées

Une vidéo générée se modifie en la **remixant** : Sora 2 applique un ajustement ciblé au lieu de tout régénérer.

```text
remix = client.videos.remix(
    video_id=video.id,                  # a completed video
    prompt="Shift the color palette to teal and sand, with a warm backlight",
)
# remix is a new job: poll it with videos.retrieve, then download it
```

- La source doit être une vidéo **terminée avec succès**, identifiée par son ID (`video_...`), et encore disponible : les travaux sont conservés 24 heures.
- Le remix conserve la structure, les transitions de scène et la disposition de l'original.
- Faites **un seul changement clairement formulé par remix** (palette, éclairage, couleur d'un objet). Des modifications étroites préservent la fidélité et réduisent les défauts visuels ; enchaînez plusieurs remix pour plusieurs changements, en vérifiant chaque résultat.
- Le remix est un nouveau travail asynchrone, avec la même interrogation d'état, le même téléchargement et le même filtrage de contenu qu'une création.

| Exigence | Approche |
| --- | --- |
| Même plan, éclairage ou couleurs différents | Remix avec un seul ajustement |
| Plusieurs changements, chacun vérifié | Une chaîne de remix, un changement chacun |
| Une autre scène ou une autre histoire | Un nouveau `videos.create` avec une nouvelle invite |
| Le clip doit commencer par une image fixe validée | `videos.create` avec `input_reference` |
| Repartir d'un clip généré avec une nouvelle instruction | Entrée vidéo plus texte (vidéo générée vers vidéo) |

> **Piège d'examen.** Renvoyer l'invite d'origine avec un mot changé n'est pas une modification : une nouvelle génération change la composition, le mouvement de caméra et le rythme. Pour garder le clip et changer un seul aspect, utilisez le **remix**.

<!-- section: generation-controls | objectives: 3.1.5 -->
## Choisir les contrôles de génération et de modification

| Contrôle | Valeurs et règles |
| --- | --- |
| `size` | Image : liste fixe (série GPT-image-1) ou `WIDTHxHEIGHT` personnalisé (GPT-image-2 et suivants), ou `auto`. Vidéo : `720x1280` ou `1280x720` |
| `quality` | `low`, `medium`, `high` (GPT-image-2.5 ajoute `xhigh` et `max`). Qualité plus basse = latence et coût plus faibles |
| `n` | 1 à 10 images par requête |
| `output_format` | `png` (par défaut) ou `jpeg` ; WebP n'est pas pris en charge |
| `output_compression` | 0 à 100, pour une sortie JPEG |
| `background` | `transparent` ou `auto` ; la transparence exige PNG |
| `mask` | PNG, même taille que l'image, transparent = zone à modifier |
| `input_fidelity` | Degré de conservation du style et des traits (visages) des images d'entrée ; absent de `gpt-image-1-mini` |
| `stream` + `partial_images` | Aperçu progressif de l'image pendant sa génération (documenté pour la série GPT-image-1 et GPT-image-2) |
| `user` | Identifiant de votre utilisateur final, pour suivre l'usage |
| `seconds`, `input_reference` | Durée de la vidéo ; ancre de la première image |

| Exigence | Contrôle |
| --- | --- |
| Un logo à poser sur une page web de n'importe quelle couleur | `background="transparent"` avec `output_format="png"` |
| Les fichiers les plus légers pour un catalogue | `output_format="jpeg"` et une `output_compression` plus basse |
| Des brouillons rapides dans un outil de conception | `quality="low"` ou un modèle plus rapide (`gpt-image-1-mini`, `gpt-image-2.5-flare`) |
| Montrer la progression à l'utilisateur pendant le rendu | `stream=True`, `partial_images` |
| Quatre propositions au choix | `n=4` |
| Une bannière 21:9 | Un modèle qui accepte des tailles personnalisées (`gpt-image-2` et suivants) |

La plateforme ajoute des contrôles que vous ne réglez pas par requête. Les garde-fous (filtres de contenu) s'appliquent à chaque invite, image d'entrée et sortie d'image : une requête bloquée échoue avec le code d'erreur `contentFilter` (« Your task failed as a result of our safety system ») et une sortie bloquée avec « Generated image was filtered as a result of our safety system ». Les images photoréalistes de mineurs sont bloquées par défaut. Les images générées portent des Content Credentials (voir le chapitre sur l'IA responsable pour le contenu multimodal).

Une bonne invite indique le sujet, la composition, le style et l'éclairage ; pour une vidéo, ajoutez le plan et le mouvement de caméra. Sora 2 est faible sur la physique complexe, les relations de cause à effet, la gauche et la droite, et l'enchaînement précis d'événements comme les mouvements de caméra : gardez ces exigences simples.

> **Conseil d'examen.** Arrière-plan transparent, PNG et compression JPEG sont liés : `background="transparent"` avec `output_format="jpeg"` ne peut pas fonctionner, et `output_compression` ne compte que pour le JPEG.

<!-- section: key-points -->
## Points clés

- DALL-E 3 est mis hors service ; utilisez un modèle `gpt-image`. La sortie est uniquement en base64 (`b64_json`).
- `images.generate` = texte vers image ; `images.edit` = image(s) + invite, avec un masque facultatif ; jusqu'à 16 images d'entrée.
- Masque : PNG, même taille, pixels transparents = zone à changer. Sans masque, toute l'image peut changer.
- `input_fidelity` conserve les visages et le style ; indisponible sur `gpt-image-1-mini`.
- Sora 2 : travail asynchrone (`videos.create`, interrogation avec `videos.retrieve`, `download_content`), 4, 8 ou 12 secondes, deux travaux simultanés, conservé 24 heures.
- `input_reference` = première image, même résolution que `size` ; les visages dans les images d'entrée sont refusés.
- Modifiez une vidéo générée avec `videos.remix`, un changement par remix.
- L'arrière-plan transparent exige PNG ; `quality="low"` pour la vitesse ; `stream` avec `partial_images` pour un affichage progressif.
