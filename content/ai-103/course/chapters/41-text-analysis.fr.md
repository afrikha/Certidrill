L'analyse de texte dans Foundry combine deux approches. Un **modèle de langage** avec une invite et un schéma JSON extrait, classe, résume et traduit presque tout, dans la forme dont votre application a besoin. **Foundry Tools** (Azure Language, Azure AI Content Safety, Azure Translator) effectuent une tâche avec une sortie prévisible et documentée. Les questions d'examen donnent des contraintes (un schéma de sortie fixe, des données personnelles à masquer, un ton formel en espagnol, une synthèse de conformité) et demandent quoi utiliser et comment l'appeler.

<!-- section: extraction-prompting | objectives: 4.1.1 -->
## Extraire des entités, des sujets, des résumés et du JSON structuré

Les **sorties structurées** obligent un modèle à suivre un schéma JSON que vous fournissez. L'ancien **mode JSON** garantit un JSON valide mais pas le respect d'un schéma.

```text
from pydantic import BaseModel
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://ai.azure.com/.default"
)
client = OpenAI(
    base_url="https://contoso-ai.openai.azure.com/openai/v1/",
    api_key=token_provider,
)

class Ticket(BaseModel):
    product: str
    topics: list[str]
    customer_name: str | None
    summary: str

response = client.responses.parse(
    model="text-analysis",               # deployment name
    instructions="Extract the fields from the support email. Use null when absent.",
    input=email_text,
    text_format=Ticket,
)
ticket = response.output_parsed
```

| API | Comment le schéma est transmis | Résultat |
| --- | --- | --- |
| Responses | `text_format=Model` avec `responses.parse`, ou `text={"format": {"type": "json_schema", "name": ..., "schema": ..., "strict": True}}` | `response.output_parsed` |
| Chat Completions | `response_format=Model` avec `client.beta.chat.completions.parse`, ou `{"type": "json_schema", "json_schema": {...}}` | `completion.choices[0].message.parsed` |

Règles du schéma en mode strict :

- Chaque champ est **obligatoire** ; un champ facultatif s'émule avec une union avec null (`"type": ["string", "null"]`).
- `additionalProperties: false` sur chaque objet ; l'objet racine ne peut pas être `anyOf`.
- Jusqu'à 100 propriétés d'objet et cinq niveaux d'imbrication ; les clés reviennent dans l'ordre du schéma.
- Non pris en charge : `minLength`, `maxLength`, `pattern`, `format`, `minimum`, `maximum`, `minItems`, `maxItems` et contraintes similaires. Validez-les dans le code.
- Incompatible avec les appels de fonction parallèles (réglez `parallel_tool_calls` sur `false`).
- Vérifiez le champ `refusal` : un modèle qui refuse renvoie un refus au lieu du schéma.

**Azure Language dans Foundry Tools** range ses fonctionnalités en deux groupes :

