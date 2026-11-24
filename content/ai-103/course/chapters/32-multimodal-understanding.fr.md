Deux briques de Foundry comprennent les images et la vidéo. Un **modèle multimodal** (modèle de conversation compatible avec la vision) répond à une invite portant sur une ou plusieurs images : souple et piloté par des instructions. **Azure Content Understanding** dans Foundry Tools exécute un **analyseur** qui transforme images, vidéos, audio et documents en Markdown ou en champs conformes à votre schéma : reproductible et structuré. Les questions d'examen demandent lequel convient à un besoin, comment le configurer et comment lire sa sortie.

<!-- section: visual-context | objectives: 3.2.1 -->
## Analyser le contexte visuel avec des modèles multimodaux

Les modèles compatibles avec la vision comprennent la série GPT-4.1, la série GPT-5, les modèles de raisonnement de la série o, GPT-4.5 et la série GPT-4o. Un déploiement limité au texte, ou un modèle d'embedding, ne peut pas lire une image, quoi que dise l'invite.

Avec l'API Responses, une image est une partie de contenu de type `input_image` à côté d'une partie `input_text` :

```text
response = client.responses.create(
    model="vision-chat",                         # deployment name
    instructions="You inspect photos of delivery damage for Tailspin Toys.",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "Is the box damaged? Answer in one sentence."},
            {"type": "input_image", "image_url": "https://contoso.example/parcel.jpg"},
            {"type": "input_image",
             "image_url": f"data:image/jpeg;base64,{b64_photo}",
             "detail": "high"},
        ],
    }],
)
print(response.output_text)
```

| Source de l'image | À utiliser quand |
| --- | --- |
| URL publique (`image_url`) | L'image est accessible depuis Internet |
| URL de données base64 (`data:image/jpeg;base64,...`) | L'image est locale ou privée |
| `file_id` | Le fichier a été chargé avec l'API Files |

L'API Chat Completions reçoit la même image sous forme de partie de type `image_url` (`{"type": "image_url", "image_url": {"url": ...}}`).

Le réglage `detail` arbitre entre précision d'une part, jetons et latence d'autre part :

| `detail` | Comportement |
| --- | --- |
| `auto` (par défaut) | Le modèle choisit selon la taille de l'image |
| `low` | Une version basse résolution de 512 x 512 : le plus rapide, le moins de jetons, peut manquer les petits détails |
| `high` | La vue basse résolution plus des segments détaillés de 512 x 512 : petit texte et détails fins, plus de jetons |

Avec Chat Completions, les formats pris en charge sont JPEG, PNG, WEBP et GIF (première image seulement), jusqu'à 20 Mo par image et 10 images par appel ; l'API Responses accepte les GIF non animés et jusqu'à 50 images par requête, la requête entière restant sous 512 Mo. Les URL d'images doivent être **accessibles publiquement** : une URL derrière un point de terminaison privé, une restriction de réseau virtuel ou un pare-feu n'est pas lue, même sur un compte de stockage du même réseau virtuel ou d'un réseau virtuel connecté par peering. Réglez `max_output_tokens` (Responses) ou `max_tokens` / `max_completion_tokens` (Chat Completions) assez haut : un `finish_reason` à `length` signifie que la réponse a été coupée.

> **Piège d'examen.** Un compte de stockage qui n'autorise que l'accès privé ne peut pas fournir ses images au modèle par URL. Lisez l'objet blob dans l'application et envoyez-le sous forme d'**URL de données base64**.

<!-- section: captions | objectives: 3.2.2 -->
## Produire des légendes concises ou détaillées

La longueur et l'angle d'une légende se règlent par l'invite et la requête, pas par un service séparé.

