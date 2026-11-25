Les agents d'IA sont sans état entre deux appels au modèle : tout ce dont ils doivent se souvenir (la conversation en cours, les décisions passées, les préférences de l'utilisateur) réside dans un magasin que l'application lit et écrit. Azure Cosmos DB for NoSQL sert de mémoire durable, avec des lectures ponctuelles et des requêtes limitées à une partition pour les tours récents, la durée de vie (TTL) pour l'expiration, le flux de modification pour les traitements en arrière-plan, et la recherche vectorielle, en texte intégral et hybride pour un rappel par le sens. Les questions d'examen demandent le modèle de données, la clé de partition, le mécanisme de rétention ou la requête adaptés à un modèle d'accès à la mémoire.

<!-- section: memory-design | objectives: 3.2.1 -->
## Concevoir des espaces de stockage mémoire durables

| Mémoire | Contenu | Durée de vie | Accès typique |
| --- | --- | --- | --- |
| Court terme (de travail, épisodique) | Les derniers tours du thread actif : prompts, réponses, résultats d'outils, état de la tâche | Heures à jours ; expire, est résumée ou promue | Les N derniers tours d'un thread, dans l'ordre |
| Enregistrements épisodiques | Un enregistrement par interaction passée (date, résumé, décisions, suivis) | Semaines à années, selon la stratégie de rétention | Correspondance exacte, plage de dates, audit |
| Long terme (sémantique) | Faits, préférences et résumés dérivés de plusieurs threads | Mois à années | Recherche de similarité pour un utilisateur ou un locataire |

L'Agent Memory Toolkit pour Azure Cosmos DB (préversion, SDK Python) nomme quatre types d'éléments qui suivent ce découpage : `turn` (messages bruts de l'utilisateur, de l'agent, d'un outil ou du système), `summary` (un thread condensé : sujet, décisions, points ouverts), `fact` (une assertion distincte, recherchable d'un thread à l'autre) et `user_summary` (un profil d'un utilisateur sur l'ensemble de ses threads). Ses opérations ajoutent des mémoires (dans un stockage local en mémoire pour le développement, ou directement dans Azure Cosmos DB), les récupèrent par utilisateur, par thread ou par récence, les recherchent par classement vectoriel ou hybride, génèrent des résumés, extraient des faits et les réconcilient. Le stockage local convient aux démonstrations et aux tests ; Azure Cosmos DB est nécessaire pour la persistance, l'accès partagé, la recherche sémantique et le pipeline en arrière-plan.

Modèle de données : choisissez l'unité de stockage.

| Modèle | Atouts | Faiblesses | Verdict |
| --- | --- | --- | --- |
| Un élément par tour (message de l'utilisateur plus réponse de l'agent, ou agent plus outil) | Petits éléments, écritures peu coûteuses, requêtes des N derniers, une incorporation par tour, TTL par tour | Les résumés sont des éléments séparés ; les anciens tours doivent être élagués ou compactés | Choix par défaut recommandé |
| Un élément par message | Granularité la plus fine, mises à jour et TTL simples | Une incorporation ne couvre qu'un côté de l'échange ; faible pour le cache sémantique | Acceptable |
| Un élément par thread (messages dans un tableau) | Une lecture renvoie tout l'historique | Croissance sans limite vers la limite de 2 Mo par élément, chaque ajout réécrit l'élément, recherche vectorielle grossière, TTL seulement par thread | À éviter |

Clé de partition : alignez-la sur la requête dominante.

| Clé de partition | Adaptée à | Compromis |
| --- | --- | --- |
| GUID par élément | Journalisation et analytique à forte écriture | Chaque requête sur un thread est diffusée vers toutes les partitions |
| `/threadId` | Agents conversationnels et RAG : les N derniers tours et la recherche vectorielle dans le thread restent dans une partition | Exige beaucoup de threads pour répartir la charge |
| Hiérarchique `["/tenantId", "/threadId"]` | Applications multilocataires avec de nombreux threads simultanés par client : localité du thread plus requêtes limitées au locataire | Un premier niveau avec peu de valeurs concentre les écritures |
| `/userId` (ou `["/tenantId", "/userId"]`) | Mémoire à long terme rappelée par utilisateur d'un thread à l'autre ; isolation par utilisateur | La relecture d'un thread exige un filtre sur le thread |

Comme la mémoire à court terme et la mémoire à long terme se lisent différemment (par thread ou par utilisateur), une conception courante utilise deux conteneurs : `turns` partitionné par locataire puis par thread, et `memories` partitionné par locataire puis par utilisateur.

Indexation : `quantizedFlat` pour des dizaines de milliers de vecteurs de mémoire, `diskANN` pour des centaines de milliers à des milliards, avec `vectorIndexShardKey` égal à la clé de partition ou à son premier niveau pour l'isolation multilocataire ; un index de texte intégral sur le contenu pour le rappel lexical (« refund policy », un numéro de commande). Le chemin de l'incorporation doit être déclaré dans la stratégie vectorielle du conteneur. La recherche vectorielle sur un conteneur à clé de partition hiérarchique, comme `["/tenantId", "/threadId"]`, exige d'abord que l'équipe Azure Cosmos DB configure le compte (contact sur la page de la recherche vectorielle).

Rétention et confidentialité :

- Les tours à court terme expirent avec la **TTL** ; les éléments à long terme généralement non.
- Les anciens enregistrements épisodiques peuvent être résumés en mémoires sémantiques et le détail archivé dans un stockage moins cher.
- Limitez chaque lecture à l'identité issue de la session authentifiée (ID du locataire, de l'utilisateur ou du patient dans la clé de partition), afin qu'aucune requête ne puisse traverser les utilisateurs sans autorisation explicite.
- Préférez une mémoire par utilisateur à une mémoire partagée ; n'agrégez entre utilisateurs qu'avec des données anonymisées.

