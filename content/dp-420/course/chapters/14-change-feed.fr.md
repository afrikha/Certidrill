Le flux de modification est l'enregistrement ordonné et persistant des écritures effectuées dans un conteneur. Les questions DP-420 demandent quel consommateur construire (processeur de flux de modification, modèle de tirage (pull) ou déclencheur Azure Functions), comment configurer son conteneur de bail, quel mode capture les suppressions et comment copier un conteneur avec une tâche de copie de conteneur. Attendez-vous à du code C# ou Python à compléter.

<!-- section: change-feed-basics | objectives: 1.4.1 -->
## Fonctionnement du flux de modification

Le flux de modification est **activé par défaut** et disponible dans chaque conteneur de chaque compte, que vous l'utilisiez ou non. Il enregistre les modifications dans l'ordre où elles ont eu lieu et permet de les traiter de façon asynchrone et incrémentielle, en parallèle sur plusieurs consommateurs.

| Propriété | Comportement |
| --- | --- |
| Opérations capturées | Insertions et mises à jour. Suppressions et expirations TTL uniquement en mode Toutes les versions et suppressions |
| Ordre | Ordre de modification, garanti **par valeur de clé de partition** uniquement. Aucun ordre entre valeurs de clé de partition |
| Lots | Les éléments écrits par un même lot transactionnel, une procédure stockée ou une requête en bloc partagent une heure de modification et peuvent arriver dans n'importe quel ordre au sein de cette portée |
| Parallélisme | Les modifications sont exposées par plage de clés de partition (partition physique), plusieurs consommateurs peuvent donc se partager un grand conteneur |
| Coût | La lecture consomme des RU du débit provisionné, dans n'importe quelle région du compte. Le flux lui-même ne coûte rien de plus ; le processeur ajoute le débit du conteneur de bail |
| Plusieurs consommateurs | Plusieurs applications peuvent lire en même temps le flux du même conteneur, chacune dans son propre mode |
| Multirégion | Les modifications faites dans une région sont disponibles dans toutes les régions ; le flux reste continu lors d'un basculement manuel |

Dans un compte à écritures multirégions, chaque modification a deux horodatages : `_ts` (écriture dans la région locale) et `crts` (conflit résolu ou absence de conflit confirmée dans la région hub). Les éléments du flux arrivent dans l'ordre de `crts`. Dans un tel compte, le mode dernière version peut abandonner une modification entrante d'un document quand une modification plus récente existe dans une autre région ; le mode toutes les versions et suppressions capture chaque modification.

Méthodes de lecture du flux en mode Dernière version :

| Méthode | .NET | Java | Python | Node.js |
| --- | --- | --- | --- | --- |
| Modèle de tirage (pull) | Oui | Oui | Oui | Oui |
| Processeur de flux de modification | Oui | Oui | Non | Non |
| Déclencheur Azure Functions | Oui | Oui | Oui | Oui |

Usages typiques : traitement piloté par les événements (notifier, appeler une API), maintien d'une **vue matérialisée** ou d'une copie des données avec une autre clé de partition, alimentation d'un index de recherche ou d'un cache, diffusion des modifications vers un autre magasin, audit.

> **Piège d'examen.** Le processeur de flux de modification n'existe que dans les SDK .NET et Java. Une application Python lit le flux avec le modèle de tirage (`query_items_change_feed`) et gère ses propres points de contrôle, ou utilise le déclencheur Azure Functions.

<!-- section: processor-vs-pull | objectives: 1.4.2 -->
## Processeur de flux de modification ou modèle de tirage

Les deux conservent un signet de la dernière modification traitée, mais à des endroits différents, et on ne peut pas convertir l'un en l'autre.

| Fonctionnalité | Processeur de flux de modification | Modèle de tirage |
| --- | --- | --- |
| Signet | Documents de **bail** dans un conteneur de bail | **Jeton de continuation**, gardé en mémoire ou persisté par vous |
| Interrogation des nouvelles modifications | Automatique, toutes les `WithPollInterval` | Manuelle |
| Aucune nouvelle modification | Attend l'intervalle d'interrogation puis revérifie | Vous testez le statut (`NotModified`) et réessayez |
| Conteneur entier | Oui, réparti automatiquement sur les threads et les machines | Oui, parallélisé manuellement avec `FeedRange` |
| Une seule clé de partition | Non pris en charge | Pris en charge |
| Relire les modifications passées | Oui | Oui |