| Besoin | Configuration |
| --- | --- |
| Une courte légende par photo pour une galerie | Instruction « une phrase, 15 mots au plus », `max_output_tokens` bas, `detail: "low"` souvent suffisant |
| Une description détaillée d'une photo complexe | Instruction listant ce qu'il faut couvrir (lieu, personnes, actions, texte visible), `detail: "high"` |
| Des légendes pour plusieurs images en un appel | Plusieurs parties `input_image` dans un message, chacune précédée d'une étiquette `input_text` (« Image 1 : ... ») |
| Des légendes qu'une application doit stocker par image | Sorties structurées : un schéma JSON avec un tableau de `{ "imageId", "caption" }` |
| Des descriptions consultables pour des milliers d'images | `prebuilt-imageSearch` de Content Understanding (descriptions visuelles et informations pour la récupération) |

Étiqueter chaque image permet au modèle et à votre code de désigner « Image 2 » sans ambiguïté.

> **Conseil d'examen.** « Concise » et « détaillée » sont deux invites sur le même déploiement. Un nouveau modèle ou un service supplémentaire est la mauvaise réponse quand seuls la longueur ou le niveau de détail changent.

<!-- section: visual-qa | objectives: 3.2.3 -->
## Répondre à des questions à partir de preuves visuelles

Une réponse visuelle ancrée ne vient que de ce que montre l'image, et le dit quand l'image ne le montre pas.

- **Instructions** : répondre uniquement à partir des images fournies ; citer exactement le texte visible ; indiquer où se trouve la preuve (« jauge en bas à gauche ») ; si la réponse n'est pas visible, répondre qu'elle ne peut pas être déterminée à partir de l'image.
- La **sortie structurée** sépare la réponse de ses preuves, pour que l'application puisse les afficher ou les vérifier :

```json
{
  "type": "json_schema",
  "name": "visual_answer",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "answer": { "type": "string" },
      "answerable": { "type": "boolean" },
      "evidence": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["answer", "answerable", "evidence"],
    "additionalProperties": false
  }
}
```

Cet objet se place dans `text.format` d'une requête Responses (`response_format` avec une enveloppe `json_schema` dans Chat Completions).

- **`detail: "high"`** quand la réponse dépend de petit texte, d'étiquettes ou de jauges.
- **Beaucoup d'images** : indexez-les d'abord. Un analyseur produit des descriptions pour un index de recherche ; le flux RAG récupère les images pertinentes, ou leurs descriptions, et les envoie au modèle avec la question.

> **Piège d'examen.** Augmenter `temperature` ou ajouter « sois précis » n'ancre pas une réponse. L'ancrage vient de la restriction de la source (l'image), de la demande de preuves et de l'autorisation de répondre « impossible à déterminer ».

<!-- section: alt-text | objectives: 3.2.4 -->
## Générer du texte de remplacement et des descriptions étendues

Les recommandations d'accessibilité de Microsoft pour le texte de remplacement (Microsoft Writing Style Guide) donnent les règles que l'invite doit encoder :

| Règle | Dans l'invite |
| --- | --- |
| Transmettre l'**objectif** de l'image, de façon concise ; cela demande du jugement, pas chaque détail | « Décris ce que l'image signifie dans ce contexte » et transmettre le texte environnant |
| **150 caractères** au plus | Une limite de longueur, revérifiée dans le code |
| Ne pas commencer par « Image » (les lecteurs d'écran l'annoncent déjà) ; dire ce que c'est : photographie, diagramme, graphique, capture d'écran | Instruction explicite |
| Ne pas répéter le texte environnant ni la légende ; ne pas utiliser le nom du fichier | Transmettre la légende pour que le modèle l'évite |
| Inclure le texte incorporé si la page ne le contient pas déjà | « Inclure le texte visible qui compte » |
| Les images décoratives n'ont pas besoin de texte de remplacement : dans du contenu web, utiliser un `alt=""` vide | Un champ `isDecorative` |
| Une image complexe (graphique, diagramme) reçoit une **description détaillée** dans le texte environnant ou dans un contenu lié | Un champ `longDescription` séparé |

Le contenu vidéo demande des sous-titres et des descriptions audio, et la miniature d'une vidéo a besoin d'un texte de remplacement.

