Azure Content Understanding dans Foundry Tools transforme un contenu non structuré (documents, images, audio, vidéo) en données structurées qu'une application peut stocker, rechercher ou traiter. L'examen demande quel analyseur convient à un type de contenu, à quoi sert un schéma, et comment une courte application cliente obtient ses résultats.

<!-- section: documents-and-forms | objectives: 2.4.1 -->
## Extraire des informations de documents et de formulaires

Content Understanding travaille toujours en trois étapes : vous envoyez le contenu ; le service l'analyse avec la reconnaissance optique de caractères (OCR), la reconnaissance vocale et des modèles d'IA générative ; il renvoie un résultat structuré, en Markdown et en JSON.

Trois notions portent tout le service :

| Notion | Signification |
| --- | --- |
| **Analyseur** | L'unité qui prend le contenu, applique l'analyse et produit le résultat. Il est prédéfini ou personnalisé, et il applique la même logique à chaque fichier |
| **Schéma** | La liste des champs à extraire et leur structure. Les champs peuvent être imbriqués : une collection `Items` où chaque élément a une description, un prix unitaire, une quantité et un total de ligne |
| **Champ** | Une valeur nommée dans le résultat, avec son type et, pour les documents, un score de confiance entre 0 et 1 |

Le schéma s'applique de façon **sémantique** : « Invoice No. », « Invoice # » ou un numéro sans libellé en haut de la page peuvent tous remplir le champ du numéro de facture, car l'analyseur cherche le sens, pas un libellé ou une position fixes.

| Analyseur | Renvoie | À utiliser pour |
| --- | --- | --- |
| `prebuilt-read` | Le texte : mots et paragraphes (OCR) | Lire du texte imprimé ou manuscrit |
| `prebuilt-layout` | Le texte et sa structure : paragraphes, tableaux, sections | Conserver la disposition d'un document |
| `prebuilt-invoice` | Les champs d'une facture : fournisseur, client, dates, articles, totaux | Les factures, sans définir de schéma |
| `prebuilt-receipt` | Les champs d'un reçu | Tickets de caisse, notes de frais |
| Analyseur personnalisé | Les champs de votre propre schéma | Un formulaire ou un type de document qu'aucun analyseur prédéfini ne couvre |

Dans le portail Foundry, le terrain de jeu Content Understanding permet de choisir un analyseur, de l'exécuter sur un exemple ou sur votre propre fichier, et de lire le résultat : les champs extraits, la version Markdown du contenu et le JSON brut.

> **Piège d'examen.** Les analyseurs d'OCR et de disposition renvoient ce qui est écrit, pas ce que cela signifie : le texte d'une facture, mais pas « le total est 1585.98 ». Pour obtenir des valeurs nommées, utilisez un analyseur doté d'un schéma, prédéfini (`prebuilt-invoice`) ou personnalisé. L'extraction de champs s'appuie sur un modèle génératif déployé dans la ressource Foundry ; les analyseurs read et layout n'en ont pas besoin.

<!-- section: images | objectives: 2.4.2 -->
## Extraire des informations d'images

Pour une image, il n'y a souvent aucun texte à lire : l'analyseur regarde l'image elle-même. Vous définissez un schéma dont les champs ont un nom, une description et un type, et un modèle génératif les remplit d'après ce qu'il voit.

| Scénario | Champs du schéma |
| --- | --- |
| La photo d'une salle de réunion | Lieu, participants sur place, participants à distance, total des participants |
| Un graphique tiré d'un rapport d'activité | Type de graphique, titre, tendance |
| Une pièce sur une chaîne de production | Présence d'un défaut, type de défaut |
| Un rayon dans un magasin | Produits détectés, nombre, emplacements vides |

L'analyseur prédéfini `prebuilt-imageSearch` génère une description de l'image, utile pour rendre une collection d'images interrogeable.

> **Piège d'examen.** Les analyseurs d'images ne sont pas faits pour les images composées surtout de texte. Pour un formulaire numérisé ou un reçu photographié, le contenu principal est du texte : utilisez un analyseur de documents.

<!-- section: audio-and-video | objectives: 2.4.3 -->
## Extraire des informations de l'audio et de la vidéo

