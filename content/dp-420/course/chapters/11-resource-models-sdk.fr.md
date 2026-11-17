Avant la première ligne de code d'accès aux données, une solution Cosmos DB fixe cinq choses : le niveau de cohérence, le budget de RU, le modèle de débit qui le paie, les paramètres portés par le compte ou par le conteneur, et la façon dont le client SDK se connecte. Les questions décrivent une charge de travail et demandent le niveau, le mode, le paramètre ou l'option du client qui satisfait une contrainte au coût le plus faible.

<!-- section: consistency-levels | objectives: 1.1.1 -->
## Évaluer les niveaux de cohérence

Le compte a un **niveau de cohérence par défaut** (Session si vous ne le changez pas) qui s'applique à toutes les bases de données et à tous les conteneurs. Du plus fort au plus faible :

| Niveau | Garantie | Coût des lectures | Écritures multirégions |
| --- | --- | --- | --- |
| Strong (fort) | Linéarisabilité : les lectures renvoient la dernière version validée | 2 réplicas (minorité locale) : environ **deux fois** les RU de lecture | Impossible |
| Bounded staleness (obsolescence limitée) | Retard entre régions inférieur à K versions ou T secondes, selon le premier atteint | Environ deux fois les RU de lecture | Autorisé, mais c'est un anti-modèle |
| Session | Dans une session : lecture de ses propres écritures et écritures après lectures | Un seul réplica | Oui |
| Consistent prefix (préfixe cohérent) | Jamais dans le désordre ; les écritures d'un lot transactionnel sont visibles ensemble | Un seul réplica | Oui |
| Eventual (éventuel) | Aucune garantie d'ordre | Un seul réplica | Oui |

Les RU d'écriture sont les mêmes à tous les niveaux. Minimums de l'obsolescence limitée : K = 10 écritures ou T = 5 secondes pour un compte monorégion ; K = 100 000 écritures ou T = 300 secondes pour un compte multirégion. Strong entre des régions distantes de plus de 5 000 miles (8 000 km) est bloqué par défaut, et sa latence d'écriture vaut deux fois l'aller-retour entre les deux régions les plus éloignées, plus 10 ms au 99e centile.