Un schéma avec `altText`, `isDecorative` et `longDescription` renvoie tout en un appel ; l'application applique la limite de longueur et oriente les cas douteux vers un relecteur humain.

> **Piège d'examen.** Une légende détaillée n'est pas un texte de remplacement. Pour un graphique, le texte de remplacement nomme le graphique et son message clé en une phrase, et les données vont dans une **description étendue**.

<!-- section: content-understanding-images | objectives: 3.2.5 -->
## Extraire des caractéristiques visuelles avec Content Understanding

Content Understanding est un Foundry Tool de la ressource Foundry. L'API GA actuelle est `2025-11-01` ; `2026-06-01-preview` ajoute des fonctionnalités en préversion. Un **analyseur** réunit les paramètres d'extraction de contenu, un **schéma de champs** et les déploiements de modèles qu'il utilise (vous apportez vos propres déploiements Foundry de LLM et d'embedding).

```json
{
  "analyzerId": "shelfAudit",
  "description": "Photos of store shelves taken by Northwind field staff",
  "baseAnalyzerId": "prebuilt-image",
  "config": { "returnDetails": true },
  "fieldSchema": {
    "name": "ShelfFields",
    "fields": {
      "productFacings": {
        "type": "number",
        "method": "generate",
        "description": "Number of visible Northwind cereal boxes facing the aisle"
      },
      "shelfCondition": {
        "type": "string",
        "method": "classify",
        "description": "Overall state of the shelf",
        "enum": ["Full", "PartiallyEmpty", "Empty"]
      }
    }
  },
  "models": { "completion": "gpt-5.2" }
}
```

| Propriété | Signification |
| --- | --- |
| `analyzerId` | Le nom utilisé dans les appels (lettres, chiffres, points, traits de soulignement) |
| `description` | Contexte que le modèle utilise pendant l'extraction des champs |
| `baseAnalyzerId` | `prebuilt-image`, `prebuilt-video`, `prebuilt-audio` ou `prebuilt-document` : un analyseur personnalisé ne peut dériver que de ces quatre analyseurs de base |
| `fieldSchema` | Champs avec `type` (`string`, `number`, `boolean`, `date`, `object`, `array`), `description` et `method` |
| `models` | Noms de modèles du catalogue (par exemple `gpt-5.2`), pas des noms de déploiements |

Méthodes de champ : `generate` (valeur libre, comme une description ou un nombre), `classify` (une valeur d'une `enum`), `extract` (valeur telle qu'elle apparaît, **documents uniquement**).

```bash
curl -X PUT "https://{endpoint}/contentunderstanding/analyzers/shelfAudit?api-version=2025-11-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  -d @shelfAudit.json

curl -X POST "https://{endpoint}/contentunderstanding/analyzers/shelfAudit:analyze?api-version=2025-11-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  -d '{"inputs":[{"url":"https://contoso.example/shelf-042.jpg"}]}'
```

La création renvoie `201 Created` et l'analyse `202 Accepted`, toutes deux avec un en-tête `Operation-Location` : interrogez-le jusqu'à ce que `status` vaille `Succeeded`.

Content Understanding Studio est l'endroit où l'on crée des analyseurs personnalisés ; le terrain de jeu Content Understanding dans Foundry exécute les analyseurs prédéfinis pris en charge mais ne permet pas d'en créer.

> **Piège d'examen.** Les analyseurs d'images ne sont pas optimisés pour une analyse fondée surtout sur le texte de l'image. Pour lire et extraire le texte de formulaires numérisés ou de reçus, utilisez un analyseur de documents (`prebuilt-document`, `prebuilt-read`, `prebuilt-layout`).

<!-- section: video-analysis | objectives: 3.2.6 -->
## Traiter et interpréter des segments vidéo

Un analyseur vidéo fonctionne en deux étapes.