> **Piège d'examen.** « Stocker la conversation comme un tableau dans un document de thread » semble simple mais échoue à grande échelle : l'élément grossit sans limite, chaque nouveau message le réécrit (les RU croissent avec la taille) et il atteint la limite de 2 Mo par élément. Stockez un élément par tour.

<!-- section: conversation-state | objectives: 3.2.2 -->
## Implémenter l'état de conversation

Un élément de tour dans un conteneur partitionné sur `["/tenantId", "/threadId"]` :

```json
{
  "id": "thread-1234-0007",
  "tenantId": "contoso",
  "threadId": "thread-1234",
  "userId": "user-12345",
  "type": "turn",
  "turnIndex": 7,
  "messages": [
    { "role": "user", "content": "What's our refund policy for accessories?", "timestamp": "2026-11-17T10:14:25Z" },
    { "role": "agent", "name": "kb.search", "content": "Accessories can be returned within 30 days.", "timestamp": "2026-11-17T10:14:26Z" }
  ],
  "embedding": [0.013, -0.092, 0.551],
  "ttl": 2592000
}
```

Charger la fenêtre de contexte : les derniers tours d'un thread, une requête sur une seule partition.

```text
SELECT TOP @k c.turnIndex, c.messages
FROM c
WHERE c.tenantId = @tenantId AND c.threadId = @threadId AND c.type = "turn"
ORDER BY c.turnIndex DESC
```

En Python, ajout d'un tour et lecture du contexte :

```text
turns = db.get_container_client("turns")
turns.create_item(turn)                       # one small write per turn

recent = list(turns.query_items(
    query="SELECT TOP @k c.turnIndex, c.messages FROM c "
          "WHERE c.threadId = @th AND c.type = 'turn' ORDER BY c.turnIndex DESC",
    parameters=[{"name": "@k", "value": 10}, {"name": "@th", "value": "thread-1234"}],
    partition_key=["contoso", "thread-1234"]))
recent.reverse()                              # chronological order for the prompt
```

Expiration avec la **TTL** :

| `defaultTtl` du conteneur | `ttl` de l'élément | Résultat |
| --- | --- | --- |
| Non défini | Quelconque | Rien n'expire ; la `ttl` de l'élément est ignorée |
| `-1` | Non défini | L'élément n'expire jamais |
| `-1` | `2592000` | L'élément expire 30 jours après sa dernière écriture |
| `86400` | Non défini | L'élément expire un jour après sa dernière écriture |
| `86400` | `-1` | L'élément n'expire jamais |

L'expiration se compte à partir de la dernière modification de l'élément (`_ts`) ; les éléments expirés disparaissent immédiatement des lectures et sont supprimés en arrière-plan avec les RU/s inutilisées.

Gardez le thread compact : tous les N tours, générez un **élément de résumé** (`type: "summary"`) pour le thread et chargez-le avec les derniers tours au lieu de l'historique complet. Quand plusieurs agents ou instances mettent à jour le même élément de résumé ou d'état de tâche, remplacez-le avec l'ETag en `IfMatchEtag` (contrôle d'accès concurrentiel optimiste) et réessayez sur un 412 ; utilisez une opération de correctif (patch) pour incrémenter des compteurs sans lire l'élément.

> **Conseil d'examen.** Les tours récents se lisent par récence, pas par sens : `TOP N ... ORDER BY turnIndex DESC` dans la partition du thread est moins cher et plus juste qu'une recherche vectorielle. N'utilisez la recherche vectorielle ou hybride sur les tours que pour retrouver un échange plus ancien et pertinent dans un long thread.