| Groupe | Fonctionnalités |
| --- | --- |
| Principales : recommandées pour les nouveaux développements | Détection des informations personnelles (PII) (texte, conversation, document), détection de langue, reconnaissance d'entités nommées (NER, prédéfinie et personnalisée), Text Analytics for health |
| Héritées : prises en charge pour les implémentations existantes | Extraction d'expressions clés, analyse des sentiments et exploration d'opinions, résumé (texte, conversation, centre d'appels), liaison d'entités, classification de texte personnalisée, CLU, réponses aux questions personnalisées |

```text
from azure.ai.textanalytics import TextAnalyticsClient
from azure.identity import DefaultAzureCredential

language = TextAnalyticsClient(endpoint=language_endpoint, credential=DefaultAzureCredential())

entities = language.recognize_entities([email_text])[0]
for entity in entities.entities:
    print(entity.text, entity.category, entity.confidence_score)
```

| Exigence | Choix |
| --- | --- |
| Des champs propres à votre activité (produit, type de problème, date promise) dans un objet JSON | Modèle avec sorties structurées |
| Des sujets et un résumé dans votre propre format | Modèle avec sorties structurées |
| Des catégories d'entités standard (personne, lieu, organisation) avec scores de confiance | NER d'Azure Language |
| Un agent qui appelle les fonctionnalités de langage comme un outil | Le serveur MCP Azure Language (préversion) du catalogue d'outils Foundry |

> **Piège d'examen.** « La sortie doit toujours respecter ce schéma JSON », ce sont les **sorties structurées** avec `strict` à true, pas le mode JSON ni une invite qui dit « réponds en JSON ».

<!-- section: sentiment-safety | objectives: 4.1.2 -->
## Détecter les sentiments, le ton, les problèmes de sécurité et le contenu sensible

| Signal | Outil | Sortie |
| --- | --- | --- |
| Sentiment (positif, neutre, négatif) | Analyse des sentiments d'Azure Language, ou un modèle | Étiquettes au niveau de la phrase et du document, scores de confiance de 0 à 1 |
| Opinion sur chaque aspect (« batterie excellente, écran terne ») | Exploration d'opinions d'Azure Language (sentiment par aspect), ou un modèle avec un schéma | Sentiment par attribut du produit |
| Ton (formel, sarcastique, urgent, menaçant) | Un modèle avec un champ `enum` dans le schéma | Une étiquette de votre liste, plus une justification |
| Contenu préjudiciable (haine, sexuel, violence, automutilation) | API de texte de Content Safety, ou les garde-fous d'un déploiement | Gravité par catégorie |
| Termes interdits par votre stratégie | Listes de blocage de Content Safety | `blocklistsMatch` |
| Données personnelles (noms, numéros de téléphone, numéros de compte) | Détection des PII d'Azure Language | Entités avec catégories et un texte masqué |

L'analyse des sentiments et l'exploration d'opinions **sont mises hors service dans Azure Language le 31 mars 2029** : Microsoft oriente les nouveaux projets vers les modèles de Microsoft Foundry. Le ton n'a pas d'API dédiée : c'est une classification que vous définissez pour un modèle.

```json
{
  "text": "Your product is a scam and I will make you pay for it.",
  "categories": ["Hate", "Violence"],
  "blocklistNames": ["fabrikam-banned-terms"],
  "haltOnBlocklistHit": false,
  "outputType": "EightSeverityLevels"
}
```

Ce corps est envoyé à `POST {endpoint}/contentsafety/text:analyze?api-version=2024-09-01`. `outputType` vaut `FourSeverityLevels` (0, 2, 4, 6) ou `EightSeverityLevels` (0 à 7). Avec `haltOnBlocklistHit` à true, une correspondance dans une liste de blocage arrête l'analyse des préjudices. La réponse liste `blocklistsMatch` et `categoriesAnalysis` (catégorie et gravité).

La **détection des PII** couvre le texte, les conversations (chats, transcriptions) et les documents :

```text
pii = language.recognize_pii_entities([email_text])[0]
print(pii.redacted_text)
for entity in pii.entities:
    print(entity.category, entity.confidence_score)
```

La détection des PII dans le texte (GA) prend aussi en charge un seuil de confiance, des valeurs exclues, des synonymes d'entités et la stratégie de masquage `syntheticReplacement`, qui remplace les valeurs détectées par de fausses valeurs réalistes. Sur un déploiement de modèle, les garde-fous comprennent un filtre **PII** sur les sorties, à côté des contrôles de contenu protégé et d'ancrage.

> **Piège d'examen.** Content Safety détecte les **préjudices** ; il ne détecte pas les données personnelles. Pour trouver et masquer des numéros de téléphone ou de compte, utilisez la **détection des PII** d'Azure Language.

<!-- section: translation | objectives: 4.1.3 -->
## Traduire du texte avec Azure Translator ou des flux alimentés par LLM

**Azure Translator dans Foundry Tools** est un service de traduction automatique neuronale (NMT).

| Fonctionnalité | Usage |
| --- | --- |
| Traduction de texte v3 (GA) | Traduction de texte en temps réel ; dictionnaire dynamique et balisage « ne pas traduire » |
| Traduction de texte `2026-06-06` (GA, la plus récente) | Même opération avec un choix de moteur : NMT par défaut, ou un déploiement LLM Foundry ; ton, genre et traduction personnalisée adaptative |
| Traduction de documents, asynchrone | Lots de fichiers complexes avec structure et mise en forme conservées ; conteneurs Blob source et cible |
| Traduction de documents, synchrone | Un fichier, glossaire facultatif, pas de stockage Blob ; le fichier traduit revient dans la réponse |
| Custom Translator | Modèles NMT personnalisés pour la terminologie et le style d'un domaine ou d'un secteur |

```json
{
  "inputs": [
    {
      "text": "The doctor is available next Monday. Do you want to book an appointment?",
      "language": "en",
      "targets": [
        {
          "language": "es",
          "deploymentName": "gpt-translation",
          "tone": "formal",
          "gender": "female"
        },
        { "language": "fr" }
      ]
    }
  ]
}
```

Ce corps est envoyé à `POST https://api.cognitive.microsofttranslator.com/translate?api-version=2026-06-06`, ou à `https://{resource}.cognitiveservices.azure.com/translator/text/translate?api-version=2026-06-06`. La réponse est un tableau `value` avec des `translations` par cible, et `detectedLanguage` quand `language` a été omis.

| Propriété de la cible | Valeurs |
| --- | --- |
| `deploymentName` | `general` (par défaut, NMT), le nom de votre déploiement LLM, ou l'ID de catégorie d'un modèle Custom Translator |
| `tone` | `formal`, `informal`, `neutral` (LLM) |
| `gender` | `female`, `male`, `neutral` (LLM) |
| `referenceTextPairs` / `adaptiveDatasetId` | Jusqu'à cinq exemples source et cible, ou un index de jeu de données adaptatif : traduction few-shot dans votre style. Si des paires sont fournies, l'ID du jeu de données est ignoré |
| `allowFallback` | true par défaut : si le modèle choisi ne prend pas en charge la paire de langues, le service se rabat sur un système général ; false renvoie une erreur |
| `profanityAction` | `NoAction` (par défaut), `Marked`, `Deleted` |

Autres faits :

- Un moteur LLM exige une **ressource Microsoft Foundry**, et n'est pas disponible quand la ressource Translator utilise un **point de terminaison privé**.
- Limites par requête : NMT 1 000 éléments de tableau de 50 000 au plus chacun ; LLM 50 éléments de 5 000 au plus chacun.
- Facturation : NMT par caractère source ; LLM par jeton d'entrée et de sortie, au tarif Azure OpenAI.
- La traduction personnalisée adaptative construit un index bilingue en quelques minutes à partir de 5 à 10 000 paires de segments préalignées (500 caractères au plus par paire).

Un **flux de traduction alimenté par LLM** sans Translator est une invite : langue cible, glossaire, ton et « conserver tels quels les noms de produits, les codes et les espaces réservés » dans les instructions, et une sortie structurée quand plusieurs langues reviennent ensemble.

| Exigence | Choix |
| --- | --- |
| Gros volume, coût par caractère le plus bas, sortie prévisible | Translator, NMT |
| Registre formel ou informel, ou formes genrées | Translator `2026-06-06` avec un déploiement LLM |
| Reprendre le style de traductions validées | `referenceTextPairs` ou un jeu de données adaptatif |
| Traduire des fichiers Word ou PDF en conservant leur mise en page | Traduction de documents |
| Traduire et résumer en une étape | Une invite de modèle avec sortie structurée |

> **Piège d'examen.** `tone` et `gender` ne s'appliquent que si la cible utilise un **déploiement LLM**. Avec le moteur `general` par défaut (NMT), ils ne peuvent pas changer le résultat.

<!-- section: domain-customization | objectives: 4.1.4 -->
## Personnaliser les sorties pour des tâches de domaine

Les tâches de domaine comme la **synthèse de conformité** (ce qu'un contrat, un appel ou un changement de stratégie implique au regard d'une réglementation) et l'**extraction de domaine** (clauses, posologies, références de pièces) se résolvent le plus souvent sans entraînement :

1. Des **instructions** qui définissent le rôle, le public et les règles : « Summarize for the Woodgrove compliance team. Cite the clause number for every obligation. Don't give legal advice. »
2. Le **vocabulaire du domaine** : définitions et abréviations dans les instructions, un glossaire pour la traduction.
3. Des **exemples few-shot** : une ou deux paires d'entrée et de sortie qui montrent le niveau de détail attendu.
4. Un **schéma** avec des valeurs `enum` propres au domaine, pour que la sortie alimente un workflow.
5. L'**ancrage** : placer le texte de référence (la réglementation, la stratégie) dans l'invite ou le récupérer par RAG, et exiger des citations.
6. L'**évaluation** : un jeu de test de documents réels vérifié par des experts du domaine avant de changer l'invite ou le modèle.

```json
{
  "type": "object",
  "properties": {
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "clause": { "type": "string" },
          "obligation": { "type": "string" },
          "riskLevel": { "type": "string", "enum": ["Low", "Medium", "High"] }
        },
        "required": ["clause", "obligation", "riskLevel"],
        "additionalProperties": false
      }
    },
    "requiresLegalReview": { "type": "boolean" }
  },
  "required": ["obligations", "requiresLegalReview"],
  "additionalProperties": false
}
```

| Symptôme | Correction |
| --- | --- |
| Le format de sortie varie | Sorties structurées avec `strict` à true |
| Les termes du domaine sont mal employés | Définitions et exemples few-shot dans les instructions |
| Des affirmations n'apparaissent pas dans la source | Ancrage avec le texte source et citations obligatoires |
| Mauvaises étiquettes de catégorie | Une `enum` avec une définition d'une ligne par valeur |
| L'invite est cohérente mais n'atteint pas le style ou le comportement exigé | Affiner (fine-tuning) un modèle, après les options fondées sur l'invite |

Un Foundry Tool peut rester dans le pipeline à côté du modèle : la détection des PII d'Azure Language masque le document avant qu'il n'atteigne le modèle, et Translator ramène d'abord les contrats en langue étrangère dans la langue de travail.

> **Piège d'examen.** Le fine-tuning n'est pas la première réponse à « utiliser notre terminologie » ou « toujours renvoyer ces champs ». Instructions, exemples, schéma strict et ancrage passent d'abord ; ils coûtent moins et se modifient en quelques minutes.

<!-- section: key-points -->
## Points clés

- Les sorties structurées (`strict`) imposent un schéma JSON ; le mode JSON garantit seulement un JSON valide. Tous les champs obligatoires, `additionalProperties: false`.
- `responses.parse` avec `text_format` renvoie `output_parsed` ; Chat Completions utilise `response_format` et `message.parsed`.
- Azure Language, fonctionnalités principales : PII, NER, détection de langue, Text Analytics for health ; expressions clés, sentiments et résumé sont hérités ; les sentiments sont mis hors service le 31 mars 2029.
- Ton = une classification par modèle ; préjudices = Content Safety (gravités, listes de blocage) ; données personnelles = détection des PII d'Azure Language.
- Translator `2026-06-06` : `inputs` et `targets` ; `deploymentName` `general` = NMT ; `tone` et `gender` exigent un déploiement LLM et une ressource Foundry ; pas de LLM avec un point de terminaison privé.
- Traduction de documents : asynchrone avec des conteneurs Blob, ou synchrone pour un fichier.
- Sorties de domaine : instructions, vocabulaire, exemples, schéma avec `enum`, ancrage, évaluation ; le fine-tuning en dernier.
