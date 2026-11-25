Dans Cosmos DB, le modèle de données et la clé de partition décident de presque tout le reste : les RU de chaque opération, le fait qu'une requête cible une partition ou toutes, la capacité d'un locataire à grandir, et le montant de la facture. Les questions donnent des modèles d'accès et des volumes, puis demandent le modèle, la clé, l'organisation multilocataire ou la correction d'un constat de revue, souvent avec l'option la moins chère comme contrainte décisive.

<!-- section: access-patterns | objectives: 1.3.1 -->
## Concevoir des modèles de données selon les modèles d'accès

Partez des **opérations**, pas des entités. Listez chaque opération avec sa fréquence et son filtre, puis façonnez éléments et conteneurs pour que les plus fréquentes soient des **lectures ponctuelles** ou des **requêtes sur une seule partition**.

Exemple : le service de commandes de Contoso.

| Opération | Fréquence | Conception |
| --- | --- | --- |
| Lire le profil d'un client | 2 000/s | Élément `id = customerId` dans le conteneur `customers`, clé de partition `/customerId` : lecture ponctuelle |
| Lister les 20 dernières commandes d'un client | 500/s | Commandes dans un conteneur partitionné sur `/customerId` : requête sur une seule partition avec `ORDER BY` |
| Lire une commande avec ses lignes | 800/s | Lignes incorporées dans la commande (bornées, lues ensemble) : une lecture ponctuelle |
| Parcourir les produits d'une catégorie | 1 000/s | Conteneur `products` partitionné sur `/categoryId` |
| Afficher le nombre de commandes du client | 2 000/s | `orderCount` précalculé sur le profil, mis à jour à chaque commande |

Techniques :

| Technique | À utiliser quand |
| --- | --- |
| **Dénormaliser** (copier les champs dont le lecteur a besoin) | Les lectures dépassent largement les écritures ; les données copiées changent rarement |
| **Agrégats précalculés** (compteurs, totaux) | Une lecture fréquente devrait sinon parcourir de nombreux éléments |
| **Plusieurs types d'entités dans un conteneur**, avec une propriété `type` | Des éléments liés sont lus ensemble et peuvent partager la clé de partition (une commande et ses expéditions) |
| **Conteneurs distincts** | Les entités exigent des clés de partition, un débit, une TTL ou une indexation différents |
| **Vue matérialisée** alimentée par le flux de modification, ou **index secondaire global** (GSI) | Les mêmes données doivent être interrogées par une seconde clé (commandes par produit en plus de par client) |

Les exigences opérationnelles façonnent aussi le modèle : un élément ne peut pas dépasser 2 Mo ni une partition logique 20 Go ; l'imbrication est limitée à 128 niveaux ; la rétention (TTL), le débit et l'indexation se règlent par conteneur, donc des données de rétention ou de charge différentes vont dans des conteneurs différents.

> **Conseil d'examen.** Dans un énoncé, repérez d'abord l'opération la plus fréquente : le bon modèle en fait une lecture ponctuelle, même si une opération plus rare devient une requête entre partitions.

<!-- section: embed-reference | objectives: 1.3.3 -->
## Incorporer ou référencer les données associées

| Incorporez (dénormalisé) quand | Référencez (normalisé) quand |
| --- | --- |
| La relation est contenue (une commande et ses lignes) | Un-à-plusieurs sans limite supérieure |
| Un-à-quelques-uns | Plusieurs-à-plusieurs |
| Les données changent rarement | Les données associées changent souvent |
| Les données ne grossissent pas sans limite | Les données référencées peuvent être non bornées |
| Les données sont interrogées ensemble | |
| Meilleures performances en **lecture** | Meilleures performances en **écriture** |

```json
{
  "id": "order-1001",
  "customerId": "customer-42",
  "type": "order",
  "lines": [
    { "productId": "p-17", "name": "Trail shoes", "qty": 1, "price": 89.0 },
    { "productId": "p-90", "name": "Socks", "qty": 3, "price": 6.5 }
  ],
  "customer": { "id": "customer-42", "name": "Ana Silva" }
}
```

Ici, les lignes sont incorporées (bornées, lues avec la commande) et le client est **référencé avec une copie dénormalisée** des champs affichés (modèle hybride) : le profil lui-même vit dans son propre élément.

Où placer une référence : du côté qui **ne grossit pas**. Un éditeur doté d'un tableau `books` toujours plus long est un document mutable qui enfle ; à la place, chaque livre stocke `"publisherId": "mspress"`. Pour du plusieurs-à-plusieurs, stockez un tableau d'ID des **deux** côtés (un auteur liste les ID de ses livres, un livre liste les ID de ses auteurs) plutôt qu'un conteneur de jointure qui coûterait des requêtes supplémentaires.

