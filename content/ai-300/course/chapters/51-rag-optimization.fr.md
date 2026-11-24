Une application de génération augmentée par récupération (RAG) ne vaut que par les passages qu'elle récupère : un modèle parfait ancré sur les mauvais blocs donne une réponse fluide et fausse. Optimiser une solution RAG, c'est régler le pipeline de récupération (taille des blocs, chevauchement, nombre de candidats, seuils, filtres, réécriture des requêtes), choisir le bon modèle d'incorporation, combiner recherche par mots clés et recherche vectorielle avec un reclassement, et prouver chaque changement par des métriques avant qu'il n'atteigne tous les utilisateurs. Les exemples utilisent Azure AI Search, le moteur de récupération de Microsoft Foundry. Les questions d'examen décrivent un symptôme de récupération et demandent quel paramètre, quel modèle, quelle forme de requête ou quelle métrique le corrige ou le mesure.

<!-- section: retrieval-tuning | objectives: 5.1.1 -->
## Régler les blocs, les seuils et les stratégies de récupération

La **segmentation en blocs** (chunking) découpe les documents avant leur incorporation. Raisons : les modèles d'incorporation ont une limite d'entrée (8 191 jetons pour `text-embedding-3-small`, environ 6 000 mots), la troncation perd du contenu, et un long document qui traite plusieurs sous-sujets est mal représenté par un seul vecteur.

| Technique | Méthode | Option intégrée |
| --- | --- | --- |
| Taille fixe | Même longueur avec 10 à 15 % de chevauchement (par exemple 200 mots ou 600 caractères) | Compétence Text Split, `textSplitMode: pages` |
| Taille variable | Découpage sur les phrases, les fins de ligne ou les titres Markdown et HTML | Compétence Text Split, `textSplitMode: sentences` ; compétence Content Understanding |
| Sémantique | Garder ensemble les phrases et paragraphes liés, même d'une page à l'autre | Compétence Content Understanding (sortie Markdown) |
| Personnalisée | Combiner les approches, ou ajouter le titre du document à chaque bloc | Compétence personnalisée |

Le point de départ recommandé par Microsoft est de **512 jetons (environ 2 000 caractères) avec 25 % de chevauchement (128 jetons)**. Les données structurées peuvent demander moins de chevauchement, les textes narratifs ou conversationnels davantage. Avec la compétence Text Split, la valeur par défaut recommandée en caractères est :

```json
{
  "@odata.type": "#Microsoft.Skills.Text.SplitSkill",
  "textSplitMode": "pages",
  "maximumPageLength": 2000,
  "pageOverlapLength": 500,
  "maximumPagesToTake": 0,
  "inputs": [ { "name": "text", "source": "/document/content" } ],
  "outputs": [ { "name": "textItems", "targetName": "pages" } ]
}
```