| Exigence | Niveau |
| --- | --- |
| Un utilisateur voit toujours ses propres modifications de panier, coût le plus faible | Session |
| Chaque client, dans chaque région, lit la dernière écriture validée | Strong (une seule région d'écriture) |
| Les lectures globales peuvent être en retard, mais dans une fenêtre connue | Bounded staleness |
| L'ordre des mises à jour doit être respecté, un retard est accepté | Consistent prefix |
| Compteurs de « j'aime », de vues, débit de lecture maximal | Eventual |

Les **jetons de session** sont propres à chaque partition. Un client qui n'a pas écrit dans une partition n'a pas de jeton pour elle, et ses lectures y sont de niveau éventuel. Quand plusieurs instances d'application servent le même utilisateur (ferme web), transmettez le jeton de la réponse d'écriture à la lecture suivante ; recréer le client vide son cache de jetons.

Un client ou une requête peut **assouplir** la cohérence des lectures (jamais la rendre plus forte que celle du compte). Après avoir changé le niveau par défaut du compte, redémarrez les applications pour que les clients SDK soient recréés.

```text
// C#: relax reads for this client only
CosmosClient client = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { ConsistencyLevel = ConsistencyLevel.Eventual });

// C#: hand the session token from one instance to another
ItemResponse<Cart> write = await container.UpsertItemAsync(cart, new PartitionKey(cart.userId));
string token = write.Headers.Session;              // for example, stored in a cookie
ItemResponse<Cart> read = await container.ReadItemAsync<Cart>(cart.id, new PartitionKey(cart.userId),
    new ItemRequestOptions { SessionToken = token });
```

> **Piège d'examen.** « Les utilisateurs doivent voir leurs propres écritures » n'impose pas Strong : Session donne cette garantie au coût d'un seul réplica. Strong exclut en outre les écritures multirégions.

<!-- section: request-units | objectives: 1.1.2 -->
## Évaluer la consommation d'unités de requête

Une **unité de requête** (RU) normalise le processeur, les IOPS et la mémoire. **Lire un élément d'environ 1 Ko par son ID et sa clé de partition coûte 1 RU.** Les coûts sont déterministes : la même opération sur les mêmes données coûte toujours le même nombre de RU.

| Facteur | Effet sur les RU |
| --- | --- |
| Taille de l'élément | Un élément plus gros coûte plus cher à lire et à écrire |
| Propriétés indexées | Chaque propriété indexée alourdit l'écriture ; exclure des chemins l'allège |
| Cohérence | Les lectures Strong et Bounded staleness coûtent environ deux fois plus |
| Lecture ponctuelle ou requête | Une lecture ponctuelle coûte toujours moins qu'une requête qui renvoie le même élément |
| Forme de la requête | Nombre de résultats, de prédicats, de fonctions définies par l'utilisateur, taille des données parcourues et du résultat, projections |
| Portée de partition | Une requête sans clé de partition paie 2 à 3 RU de plus par partition physique vérifiée |
| Régions | R RU/s provisionnées sont disponibles, et facturées, dans **chaque** région : R × N au total |

Lisez le coût réel au lieu de le deviner :

```text
// C#
ItemResponse<Order> response = await container.ReadItemAsync<Order>("order-1001", new PartitionKey("customer-42"));
double charge = response.RequestCharge;            // also on FeedResponse for each query page

# Python: the response hook receives the response headers
charges = []
item = container.read_item(item="order-1001", partition_key="customer-42",
    response_hook=lambda headers, body: charges.append(float(headers["x-ms-request-charge"])))
```

Quand les RU/s d'une seconde sont épuisées sur une partition, les requêtes reçoivent **HTTP 429** avec un en-tête `x-ms-retry-after-ms`. Le SDK .NET réessaie automatiquement (9 tentatives par défaut, jusqu'à 30 secondes d'attente cumulée) avant de remonter l'exception. Un taux stable de 1 à 5 % de 429 avec une latence acceptable signifie que les RU/s sont pleinement utilisées, pas sous-dimensionnées.

Pour estimer un budget, multipliez le coût mesuré de chaque opération par sa fréquence par seconde et additionnez : 800 lectures ponctuelles/s d'éléments de 1 Ko font environ 800 RU/s, et environ 1 600 RU/s en Strong.

> **Piège d'examen.** `EnableContentResponseOnWrite = false` économise de la bande passante et la sérialisation côté client ; il ne rend pas l'écriture elle-même moins chère. Réduisez les RU d'écriture en indexant moins de chemins ou en écrivant des éléments plus petits.

<!-- section: throughput-models | objectives: 1.1.3 -->
## Évaluer et configurer le débit

| | Standard (manuel) | Autoscale | Serverless |
| --- | --- | --- | --- |
| Configuration | RU/s fixes, par paliers de 100, minimum 400 | Maximum `Tmax` par paliers de 1 000 ; varie entre 0,1 × `Tmax` et `Tmax` (point d'entrée 100 à 1 000 RU/s) | Rien à provisionner |
| Facturation | RU/s provisionnées, chaque heure | RU/s les plus élevées atteintes dans chaque heure, à 1,5 × le tarif manuel (même tarif que le manuel avec des écritures multirégions) | RU consommées, plus le stockage |
| Au-delà de la capacité | 429 | Monte jusqu'à `Tmax`, puis 429 | 5 000 RU/s par partition physique |
| Régions | Illimitées | Illimitées | **Une seule région**, impossible d'en ajouter ensuite |
| Idéal pour | Trafic régulier et prévisible | Trafic variable ; `Tmax` complet utilisé 66 % des heures ou moins | Trafic intermittent, rapport moyenne/pic inférieur à 10 %, dev/test |

La règle de Microsoft : faites la moyenne, sur le mois, de l'utilisation normalisée la plus élevée de chaque heure. En dessous de 66 %, l'autoscale est estimé moins cher ; au-dessus, restez en manuel. Avec des écritures multirégions, préférez l'autoscale (même tarif). Tarifs d'exemple de Learn (une seule région d'écriture) : manuel 0,008 $ et autoscale 0,012 $ pour 100 RU/s par heure.

**Où se règle le débit.** Sur un **conteneur** (débit dédié, réservé à ce conteneur, couvert par le SLA ; recommandé) ou sur une **base de données** (débit partagé par 25 conteneurs au plus, sans garantie par conteneur ; un conteneur très sollicité peut limiter les autres). Les deux se combinent : un conteneur avec ses propres RU/s dans une base à débit partagé. Le choix partagé ou dédié se fait à la création et ne se convertit pas : déplacez les données vers un nouveau conteneur (tâches de copie de conteneur).

RU/s minimales jusqu'auxquelles vous pouvez descendre :

| Ressource | Minimum |
| --- | --- |
| Conteneur manuel | `MAX(400, storage GB × 1, highest RU/s ever provisioned / 100)` |
| Conteneur autoscale | RU/s maximales de `MAX(1000, storage GB × 10, highest max RU/s ever provisioned / 10)` |

L'autoscale relève aussi `Tmax` automatiquement quand le stockage grossit : chaque `Tmax` couvre 0,1 × `Tmax` Go. Les comptes créés après le 25 septembre 2024 ont la **mise à l'échelle dynamique** (chaque partition physique et chaque région varient indépendamment) ; les comptes plus anciens l'activent dans la page Fonctionnalités (Features) du compte.

```bash
az cosmosdb sql container create --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --partition-key-path "/customerId" --throughput 400

# Switch to autoscale, then set the maximum
az cosmosdb sql container throughput migrate --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --throughput-type autoscale
az cosmosdb sql container throughput update --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --max-throughput 10000
```

**Capacité de rafale (burst capacity)** (page Features du compte, comptes provisionnés uniquement) : chaque partition physique sous 3 000 RU/s accumule jusqu'à 5 minutes de capacité inutilisée et peut la dépenser à 3 000 RU/s au plus. C'est du meilleur effort, pas un substitut aux RU/s provisionnées.

> **Piège d'examen.** Seul le serverless ne coûte rien au repos : un conteneur autoscale est facturé au moins 10 % de `Tmax` chaque heure. Et un compte serverless ne peut pas devenir multirégion.

<!-- section: account-container-settings | objectives: 1.1.4 -->
## Paramètres au niveau du compte et du conteneur

| Niveau compte | Niveau conteneur |
| --- | --- |
| API (fixée à la création) et mode de capacité : provisionné ou serverless (fixé à la création) | Chemin de la clé de partition (fixé à la création) |
| Niveau de cohérence par défaut | Débit, s'il est dédié |
| Régions, écritures multirégions, basculement géré par le service | Stratégie d'indexation (modifiable en ligne) |
| Stratégie de sauvegarde (périodique ou continue) | Durée de vie par défaut (modifiable) |
| Réseau : accès public, pare-feu, points de terminaison privés | Stratégie de clés uniques (à la création uniquement, 10 clés uniques au plus) |
| Authentification locale (par clé) activée ou non | Stratégie de résolution des conflits pour les écritures multirégions (à la création uniquement) |
| Niveau gratuit (1 000 premières RU/s et 25 Go gratuits ; à choisir à la création) | Stratégies d'incorporation vectorielle et de texte intégral |
| Page Features : capacité de rafale, exécution basée sur la priorité, mise à l'échelle dynamique | |

**Exécution basée sur la priorité** (page Features ; pas pour le serverless) : quand les requêtes dépassent les RU/s, les requêtes de faible priorité sont limitées en premier, en meilleur effort. Les requêtes sans priorité s'exécutent en High. Elle se règle par requête : `new ItemRequestOptions { PriorityLevel = PriorityLevel.Low }` (.NET 3.38.0 ou ultérieur) ou `priority="Low"` en Python.

```bicep
resource account 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-contoso'
  location: 'westeurope'
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      { locationName: 'westeurope', failoverPriority: 0, isZoneRedundant: true }
      { locationName: 'northeurope', failoverPriority: 1, isZoneRedundant: false }
    ]
    enableAutomaticFailover: true
    enableMultipleWriteLocations: false
    disableLocalAuth: true
  }
}
```

> **Piège d'examen.** Les paramètres fixés à la création (clé de partition, clés uniques, stratégie de conflits, serverless, débit partagé ou dédié) ne se « modifient » qu'en créant un nouveau conteneur ou un nouveau compte et en y copiant les données.

<!-- section: databases-containers | objectives: 1.1.5 -->
## Créer et gérer des bases de données et des conteneurs

Modèle de ressources : **compte** (`https://<account>.documents.azure.com:443/`) > **base de données** > **conteneur** > **éléments**. Limites : 500 bases de données et conteneurs par compte (non augmentable), noms de 255 caractères au plus, 25 conteneurs par base à débit partagé.

```text
// C#: database, then an autoscale container with TTL and a unique key
Database database = await client.CreateDatabaseIfNotExistsAsync("sales");

ContainerProperties properties = new ContainerProperties(id: "orders", partitionKeyPath: "/customerId")
{
    DefaultTimeToLive = -1,                              // TTL on, items don't expire by default
    UniqueKeyPolicy = new UniqueKeyPolicy { UniqueKeys = { new UniqueKey { Paths = { "/orderNumber" } } } }
};
Container container = await database.CreateContainerIfNotExistsAsync(
    properties, ThroughputProperties.CreateAutoscaleThroughput(4000));

// Later: change the throughput or the TTL
await container.ReplaceThroughputAsync(ThroughputProperties.CreateAutoscaleThroughput(10000));
ContainerProperties current = (await container.ReadContainerAsync()).Resource;
current.DefaultTimeToLive = 2592000;
await container.ReplaceContainerAsync(current);
```

```text
# Python
from azure.cosmos import PartitionKey, ThroughputProperties

database = client.create_database_if_not_exists(id="sales")
container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customerId"),
    offer_throughput=ThroughputProperties(auto_scale_max_throughput=4000),
    default_ttl=-1)
```

Une clé unique est unique **au sein d'une partition logique**, pas dans tout le conteneur. Changer de clé de partition impose un nouveau conteneur et un déplacement des données (tâches de copie de conteneur, ou flux de modification pour une migration à chaud). Supprimer un conteneur supprime tous ses éléments.

Les rôles de plan de données Microsoft Entra (Cosmos DB Built-in Data Reader et Data Contributor) couvrent les éléments, les requêtes et le flux de modification, pas la création de bases de données ou de conteneurs. Avec un accès sans clé, créez les ressources par Azure Resource Manager (Bicep, CLI, portail) et laissez l'application se contenter de `GetContainer`.

> **Conseil d'examen.** `GetDatabase` et `GetContainer` (`get_database_client`, `get_container_client`) ne font que construire une référence, sans appel réseau. `CreateContainerIfNotExistsAsync` est un appel du plan de contrôle : gardez-le hors du chemin des requêtes.

<!-- section: sdk-clients | objectives: 1.1.6 -->
## Initialiser les clients SDK et les connexions

Créez **un seul client par compte pour toute la durée de vie de l'application** (il est thread-safe et met en cache connexions et adresses) ; enregistrez-le comme singleton, y compris dans Azure Functions. Un client par requête épuise les sockets et ajoute de la latence.

```text
// C#
CosmosClient client = new CosmosClient(
    accountEndpoint: "https://cosmos-contoso.documents.azure.com:443/",
    tokenCredential: new DefaultAzureCredential(),
    clientOptions: new CosmosClientOptions
    {
        ApplicationRegion = Regions.WestEurope,      // or ApplicationPreferredRegions, not both
        ConnectionMode = ConnectionMode.Direct,      // default in .NET v3
        MaxRetryAttemptsOnRateLimitedRequests = 9,
        MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30),
        EnableContentResponseOnWrite = false
    });
Container container = client.GetContainer("sales", "orders");
```

```text
# Python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient(
    url="https://cosmos-contoso.documents.azure.com:443/",
    credential=DefaultAzureCredential(),
    preferred_locations=["West Europe", "North Europe"],
    consistency_level="Session")
container = client.get_database_client("sales").get_container_client("orders")
```

| Exigence | Paramètre |
| --- | --- |
| Meilleure latence depuis .NET ou Java | Mode direct (TCP), par défaut en .NET v3 ; ouvre les ports 10000 à 20000 (n'importe quel port avec des points de terminaison privés) |
| Le pare-feu d'entreprise n'autorise que 443, ou peu de sockets disponibles | `ConnectionMode.Gateway` (HTTPS 443) |
| Application Python | Passerelle uniquement : le SDK Python n'a pas de mode direct ; utilisez `azure.cosmos.aio` pour du code asynchrone |
| Lire depuis la région la plus proche, basculer dans l'ordre | `ApplicationRegion` (le SDK ordonne les régions par proximité) ou `ApplicationPreferredRegions` ; `preferred_locations` en Python |
| Éviter une région pour une requête | `ExcludeRegions` dans les options de requête (.NET 3.37.0 ou ultérieur) |
| Absorber de courtes salves de 429 | Options de nouvelle tentative : nombre de tentatives et attente cumulée |
| Import à fort volume | `AllowBulkExecution = true`, figé pour la durée de vie du client : utilisez un client distinct |
| Aucune clé dans la configuration | `DefaultAzureCredential` ou une identité managée, plus un rôle de plan de données Cosmos DB |
| Trafic clairsemé, épuisement des ports éphémères | `PortReuseMode = PrivatePortPool`, `IdleTcpConnectionTimeout` de 20 minutes à 24 heures |

Utilisez `async`/`await` partout : `.Result`, `.Wait()` et `GetAwaiter().GetResult()` bloquent des threads. Journalisez `response.Diagnostics` quand une requête dépasse votre seuil. Le SDK .NET exige une référence explicite au package `Newtonsoft.Json` 13.0.3 ou ultérieur, même quand vous sérialisez vos types avec `UseSystemTextJsonSerializerWithOptions`.

> **Piège d'examen.** En mode direct, si les ports 10000 à 20000 sont bloqués, les requêtes échouent avec 503 Service Unavailable : passez en mode passerelle (Gateway) ou ouvrez les ports.

<!-- section: key-points -->
## Points clés

- La cohérence par défaut est Session ; Strong et Bounded staleness doublent les RU de lecture, et Strong exclut les écritures multirégions. Les clients ne peuvent qu'assouplir les lectures.
- 1 RU = lecture ponctuelle d'un élément de 1 Ko ; les écritures croissent avec la taille et les propriétés indexées ; les RU/s s'appliquent dans chaque région.
- Manuel pour une charge régulière, autoscale (0,1 × `Tmax` à `Tmax`, tarif × 1,5) pour une charge variable, serverless pour une charge intermittente monorégion.
- Clé de partition, clés uniques, stratégie de conflits, mode de capacité et débit partagé ou dédié sont fixés à la création.
- Un client singleton par compte ; le mode direct en .NET exige les ports 10000 à 20000 ; Python fonctionne uniquement en mode passerelle.