| Exigence | Choix |
| --- | --- |
| Traitement continu avec répartition de charge et points de contrôle automatiques | Processeur de flux de modification |
| Serverless, aucun worker à héberger | Déclencheur Azure Functions (utilise le processeur en interne) |
| Lire uniquement les modifications d'une clé de partition | Modèle de tirage avec `FeedRange.FromPartitionKey` |
| Contrôler le rythme, lecture unique pour une migration | Modèle de tirage |
| Worker Python ou Node.js | Modèle de tirage (ou Functions) |

Modèle de tirage en C#. `ChangeFeedStartFrom` (position de départ et `FeedRange` facultative) et `ChangeFeedMode` sont tous deux obligatoires :

```text
FeedIterator<Order> iterator = container.GetChangeFeedIterator<Order>(
    ChangeFeedStartFrom.Beginning(), ChangeFeedMode.LatestVersion);

string continuation = null;
while (iterator.HasMoreResults)
{
    FeedResponse<Order> response = await iterator.ReadNextAsync();
    if (response.StatusCode == HttpStatusCode.NotModified)
    {
        continuation = response.ContinuationToken;   // persist it
        await Task.Delay(TimeSpan.FromSeconds(5));
        continue;
    }
    foreach (Order order in response) { /* process */ }
}

// Later: resume exactly where the previous reader stopped
FeedIterator<Order> resumed = container.GetChangeFeedIterator<Order>(
    ChangeFeedStartFrom.ContinuationToken(continuation), ChangeFeedMode.LatestVersion);

// One partition key, or one physical partition per worker
ChangeFeedStartFrom.Beginning(FeedRange.FromPartitionKey(new PartitionKey("tenant-42")));
IReadOnlyList<FeedRange> ranges = await container.GetFeedRangesAsync();
```

Les règles que l'examen vérifie :

- `HasMoreResults` est **toujours vrai** : le flux est infini. La fin des modifications disponibles est signalée par le code HTTP 304 `NotModified`, pas par une page vide. Un 200 `OK` sans élément ne signifie pas que vous avez atteint la fin.
- Positions de départ : `Beginning()`, `Now()`, un instant donné ou `ContinuationToken(...)`. Un jeton de continuation a priorité sur les autres options de départ.
- `GetFeedRangesAsync` renvoie **une `FeedRange` par partition physique**. Un orchestrateur les distribue (`FeedRange.ToJsonString` / `FromJsonString`) pour que chaque worker lise sa propre plage.
- `ChangeFeedRequestOptions.PageSizeHint` limite le nombre d'éléments par page (la transaction d'une procédure stockée peut le dépasser pour rester dans une seule page).
- `GetChangeFeedStreamIterator` renvoie des flux bruts, sans désérialisation.
- En mode Dernière version, un jeton de continuation n'expire jamais tant que le conteneur existe.

Modèle de tirage en Python :

```text
# Whole container from the beginning (LatestVersion is the default mode)
for doc in container.query_items_change_feed(start_time="Beginning"):
    process(doc)
continuation_token = container.client_connection.last_response_headers["etag"]

# One partition key, or one feed range per worker
container.query_items_change_feed(start_time="Beginning", partition_key="tenant-42")
ranges = list(container.read_feed_ranges())
container.query_items_change_feed(start_time="Beginning", feed_range=ranges[0])

# Resume later; the token carries the mode
container.query_items_change_feed(continuation=continuation_token)
```

<!-- section: change-feed-processor | objectives: 1.4.1, 1.4.3 -->
## Implémenter le processeur de flux de modification

Le processeur comporte quatre éléments : le **conteneur supervisé** (source des modifications), le **conteneur de bail** (état et coordination), l'**instance de calcul** qui héberge le processeur (machine virtuelle, pod Kubernetes, instance App Service, machine physique) et le **délégué** (votre code qui traite chaque lot).

```text
Container leaseContainer = client.GetContainer("retail", "leases");
ChangeFeedProcessor processor = client.GetContainer("retail", "orders")
    .GetChangeFeedProcessorBuilder<Order>(
        processorName: "ordersToSearch",
        onChangesDelegate: HandleChangesAsync)
    .WithInstanceName(Environment.MachineName)      // unique per instance
    .WithLeaseContainer(leaseContainer)
    .WithStartTime(DateTime.MinValue.ToUniversalTime()) // optional: from the beginning
    .WithErrorNotification(OnErrorAsync)            // optional: recommended
    .Build();

await processor.StartAsync();

static async Task HandleChangesAsync(
    ChangeFeedProcessorContext context,
    IReadOnlyCollection<Order> changes,
    CancellationToken cancellationToken)
{
    Console.WriteLine($"Lease {context.LeaseToken}: {context.Headers.RequestCharge} RU");
    foreach (Order order in changes) { await IndexAsync(order); }
}
```