`pageOverlapLength` doit être **inférieur à la moitié** de `maximumPageLength` ; `maximumPagesToTake` à 0 prend tous les blocs. Des blocs plus petits et plus de chevauchement produisent plus de blocs (plus de stockage, plus de coût d'incorporation). Choisissez une taille qui convient à tous les modèles du pipeline, par exemple le modèle d'incorporation et le modèle de conversation.

**Combien de résultats.** Les requêtes vectorielles renvoient les `k` plus proches voisins, `top` fixe le nombre de résultats d'une requête hybride, et les deux valent **50** par défaut s'ils ne sont pas définis. Un réglage équilibré est `k` de 30 à 50 et `top` de 10 à 20. Le pipeline recommandé par Microsoft : récupérer large (20 à 50 candidats), fusionner avec RRF, reclasser, puis garder les 5 ou 10 premiers pour la génération. La récupération optimise le **rappel**, le reclassement optimise la **précision**.

Les **seuils de similarité** écartent les correspondances faibles des requêtes purement vectorielles (préversion, `api-version=2026-08-01-preview`) :

```json
{
  "vectorQueries": [
    {
      "kind": "vector",
      "vector": [0.012, -0.044, 0.031],
      "fields": "contentVector",
      "k": 10,
      "threshold": { "kind": "vectorSimilarity", "value": 0.8 }
    }
  ]
}
```

Les résultats sous la valeur sont exclus même s'il en reste moins de `k`, et le filtrage a lieu avant la fusion. Les seuils ne conviennent pas aux requêtes hybrides, dont les scores RRF sont faibles et instables. Les scores du classeur sémantique varient aussi légèrement d'une exécution à l'autre : évitez des seuils trop fins sur ces scores.

**Autres leviers :**

| Levier | Effet |
| --- | --- |
| HNSW (`m`, `efConstruction`, `efSearch`) ou KNN exhaustif | HNSW est approximatif et rapide ; le KNN exhaustif parcourt tous les vecteurs (`"exhaustive": true` par requête). Le réglage de ces paramètres arbitre entre le rappel d'une part, la latence, la mémoire et l'empreinte disque d'autre part (valeurs par défaut `m` 4, `efConstruction` 400, `efSearch` 500) |
| Métrique de similarité | `cosine` pour les modèles d'incorporation Azure OpenAI |
| Filtres sur les champs de mots clés ou d'entités | Éliminent les documents non pertinents ; `vectorFilterMode` vaut `preFilter` (par défaut), `postFilter` (peut renvoyer moins de `top` résultats) ou `strictPostFilter` (préversion) |
| Réécriture de la requête | Corrige les requêtes vagues, les mots clés manquants et les mots superflus |
| Décomposition de la requête | Découpe une question complexe en sous-requêtes, récupérées séparément |
| Augmentation de la requête | Ajoute du contexte à une requête courte sans en changer le sens |
| HyDE | Incorpore une réponse hypothétique générée par un modèle, pour une similarité réponse à réponse |

| Symptôme | Correction probable |
| --- | --- |
| La réponse omet des détails répartis sur deux blocs | Plus de chevauchement ou des blocs plus grands |
| Les blocs mélangent plusieurs sujets, la récupération est floue | Des blocs plus petits ou sémantiques |
| Des passages non pertinents arrivent dans l'invite | Moins de résultats finaux après reclassement, un seuil vectoriel ou des filtres |
| Le bon document n'est jamais parmi les candidats | `k` plus grand, recherche hybride, réécriture de la requête |
| Les questions en plusieurs parties n'obtiennent qu'une réponse partielle | Décomposition de la requête |

> **Piège d'examen.** Learn ne recommande un seuil minimal que sur une requête purement vectorielle unique. Sur une requête hybride, le `@search.score` fusionné est un score RRF, pas une similarité : un seuil de 0,8 sur ce score fusionné éliminerait tout (un seuil `vectorSimilarity` ne filtre que les résultats vectoriels, avant la fusion). Pour écarter les résultats hybrides faibles, reclassez et gardez les N premiers.

<!-- section: embedding-models | objectives: 5.1.2 -->
## Sélectionner et ajuster les modèles d'incorporation

Le **même modèle d'incorporation** doit incorporer les blocs et les requêtes ; les dimensions du champ vectoriel doivent être égales à la sortie du modèle. Changer de modèle impose donc de réincorporer tout l'index.

| Modèle | Dimensions | Remarques |
| --- | --- | --- |
| `text-embedding-ada-002` | 1536 (fixe) | Génération précédente |
| `text-embedding-3-small` | 1 à 1536 | 1536 par défaut, coût plus faible |
| `text-embedding-3-large` | 1 à 3072 | 3072 par défaut, précision plus élevée, plus de stockage |

`dimensions` raccourcit la sortie des modèles text-embedding-3 ; définissez la même valeur sur le champ de l'index. Dans un pipeline d'indexeur, la **compétence Azure OpenAI Embedding** appelle le déploiement :

```json
{
  "@odata.type": "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill",
  "resourceUri": "https://contoso-foundry.openai.azure.com/",
  "deploymentId": "text-embedding-3-large",
  "modelName": "text-embedding-3-large",
  "dimensions": 1024,
  "inputs": [ { "name": "text", "source": "/document/pages/*" } ],
  "outputs": [ { "name": "embedding" } ]
}
```

Sans `apiKey` ni `authIdentity`, la compétence utilise l'identité affectée par le système du service de recherche, qui a besoin de **Cognitive Services OpenAI User** sur la ressource du modèle. La compétence accepte au plus 8 000 jetons de texte (découpez d'abord). Learn recommande pour la compétence un déploiement distinct de celui du vectoriseur de requêtes (même modèle), pour régler chacun et distinguer le trafic de l'indexeur de celui des requêtes. L'API d'incorporations accepte jusqu'à 8 192 jetons par entrée, 2 048 entrées par requête et 300 000 jetons par requête au total.