> **Piège d'examen.** Commentaires d'un billet populaire, mesures d'un capteur, messages d'une longue conversation : non bornés, donc référencés (un élément chacun), pas incorporés. Un tableau incorporé qui ne cesse de grandir augmente les RU de chaque écriture et finit par atteindre 2 Mo.

<!-- section: partition-key-choice | objectives: 1.3.2, 1.3.4 -->
## Choisir une clé de partition et évaluer son impact

Tous les éléments qui partagent la même valeur de clé de partition forment une **partition logique** ; Cosmos DB place les partitions logiques sur des **partitions physiques** et les fractionne automatiquement quand les données et le débit augmentent.

| Limite | Partition logique | Partition physique |
| --- | --- | --- |
| Stockage | 20 Go | 50 Go |
| Débit | 10 000 RU/s | 10 000 RU/s |
| Gérée par | Votre choix de clé | Le service (fractionnements transparents ; une partition logique ne s'étend jamais sur deux partitions physiques) |

Une bonne clé de partition :

1. Est une propriété dont la valeur **ne change jamais** pour un élément (une valeur de clé de partition ne se met pas à jour sur place).
2. A une **forte cardinalité** : beaucoup de valeurs distinctes.
3. **Répartit uniformément la consommation de RU et le stockage**, y compris les écritures à un instant donné.
4. Apparaît comme **filtre d'égalité dans les requêtes fréquentes** (conteneurs à forte lecture).

`/id` est un bon choix pour les conteneurs à forte écriture de toute taille et les petits conteneurs à forte lecture : répartition parfaite, et chaque lecture ponctuelle connaît sa clé. Son coût : pas de transactions multiéléments, et les requêtes sur d'autres propriétés touchent toutes les partitions.

**Impact sur l'extensibilité et les performances.** Les RU/s provisionnées sont réparties uniformément entre les partitions physiques : 18 000 RU/s sur trois partitions donnent 6 000 RU/s chacune. Une clé qui concentre le trafic sur une valeur est plafonnée par la part de cette partition, et jamais au-delà de 10 000 RU/s, quel que soit le total du conteneur. Une requête sans clé de partition vérifie chaque partition physique (2 à 3 RU chacune, plus de la latence). Avec 5 partitions physiques ou moins, la clé compte peu ; au-delà de 30 000 RU/s ou de 100 Go, choisissez-la pour réduire les requêtes entre partitions.

| Clé candidate pour de la télémétrie IoT (50 000 appareils, requêtes par appareil) | Évaluation |
| --- | --- |
| `/deviceId` | Forte cardinalité, écritures réparties, requêtes par appareil sur une seule partition : bon choix |
| `/date` | Toutes les écritures du jour vont sur une seule valeur : partition chaude |
| `/sensorType` (5 valeurs) | Faible cardinalité : 5 partitions logiques, 20 Go chacune au plus |
| `/readingId` (GUID) | Écritures réparties, mais chaque requête par appareil touche toutes les partitions |

Changer de clé plus tard impose un nouveau conteneur et un déplacement des données : tâches de copie de conteneur, ou flux de modification pour une migration à chaud. Quand l'ancienne clé doit rester mais qu'un autre modèle de requête exige une autre clé, ajoutez un **index secondaire global** (GSI) : un conteneur en lecture seule doté de sa propre clé de partition, synchronisé automatiquement par le flux de modification (cohérence éventuelle, débit autoscale uniquement ; les remplacements et suppressions sur la source coûtent 50 à 100 % de RU en plus).

> **Piège d'examen.** Augmenter les RU/s du conteneur ne corrige pas une partition logique chaude : une valeur de clé ne peut jamais obtenir plus de 10 000 RU/s. Corrigez la clé (ou ajoutez un suffixe), pas le débit.

<!-- section: hierarchical-multitenant | objectives: 1.3.5 -->
## Clés de partition hiérarchiques et stratégies multilocataires

Les **clés de partition hiérarchiques** (sous-partitionnement) définissent **jusqu'à trois niveaux**, par exemple `/tenantId` puis `/userId` puis `/sessionId`. Un **préfixe** de la clé (un locataire) peut alors dépasser 20 Go et 10 000 RU/s, tandis que les requêtes sur ce préfixe ne ciblent que les partitions physiques de ce locataire.

| Filtre de la requête | Routage |
| --- | --- |
| Les trois niveaux | Une seule partition logique et physique |
| `tenantId`, ou `tenantId` + `userId` | Uniquement les partitions physiques qui contiennent ce préfixe |
| `userId` ou `sessionId` seul | Toutes les partitions physiques |

Règles de conception : chaque niveau doit avoir une forte cardinalité (au moins des milliers de valeurs, plus que le nombre de partitions physiques) ; avec peu de valeurs au premier niveau (cinq locataires), l'ingestion reste sur une seule partition physique jusqu'à son fractionnement à 50 Go (un fractionnement prend 4 à 6 heures), et si une telle clé atteint déjà la limite de 20 Go, Learn conseille plutôt une clé synthétique ; utilisez une valeur unique comme l'`id` de l'élément au **dernier niveau** pour qu'un préfixe puisse dépasser 20 Go. Les clés hiérarchiques se définissent **à la création du conteneur uniquement** (migration par tâches de copie de conteneur ou flux de modification), exigent un SDK récent (.NET 3.33.0, Java 4.42.0, Python 4.6.0 ou ultérieur), et les autorisations ne peuvent pas cibler un préfixe partiel.

```text
// C#: create the container, then point read with the full key
ContainerProperties properties = new ContainerProperties(
    id: "sessions",
    partitionKeyPaths: new List<string> { "/tenantId", "/userId", "/sessionId" });
Container container = await database.CreateContainerIfNotExistsAsync(properties, throughput: 400);

PartitionKey key = new PartitionKeyBuilder()
    .Add("fabrikam").Add("user-17").Add("s-2026-11-17-01")
    .Build();
ItemResponse<SessionState> state = await container.ReadItemAsync<SessionState>("state-01", key);

// Prefix query: put the leading levels in the WHERE clause
QueryDefinition query = new QueryDefinition("SELECT * FROM c WHERE c.tenantId = @t AND c.userId = @u")
    .WithParameter("@t", "fabrikam").WithParameter("@u", "user-17");

# Python
container = database.create_container_if_not_exists(
    id="sessions",
    partition_key=PartitionKey(path=["/tenantId", "/userId", "/sessionId"], kind="MultiHash"))
```

```bicep
partitionKey: {
  paths: [
    '/tenantId'
    '/userId'
    '/sessionId'
  ]
  kind: 'MultiHash'
  version: 2
}
```

**Organisations multilocataires**, de la plus partagée à la plus isolée :

| Organisation | Isolation | Coût et limites | Adaptée à |
| --- | --- | --- | --- |
| Clé de partition par locataire (`/tenantId`) | Logique seulement ; les voisins bruyants partagent les RU/s | La moins chère ; un locataire est plafonné à 20 Go | Beaucoup de petits locataires de taille comparable |
| Clé hiérarchique `/tenantId` > ... | Logique | Peu chère ; les gros locataires dépassent 20 Go | Beaucoup de locataires (des centaines ou plus) à l'usage comparable, charge surtout en lecture |
| Conteneur par locataire | Débit (RU/s dédiées) et paramètres | RU/s dédiées pour chacun (400 minimum en mode manuel) ; 500 conteneurs et bases de données par compte | Déconseillée par le Centre des architectures (limites du compte sur les conteneurs et les opérations de métadonnées) |
| Base de données par locataire (débit partagé) | Regroupement de conteneurs | Jusqu'à 25 conteneurs partageant les RU/s | Déconseillée, pour les mêmes raisons |
| Compte par locataire | La plus forte : clés, réseau, régions, sauvegarde | La plus chère ; 250 comptes par abonnement par défaut | Locataires réglementés ou premium, quelques très gros locataires (le pool de débit d'une flotte, en préversion, peut partager des RU/s entre comptes) |

Le Centre des architectures recommande la clé de partition par locataire et le compte par locataire pour la plupart des scénarios multilocataires. Pour les charges optimisées pour l'écriture, ou quand le niveau locataire manque de cardinalité, il recommande une clé synthétique ou `/id` plutôt qu'une clé hiérarchique.

> **Piège d'examen.** Filtrer sur `userId` seul dans un conteneur `/tenantId` > `/userId` provoque une requête sur toutes les partitions. Et passer les valeurs par `PartitionKeyBuilder` ne garantit pas un routage efficace : les niveaux de tête doivent figurer dans la clause `WHERE`.

<!-- section: synthetic-keys | objectives: 1.3.6 -->
## Clés de partition synthétiques

Une **clé synthétique** est une propriété que votre code construit et écrit dans chaque élément, quand aucune propriété seule ne répartit bien la charge.

| Technique | Exemple | Écritures | Lectures |
| --- | --- | --- | --- |
| Concaténer des propriétés | `"partitionKey": "abc-123-2026"` à partir de `deviceId` et de l'année | Réparties par les deux valeurs | Lectures ponctuelles quand les deux valeurs sont connues |
| Suffixe aléatoire | `2026-11-17.1` à `2026-11-17.400` | Réparties uniformément sur 400 valeurs | Difficiles : le suffixe d'un élément donné est inconnu, les lectures touchent toutes les valeurs |
| Suffixe précalculé (hachage) | Date + hachage du numéro de véhicule, modulo 400 | Réparties uniformément | Un véhicule et une date donnent une clé calculable : les lectures ponctuelles fonctionnent |

```text
// C#: precalculated suffix with a stable hash (string.GetHashCode differs between processes)
static int Bucket(string vin)
{
    byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(vin));
    return (int)(BitConverter.ToUInt32(hash, 0) % 400) + 1;
}
reading.partitionKey = $"{reading.date}.{Bucket(reading.vin)}";   // "2026-11-17.137"

# Python: same rule (the built-in hash() of a str changes between processes)
import hashlib
def bucket(vin: str) -> int:
    return int(hashlib.sha256(vin.encode("utf-8")).hexdigest(), 16) % 400 + 1
reading["partitionKey"] = f"{reading['date']}.{bucket(reading['vin'])}"
```

| Exigence | Choix |
| --- | --- |
| Les requêtes filtrent sur un locataire puis un utilisateur, un locataire peut dépasser 20 Go | Clé de partition hiérarchique |
| Très fort débit d'écriture sur une date ou une valeur, lectures par une valeur secondaire connue | Clé synthétique à suffixe précalculé |
| Débit d'écriture maximal, lectures rares par parcours | Clé synthétique à suffixe aléatoire |
| Deux propriétés toujours interrogées ensemble, aucune suffisante seule | Clé synthétique concaténée, ou clé hiérarchique à deux niveaux |

> **Piège d'examen.** Un suffixe construit avec un hachage non déterministe (ou un nombre aléatoire) ne peut pas être recalculé à la lecture : seul un suffixe précalculé et stable préserve les lectures ponctuelles.

<!-- section: anti-patterns | objectives: 1.3.7 -->
## Les anti-modèles de partitionnement lors des revues de solution

| Constat | Problème | Correction |
| --- | --- | --- |
| Clé sur `status`, `type` ou `country` | Faible cardinalité : peu de partitions logiques, points chauds, plafond de 20 Go | Clé à forte cardinalité, ou clé hiérarchique |
| Clé sur une date ou un horodatage pour une charge d'ingestion | Toutes les écritures du moment vont sur une seule valeur | Suffixe synthétique, ou clé comme `/deviceId` |
| Clé sur un GUID aléatoire alors que les lectures filtrent par client | Écritures réparties, mais chaque lecture touche toutes les partitions | Clé sur la propriété filtrée par les lectures |
| Clé sur une propriété qui change (`status`) | Pas de mise à jour sur place ; suppression plus création non atomique | Propriété immuable |
| Un locataire proche de 20 Go sur `/tenantId` | Les écritures de ce locataire vont échouer | Clé hiérarchique avec un dernier niveau unique |
| Tableau incorporé non borné | L'élément grossit vers 2 Mo, les RU d'écriture ne cessent d'augmenter | Référencer : un élément par enfant |
| Requête entre partitions fréquente sur le chemin critique | RU et latence augmentent avec le nombre de partitions | Ajouter la clé au filtre, dénormaliser, ou une vue matérialisée ou un index secondaire global |
| Débit de base de données partagé avec un conteneur très sollicité | Les autres sont limités (le débit partagé est déconseillé pour la plupart des charges) | Un nouveau conteneur à débit dédié et un déplacement des données : aucune conversion sur place |

**Repérer une partition chaude** : Insights > Throughput > **Normalized RU Consumption (%) By PartitionKeyRangeID**. La métrique est l'utilisation maximale parmi les plages de clés de partition, chaque minute ; une plage à 100 % alors que les autres restent à 30 % ou moins signale une partition chaude. Un 100 % constant sur plusieurs plages avec plus de 5 % de 429 signifie que le conteneur a besoin de plus de RU/s. Avec les journaux de diagnostic, les RU par seconde et par plage de clés de partition :

```kusto
CDBPartitionKeyRUConsumption
| where TimeGenerated > ago(1h)
| where DatabaseName == "sales" and CollectionName == "orders"
| summarize sum(RequestCharge) by bin(TimeGenerated, 1s), PartitionKeyRangeId
| render timechart
```

> **Piège d'examen.** Une Normalized RU Consumption à 100 % ne signifie pas à elle seule que le conteneur est sous-dimensionné : elle indique seulement qu'au moins une plage de clés de partition a utilisé toutes ses RU/s pendant une seconde. Regardez la répartition entre plages et le taux de 429 avant d'ajouter du débit.

<!-- section: cost-estimation | objectives: 1.3.8 -->
## Estimer le coût d'une charge de travail

Une facture Cosmos DB, c'est surtout le **débit** (RU/s provisionnées par heure, ou RU consommées en serverless) plus le **stockage**, tous deux multipliés par le nombre de régions. Méthode :

1. Mesurez les RU de chaque opération sur des éléments représentatifs (`RequestCharge`), au niveau de cohérence prévu.
2. Multipliez par la fréquence par seconde et additionnez : vous obtenez les RU/s au pic.
3. Multipliez par le nombre de régions ; les écritures multirégions ont leur propre tarif, plus élevé.
4. Choisissez le mode de capacité (règle des 66 % entre manuel et autoscale, serverless pour un trafic intermittent monorégion) et appliquez les remises : niveau gratuit (1 000 premières RU/s et 25 Go), capacité réservée (1 ou 3 ans).

Exemple chiffré aux tarifs d'exemple de Learn (manuel 0,008 $, autoscale 0,012 $ pour 100 RU/s par heure, une seule région d'écriture), deux régions :

| Opération | Fréquence | RU chacune | RU/s |
| --- | --- | --- | --- |
| Lectures ponctuelles, 1 Ko | 2 000/s | 1 | 2 000 |
| Écritures (mesurées) | 200/s | 7 | 1 400 |
| Requêtes (mesurées) | 100/s | 10 | 1 000 |
| **Total** | | | **4 400** |

En manuel à 4 400 RU/s : 44 × 0,008 $ = 0,352 $ par heure et par région, × 2 régions × 730 heures = environ 514 $ par mois, quel que soit le trafic. Si le pic ne dure que 6 heures par jour et que le reste de la journée demande 1 000 RU/s, l'autoscale avec un `Tmax` de 5 000, même facturé aux 5 000 complets pendant les heures de pic, coûte par région 6 × 0,60 $ + 18 × 0,12 $ = 5,76 $ par jour, contre 8,45 $ en manuel : l'autoscale l'emporte. Pour une charge intermittente de 20 millions de RU par mois avec un pic de 500 RU/s, l'exemple de Learn donne 5,00 $ en serverless contre 29,20 $ en provisionné.

L'**Azure Cosmos DB Cost Estimator** (`https://cosmos.azure.com/costestimator/`, en préversion publique, sans connexion) produit un coût mensuel projeté à partir de : régions et écritures multirégions, volume total de données, taille des éléments, fréquences des lectures, écritures, mises à jour, suppressions et requêtes (complexité de requête d'environ 3, 10 ou 30 RU), stratégie d'indexation, mode de capacité (manuel, autoscale, serverless) et remises (niveau gratuit, capacité réservée, Contrat Entreprise). Il suppose la cohérence Session (Strong ou Bounded staleness doublent environ les RU/s de lecture). Le résultat est une estimation, pas un devis.