**Cycle de vie.** Lire le flux ; si rien n'a changé, attendre l'intervalle d'interrogation (`WithPollInterval`) ; sinon appeler le délégué ; quand le délégué **se termine avec succès**, écrire le nouveau point de contrôle dans le bail ; recommencer.

**Garantie de remise : au moins une fois.** Si le délégué lève une exception, le thread du lot s'arrête, un nouveau thread repart du dernier point de contrôle et le même lot est remis, jusqu'à ce qu'il réussisse. Une exception : si la **toute première** exécution du délégué échoue, aucun état de bail n'est encore enregistré, et la nouvelle tentative utilise la configuration de démarrage initiale, qui peut inclure ou non ce lot. Rendez le délégué idempotent et envoyez les modifications problématiques vers un magasin de messages en erreur (par exemple un autre conteneur) pour éviter des tentatives sans fin. Ne lancez pas de travail asynchrone dans le délégué sans l'attendre : le bail pourrait être validé avant la fin du travail.

**Heure de départ.** Par défaut, le processeur démarre au moment de sa **première** initialisation ; les modifications antérieures sont ignorées. `WithStartTime(DateTime)` démarre à une heure donnée et `WithStartTime(DateTime.MinValue.ToUniversalTime())` depuis le début. Ces options ne s'appliquent que s'il n'existe aucun bail : une fois les baux stockés, le processeur reprend à partir d'eux et une nouvelle heure de départ est sans effet.

**Mise à l'échelle.** Les instances qui ont le même `processorName` et la même configuration de conteneur de bail forment une **unité de déploiement** et se partagent les baux (un bail par partition physique, détenu par une seule instance à la fois). Chaque instance a besoin d'un `WithInstanceName` distinct. Avec plus d'instances que de baux, les instances en trop restent inactives. Quand des partitions se divisent, de nouveaux baux sont créés et redistribués automatiquement.

**Supervision.** L'**estimateur du flux de modification** mesure le nombre de modifications encore en attente : `GetChangeFeedEstimatorBuilder(processorName, delegate, interval)` envoie un nombre à intervalles réguliers ; `GetChangeFeedEstimator(processorName, leaseContainer)` suivi de `GetCurrentStateIterator()` renvoie, par bail, `EstimatedLag`, `LeaseToken` et l'`InstanceName` propriétaire. Il doit utiliser le même nom de processeur et le même conteneur de bail, peut tourner sur une instance séparée et consomme des RU sur les deux conteneurs. Notifications de cycle de vie : `WithLeaseAcquireNotification`, `WithLeaseReleaseNotification`, `WithErrorNotification` (qui distingue `ChangeFeedProcessorUserException`, levée par votre délégué).

> **Piège d'examen.** Un retard qui grandit alors que les workers ont du processeur libre signifie en général que le conteneur de bail ou le conteneur supervisé est limité (429), ou qu'il y a moins d'instances que de baux. Ajouter des instances au-delà du nombre de baux n'augmente pas le débit.

<!-- section: lease-containers | objectives: 1.4.3 -->
## Configurer les conteneurs de bail

| Paramètre | Règle |
| --- | --- |
| Clé de partition | `/id` pour un conteneur de bail partitionné |
| Emplacement | Même compte que le conteneur supervisé ou un autre compte |
| Débit | Les lectures et renouvellements de baux consomment des RU ; plus d'instances, plus de RU. Une limitation retarde les événements et peut arrêter le traitement |
| Création | Créez-le vous-même, ou laissez le déclencheur Azure Functions le créer (`CreateLeaseContainerIfNotExists`) |
| Partage | Un conteneur de bail peut servir plusieurs unités de déploiement si chacune supervise un conteneur différent **ou** utilise un `processorName` différent. Dimensionnez son débit pour toutes |
| Point de terminaison | Utilisez le **point de terminaison global** du compte ; choisissez les régions avec `ApplicationRegion` / `ApplicationPreferredRegions`. Un point de terminaison régional crée des baux séparés, propres à la région |

La temporisation des baux (paramètres avancés) comporte trois réglages :

| Paramètre | Valeur par défaut | Effet d'une baisse |
| --- | --- | --- |
| Intervalle d'acquisition du bail | 17 secondes | Rééquilibrage plus rapide, plus de RU sur les baux |
| Intervalle d'expiration du bail | 60 secondes | Reprise plus rapide après un plantage ; jamais inférieur à l'intervalle de renouvellement |
| Intervalle de renouvellement du bail | 13 secondes | Détection plus rapide d'un plantage, plus de RU sur les baux |

