Les agents et les pipelines RAG ne raisonnent bien que sur une entrée propre : du texte dans l'ordre de lecture, des tableaux restés des tableaux, des figures décrites et des valeurs nommées fiables. Azure Content Understanding dans Foundry Tools produit cette entrée à partir de documents, d'images, d'audio et de vidéo, au moyen d'analyseurs qui renvoient du Markdown, des champs JSON, ou les deux. L'examen demande quel analyseur utiliser, comment en définir un personnalisé et comment sa sortie alimente le raisonnement en aval.

<!-- section: multimodal-pipeline | objectives: 5.2.1 -->
## Pipelines multimodaux : OCR, disposition et extraction de champs

Content Understanding est un service Foundry : il faut une ressource Foundry. Une analyse passe par des étapes que la configuration de l'analyseur active ou désactive :

| Étape | Ce qu'elle fait | Configurée par |
| --- | --- | --- |
| Extraction de contenu | OCR, marques de sélection, codes-barres, formules, disposition (paragraphes, tableaux, figures, sections, ordre de lecture) ; transcription pour l'audio et la vidéo | `enableOcr`, `enableLayout`, `enableFormula`, `enableBarcode` (tous à `true` par défaut) |
| Segmentation et classification | Découpe un fichier en sections logiques et classe chacune, éventuellement en la routant vers un autre analyseur | `contentCategories`, `enableSegment` |
| Extraction de champs | Remplit les champs d'un schéma, à l'aide d'un modèle génératif | `fieldSchema`, `models` |
| Confiance et ancrage | Un score de 0 à 1 et l'emplacement source (page, cadre englobant) de chaque valeur de champ ; analyseurs de documents, toutes les méthodes de champ | `estimateFieldSourceAndConfidence`, ou `estimateSourceAndConfidence` sur un champ (prioritaire sur le paramètre de l'analyseur) |

L'extraction de champs a trois méthodes :

| `method` | La valeur est | Exemple |
| --- | --- | --- |
| `extract` | Copiée telle qu'elle apparaît dans le contenu (documents uniquement) ; exige l'estimation de la source et de la confiance | Numéro de facture, date d'échéance |
| `generate` | Produite par le modèle à partir du contenu | Un résumé en une phrase, les conditions de paiement en clair |
| `classify` | Choisie dans un ensemble prédéfini | Type de document, priorité |

Les analyseurs prédéfinis couvrent les cas courants :

| Analyseur | Renvoie | Modèle nécessaire |
| --- | --- | --- |
| `prebuilt-read` | Mots, paragraphes, formules, codes-barres (OCR) | Non |
| `prebuilt-layout` | Le texte plus les tableaux, figures, sections, liens hypertexte | Non |
| `prebuilt-digitalParse` | Le contenu des fichiers numériques, lu dans leur structure interne (pas pour les fichiers numérisés : utilisez `prebuilt-read` ou `prebuilt-layout`) | Non |
| `prebuilt-invoice`, `prebuilt-receipt`, `prebuilt-contract`, `prebuilt-idDocument`... | Les champs d'un domaine sans écrire de schéma | Oui |
| `prebuilt-documentSearch`, `prebuilt-imageSearch`, `prebuilt-audioSearch`, `prebuilt-videoSearch` | Du Markdown et des descriptions pour le RAG | Oui |
| `prebuilt-document`, `prebuilt-image`, `prebuilt-audio`, `prebuilt-video` | Les analyseurs de base dont dérivent les analyseurs personnalisés | Via l'analyseur personnalisé |

Le service a besoin d'un modèle de complétion de conversation et d'un modèle d'embedding déployés dans la ressource Foundry. Les analyseurs prédéfinis y font référence par des alias (`prebuilt-analyzer-completion`, `prebuilt-analyzer-completion-mini` pour les analyseurs `prebuilt-*Search`, `prebuilt-analyzer-embedding`) associés à vos déploiements, soit comme valeurs par défaut de la ressource, soit à chaque requête avec `modelDeployments`. Vous payez les compteurs de Content Understanding plus les jetons des déploiements connectés, et les garde-fous de ces déploiements s'appliquent. Rôles intégrés : Cognitive Service Content Understanding Owner, Contributor et Reader.

| Besoin | Choisissez |
| --- | --- |
| Les mêmes champs sur des milliers de documents, avec une confiance pour la révision humaine | Un analyseur Content Understanding avec un schéma |
| Texte et tableaux seulement, sans modèle génératif, au coût le plus bas | `prebuilt-read` ou `prebuilt-layout` |
| Une question ponctuelle sur une image ou un document | Une invite à un modèle multimodal |