Démarche de sélection du Centre des architectures Azure :

1. Trouvez-vous vos entités et mots clés sur internet ? Alors un **modèle généraliste** les connaît probablement : partez des modèles les mieux classés du classement MTEB et testez-les sur vos données.
2. Domaine spécialisé : cherchez un **modèle de domaine** (par exemple un modèle d'incorporation biomédical) et testez-le.
3. Pas de modèle de domaine, ou il donne de mauvais résultats : **ajustez un modèle généraliste** sur votre vocabulaire. L'ajustement modifie les poids pour représenter vos termes et aide les domaines spécialisés comme la recherche de code ou les documents juridiques ; des données d'entraînement médiocres peuvent dégrader les résultats, donc évaluez avec soin, et vérifiez d'abord si l'ingénierie d'invite résout le problème.
4. Vérifiez toujours la licence et les langues prises en charge.

Pourquoi le vocabulaire compte : un mot absent du vocabulaire du modèle est découpé en sous-mots (*histamine* en *his*, *ta*, *mine*), ce qui donne une moins bonne correspondance vectorielle. Comparez les candidats par des **tests de récupération sur des requêtes réelles** : incorporez le contenu, exécutez les requêtes, vérifiez que les bons blocs reviennent. Les bancs d'essai reposent souvent sur des jeux de données académiques qui ne reflètent pas les données de l'entreprise, et un modèle plus grand n'est pas toujours meilleur : plus de dimensions, c'est plus de stockage, de calcul et de latence.

| Exigence | Choix |
| --- | --- |
| Coût et stockage minimaux, contenu général | `text-embedding-3-small`, ou moins de dimensions |
| Précision maximale sur du contenu général | `text-embedding-3-large` |
| Jargon métier que les modèles généralistes ignorent | Un modèle de domaine, sinon un modèle généraliste ajusté |
| Images ou schémas | Conversion en texte avec Content Understanding, puis incorporation avec un modèle de texte |

**Migrer vers un autre modèle d'incorporation.** Les dimensions d'un champ vectoriel ne peuvent pas changer, et des dimensions égales ne rendent pas deux modèles compatibles. Changer de vectoriseur ou de nom de déploiement ne régénère pas les vecteurs stockés, et les scores vectoriels bruts ne sont pas comparables d'un modèle à l'autre : revoyez les seuils de score. Avec les indexeurs intégrés, reconstruisez un nouvel index à partir des données sources avec un nouvel indexeur ; un second champ vectoriel dans le même index n'est possible qu'avec l'ingestion par envoi (push). `Cohere-embed-v3-english` et `Cohere-embed-v3-multilingual` sont dépréciés depuis le 15 novembre 2026 et mis hors service le 15 février 2027 (remplaçants `Cohere-embed-v5-fast` et `Cohere-embed-v5-pro`).

> **Piège d'examen.** Incorporer les requêtes avec un autre modèle, ou une autre valeur de `dimensions`, que les blocs indexés casse silencieusement la recherche vectorielle. Changer de modèle d'incorporation est un projet de réindexation complète, pas un changement de configuration de la requête.

<!-- section: hybrid-search | objectives: 5.1.3 -->
## Implémenter et régler la recherche hybride

Une **requête hybride** est une seule requête qui contient à la fois `search` (texte intégral, BM25) et `vectorQueries` (HNSW ou KNN exhaustif). Les deux s'exécutent en parallèle et la **fusion par rang réciproque** (RRF) les combine : chaque document reçoit `1/(rank + k)` par liste de résultats, avec une petite constante comme 60, et les scores sont additionnés. La recherche vectorielle trouve des passages conceptuellement proches sans mots communs ; la recherche par mots clés l'emporte sur les **codes produit, le jargon spécialisé, les dates et les noms de personnes**, là où la correspondance exacte compte. Microsoft indique que la récupération hybride avec le classeur sémantique apporte des gains de pertinence importants sur des jeux de données réels et de référence.

```json
{
  "search": "error E-4417 on the Fabrikam T200 printer",
  "vectorQueries": [
    {
      "kind": "text",
      "text": "error E-4417 on the Fabrikam T200 printer",
      "fields": "contentVector",
      "k": 50,
      "weight": 1.5
    }
  ],
  "filter": "productLine eq 'printers'",
  "queryType": "semantic",
  "semanticConfiguration": "support-semantic",
  "captions": "extractive",
  "select": "title, content, source",
  "top": 10
}
```

Une requête vectorielle peut cibler jusqu'à 10 champs vectoriels (`"fields": "contentVector, titleVector"`), tous incorporés avec le même modèle. `kind: text` exige un **vectoriseur** sur le champ vectoriel ; sinon, envoyez `kind: vector` avec une incorporation calculée par le même modèle.

| Score | Algorithme | Plage |
| --- | --- | --- |
| `@search.score`, texte intégral | BM25 | Pas de limite supérieure |
| `@search.score`, vectoriel | Similarité | 0,333 à 1,00 pour le cosinus |
| `@search.score`, hybride | RRF | Faible, borné par le nombre de requêtes fusionnées |
| `@search.rerankerScore` | Classeur sémantique | 0,00 à 4,00 |

Paramètres de réglage :

| Paramètre | Valeur par défaut | Effet |
| --- | --- | --- |
| `weight` sur une requête vectorielle | 1.0 | Au-dessus de 1, favorise le côté vectoriel dans RRF ; en dessous, les mots clés ; doit être supérieur à zéro |
| `k` | 50 si non défini | Candidats vectoriels ; utilisez 50 avec le classeur sémantique, qui reclasse au plus 50 résultats |
| `hybridSearch.maxTextRecallSize` (préversion) | 1 000 (max 10 000) | Résultats BM25 envoyés à RRF |
| `hybridSearch.countAndFacetMode` (préversion) | `countAllResults` | `countRetrievableResults` ne compte que les documents classés |

Le **classeur sémantique** s'exécute après RRF sur les 50 premiers résultats et n'utilise que le texte de la configuration sémantique : `title` et `keywords` jusqu'à 128 jetons chacun, puis `content`, pour au plus 2 000 jetons par document (placez les champs les plus importants en premier). Il renvoie `@search.rerankerScore` (4 = répond complètement à la question, 0 = sans rapport), plus des légendes verbatim et des réponses facultatives ; il ne génère jamais de texte. Il est facturé par requête quand `queryType` vaut `semantic` et que la chaîne de recherche n'est pas vide.

> **Piège d'examen.** N'ajoutez pas `orderby` à une requête hybride : un tri explicite remplace le classement par pertinence. Et ne comparez pas un `@search.score` hybride (environ 0,03) à un score BM25 ou cosinus : utilisez `@search.rerankerScore` quand vous avez besoin d'une échelle de pertinence absolue.

<!-- section: rag-evaluation | objectives: 5.1.4 -->
## Évaluer et améliorer une solution RAG avec des métriques de pertinence et des tests A/B

Mesurez séparément la récupération et la génération : sinon, impossible de savoir si une mauvaise réponse vient du moteur de récupération ou du modèle.

| Métrique | Mesure | Nécessite |
| --- | --- | --- |
| Précision à K | Part d'éléments pertinents dans les K premiers | Étiquettes de pertinence |
| Rappel à K | Part de tous les éléments pertinents trouvés dans les K premiers | Étiquettes de pertinence |
| Rang réciproque moyen (MRR) | Moyenne de 1/rang du premier résultat pertinent | Étiquettes de pertinence |
| **Document Retrieval** (`builtin.document_retrieval`) | NDCG@3, XDCG@3, Fidelity, pertinence du premier résultat, pertinence max des trois premiers, holes | `retrieval_ground_truth` (étiquettes par document) et `retrieved_documents` ; pas de modèle juge |
| **Retrieval** (`builtin.retrieval`) | Pertinence du contexte récupéré pour la requête, de 1 à 5 | `query`, `context`, un déploiement juge ; pas de vérité terrain |
| **Groundedness** (`builtin.groundedness`) | Réponse étayée par le contexte (précision) | `response`, `context` (et `query`) |
| **Relevance** (`builtin.relevance`) | La réponse répond à la requête | `query`, `response` |
| **Response Completeness** (préversion) | La réponse couvre la vérité terrain (rappel) | `response`, `ground_truth` |

Les évaluateurs à score réussissent à 3 ou plus sur l'échelle de 1 à 5 par défaut. **Holes** compte les documents récupérés sans étiquette de pertinence : une valeur élevée signifie qu'il faut compléter les étiquettes avant de se fier au NDCG. Document Retrieval est conçu pour les **balayages de paramètres** entre modes de recherche, `top_k` et tailles de bloc :

```text
testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "document_retrieval",
        "evaluator_name": "builtin.document_retrieval",
        "initialization_parameters": {
            "ground_truth_label_min": 0,
            "ground_truth_label_max": 4,
        },
        "data_mapping": {
            "retrieval_ground_truth": "{{item.retrieval_ground_truth}}",
            "retrieved_documents": "{{item.retrieved_documents}}",
        },
    },
]
```

Testez des **requêtes positives** (les données contiennent la réponse : les métriques doivent tendre vers 1) et des **requêtes négatives** (elles ne la contiennent pas : la récupération doit tendre vers 0 et l'assistant doit dire qu'il ne sait pas).

| Résultats | Diagnostic |
| --- | --- |
| Récupération faible, ancrage faible | Problème de récupération : segmentation, incorporations, hybride, `k` |
| Récupération élevée, ancrage faible | Problème de génération : invite, modèle, trop de contexte |
| Ancrage élevé, complétude faible | Blocs pertinents absents des K premiers, ou réponse trop courte |
| NDCG élevé, Fidelity faible | Bon classement, mais beaucoup de bons documents connus jamais récupérés |

Un **test A/B** compare une référence et une variante :

1. Fixez les **critères de décision avant** l'exécution (par exemple un score moyen minimal et un plafond de coût ou de latence), pour que les résultats ne puissent pas être justifiés après coup.
2. Changez **une seule variable à la fois** (taille de bloc, modèle d'incorporation, poids, reclassement, invite) ; avec plusieurs changements, impossible de savoir lequel a causé la différence.
3. Exécutez les deux variantes sur le **même jeu de données de test** et les mêmes évaluateurs, en relevant qualité, jetons et latence.
4. Sélectionnez les deux exécutions dans Foundry et choisissez **Compare**, avec la référence définie : chaque cellule affiche un résultat de **test t** (ImprovedStrong pour p de 0,001 ou moins, ImprovedWeak jusqu'à 0,05, dans le sens souhaité ; DegradedStrong et DegradedWeak, mêmes seuils, dans le mauvais sens ; ChangedStrong et ChangedWeak quand le sens souhaité est neutre ; Inconclusive avec trop peu d'exemples ou p de 0,05 et plus), avec la taille d'échantillon et la valeur p au survol. La vue de comparaison n'est pas enregistrée.
5. Pour un test en ligne, dirigez une part du trafic réel vers la variante (par exemple des backends pondérés dans API Management) et suivez l'évaluation continue, la latence et les métriques de jetons par variante avant un déploiement complet.

> **Conseil d'examen.** « La nouvelle taille de bloc est-elle meilleure, ou est-ce du bruit ? » → comparez les deux exécutions d'évaluation et lisez la signification statistique. « Inconclusive » signifie qu'il faut plus de lignes de test, pas que les variantes sont équivalentes.

<!-- section: key-points -->
## Points clés

- Commencez la segmentation à 512 jetons avec 25 % de chevauchement (Text Split : 2 000 et 500 caractères) ; chevauchement inférieur à la moitié de la longueur de page.
- Récupérez 20 à 50 candidats, fusionnez avec RRF, reclassez, gardez-en 5 à 10 ; `k` et `top` valent 50 par défaut.
- Le `threshold` vectoriel (préversion, `vectorSimilarity`) est réservé aux requêtes purement vectorielles, pas hybrides.
- Même modèle d'incorporation et mêmes dimensions pour les blocs et les requêtes ; changer de modèle impose de réincorporer.
- text-embedding-3-small jusqu'à 1536 dimensions, 3-large jusqu'à 3072 ; modèle généraliste, puis modèle de domaine, puis ajustement.
- Hybride = BM25 + vecteurs fusionnés par RRF (constante d'environ 60) ; les mots clés l'emportent sur les codes, noms, dates et jargon ; le classeur sémantique reclasse les 50 premiers (0 à 4).
- Évaluez la récupération (Document Retrieval, Retrieval) séparément de la génération (ancrage, pertinence, complétude).
- A/B : critères d'abord, un changement à la fois, même jeu de données, Compare avec signification du test t.