Avec l'authentification Microsoft Entra, l'identité du processeur a besoin de `readMetadata` et `readChangeFeed` sur le conteneur supervisé, et des actions d'élément `read`, `create`, `replace`, `delete` ainsi que `executeQuery` sur le conteneur de bail. Cosmos DB Built-in Data Contributor couvre les deux.

> **Piège d'examen.** Deux applications différentes qui doivent chacune recevoir **toutes** les modifications ont besoin de deux valeurs `processorName` différentes (ou de deux conteneurs de bail). Si elles partagent le même nom de processeur et le même conteneur de bail, elles forment une seule unité de déploiement et se répartissent les modifications.

<!-- section: change-feed-modes | objectives: 1.4.4 -->
## Mode Dernière version et mode Toutes les versions et suppressions

| | Dernière version | Toutes les versions et suppressions |
| --- | --- | --- |
| Capture | Créations et mises à jour, **dernière version uniquement** : les mises à jour intermédiaires entre deux lectures peuvent être perdues | Chaque création, mise à jour et suppression, y compris les modifications intermédiaires et les **expirations TTL** |
| Type d'opération | Non exposé | `metadata.operationType` : `create`, `replace`, `delete` |
| Rétention | Durée de vie du conteneur, depuis sa création | **Fenêtre de rétention de la sauvegarde continue** uniquement |
| Positions de départ | Début, instant donné (précision d'environ 5 secondes), maintenant, point de contrôle | **Maintenant** ou un point de contrôle (bail ou jeton de continuation) uniquement |
| Prérequis | Aucun, activé par défaut | API NoSQL, sauvegarde continue, fonctionnalité activée sur le compte |
| Par défaut | Oui | Non |

Activez le mode Toutes les versions et suppressions dans le portail : **Fonctionnalités** > **All versions and deletes change feed mode** (la sauvegarde continue doit déjà être configurée ; l'activation peut prendre jusqu'à 30 minutes, pendant lesquelles le compte ne peut pas être modifié). Il ne peut pas être activé à la création du compte. Les comptes qui ont déjà fusionné des partitions, ou dont la fusion de partitions est activée, ne sont pas pris en charge.

Éléments de réponse en mode Toutes les versions et suppressions :

```json
{
  "current": { "id": "o-1001", "status": "shipped" },
  "metadata": {
    "operationType": "replace",
    "lsn": 1543,
    "crts": 1763290800,
    "previousImageLSN": 1530
  }
}
```

Une suppression n'a pas de `current` ; son `metadata` contient `id`, `partitionKey` et `timeToLiveExpired: true` quand la suppression vient du TTL. La version précédente d'un élément mis à jour ou supprimé n'est pas disponible.

En .NET (3.60.0 ou ultérieur), lisez-le avec `GetChangeFeedIterator<ChangeFeedItem<Order>>(ChangeFeedStartFrom.Now(), ChangeFeedMode.AllVersionsAndDeletes)` ou le générateur de processeur `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes<Order>(...)` ; en Python (4.9.1b1 ou ultérieur), avec `query_items_change_feed(mode="AllVersionsAndDeletes")`. Le déclencheur Functions ne prend en charge ce mode que dans le modèle worker isolé .NET. Quel que soit le mode de connexion du client, ces requêtes utilisent le mode **Gateway**. Ses jetons de continuation ne sont valides qu'à l'intérieur de la fenêtre de rétention.

Sans ce mode, capturez les suppressions en mode Dernière version par une **suppression réversible** : un indicateur comme `"deleted": true` (une mise à jour que le flux capture) et un TTL qui supprime l'élément plus tard.

> **Piège d'examen.** « Traiter les suppressions » ou « chaque état intermédiaire d'une commande » désigne le mode Toutes les versions et suppressions, qui exige la sauvegarde continue. « Retraiter tout depuis la création du conteneur » désigne le mode Dernière version : Toutes les versions et suppressions ne peut pas démarrer depuis le début.

<!-- section: copy-container-jobs | objectives: 1.4.5 -->
## Tâches de copie de conteneur

Les tâches de copie de conteneur (préversion, au mieux, sans SLA sur la durée) copient des données entre conteneurs avec un **calcul côté serveur** que la plateforme alloue (par défaut deux instances de 4 vCPU et 16 Go par compte). C'est la réponse quand un paramètre de conteneur ne peut être choisi qu'à la création :

- changer la **clé de partition** (ou adopter les clés de partition hiérarchiques) ;
- changer les **clés uniques** ;
- passer d'un débit au niveau de la base de données (partagé) à un débit au niveau du conteneur, et inversement ;
- renommer un conteneur ou une base de données.

| | Copie en ligne (NoSQL) | Copie hors connexion |
| --- | --- | --- |
| Écritures sur la source pendant la copie | Autorisées : les modifications incrémentielles sont répliquées | Doivent être arrêtées avant |
| Mécanisme | Flux de modification Toutes les versions et suppressions | Flux de modification (Cassandra) ou flux de changements (MongoDB) |
| Prérequis | Sauvegarde continue + mode Toutes les versions et suppressions + fonctionnalité `EnableOnlineContainerCopy` (attendre 30 minutes après l'ajout) | Aucun de ceux-ci |
| Fin de la tâche | Vous arrêtez les écritures, puis appelez **complete** | Se termine seule |

Étapes d'une copie en ligne : créer le conteneur cible avec les nouveaux paramètres, créer la tâche, la surveiller jusqu'à ce que le nombre d'éléments traités atteigne le nombre total, arrêter les mises à jour sur la source, attendre quelques minutes, terminer la tâche, puis faire pointer l'application vers le nouveau conteneur.

```bash
az extension add --name cosmosdb-preview

az cosmosdb copy create --resource-group rg-retail \
  --job-name orders-repartition \
  --src-account cosmos-retail --dest-account cosmos-retail \
  --src-nosql database=retail container=orders \
  --dest-nosql database=retail container=orders-by-customer \
  --mode Online

az cosmosdb copy show --resource-group rg-retail \
  --account-name cosmos-retail --job-name orders-repartition

az cosmosdb copy complete --resource-group rg-retail \
  --account-name cosmos-retail --job-name orders-repartition
```

Autres commandes : `list`, `pause`, `resume`, `cancel`. À savoir :

- Les tâches s'exécutent dans la **région d'écriture** ; si la région d'écriture change (basculement), les tâches inachevées échouent et doivent être recréées. Plusieurs tâches sur un compte s'exécutent **l'une après l'autre** ; copier une base de données demande une tâche par conteneur.
- La vitesse dépend du débit de la source et de la cible (réglez la cible à au moins deux fois celui de la source) et des instances côté serveur.
- **Copie entre comptes** : l'identité managée du compte source (définie comme identité par défaut) a besoin d'un rôle du plan de données sur la destination, comme Cosmos DB Built-in Data Contributor (`00000000-0000-0000-0000-000000000002`) à l'étendue `/`.
- Les valeurs TTL des éléments sont copiées ; le TTL par défaut du conteneur ne l'est pas, configurez-le sur la cible.
- Les comptes dont la fusion de partitions est activée ne sont pas pris en charge.
- Avec une nouvelle clé de partition, `id` plus la nouvelle clé doivent être uniques, et aucune partition logique ne peut dépasser 20 Go (erreur 403, sous-statut 1014).
- Sur la source, les opérations de remplacement et de suppression coûtent 50 à 100 % de RU d'écriture en plus, car les versions précédente et actuelle sont conservées. Les créations ne sont pas concernées.

> **Conseil d'examen.** On ne peut pas changer la clé de partition d'un conteneur sur place. La réponse prise en charge est un nouveau conteneur plus une copie (tâche de copie de conteneur, ou votre propre migration par le flux de modification), puis une bascule de l'application.

<!-- section: key-points -->
## Points clés

- Flux de modification : activé par défaut, ordonné par valeur de clé de partition, insertions et mises à jour seulement en mode Dernière version.
- Processeur (.NET, Java) = conteneur supervisé + conteneur de bail + instances + délégué ; même `processorName` = travail partagé, noms d'instance distincts, au plus une instance par bail ; remise au moins une fois, point de contrôle après la réussite du délégué.
- Modèle de tirage = jetons de continuation, une `FeedRange` par partition physique, lecture d'une seule clé de partition, `NotModified` (304) signifie aucune nouvelle modification ; le choix en Python.
- Conteneur de bail : clé de partition `/id`, ses propres RU, point de terminaison global ; un `processorName` différent pour chaque consommateur indépendant.
- Toutes les versions et suppressions : suppressions, expirations TTL et versions intermédiaires, exige la sauvegarde continue, démarre maintenant ou à un point de contrôle, fenêtre de rétention uniquement.
- Tâches de copie de conteneur : nouvelle clé de partition, clés uniques ou modèle de débit ; la copie en ligne exige la sauvegarde continue, Toutes les versions et suppressions et `EnableOnlineContainerCopy`, puis un complete manuel.