| | Audio | Vidéo |
| --- | --- | --- |
| Extraction de contenu | Transcription de la parole, avec séparation des interlocuteurs | Transcription de la parole, images clés et détection des plans |
| Extraction de champs | Des champs générés à partir de la transcription : résumé, sujets, sentiment | Description de chaque segment et champs générés à partir des images et de la parole |
| Analyseurs prédéfinis | `prebuilt-audioSearch` : transcription et résumé ; `prebuilt-callCenter` : rôles agent et client, résumé, sentiment, sujets | `prebuilt-videoSearch` : segments avec transcription et description |
| Usages types | Analyse de messages vocaux et d'appels, enregistrements de réunions, podcasts | Réunions enregistrées, vidéos de formation, médiathèques |

Un schéma pour des messages vocaux pourrait demander l'appelant, un résumé du message, les actions demandées, le numéro de rappel et d'autres coordonnées. Pour le message « Hi, this is Ava from Contoso... call me back on 555-12345 », l'analyseur renvoie l'appelant « Ava from Contoso » et le numéro de rappel « 555-12345 » dans des champs distincts, en plus de la transcription.

Pour une réunion enregistrée, un schéma peut demander les participants, qui a parlé et ce qui a été dit, un résumé de la discussion et la liste des actions attribuées.

> **Conseil d'examen.** La reconnaissance vocale seule donne une transcription. Content Understanding donne la transcription et les champs d'un schéma. Si la question veut « le numéro de rappel » ou « un résumé de chaque appel » sous forme de données, la réponse est un analyseur audio de Content Understanding.

<!-- section: client-app | objectives: 2.4.4 -->
## Une application légère avec Content Understanding

Le SDK Python est le package `azure-ai-contentunderstanding`. Le client a besoin du point de terminaison de la ressource Foundry (`https://<resource>.services.ai.azure.com/`) et d'informations d'identification : une clé, ou Microsoft Entra ID avec `DefaultAzureCredential`.

```text
from azure.ai.contentunderstanding import ContentUnderstandingClient
from azure.core.credentials import AzureKeyCredential

client = ContentUnderstandingClient(endpoint=endpoint, credential=AzureKeyCredential(key))

poller = client.begin_analyze(
    analyzer_id="prebuilt-invoice",
    inputs=[{"url": "https://<host>/invoice.pdf"}],
)
result = poller.result()

for content in result.contents:
    print(content.markdown)
    print(content.fields)
```

| Élément | Rôle |
| --- | --- |
| `analyzer_id` | L'analyseur à exécuter : un identificateur prédéfini ou le nom d'un analyseur personnalisé |
| `inputs` | Le contenu à analyser, ici l'URL d'un fichier |
| `begin_analyze(...)` | Démarre l'analyse et renvoie immédiatement un poller |
| `poller.result()` | Attend la fin de l'analyse et renvoie le résultat |
| `content.markdown` | Le contenu en Markdown : le texte d'un document, la transcription d'un enregistrement |
| `content.fields` | Les champs extraits, chacun avec son type, sa valeur et, pour les documents, sa confiance |

L'analyse est **asynchrone** : le service accepte la requête, travaille, et met le résultat à disposition plus tard. Le SDK masque l'attente derrière `poller.result()`. Une application qui appelle directement l'API REST doit interroger l'URL renvoyée dans l'en-tête `Operation-Location` jusqu'à ce que l'état soit `Succeeded`.

Le même code traite tous les types de contenu : pour analyser un enregistrement au lieu d'une facture, remplacez `analyzer_id` par `prebuilt-audioSearch` et donnez l'URL d'un fichier audio.

> **Piège d'examen.** `begin_analyze` ne renvoie pas les champs ; il renvoie un poller. Les champs ne sont disponibles qu'après `poller.result()`. Une question de code à compléter qui lit `fields` juste après `begin_analyze` oublie cette étape.

<!-- section: key-points -->
## Points clés

- Content Understanding : du contenu en entrée, du Markdown et du JSON structurés en sortie, pour les documents, les images, l'audio et la vidéo.
- Analyseur : prédéfini ou personnalisé. Schéma : les champs voulus et leur structure, associés par le sens.
- `prebuilt-read` et `prebuilt-layout` renvoient le texte et la structure ; `prebuilt-invoice` et `prebuilt-receipt` renvoient des champs.
- Images : des champs générés d'après ce que montre l'image ; les images composées surtout de texte vont à un analyseur de documents.
- Audio et vidéo : transcription et champs générés comme un résumé ; `prebuilt-audioSearch`, `prebuilt-callCenter`, `prebuilt-videoSearch`.
- Client : `ContentUnderstandingClient`, `begin_analyze(analyzer_id=..., inputs=...)`, `poller.result()`, puis `contents`, `markdown` et `fields`.
