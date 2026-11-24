Azure Cosmos DB for NoSQL stocke les documents JSON d'une application d'IA (conversations, catalogues, segments de documents) avec leurs incorporations, et sert à la fois des lectures ponctuelles et des requêtes de similarité vectorielle. Les questions montrent du code Python `azure-cosmos` et demandent l'appel manquant, la stratégie d'indexation qui réduit les RU, le niveau de cohérence, le type d'index vectoriel ou le composant qui réagit aux nouveaux éléments.

<!-- section: cosmos-sdk | objectives: 2.1.1 -->
## Se connecter avec le SDK Python et exécuter des requêtes

Modèle de ressources : **compte** (point de terminaison `https://<account>.documents.azure.com:443/`) > **base de données** > **conteneur** > **éléments**. Chaque conteneur a une **clé de partition** (par exemple `/tenantId`) ; un élément est identifié par son `id` **et** par la valeur de sa clé de partition.

```text
from azure.cosmos import CosmosClient, PartitionKey
from azure.identity import DefaultAzureCredential

# One client for the lifetime of the application
client = CosmosClient("https://cosmos-rag.documents.azure.com:443/",
                      credential=DefaultAzureCredential())
database = client.get_database_client("ragdb")
container = database.get_container_client("chunks")

container.upsert_item({"id": "doc42-0", "tenantId": "fabrikam", "text": "..."})
item = container.read_item(item="doc42-0", partition_key="fabrikam")

results = container.query_items(
    query="SELECT c.id, c.text FROM c WHERE c.tenantId = @tenant AND c.lang = @lang",
    parameters=[{"name": "@tenant", "value": "fabrikam"},
                {"name": "@lang", "value": "en"}],
    partition_key="fabrikam")
for row in results:
    print(row["id"])
```

| Élément | Règle |
| --- | --- |
| `CosmosClient(url, credential)` | `credential` = clé du compte, jetons de ressource ou un `TokenCredential` comme `DefaultAzureCredential`. Créez **un seul** client par application : son initialisation est coûteuse |
| `create_item` / `upsert_item` / `replace_item` / `patch_item` / `delete_item` | La création échoue si l'`id` existe dans la partition ; upsert crée ou remplace ; patch ne modifie que certaines propriétés |
| `read_item(item, partition_key)` | **Lecture ponctuelle** : le moyen le moins cher d'obtenir un élément quand l'`id` et la clé de partition sont connus |
| `query_items(query, parameters, partition_key)` | Requête limitée à une partition logique. Sans `partition_key`, le client synchrone exige `enable_cross_partition_query=True` (requête sur toutes les partitions, plus de RU et de latence) ; le client asynchrone (`azure.cosmos.aio`) exécute les requêtes interpartitions par défaut |
| `parameters` | Liste de `{"name": "@x", "value": ...}` : ne construisez jamais le SQL par concaténation de chaînes |
| En-têtes de réponse | `container.client_connection.last_response_headers["x-ms-request-charge"]` donne le coût en RU de la dernière opération |

**Accès sans clé.** Les opérations sur les données avec Microsoft Entra ID utilisent les **rôles de plan de données propres à Cosmos DB**, pas des rôles Azure RBAC comme Contributor : **Cosmos DB Built-in Data Reader** et **Cosmos DB Built-in Data Contributor** (ID `00000000-0000-0000-0000-000000000002`). Ils s'attribuent avec l'interface CLI, PowerShell ou Bicep ; la page Contrôle d'accès (IAM) du portail ne les gère pas.

```bash
az cosmosdb sql role assignment create --resource-group rg-rag \
  --account-name cosmos-rag \
  --role-definition-id 00000000-0000-0000-0000-000000000002 \
  --principal-id <managed-identity-object-id> \
  --scope "/dbs/ragdb/colls/chunks"

# Refuse account keys entirely
az resource update --resource-group rg-rag --name cosmos-rag \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" \
  --set properties.disableLocalAuth=true
```

L'étendue peut être `/` (tout le compte), `/dbs/<database>` ou `/dbs/<database>/colls/<container>`.