<!-- section: semantic-memory | objectives: 3.2.3 -->
## Implémenter la mémoire sémantique

La mémoire sémantique stocke des connaissances généralisées sous forme d'éléments avec un texte et une incorporation, rappelés par similarité sur tous les threads d'un utilisateur :

```json
{
  "id": "fact-7f3c",
  "tenantId": "contoso",
  "userId": "user-12345",
  "type": "fact",
  "text": "Prefers delivery to the Lyon office, not home.",
  "embedding": [0.021, 0.117, -0.044],
  "sourceThreadId": "thread-1234",
  "createdAt": "2026-11-17T10:20:00Z",
  "isSuperseded": false
}
```

Le pipeline :

| Étape | Comment |
| --- | --- |
| Détecter les nouveaux tours | Flux de modification sur le conteneur `turns` (en production, une application Azure Durable Functions associée le traite en arrière-plan) |
| Extraire | Un modèle de conversation (Microsoft Foundry) transforme les nouveaux tours en résumés de thread, en faits distincts et en résumé utilisateur mis à jour |
| Incorporer | Un modèle d'incorporation vectorise chaque fait ou résumé |
| Réconcilier | Détecter les faits en double ou contradictoires ; marquer celui qui est remplacé (suppression réversible) plutôt que de le supprimer, pour conserver une piste d'audit |
| Stocker | Upsert dans le conteneur `memories`, partitionné par locataire puis par utilisateur |

Rappeler les mémoires pertinentes pour la nouvelle question, dans la partition de l'utilisateur :

```text
SELECT TOP 5 c.text, VectorDistance(c.embedding, @q) AS score
FROM c
WHERE c.tenantId = @tenantId AND c.userId = @userId
  AND c.type = "fact" AND c.isSuperseded = false
ORDER BY VectorDistance(c.embedding, @q)
```

Quand les mots exacts comptent autant que le sens (noms de produits, numéros de ticket), utilisez un classement hybride avec le même filtre :

```text
SELECT TOP 5 c.text
FROM c
WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.type = "fact"
ORDER BY RANK RRF(VectorDistance(c.embedding, @q), FullTextScore(c.text, @keyword))
```

L'agent construit ensuite son prompt à partir : du résumé utilisateur (lecture ponctuelle), des faits pertinents (requête vectorielle ou hybride), du résumé du thread et des derniers tours.

| Exigence | Conception |
| --- | --- |
| Se souvenir d'une préférence exprimée il y a des semaines dans un autre thread | Élément `fact` par utilisateur, recherche vectorielle filtrée sur l'utilisateur |
| Répondre à « qu'avons-nous décidé la dernière fois ? » | Éléments `summary` des threads précédents de l'utilisateur, du plus récent au plus ancien |
| Éviter de reposer la même question au modèle | Cache sémantique : incorporation de la question plus réponse, seuil de similarité, TTL |
| Un utilisateur demande à être oublié | Supprimer les éléments de la partition de l'utilisateur dans chaque conteneur de mémoire |
| La mémoire ne doit pas fuir entre locataires | Clé de partition et `vectorIndexShardKey` sur le locataire, filtre sur lui dans chaque requête |

Un cache sémantique est une forme voisine de mémoire sémantique : incorporez la question avec son contexte de conversation, renvoyez une réponse en cache quand la similarité dépasse le seuil, et maintenez en vie les entrées populaires en corrigeant (patch) un compteur d'accès et en prolongeant leur `ttl`.

> **Piège d'examen.** Une requête vectorielle sur tous les utilisateurs (« trouver des mémoires similaires ») sans filtre sur l'utilisateur ou le locataire est à la fois diffusée vers toutes les partitions et renvoie les mémoires d'autres personnes. La mémoire sémantique s'interroge toujours dans le périmètre de son propriétaire.

<!-- section: key-points -->
## Points clés

- Mémoire à court terme = derniers tours d'un thread ; mémoire à long terme (sémantique) = faits et résumés couvrant plusieurs threads.
- Un élément par tour ; évitez un document de thread qui grossit sans cesse (limite de 2 Mo, coût de réécriture).
- Partitionnez les tours par thread, ou par locataire puis thread ; partitionnez la mémoire à long terme par utilisateur, ou par locataire puis utilisateur.
- La TTL fait expirer la mémoire à court terme : le `defaultTtl` du conteneur doit être défini (`-1` ou des secondes) pour que la `ttl` de l'élément s'applique.
- N derniers tours : `TOP N ... ORDER BY turnIndex DESC` dans une partition ; les résumés gardent la fenêtre de contexte petite.
- Mémoire sémantique : flux de modification, extraction, incorporation, réconciliation avec suppression réversible ; rappel par recherche vectorielle ou hybride filtrée sur l'utilisateur.