> **Piège d'examen.** L'invite d'un modèle multimodal renvoie une réponse, pas un schéma reproductible avec un score de confiance et un emplacement source par valeur. Quand l'exigence dit « envoyer les valeurs peu fiables à un réviseur » ou « montrer d'où vient chaque valeur », la réponse est un analyseur avec `estimateFieldSourceAndConfidence`.

<!-- section: grounded-representations | objectives: 5.2.2 -->
## Des représentations propres et ancrées pour les agents et le RAG

Un index RAG ne vaut que par le texte qu'il découpe. Le texte brut d'un PDF perd la structure des tableaux, mélange les colonnes et ignore les graphiques. Les analyseurs RAG produisent une représentation conçue pour la récupération :

| Analyseur | Sortie pour le raisonnement en aval |
| --- | --- |
| `prebuilt-documentSearch` | Du Markdown avec la disposition (paragraphes, tableaux, figures), des descriptions de figures, les graphiques en chart.js et les diagrammes en mermaid.js, les annotations manuscrites, un résumé d'un paragraphe et des blocs prêts pour l'embedding |
| `prebuilt-imageSearch` | Une description de l'image et de son contenu visuel |
| `prebuilt-audioSearch` | La transcription et un résumé d'un paragraphe de la conversation |
| `prebuilt-videoSearch` | Transcriptions et descriptions par segment, avec segmentation automatique par scène ou par sujet |

Un flux type : analyser chaque fichier, conserver `contents[].markdown` (et le résumé ou les champs), le découper en blocs et en calculer les embeddings, l'indexer dans Azure AI Search avec des métadonnées comme le nom du fichier et la page, puis laisser l'outil de connaissances de l'agent le récupérer. Comme le Markdown conserve titres et tableaux, les blocs suivent les sections du document et une ligne de tableau reste avec son en-tête.

Les paramètres qui modifient la représentation :

| Paramètre | Effet |
| --- | --- |
| `tableFormat` | `html` (par défaut) ou `markdown` pour les tableaux extraits |
| `enableFigureDescription` | Des descriptions des figures en langage naturel (par défaut `false`) |
| `enableFigureAnalysis` | Les données des graphiques et les composants des diagrammes (par défaut `false`) |
| `returnDetails` | Ajoute confiance, cadres englobants, étendues de texte et métadonnées ; réponses plus volumineuses |
| `omitContent` | Ne renvoie que les champs ou les résultats des sous-analyseurs, sans l'objet de contenu |

L'ancrage joue à deux niveaux. Pour le RAG, chaque bloc garde un lien vers son fichier et sa page, ce qui permet à l'agent de le citer. Pour les champs, `estimateFieldSourceAndConfidence` renvoie la page et le cadre englobant de chaque valeur : un réviseur ou une application peut remonter à son origine, et des scores élevés autorisent un traitement entièrement automatique.

> **Conseil d'examen.** « L'agent doit répondre aux questions sur les graphiques du rapport annuel » désigne les descriptions de figures et l'extraction des graphiques (`prebuilt-documentSearch`, ou `enableFigureDescription` et `enableFigureAnalysis` dans un analyseur personnalisé). L'OCR seul renvoie les libellés du graphique, pas ce qu'il montre.

<!-- section: custom-analyzers | objectives: 5.2.3 -->
## Implémenter des analyseurs pour une sortie structurée ou Markdown

Un analyseur personnalisé dérive d'un analyseur de base et ajoute une configuration et un schéma de champs :

```json
{
  "analyzerId": "fabrikamClaimAnalyzer",
  "description": "Extracts claim data from Fabrikam insurance claim forms",
  "baseAnalyzerId": "prebuilt-document",
  "config": {
    "returnDetails": true,
    "enableOcr": true,
    "enableLayout": true,
    "tableFormat": "markdown",
    "estimateFieldSourceAndConfidence": true
  },
  "fieldSchema": {
    "name": "ClaimFields",
    "fields": {
      "PolicyNumber": { "type": "string", "method": "extract", "description": "Policy number, labeled Policy No. or Policy #" },
      "IncidentDate": { "type": "date", "method": "extract", "description": "Date of the incident" },
      "Damages": {
        "type": "array",
        "method": "generate",
        "description": "Each damaged item listed in the damages table",
        "items": {
          "type": "object",
          "properties": {
            "Item": { "type": "string" },
            "EstimatedCost": { "type": "number" }
          }
        }
      },
      "Summary": { "type": "string", "method": "generate", "description": "One-sentence summary of the incident" }
    }
  },
  "models": { "completion": "prebuilt-analyzer-completion", "embedding": "prebuilt-analyzer-embedding" }
}
```