> **Piège d'examen.** Une identité managée qui détient **Contributor** ou **DocumentDB Account Contributor** sur le compte peut le gérer (plan de contrôle), mais reçoit `403 Forbidden` sur `read_item` avec `DefaultAzureCredential` : il lui faut une attribution de rôle de plan de données Cosmos DB.

<!-- section: indexing-consistency | objectives: 2.1.2 -->
## Optimiser la consommation de RU : stratégies d'indexation et niveaux de cohérence

Chaque opération coûte des **unités de requête** (RU) ; quand les RU/s provisionnées sont épuisées, les requêtes reçoivent HTTP 429. Une lecture ponctuelle d'un élément de 1 Ko coûte 1 RU ; les écritures coûtent plus cher quand davantage de propriétés sont indexées.

**Stratégie d'indexation par défaut :** chaque propriété de chaque élément est indexée (index de plage sur les chaînes et les nombres), en mode `consistent`.

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [
    { "path": "/text/?" },
    { "path": "/metadata/raw/*" },
    { "path": "/\"_etag\"/?" }
  ],
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/updatedAt", "order": "descending" }
    ]
  ]
}
```

| Chemin | Correspond à |
| --- | --- |
| `/text/?` | La valeur scalaire de `text` |
| `/metadata/raw/*` | Tout ce qui se trouve sous `raw` |
| `/tags/[]/?` | Chaque élément du tableau `tags` |

| Exigence | Stratégie |
| --- | --- |
| Réduire les RU des écritures pour de gros éléments filtrés seulement sur quelques propriétés | Exclure ce qui n'est jamais filtré ni trié (textes longs, charges brutes, incorporations) |
| Les nouvelles propriétés doivent pouvoir être interrogées sans modifier la stratégie | Inclure `/*` et exclure des chemins précis (approche recommandée) |
| `ORDER BY` sur deux propriétés ou plus | **Index composite** obligatoire, même ordre des chemins ; sens identiques ou tous inversés |
| Filtre d'égalité plus filtre de plage ou tri | Index composite avec les propriétés d'égalité en premier et la propriété de plage en dernier ; un seul filtre de plage par index composite |
| Accès clé-valeur pur par `id` et clé de partition | Mode `none` (aucune requête sur les autres propriétés ; la durée de vie (TTL) est impossible en mode `none`) |

Quand un chemin inclus et un chemin exclu sont en conflit, **le chemin le plus précis l'emporte** (`/a/b/?` l'emporte sur `/a/*`). Une modification de stratégie s'exécute en ligne ; les nouveaux index ne servent les requêtes qu'une fois la transformation terminée, alors qu'un index supprimé cesse immédiatement d'être utilisé. Pour savoir si une requête a utilisé l'index, appelez `query_items(..., populate_index_metrics=True)` (surcoût : à réserver au diagnostic).

> **Piège d'examen.** Avec la stratégie qui exclut tout (`/*` exclu), la clé de partition n'est pas indexée sauf si vous l'incluez. Une requête sur un chemin non indexé fonctionne quand même, mais elle parcourt les données et coûte beaucoup plus de RU.

**Niveaux de cohérence**, du plus fort au plus faible :

| Niveau | Garantie | Coût des lectures |
| --- | --- | --- |
| Strong | Lit toujours la dernière écriture validée (linéarisabilité) ; indisponible avec plusieurs régions d'écriture | **Deux fois** les RU des niveaux plus faibles (lecture de deux réplicas) |
| Bounded staleness | Les lectures ont au plus K versions ou T temps de retard, le premier atteint | **Deux fois** les RU |
| Session | Dans une session cliente : lecture de ses propres écritures et écritures après lectures ; niveau par défaut des comptes | Un seul réplica |
| Consistent prefix | Les lectures ne voient jamais les écritures dans le désordre (les écritures transactionnelles apparaissent ensemble) | Un seul réplica |
| Eventual | Aucune garantie d'ordre ; latence la plus faible | Un seul réplica |

| Exigence | Niveau |
| --- | --- |
| Un utilisateur doit voir le message de conversation qu'il vient de publier, au coût le plus bas | Session |
| Chaque lecteur dans chaque région voit la dernière valeur, une seule région d'écriture | Strong |
| RU et latence les plus faibles, l'ordre importe peu (compteurs de vues) | Eventual |
| Les lecteurs mondiaux peuvent avoir du retard, mais jamais plus de 5 minutes | Bounded staleness |

La valeur par défaut du compte s'applique à chaque conteneur. Avec le remplacement `consistency_level`, un client peut seulement assouplir le niveau pour ses propres lectures (`CosmosClient(url, credential, consistency_level="Eventual")`) ; pour aller vers plus fort, modifiez la valeur par défaut du compte (seule la nouvelle stratégie de cohérence de lecture des SDK .NET et Java peut dépasser celle-ci). Les jetons de session sont propres à chaque partition et mis en cache par le client : une nouvelle instance de client démarre sans eux, réutilisez donc le client (ou transmettez le jeton de session) pour conserver la lecture de ses propres écritures.

> **Piège d'examen.** Passer de Session à Strong double les RU des lectures et est impossible avec des écritures multirégions. Si l'exigence est seulement « l'auteur voit ses propres écritures », Session y répond déjà.

<!-- section: vector-search | objectives: 2.1.3 -->
## Stocker des incorporations et exécuter une recherche de similarité vectorielle

La recherche vectorielle est activée par défaut : il n'y a aucune fonctionnalité à inscrire ni aucune capacité de compte à activer. Elle n'est pas prise en charge sur les comptes à débit partagé. Pour les conteneurs à clés de partition hiérarchiques, Learn demande de contacter l'équipe Azure Cosmos DB afin que le compte soit configuré pour ce schéma de partitionnement.

**1. Créer le conteneur avec une stratégie d'incorporation vectorielle et un index vectoriel :**

```text
vector_embedding_policy = {
    "vectorEmbeddings": [
        {"path": "/embedding", "dataType": "float32",
         "distanceFunction": "cosine", "dimensions": 1536}
    ]
}
indexing_policy = {
    "indexingMode": "consistent",
    "automatic": True,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}, {"path": "/embedding/*"}],
    "vectorIndexes": [{"path": "/embedding", "type": "diskANN"}]
}
container = database.create_container(
    id="chunks", partition_key=PartitionKey(path="/tenantId"),
    indexing_policy=indexing_policy,
    vector_embedding_policy=vector_embedding_policy)
```

| Propriété | Valeurs |
| --- | --- |
| `path` | Propriété qui contient le vecteur ; une stratégie par chemin ; pas de caractère générique, pas à l'intérieur d'un tableau |
| `dataType` | `float32`, `float16` (moitié moins de stockage, légère perte de précision), `int8`, `uint8` |
| `dimensions` | Longueur de chaque vecteur du chemin (1536 par défaut) ; doit correspondre au modèle d'incorporation |
| `distanceFunction` | `cosine` (par défaut), `dotproduct`, `euclidean` |

| Index vectoriel | Dimensions max | À choisir quand |
| --- | --- | --- |
| `flat` | 505 | Recherche exacte par force brute (rappel de 100 %) sur de petits ensembles, surtout réduits par des filtres et la clé de partition |
| `quantizedFlat` | 4 096 | Vecteurs compressés ; jusqu'à environ 50 000 vecteurs dans le périmètre d'une recherche |
| `diskANN` | 4 096 | Recherche approximative des plus proches voisins, la plus performante au-delà d'environ 50 000 vecteurs |

`quantizedFlat` et `diskANN` exigent au moins 1 000 vecteurs indexés ; en dessous, la requête fait une analyse complète et coûte plus de RU. L'exemple de Learn exclut aussi le chemin du vecteur de l'index de plage ordinaire (`/embedding/*` ci-dessus).

> **Piège d'examen.** La stratégie d'incorporation vectorielle et les index vectoriels ne peuvent pas être modifiés par un remplacement du conteneur : pour changer les dimensions, la fonction de distance ou le type d'index, supprimez la stratégie ou l'index vectoriel puis ajoutez-le de nouveau (ou créez un nouveau conteneur). La recherche vectorielle ne peut pas être désactivée sur un conteneur une fois activée. Un modèle d'incorporation à 3 072 dimensions ne peut pas utiliser `flat`.

**2. Interroger avec `VectorDistance` :**

```text
query_vector = embed("How do I rotate the storage key?")   # same model as the stored vectors

results = container.query_items(
    query="""SELECT TOP 5 c.id, c.text,
                    VectorDistance(c.embedding, @v) AS score
             FROM c
             WHERE c.tenantId = @tenant AND c.lang = 'en'
             ORDER BY VectorDistance(c.embedding, @v)""",
    parameters=[{"name": "@v", "value": query_vector},
                {"name": "@tenant", "value": "fabrikam"}],
    partition_key="fabrikam")
```

| Règle | Pourquoi |
| --- | --- |
| Toujours `TOP N` | Sans cela, la recherche renvoie beaucoup plus de résultats, avec plus de RU et de latence |
| `ORDER BY VectorDistance(...)` | Renvoie d'abord les plus similaires |
| `WHERE` sur les métadonnées et la clé de partition | Réduit les vecteurs candidats (RAG multilocataire, langue, date) |
| Même modèle d'incorporation et mêmes dimensions pour les documents et la requête | Sinon les distances n'ont aucun sens ou la requête échoue |

Avec `diskANN`, les résultats sont approximatifs : la même requête peut renvoyer des résultats légèrement différents ; un `searchListSizeMultiplier` plus grand dans `VectorDistance` améliore le rappel au prix de RU et de latence.

<!-- section: change-feed | objectives: 2.1.4 -->
## Réagir aux éléments nouveaux ou mis à jour avec le flux de modification

Le **flux de modification** (change feed) liste dans l'ordre les modifications d'un conteneur, par clé de partition. Dans le mode par défaut **dernière version** (latest version), il contient les insertions et les mises à jour mais **pas les suppressions**. Le mode **toutes les versions et suppressions** (all versions and deletes, préversion) signale aussi les versions intermédiaires et les suppressions, dans la période de rétention de la sauvegarde continue.

**Processeur de flux de modification** (bibliothèque des SDK .NET et Java ; **non disponible en Python**, qui utilise le modèle d'extraction ou Azure Functions) :

| Composant | Rôle |
| --- | --- |
| Conteneur surveillé | Le conteneur dont on lit les modifications |
| Conteneur de baux | Stocke la progression (un bail par plage de partitions) et coordonne les instances |
| Instance de calcul | Un hôte qui exécute le processeur, avec un **nom d'instance unique** |
| Délégué | Votre code qui traite chaque lot de modifications |

```text
// .NET SDK
ChangeFeedProcessor processor = container
    .GetChangeFeedProcessorBuilder<Chunk>("embedding-processor", HandleChangesAsync)
    .WithInstanceName("worker-01")
    .WithLeaseContainer(leaseContainer)
    .Build();
await processor.StartAsync();
```

| Comportement | Règle |
| --- | --- |
| Livraison | **Au moins une fois** : le bail n'est mis à jour qu'après la réussite du délégué ; une exception non gérée fait revenir le même lot. Rendez le traitement idempotent ; envoyez les éléments toxiques vers un conteneur ou une file d'erreurs |
| Scale-out | Les instances qui ont le même nom de processeur et le même conteneur de baux, mais des noms d'instance différents, se partagent les baux ; plus d'instances que de baux en laisse certaines inactives |
| Point de départ | Par défaut, seulement les modifications après le premier démarrage ; `WithStartTime` ou depuis le début, appliqués uniquement lors de la première initialisation du conteneur de baux |
| Travail asynchrone dans le délégué | Attendez-le : le bail peut être enregistré avant la fin d'un travail lancé sans attente, et des événements sont perdus |

**Option Python 1 : déclencheur Azure Functions.** Il lit le flux de modification pour vous, sur toutes les partitions, et exige un conteneur de baux (le décorateur Python prend la forme snake_case des paramètres ci-dessous) :

```text
import azure.functions as func

app = func.FunctionApp()

@app.cosmos_db_trigger(arg_name="documents",
                       database_name="ragdb",
                       container_name="chunks",
                       connection="COSMOS_CONNECTION",
                       lease_container_name="leases",
                       create_lease_container_if_not_exists="true")
def embed_changes(documents: func.DocumentList):
    for doc in documents:
        upsert_embedding(doc)   # must tolerate the same document twice
```

| Paramètre | Valeur par défaut et règle |
| --- | --- |
| `leaseContainerName` | `leases` |
| `createLeaseContainerIfNotExists` | `false` : le conteneur de baux doit exister, sauf si la valeur est true |
| `startFromBeginning` | Lit tout l'historique, uniquement la première fois (sans effet une fois les baux créés) |
| `leaseContainerPrefix` | Permet à plusieurs fonctions de partager un conteneur de baux ; sinon donnez à chaque fonction son propre conteneur de baux, ou une seule d'entre elles est déclenchée |
| `feedPollDelay` | 5 000 ms entre deux interrogations une fois les modifications épuisées |
| `maxItemsPerInvocation` | Nombre maximal d'éléments par appel de fonction |

**Option Python 2 : modèle d'extraction (pull model).** Votre code lit le flux et conserve lui-même la position :

```text
changes = container.query_items_change_feed(start_time="Beginning",
                                            partition_key="fabrikam")
for doc in changes:
    upsert_embedding(doc)
```

| Paramètre | Valeurs |
| --- | --- |
| `start_time` | `"Now"` (par défaut), `"Beginning"` ou un `datetime` (converti en UTC) |
| `partition_key` / `feed_range` | Lire une seule partition logique / une plage, pour paralléliser manuellement |
| `continuation` | Jeton d'une réponse précédente : reprendre là où le lecteur s'est arrêté (prioritaire sur `start_time`) |
| `mode` | `"LatestVersion"` ou `"AllVersionsAndDeletes"` (ce dernier démarre à `"Now"` ou depuis un jeton de continuation) |

| Exigence | Réponse |
| --- | --- |
| Python, serverless, mise à l'échelle avec la charge, aucun état à gérer | Déclencheur Cosmos DB d'Azure Functions |
| Worker Python qui ne traite que la partition d'un locataire, à son rythme | Modèle d'extraction avec `partition_key` |
| Service .NET ou Java qui répartit la charge sur plusieurs instances | Processeur de flux de modification |
| Réagir aux suppressions | Suppression logique (un indicateur, puis TTL), ou mode toutes les versions et suppressions |

> **Piège d'examen.** Le modèle d'extraction n'a ni conteneur de baux ni interrogation automatique : votre code stocke le jeton de continuation et vérifie de nouveau quand il n'y a pas de nouvelles modifications. Le processeur de flux de modification et le déclencheur Functions conservent leur état dans le conteneur de baux, et les deux types de marque-page ne se convertissent pas l'un en l'autre.

<!-- section: key-points -->
## Points clés

- Un seul `CosmosClient` par application ; `read_item(id, partition_key)` est la lecture la moins chère ; les requêtes paramétrées limitées par `partition_key` évitent les requêtes interpartitions.
- Accès sans clé = `DefaultAzureCredential` plus un rôle de plan de données Cosmos DB (Built-in Data Reader / Data Contributor) attribué avec `az cosmosdb sql role assignment create`, pas le rôle Azure RBAC Contributor.
- Excluez les chemins jamais interrogés pour réduire les RU d'écriture ; index composites pour les `ORDER BY` multipropriétés et les filtres égalité plus plage ; le chemin le plus précis l'emporte.
- Session = lecture de ses propres écritures, niveau par défaut ; les lectures Strong et Bounded staleness coûtent deux fois plus de RU ; Strong est impossible avec plusieurs régions d'écriture.
- Vecteurs : activés par défaut, sans capacité de compte ; déclarez la stratégie d'incorporation (path, dataType, dimensions, distanceFunction) et un index vectoriel (`flat` jusqu'à 505 dimensions, `quantizedFlat`, `diskANN` jusqu'à 4 096) ; interrogez avec `SELECT TOP N ... ORDER BY VectorDistance(...)`.
- Flux de modification : insertions et mises à jour, pas de suppressions en mode dernière version ; processeur = conteneur surveillé + conteneur de baux + instances + délégué, au moins une fois ; Python utilise le déclencheur Functions ou `query_items_change_feed`.