> **Piège d'examen.** Les RU/s sont provisionnées et facturées dans **chaque** région : ajouter une région de lecture à un conteneur de 10 000 RU/s ajoute 10 000 RU/s à la facture. Et un compte serverless ne peut pas être la réponse quand l'énoncé exige une seconde région.

<!-- section: key-points -->
## Points clés

- Modélisez à partir des opérations les plus fréquentes : faites-en des lectures ponctuelles ou des requêtes sur une seule partition ; dénormalisez, précalculez, regroupez les types, ou alimentez des vues par le flux de modification (ou un index secondaire global).
- Incorporez ce qui est borné, lu ensemble et stable ; référencez ce qui est non borné, plusieurs-à-plusieurs ou volatil ; placez les références du côté qui ne grossit pas.
- Clé de partition : immuable, forte cardinalité, répartition uniforme, utilisée dans les filtres. Partition logique 20 Go et 10 000 RU/s ; physique 50 Go et 10 000 RU/s.
- Clés hiérarchiques : jusqu'à 3 niveaux, routage par préfixe, définies à la création, dernier niveau unique pour dépasser 20 Go.
- Clés synthétiques : concaténation, suffixe aléatoire (optimisé pour l'écriture) ou suffixe précalculé stable (préserve les lectures ponctuelles).
- Coût = RU/s × régions × heures (ou RU consommées) + stockage ; mesurez les RU, puis choisissez manuel, autoscale ou serverless.