| Propriété | Règle |
| --- | --- |
| `baseAnalyzerId` | Uniquement `prebuilt-document`, `prebuilt-image`, `prebuilt-audio` ou `prebuilt-video` |
| `description` (analyseur et champ) | Utilisée par le modèle comme contexte : la description d'un champ est une mini-invite, soyez précis |
| `type` | `string`, `number`, `boolean`, `date`, `object`, `array` ; `object` a des `properties`, `array` a des `items` |
| `method` | `extract`, `generate`, `classify` ; si elle est omise, le service choisit |
| `models` | Des noms de modèles Foundry ou des alias, pas des noms de déploiements ; ils doivent figurer parmi les modèles pris en charge par l'analyseur de base |

Créez l'analyseur, puis lancez une analyse avec lui (version d'API `2025-11-01`, en disponibilité générale) :

```text
PUT  {endpoint}/contentunderstanding/analyzers/fabrikamClaimAnalyzer?api-version=2025-11-01
POST {endpoint}/contentunderstanding/analyzers/fabrikamClaimAnalyzer:analyze?api-version=2025-11-01
     body: { "inputs": [ { "url": "https://<storage>/claims/claim-0042.pdf" } ] }
GET  the Operation-Location URL until the status is Succeeded
```

L'analyse est asynchrone. Le résultat contient une liste `contents` dont les entrées portent `markdown` et `fields` ; avec l'estimation de la confiance, chaque champ porte aussi sa confiance et sa source. En Python, `ContentUnderstandingClient.begin_analyze(analyzer_id=..., inputs=[...])` renvoie un poller, et `poller.result()` renvoie ce résultat. L'analyse asynchrone d'un fichier PDF ou TIFF accepte jusqu'à 2 000 pages par défaut.

Choisissez la sortie selon le consommateur :

| Consommateur en aval | Sortie |
| --- | --- |
| Un index RAG ou un agent qui lit le document | Markdown (`contents[].markdown`), sans schéma |
| Un flux de travail qui écrit dans une base de données ou appelle une API | Les champs JSON du schéma, avec leur confiance |
| Un fichier qui regroupe plusieurs types de documents | `contentCategories` avec `enableSegment` : chaque segment est classé et peut être routé vers son propre analyseur |
| Les champs seulement, des réponses plus légères | `omitContent: true` |

Un analyseur de classification liste des catégories, chacune avec une description et éventuellement l'`analyzerId` qui la traite :

```json
{
  "config": {
    "enableSegment": true,
    "contentCategories": {
      "claimForm": { "description": "Insurance claim form filled by the customer", "analyzerId": "fabrikamClaimAnalyzer" },
      "repairInvoice": { "description": "Invoice from a repair shop", "analyzerId": "prebuilt-invoice" },
      "other": { "description": "Any other page" }
    }
  }
}
```

Ajoutez une catégorie `other` : sans elle, chaque page est forcée dans l'une de vos catégories. Une catégorie sans `analyzerId` est classée mais pas analysée. La classification travaille par page (la plus petite unité), avec jusqu'à 200 catégories, et sans données d'entraînement. Un analyseur vidéo n'accepte qu'une seule entrée `contentCategories` : pour la vidéo, les catégories servent à la segmentation.

> **Piège d'examen.** `models` prend des noms de modèles ou des alias associés à des déploiements, pas votre nom de déploiement, et les champs `extract` exigent l'estimation de la source et de la confiance. `extract` n'est pris en charge que par les analyseurs de documents : un analyseur audio, vidéo ou d'image utilise `generate` ou `classify`. La confiance et la source ne se limitent pas à `extract` : les analyseurs de documents les renvoient aussi pour les champs `generate` et `classify`. Une question qui met `"method": "extract"` pour une valeur qui n'est pas écrite dans le document (un résumé, un niveau de risque) utilise la mauvaise méthode : prenez `generate` ou `classify`.

<!-- section: key-points -->
## Points clés

- Étapes de Content Understanding : extraction de contenu (OCR, disposition), segmentation et classification, extraction de champs, confiance et ancrage.
- `prebuilt-read` et `prebuilt-layout` ne demandent aucun modèle génératif ; l'extraction de champs et les analyseurs RAG utilisent des déploiements de complétion et d'embedding associés par des alias.
- `prebuilt-documentSearch` fournit un Markdown prêt pour le RAG, avec descriptions de figures, résumé et blocs.
- Analyseur personnalisé : `baseAnalyzerId`, `config`, `fieldSchema` avec `type`, `method` (`extract`, `generate`, `classify`) et `description`, `models`.
- `estimateFieldSourceAndConfidence` ajoute la confiance et l'emplacement source de chaque valeur, pour toutes les méthodes de champ d'un analyseur de documents : la base de la révision humaine et des citations. `extract` est réservé aux analyseurs de documents.
- L'analyse est asynchrone : interrogez `Operation-Location`, ou `begin_analyze` puis `poller.result()`.
