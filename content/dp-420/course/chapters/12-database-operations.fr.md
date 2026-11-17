Ce chapitre réunit le code SDK que l'on écrit chaque jour sur un conteneur : requêtes paramétrées et paginées, lectures ponctuelles, les cinq opérations d'écriture dont le patch, lots transactionnels et imports en bloc, durée de vie et contrôle d'accès concurrentiel optimiste. Les questions d'examen montrent du C# ou du Python à trous (la méthode, l'option de requête, l'argument de clé de partition) ou demandent quelle opération donne le bon résultat au coût en RU le plus faible.

<!-- section: queries-paging | objectives: 1.2.1 -->
## Requêtes, paramètres, pagination et jetons de continuation

Les requêtes utilisent le langage de requête NoSQL : `SELECT ... FROM c WHERE ... ORDER BY ...`, où `c` est un alias du conteneur. **Passez toujours les valeurs en paramètres** : pas de concaténation de chaînes (injection, erreurs d'échappement).

```text
// C#: parameterized query scoped to one logical partition, read one page at a time
QueryDefinition query = new QueryDefinition(
        "SELECT c.id, c.orderDate, c.total FROM c WHERE c.customerId = @customerId AND c.status = @status ORDER BY c.orderDate DESC")
    .WithParameter("@customerId", "customer-42")
    .WithParameter("@status", "shipped");

QueryRequestOptions options = new QueryRequestOptions
{
    PartitionKey = new PartitionKey("customer-42"),   // no fan-out to other partitions
    MaxItemCount = 25                                  // page size; -1 = no limit per page
};

using FeedIterator<OrderSummary> iterator = container.GetItemQueryIterator<OrderSummary>(
    query, continuationToken: tokenFromClient, requestOptions: options);

if (iterator.HasMoreResults)
{
    FeedResponse<OrderSummary> page = await iterator.ReadNextAsync();
    string next = page.ContinuationToken;              // null when the results are exhausted
    double charge = page.RequestCharge;
}
```

```text
# Python: same query, resumed from a continuation token
pager = container.query_items(
    query="SELECT c.id, c.orderDate, c.total FROM c WHERE c.customerId = @customerId AND c.status = @status ORDER BY c.orderDate DESC",
    parameters=[{"name": "@customerId", "value": "customer-42"},
                {"name": "@status", "value": "shipped"}],
    partition_key="customer-42",
    max_item_count=25)
pages = pager.by_page(continuation_token=token_from_client)
first_page = list(next(pages))
next_token = pages.continuation_token
```

| Élément | Règle |
| --- | --- |
| Clé de partition dans les options de requête (ou filtre d'égalité sur elle) | Requête sur une seule partition : RU et latence les plus faibles |
| Pas de clé de partition | Requête entre partitions, 2 à 3 RU de plus par partition physique ; avec le client Python synchrone, passez `enable_cross_partition_query=True` |
| `MaxItemCount` / `max_item_count` | Nombre maximal d'éléments par page ; une page peut en contenir **moins**, voire **aucun** |
| Pourquoi une page est courte | Limitation de débit, réponse trop volumineuse, exécution trop longue, ou le moteur a jugé plusieurs exécutions plus efficaces |
| `HasMoreResults` | Appelez `ReadNextAsync` tant qu'il vaut true : une page vide n'est pas la fin |
| Jeton de continuation | Point de reprise sans état côté serveur ; un seul jeton quel que soit le nombre de partitions ; **n'expire jamais** avec la même version du SDK |
| Taille du jeton | Limitez-la avec `ResponseContinuationTokenLimitInKb` (.NET) ou `continuation_token_limit` (Python, en Ko) |
| `GROUP BY`, `DISTINCT` | Pas de jeton de continuation (sauf `DISTINCT` avec `ORDER BY`) |
| `OFFSET n LIMIT m` | Ignore n résultats et renvoie les m suivants ; à combiner avec `ORDER BY` pour un ordre stable |
| `ORDER BY` sur deux propriétés ou plus | Exige un index composite |

LINQ est disponible en .NET : `container.GetItemLinqQueryable<Order>().Where(o => o.customerId == id).ToFeedIterator()`. N'appelez jamais `ToList()` sur le queryable : c'est un appel bloquant.

> **Piège d'examen.** Une boucle qui s'arrête à la première page vide perd des résultats. Arrêtez-vous quand `HasMoreResults` vaut false ou que le jeton de continuation est null.

<!-- section: point-reads | objectives: 1.2.2 -->
## Lectures ponctuelles

Une **lecture ponctuelle** récupère un élément par son `id` **et** sa valeur de clé de partition, sans passer par le moteur de requête. C'est l'opération la moins chère : environ 1 RU pour un élément de 1 Ko.

```text
// C#
ItemResponse<Order> response = await container.ReadItemAsync<Order>(
    id: "order-1001", partitionKey: new PartitionKey("customer-42"));
Order order = response.Resource;

// C#: the stream variant doesn't throw on 404
using ResponseMessage message = await container.ReadItemStreamAsync("order-1001", new PartitionKey("customer-42"));
if (message.StatusCode == HttpStatusCode.NotFound) { /* not there */ }

// C#: many known (id, partition key) pairs in one call
IReadOnlyList<(string, PartitionKey)> keys = new List<(string, PartitionKey)>
{
    ("order-1001", new PartitionKey("customer-42")),
    ("order-2002", new PartitionKey("customer-77"))
};
FeedResponse<Order> orders = await container.ReadManyItemsAsync<Order>(keys);

# Python
order = container.read_item(item="order-1001", partition_key="customer-42")
```

| Exigence | Opération |
| --- | --- |
| Un élément, `id` et clé de partition connus | `ReadItemAsync` / `read_item` |
| Plusieurs éléments, tous les couples connus | `ReadManyItemsAsync` (.NET) : un seul appel au lieu de nombreuses lectures ou d'une requête `IN` |
| Un élément, seul l'`id` est connu | Requête sur `c.id` (entre partitions), sauf si la clé de partition est `/id` : alors lecture ponctuelle |
| Éviter de retélécharger un élément inchangé | Lecture ponctuelle avec If-None-Match et l'`_etag` en cache : 304 Not Modified |
| Clé de partition hiérarchique | Clé complète construite avec `PartitionKeyBuilder` (tous les niveaux) ; un préfixe ne suffit pas |

L'`id` n'est unique **qu'au sein d'une partition logique** : deux éléments de partitions différentes peuvent avoir le même `id`, c'est pourquoi la clé de partition est obligatoire. Un élément absent lève `CosmosException` avec le statut 404 en .NET, `CosmosResourceNotFoundError` en Python.

> **Piège d'examen.** `SELECT * FROM c WHERE c.id = @id` avec la clé de partition renvoie le même élément mais coûte plus que `ReadItemAsync`. « RU le plus faible » avec un ID et une clé de partition connus signifie toujours lecture ponctuelle.

<!-- section: write-operations | objectives: 1.2.3 -->
## Création, remplacement, upsert, patch et suppression

| Opération | .NET / Python | Comportement |
| --- | --- | --- |
| Create | `CreateItemAsync` / `create_item` | Échoue avec **409 Conflict** si l'`id` existe dans cette partition logique |
| Replace | `ReplaceItemAsync` / `replace_item` | Remplace l'élément **entier** ; **404** s'il n'existe pas |
| Upsert | `UpsertItemAsync` / `upsert_item` | Crée ou remplace |
| Patch | `PatchItemAsync` / `patch_item` | Applique jusqu'à **10** opérations sur des chemins, côté serveur |
| Delete | `DeleteItemAsync` / `delete_item` | **404** s'il n'existe pas |
| Supprimer toute une partition logique | `delete_all_items_by_partition_key` (Python) | Opération en arrière-plan qui utilise au plus 10 % des RU/s du conteneur |

**Opérations de patch** (mise à jour partielle de document) :

| Opération | Comportement |
| --- | --- |
| `Add` | Ajoute la propriété, ou la remplace si elle existe ; sur un index de tableau, **insère** et décale ; `-` ajoute à la fin |
| `Set` | Comme Add, mais sur un index de tableau elle **met à jour** l'élément |
| `Replace` | Stricte : erreur si le chemin n'existe pas |
| `Remove` | Erreur si le chemin n'existe pas |
| `Increment` (`incr`) | Ajoute un nombre positif ou négatif ; crée le champ s'il manque |
| `Move` | Déplace la valeur de `from` vers `path` ; `from` doit exister |

```text
// C#: conditional patch; fails with 412 if the predicate is false
ItemResponse<Order> patched = await container.PatchItemAsync<Order>(
    id: "order-1001",
    partitionKey: new PartitionKey("customer-42"),
    patchOperations: new[]
    {
        PatchOperation.Replace("/status", "shipped"),
        PatchOperation.Increment("/version", 1),
        PatchOperation.Add("/events/-", new { type = "shipped", at = DateTime.UtcNow })
    },
    requestOptions: new PatchItemRequestOptions { FilterPredicate = "FROM c WHERE c.status = 'packed'" });

# Python
container.patch_item(
    item="order-1001", partition_key="customer-42",
    patch_operations=[
        {"op": "replace", "path": "/status", "value": "shipped"},
        {"op": "incr", "path": "/version", "value": 1},
        {"op": "add", "path": "/events/-", "value": {"type": "shipped"}}],
    filter_predicate="FROM c WHERE c.status = 'packed'")
```

Le patch économise processeur client, latence et bande passante (pas d'aller-retour lecture-modification-écriture). Avec des écritures multirégions, des patchs concurrents sur des **chemins différents** du même élément fusionnent automatiquement ; sur le même chemin, c'est la stratégie de résolution des conflits qui s'applique.

Une **valeur de clé de partition ne se modifie pas** sur place : créez l'élément avec la nouvelle valeur et supprimez l'ancien (deux opérations, non atomiques entre partitions). Pour ne pas recevoir le corps de la réponse aux écritures, définissez `EnableContentResponseOnWrite = false` (.NET) ou `no_response=True` (Python).

> **Piège d'examen.** « Créer l'élément seulement s'il n'existe pas encore », c'est `Create` (409 en cas de doublon), pas `Upsert`, qui écrase sans prévenir.

<!-- section: bulk-batch | objectives: 1.2.4 -->
## Opérations en bloc, par lot et transactionnelles

| | Lot transactionnel | Exécution en bloc |
| --- | --- | --- |
| Objectif | Plusieurs opérations qui réussissent ou échouent **ensemble** | Débit maximal pour de nombreuses opérations indépendantes |
| Portée | **Une seule valeur de clé de partition logique** | N'importe quelles partitions |
| Atomicité | ACID avec isolation de capture instantanée ; annulé si une opération échoue | Aucune : chaque opération réussit ou échoue seule |
| Limites | 100 opérations, requête de 2 Mo, 5 secondes d'exécution | Limitée par les RU/s ; gérez les 429 par opération |
| Comment | `CreateTransactionalBatch(pk)` puis `ExecuteAsync()` ; `execute_item_batch` en Python | `AllowBulkExecution = true` sur le client, puis de nombreuses opérations ponctuelles concurrentes (.NET, Java) |

```text
// C#: order header, order line and cart update in one transaction (same partition key value)
using TransactionalBatchResponse response = await container
    .CreateTransactionalBatch(new PartitionKey("customer-42"))
    .CreateItem(order)
    .CreateItem(orderLine)
    .PatchItem("cart-customer-42", new[] { PatchOperation.Set("/status", "checkedOut") })
    .ExecuteAsync();

if (!response.IsSuccessStatusCode)
{
    // nothing was written: the failing operation has its own status code, the others 424
}

# Python
from azure.cosmos import exceptions

batch = [
    ("create", (order,)),
    ("create", (order_line,)),
    ("patch", ("cart-customer-42", [{"op": "set", "path": "/status", "value": "checkedOut"}])),
]
try:
    results = container.execute_item_batch(batch_operations=batch, partition_key="customer-42")
except exceptions.CosmosBatchOperationError as error:
    pass  # the error reports the failed operation and the responses of the batch
```

```text
// C#: bulk import with a dedicated client
CosmosClient bulkClient = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { AllowBulkExecution = true });
Container target = bulkClient.GetContainer("sales", "orders");

List<Task> tasks = new List<Task>();
foreach (Order o in ordersToImport)
{
    tasks.Add(target.CreateItemAsync(o, new PartitionKey(o.customerId)));
}
await Task.WhenAll(tasks);   // the SDK groups concurrent operations into service calls per partition
```

En .NET, le lot ne lève pas d'exception quand une opération échoue : vérifiez `IsSuccessStatusCode`, puis `GetOperationResultAtIndex<T>(i)`. Une création sur un `id` existant dans un lot renvoie 409. En préfixe cohérent, les lecteurs voient toutes les écritures d'un lot ou aucune. Le readme du SDK Python indique que les requêtes en bloc ne sont pas encore implémentées, et limite les opérations d'un lot à 1,2 Mo.

> **Piège d'examen.** Aucune transaction ne couvre deux partitions logiques. « Débiter le client A et créditer le client B de façon atomique » est impossible si la clé de partition est `/customerId` : revoyez le modèle pour que les deux éléments partagent une clé, ou utilisez un mécanisme de compensation.

<!-- section: time-to-live | objectives: 1.2.5 -->
## Configurer la durée de vie (TTL)

La TTL supprime automatiquement les éléments un certain nombre de secondes après leur **dernière modification** (ou leur création). Elle se définit sur le conteneur (`DefaultTimeToLive`, `defaultTtl`) et éventuellement par élément (propriété `ttl`).

| TTL du conteneur | `ttl` de l'élément | Résultat |
| --- | --- | --- |
| Non définie (null) | Quelconque ou absente | Rien n'expire ; le `ttl` de l'élément est **ignoré** |
| `-1` | Absente | TTL activée, les éléments n'expirent jamais |
| `-1` | `3600` | Cet élément expire au bout d'une heure ; les autres jamais |
| `604800` | Absente | Chaque élément expire 7 jours après sa dernière écriture |
| `604800` | `-1` | Cet élément n'expire jamais ; les autres au bout de 7 jours |
| `3600` | `1800` | Cet élément au bout de 30 minutes ; les autres au bout d'une heure |

Règles : les valeurs sont en secondes ; le `ttl` d'un élément vaut `-1` ou un entier positif jusqu'à 2147483647 ; `null` n'est pas pris en charge sur un élément (omettez la propriété pour utiliser la valeur du conteneur) ; les éléments expirés sont retirés par une purge en arrière-plan.

```text
// C#: container default of 30 days
ContainerProperties props = new ContainerProperties("sessions", "/userId") { DefaultTimeToLive = 2592000 };

// C#: item-level override, omitted from the JSON when null
public class Session
{
    public string id { get; set; }
    public string userId { get; set; }
    [JsonProperty("ttl", NullValueHandling = NullValueHandling.Ignore)]
    public int? ttl { get; set; }
}

# Python: enable TTL on an existing container (1 hour)
database.replace_container(container, partition_key=PartitionKey(path="/userId"), default_ttl=3600)
```

Modèle courant pour les consommateurs du flux de modification en mode dernière version : marquez l'élément comme supprimé (une mise à jour que le flux voit) et définissez son `ttl` pour que la purge le retire plus tard.

> **Piège d'examen.** Définir `ttl` sur les éléments ne fait rien tant que la TTL du conteneur n'est pas définie. « Certains éléments n'expirent jamais, d'autres après un délai » exige une TTL de conteneur (à `-1` ou à une valeur), puis un `ttl` sur les éléments.

<!-- section: concurrency | objectives: 1.2.6 -->
## Contrôle de la concurrence

Chaque élément possède un `_etag` système que le serveur change à **chaque** mise à jour. **Contrôle d'accès concurrentiel optimiste** : envoyez l'`_etag` lu dans une condition If-Match ; si l'élément a changé depuis, le serveur rejette l'écriture avec **HTTP 412 Precondition Failed**, et votre code relit puis réessaie. Pour un remplacement, If-Match doit être indiqué explicitement dans les options de requête.

```text
// C#: read-modify-write that never overwrites a concurrent change
while (true)
{
    ItemResponse<Account> read = await container.ReadItemAsync<Account>("acc-7", new PartitionKey("acc-7"));
    Account account = read.Resource;
    account.balance -= 25;
    try
    {
        await container.ReplaceItemAsync(account, account.id, new PartitionKey(account.id),
            new ItemRequestOptions { IfMatchEtag = read.ETag });
        break;
    }
    catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed)
    {
        // 412: the item changed after our read; loop to read it again
    }
}

# Python
from azure.core import MatchConditions
doc = container.read_item(item="acc-7", partition_key="acc-7")
doc["balance"] -= 25
container.replace_item(item=doc["id"], body=doc,
                       etag=doc["_etag"], match_condition=MatchConditions.IfNotModified)
# raises CosmosHttpResponseError with status_code 412 if the item changed
```

| Exigence | Mécanisme |
| --- | --- |
| Ne pas perdre une mise à jour concurrente dans un cycle lecture-modification-écriture | If-Match avec `_etag` (`IfMatchEtag`, `etag` + `MatchConditions.IfNotModified`), nouvelle tentative sur 412 |
| Mettre à jour un compteur sans le lire d'abord | Patch `Increment` : appliqué de façon atomique sur le serveur |
| Appliquer une modification seulement si l'élément est dans un état donné | Patch conditionnel (`FilterPredicate`), 412 si le prédicat est faux |
| Plusieurs éléments changent ensemble ou pas du tout | Lot transactionnel (même partition logique) |
| Rafraîchir un cache seulement si l'élément a changé | If-None-Match avec `_etag` : 304 s'il n'a pas changé |
| Écritures concurrentes dans plusieurs régions d'écriture | Stratégie de résolution des conflits : le dernier écrivain gagne sur `_ts` par défaut, ou personnalisée |

Toutes les opérations au sein d'une partition logique s'exécutent comme des transactions ACID avec isolation de capture instantanée. Il n'existe pas d'API de verrou : la concurrence est optimiste. Avec des écritures multirégions, une mise à jour est validée dans la région locale si son `_etag` y correspond ; la stratégie de résolution des conflits la conserve ou la rejette ensuite à l'échelle globale.

> **Piège d'examen.** La cohérence Session et le jeton de session garantissent la lecture de ses propres écritures ; ils n'empêchent pas deux clients de s'écraser mutuellement. Les mises à jour perdues sont évitées par l'ETag.

<!-- section: key-points -->
## Points clés

- Paramétrez chaque requête, limitez-la par la clé de partition et paginez avec `HasMoreResults` et des jetons de continuation (sans expiration, un par requête) ; les pages vides sont normales.
- Lecture ponctuelle = `id` + clé de partition, environ 1 RU par Ko ; toujours moins chère qu'une requête pour le même élément.
- Create renvoie 409 sur un doublon, Replace et Delete 404 si l'élément manque, Upsert fait les deux ; Patch : jusqu'à 10 opérations, conditionnel avec un prédicat de filtre.
- Lot transactionnel : une partition logique, 100 opérations, tout ou rien. Exécution en bloc : du débit, sans atomicité.
- La TTL ne fonctionne que si la TTL du conteneur est définie ; `-1` signifie « n'expire jamais ».
- `_etag` + If-Match et HTTP 412 pour la concurrence optimiste ; les incréments par patch évitent la lecture.