**Extraction de contenu** : une transcription au format WEBVTT (avec diarisation des locuteurs, et transcription multilingue quand aucun paramètre régional n'est défini), des images clés qui représentent chaque plan, et la détection des plans. Avec `"returnDetails": true`, le résultat donne aussi les horodatages par phrase et les limites des plans dans `cameraShotTimesMs`.

**Extraction de champs et segmentation** : le modèle génératif remplit vos champs pour chaque segment.

| `enableSegment` | Comportement | Exemple |
| --- | --- | --- |
| `false` | Toute la vidéo forme un seul segment | Contrôle de sécurité de marque d'une publicité, résumé de la vidéo entière |
| `true` | Le modèle découpe la vidéo selon une description en langage naturel dans `contentCategories` | Un segment par sujet d'actualité, publicités séparées des programmes |

```json
{
  "analyzerId": "newsSegments",
  "baseAnalyzerId": "prebuilt-video",
  "config": {
    "returnDetails": true,
    "enableSegment": true,
    "contentCategories": {
      "news-story": {
        "description": "Each distinct news story, no overlap. Ignore ads and promotions.",
        "analyzerId": "newsStoryAnalyzer"
      }
    }
  },
  "models": { "completion": "gpt-5.2" }
}
```

Chaque segment est ensuite analysé par `newsStoryAnalyzer`, dont le schéma de champs porte les champs propres à chaque sujet (thème, personnes citées, lieu). Un analyseur vidéo prend en charge **un seul** objet de catégories de contenu. La segmentation utilise le modèle génératif et consomme des jetons même si aucun champ n'est défini. L'analyseur prêt à l'emploi `prebuilt-videoSearch` fournit les transcriptions et des résumés par segment avec détection automatique des scènes, en Markdown prêt pour un magasin de vecteurs.

Limites à retenir : environ **une image par seconde** est échantillonnée, les images sont redimensionnées en carrés de 512 pixels (le petit texte et les objets lointains peuvent être perdus), et seule la parole est transcrite (pas la musique ni les effets sonores).

> **Piège d'examen.** Les modèles de conversation multimodaux reçoivent des images, pas des fichiers vidéo. Pour interroger un modèle de conversation sur une vidéo, l'application doit extraire elle-même des images ; pour des champs par scène, des transcriptions et des horodatages, utilisez un analyseur vidéo Content Understanding.

<!-- section: cu-pipelines | objectives: 3.2.7 -->
## Pipelines à tâche unique et en mode pro

Les pipelines **à tâche unique** sont ce que font la plupart des analyseurs : un analyseur, un fichier d'entrée, un passage d'extraction de contenu puis d'extraction de champs (`extract`, `classify`, `generate`). Un analyseur prédéfini (`prebuilt-read`, `prebuilt-layout`, `prebuilt-imageSearch`) ou un analyseur personnalisé effectue chacun une tâche. Les pipelines se composent par **routage** : `contentCategories` classe un fichier ou ses segments et envoie chaque catégorie à l'analyseur nommé dans son `analyzerId`, en une seule exécution. Seuls les analyseurs de documents et de vidéos prennent en charge `contentCategories` (et `enableSegment`) ; un analyseur d'images, non.

Le **mode pro** est apparu, en préversion, avec l'API `2025-05-01-preview` ; les notes de publication de l'API en disponibilité générale `2025-11-01` ne le mentionnent pas. Le mode par défaut de tout analyseur est **standard**. Le mode pro ajoute le **raisonnement**, **plusieurs documents d'entrée** dans une même analyse, et une **base de connaissances externe** (données de référence) pour la liaison, l'enrichissement et la validation. Il vise des tâches qui demandaient auparavant du code personnalisé ou un humain : agréger un schéma sur plusieurs fichiers, valider des résultats d'un document à l'autre, utiliser des données de référence pour produire la sortie. Le mode pro est limité aux **documents**.

| Exigence | Pipeline |
| --- | --- |
| Des champs pour chaque photo ou chaque segment vidéo | Tâche unique (standard) |
| Des fichiers variés routés vers le bon analyseur | Classification avec `contentCategories` |
| Rapprocher une facture d'un bon de commande et d'une liste de fournisseurs | Mode pro (documents, `2025-05-01-preview`) |
| Un calcul en plusieurs étapes ou une validation dans un seul document | Mode agentique (préversion) |

Dans l'API en préversion actuelle (`2026-06-01-preview`), le raisonnement en plusieurs étapes sur un document s'appelle le **mode agentique** : réglez `config.workflow` sur `"agentic"` pour un analyseur de documents (un fichier d'entrée par requête pour l'instant) ; `"default"`, ou l'absence de `workflow`, laisse le service choisir un flux standard. L'expérience Foundry (classique) qui créait les tâches en mode standard et en mode pro est mise hors service.

> **Piège d'examen.** Le raisonnement sur plusieurs fichiers et sur des données de référence est une capacité propre aux documents. Pour des images ou des vidéos, concevez un analyseur à tâche unique par modalité et faites le rapprochement dans votre application ou dans un agent.

<!-- section: objects-regions | objectives: 3.2.8 -->
## Identifier des objets, des composants et des régions

| Besoin | Meilleur choix |
| --- | --- |
| Nommer et compter les objets d'une photo, questions variables | Modèle multimodal, avec sortie structurée (liste d'objets, nombre, position décrite en mots) |
| Les mêmes champs sur chaque image : nombre de produits, type de défaut, composant présent ou absent | Analyseur d'images Content Understanding (`generate` pour les nombres, `classify` pour les états) |
| Quelle partie d'une vidéo montre le produit, avec heures de début et de fin | Analyseur vidéo Content Understanding avec segmentation |
| La région source de chaque valeur extraite d'un document | Analyseur de documents avec `estimateFieldSourceAndConfidence` (ancrage et confiance de 0 à 1) |
| Des rectangles englobants en pixels autour des objets | Azure Vision Image Analysis 4.0 (détection d'objets, légendes denses) : déprécié, mis hors service le 25 septembre 2028 |

Les recommandations de migration de Microsoft pour Image Analysis désignent deux remplaçants : les **modèles GPT dans Foundry** pour des solutions de vision souples et personnalisées, et **Content Understanding** pour une solution générative managée qui renvoie des informations structurées dans un format prédéfini ou défini par l'utilisateur.

Rédigez précisément les champs de composants : « Is the motor's safety cover present? Present, Missing or NotVisible » (`classify`) vaut mieux que « décris le moteur ».

> **Piège d'examen.** Une exigence de coordonnées exactes en pixels n'est pas satisfaite par la description d'un modèle de conversation (« dans le coin supérieur gauche »). Lisez l'exigence : des positions décrites en mots, une classification par composant ou de vrais rectangles englobants mènent à des réponses différentes.

<!-- section: key-points -->
## Points clés

- Modèle multimodal = compréhension d'image pilotée par l'invite ; Content Understanding = analyseurs avec un schéma, pour une sortie structurée reproductible.
- Images : `input_image` (Responses) ou `image_url` (Chat Completions) ; URL publique, URL de données base64 ou `file_id` ; les images privées partent en base64.
- `detail` : `low` pour la vitesse et le coût, `high` pour le petit texte, `auto` par défaut.
- Légendes et texte de remplacement sont des invites plus des schémas ; texte de remplacement : objectif, 150 caractères au plus, pas de « Image de », `alt=""` pour les images décoratives, description longue pour les graphiques.
- Réponses visuelles ancrées : se limiter à l'image, renvoyer les preuves, autoriser « impossible à déterminer ».
- Analyseur = `baseAnalyzerId` + `config` + `fieldSchema` + `models` ; méthodes `generate`, `classify`, `extract` (documents uniquement).
- Vidéo : transcription WEBVTT, images clés, plans ; `enableSegment` + un seul `contentCategories` ; environ 1 image par seconde.
- Mode pro (préversion, `2025-05-01-preview`) : raisonnement, plusieurs documents, données de référence, documents uniquement ; mode agentique dans la préversion actuelle. `contentCategories` : analyseurs de documents et de vidéos uniquement.
