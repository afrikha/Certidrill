Les développeurs choisissent et configurent des magasins de données tous les jours : quel service convient à un modèle d'accès, combien de temps les données sont conservées et comment elles expirent, où placer un cache, et surtout comment concevoir les clés, les index, les lectures et les écritures d'une table DynamoDB. Les questions du DVA-C03 testent ces paramètres et les calculs de capacité qui les accompagnent. Ce chapitre traite du cycle de vie des données, du choix du magasin, du cache selon le magasin de données, et des clés, index, modèles de cohérence et opérations de DynamoDB.

<!-- section: data-lifecycle | objectives: 1.3.1 -->
## Gérer le cycle de vie des données

Chaque magasin a sa façon de ne conserver les données que le temps nécessaire :

| Magasin | Contrôle du cycle de vie | Faits à retenir |
| --- | --- | --- |
| Amazon S3 | Règles S3 Lifecycle : transition, expiration, versions non actuelles, chargements partitionnés incomplets | Les objets doivent avoir 30 jours avant de passer en S3 Standard-IA ou S3 One Zone-IA ; dans un compartiment versionné, l'expiration ajoute seulement un marqueur de suppression |
| Amazon S3 | Rétention S3 Object Lock (mode gouvernance ou conformité), conservations légales (legal holds) | Exige la gestion des versions ; le mode conformité ne peut être raccourci par personne |
| DynamoDB | Durée de vie (TTL) sur un attribut Number contenant une heure epoch en secondes | Les éléments expirés sont supprimés en général sous quelques jours, sans consommer de capacité d'écriture |
| CloudWatch Logs | Rétention par groupe de journaux | N'expire jamais par défaut ; les événements expirés sont supprimés sous 72 heures environ |
| Amazon SQS | Période de conservation des messages | De 1 minute à 14 jours, 4 jours par défaut |
| Kinesis Data Streams / DynamoDB Streams | Rétention du flux | 24 heures par défaut, jusqu'à 365 jours / toujours 24 heures |
| DynamoDB / Amazon RDS | Restauration à un instant dans le passé (PITR) / sauvegardes automatiques | De 1 à 35 jours / de 0 à 35 jours |
| ElastiCache | TTL sur chaque clé | La clé disparaît quand son TTL expire |

```json
{
  "Rules": [
    {
      "ID": "exports-lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "exports/" },
      "Transitions": [ { "Days": 30, "StorageClass": "STANDARD_IA" } ],
      "Expiration": { "Days": 365 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws dynamodb update-time-to-live --table-name Sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt"
aws logs put-retention-policy --log-group-name /aws/lambda/orders-api --retention-in-days 90
```

Détails du TTL DynamoDB : un attribut qui n'est pas de type Number est ignoré ; les éléments expirés apparaissent encore dans les lectures jusqu'à leur suppression, il faut donc les filtrer (`expiresAt > :now`) ; les suppressions TTL arrivent dans DynamoDB Streams comme suppressions du service, ce qui permet à une fonction Lambda d'archiver les éléments expirés dans S3.

> **Piège d'examen.** Le TTL n'est pas un minuteur. « Les sessions doivent être inutilisables exactement 30 minutes après leur dernière activité » exige une vérification de `expiresAt` à la lecture (ou une expression de filtre) ; le TTL ne fait que nettoyer le stockage plus tard.

<!-- section: choosing-stores | objectives: 1.3.2 -->
## Choisir un magasin de données selon le modèle d'accès

| Modèle d'accès | Magasin de données |
| --- | --- |
| Accès clé-valeur ou document à n'importe quelle échelle, latence de quelques millisecondes, requêtes connues | Amazon DynamoDB |
| Jointures, SQL ad hoc, transactions sur de nombreuses tables, schéma relationnel existant | Amazon RDS ou Amazon Aurora |
| Lectures en moins d'une milliseconde de données chaudes, magasins de sessions, classements, limitation de débit | Amazon ElastiCache (Valkey, Redis OSS ou Memcached) |
| Objets et fichiers (images, exports, sauvegardes), jusqu'à 5 To chacun | Amazon S3 |
| Recherche en texte intégral, classement par pertinence, analyse de journaux | Amazon OpenSearch Service |
| Requêtes SQL occasionnelles sur des fichiers déjà dans S3 | Amazon Athena |
| Un système de fichiers partagé par des instances, des conteneurs et des fonctions Lambda | Amazon EFS |

- Un élément DynamoDB est limité à 400 Ko : stockez les gros attributs (documents, images) dans S3 et gardez la clé de l'objet dans l'élément.
- S3 offre une cohérence forte de lecture après écriture pour toutes les requêtes et monte à au moins 3 500 écritures et 5 500 lectures par seconde et par préfixe.
- Le mode de capacité à la demande de DynamoDB est la valeur par défaut et convient à un trafic nouveau ou irrégulier ; la capacité provisionnée avec mise à l'échelle automatique convient à un trafic stable et prévisible.

> **Conseil d'examen.** Dans DynamoDB, on conçoit la table à partir des requêtes (« obtenir les commandes d'un client, de la plus récente à la plus ancienne »), pas à partir des entités. Quand l'énoncé évoque des requêtes inconnues ou ad hoc avec des jointures, la réponse est une base de données relationnelle.

<!-- section: caching | objectives: 1.3.3 -->
## Choisir une solution de cache selon le magasin de données

| Magasin ou couche | Cache | Remarques |
| --- | --- | --- |
| DynamoDB | DynamoDB Accelerator (DAX) | Même API par le client DAX, lectures en microsecondes, écriture simultanée (write-through) ; cache d'éléments pour `GetItem` et `BatchGetItem`, cache de requêtes pour `Query` et `Scan` ; lectures à cohérence éventuelle seulement |
| RDS ou Aurora | ElastiCache | Le code de l'application lit et alimente le cache (chargement différé ou écriture simultanée) |
| Objets S3 et contenu HTTP statique ou dynamique | Amazon CloudFront | Cache en périphérie avec des TTL par comportement de cache ; le contrôle d'accès à l'origine (OAC) garde le compartiment privé |
| Réponses d'API | Cache d'étape API Gateway (API REST) | TTL par défaut de 300 secondes, de 0 à 3 600 ; les clés de cache peuvent inclure des paramètres |
| Lambda | Variables dans le code d'initialisation, `/tmp`, l'extension Parameters and Secrets | Ne dure que tant que l'environnement d'exécution reste chaud |

ElastiCache pour **Valkey ou Redis OSS** offre réplication, basculement Multi-AZ, persistance et structures de données (ensembles triés, hachages) ; **Memcached** est un cache simple et multithread sans réplication ; **ElastiCache Serverless** supprime le dimensionnement des nœuds.

| Stratégie | Fonctionnement | Compromis |
| --- | --- | --- |
| Chargement différé (lazy loading, cache-aside) | Lire le cache ; en cas d'absence, lire la base de données et écrire le résultat dans le cache | Seules les données demandées sont en cache ; une absence coûte trois allers-retours ; les données peuvent être périmées |
| Écriture simultanée (write-through) | Mettre à jour le cache à chaque écriture en base | Les données ne sont jamais périmées ; chaque écriture coûte plus ; des données jamais lues remplissent le cache |
| TTL | Faire expirer chaque clé après un délai fixé | Limite la péremption avec le chargement différé et les données inutiles avec l'écriture simultanée |

```python
# Python: lazy loading with a TTL in ElastiCache (Valkey or Redis OSS)
def get_product(product_id):
    key = f"product:{product_id}"
    cached = cache.get(key)
    if cached:
        return json.loads(cached)
    item = table.get_item(Key={"productId": product_id})["Item"]   # or a SQL query on RDS
    cache.setex(key, 300, json.dumps(item, default=str))
    return item
```

> **Piège d'examen.** DAX ne met pas en cache les lectures à cohérence forte : les requêtes avec `ConsistentRead` à true vont directement à DynamoDB. « Des lectures en microsecondes avec le moins de modifications de code » sur DynamoDB désigne DAX ; « l'application a besoin de lectures à cohérence forte » écarte DAX comme accélérateur.

<!-- section: dynamodb-keys-indexes | objectives: 1.3.4 -->
## Clés, attributs et index DynamoDB

La **clé primaire** d'une table est soit une clé de partition seule, soit une clé de partition plus une clé de tri ; seuls les attributs de clé sont déclarés, les autres attributs sont libres pour chaque élément. Les attributs de clé sont de type String, Number ou Binary (clé de partition jusqu'à 2 048 octets, clé de tri jusqu'à 1 024 octets).

- **Cardinalité élevée** : DynamoDB hache la clé de partition pour répartir les éléments entre les partitions. Chaque partition sert jusqu'à 3 000 RCU et 1 000 WCU, donc une clé à peu de valeurs (un statut, la date du jour) crée une partition chaude et de la limitation, même quand la capacité totale de la table est loin d'être utilisée. Utilisez une clé aux nombreuses valeurs distinctes (`customerId`, `deviceId`) ou ajoutez un suffixe calculé (partitionnement des écritures, write sharding : `2026-11-20#7`).
- **Clé de tri** : regroupe des éléments liés sous une même clé de partition et accepte des conditions de plage (`orderDate` avec `begins_with` ou `BETWEEN`) ; des valeurs composées comme `ORDER#2026-11-20` servent plusieurs modèles d'accès.

| | Index secondaire global (GSI) | Index secondaire local (LSI) |
| --- | --- | --- |
| Clés | N'importe quelle clé de partition et une clé de tri facultative | Même clé de partition que la table, une autre clé de tri |
| Création | À tout moment | Seulement à la création de la table |
| Cohérence de lecture | Éventuelle seulement | Éventuelle ou forte |
| Capacité | La sienne (mode provisionné) ; un GSI à court de capacité d'écriture limite les écritures sur la table | Partage la capacité de la table |
| Limites | 20 par table par défaut (ajustable) | 5 par table ; chaque valeur de clé de partition est limitée à 10 Go d'éléments |
| Attributs non projetés | Impossibles à lire par l'index | Récupérés dans la table, avec un coût de lecture supplémentaire |

Les index projettent `KEYS_ONLY`, `INCLUDE` (attributs nommés) ou `ALL`. Un élément sans les attributs de clé de l'index n'est pas écrit dans l'index (**index fragmenté**, sparse index), ce qui rend peu coûteux « trouver les quelques commandes ouvertes ». Les clés d'un GSI peuvent aussi combiner jusqu'à quatre attributs pour la clé de partition et quatre pour la clé de tri.

> **Piège d'examen.** « Interroger la table sur un nouvel attribut avec des lectures à cohérence forte » ne peut être satisfait ni par un nouveau GSI (cohérence éventuelle) ni par un nouveau LSI (seulement à la création de la table). La réponse est de recréer la table avec un LSI et d'y migrer les données, ou d'accepter la cohérence éventuelle.

<!-- section: dynamodb-operations | objectives: 1.3.4 -->
## Cohérence, capacité, Query et Scan dans DynamoDB

Les lectures sont **à cohérence éventuelle** par défaut ; définissez `ConsistentRead` à true sur `GetItem`, `Query` ou `Scan` sur une table ou un LSI pour une lecture **à cohérence forte**, au double du coût.

| Unité | Définition |
| --- | --- |
| 1 RCU | 1 lecture à cohérence forte par seconde, ou 2 lectures à cohérence éventuelle, d'un élément jusqu'à 4 Ko |
| 1 WCU | 1 écriture par seconde d'un élément jusqu'à 1 Ko |
| Transactions | 2 RCU par lecture de 4 Ko, 2 WCU par Ko écrit |

Les tailles s'arrondissent au supérieur, élément par élément : 80 lectures à cohérence forte par seconde d'éléments de 10 Ko exigent 80 × 3 = 240 RCU (120 en cohérence éventuelle, 480 en transaction) ; 50 écritures par seconde d'éléments de 2,5 Ko exigent 50 × 3 = 150 WCU.

| | Query | Scan |
| --- | --- | --- |
| Lit | Les éléments d'une valeur de clé de partition, avec éventuellement une plage de clé de tri (`=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `begins_with`) | Tous les éléments de la table ou de l'index |
| Ordre | Ordre de la clé de tri ; `ScanIndexForward` à false pour l'ordre décroissant | Arbitraire entre les clés de partition |
| Expression de filtre | Appliquée après la lecture : les éléments filtrés consomment quand même de la capacité | Identique |
| Page | Jusqu'à 1 Mo par appel ; on continue avec `LastEvaluatedKey` passé en `ExclusiveStartKey` | Identique ; analyse parallèle avec `Segment` et `TotalSegments` |

```json
{
  "TableName": "Orders",
  "KeyConditionExpression": "customerId = :c AND begins_with(orderDate, :y)",
  "FilterExpression": "orderStatus = :s",
  "ExpressionAttributeValues": { ":c": { "S": "C-123" }, ":y": { "S": "2026-" }, ":s": { "S": "SHIPPED" } },
  "ScanIndexForward": false
}
```

`Limit` plafonne le nombre d'éléments évalués par page avant le filtre, si bien qu'une page peut renvoyer moins d'éléments que `Limit`. Une `ProjectionExpression` réduit les données renvoyées, pas la capacité consommée.

Écritures :

- Les **écritures conditionnelles** (`ConditionExpression` sur `PutItem`, `UpdateItem`, `DeleteItem`) empêchent les écrasements (`attribute_not_exists(orderId)`) ou mettent en œuvre le **verrouillage optimiste** avec un attribut de version ; une condition fausse lève `ConditionalCheckFailedException`.
- **Compteurs atomiques** : une `UpdateExpression` avec `ADD viewCount :one` ou `SET viewCount = viewCount + :one` ne demande aucune lecture préalable.
- **Opérations par lot** : `BatchWriteItem` accepte jusqu'à 25 écritures ou suppressions (16 Mo), ne peut ni mettre à jour ni utiliser de conditions, n'est pas atomique dans son ensemble et renvoie `UnprocessedItems` à retenter avec backoff ; `BatchGetItem` lit jusqu'à 100 éléments.
- **Transactions** : `TransactWriteItems` regroupe jusqu'à 100 actions (`Put`, `Update`, `Delete`, `ConditionCheck`, 4 Mo au total) sur plusieurs tables, tout ou rien ; deux actions ne peuvent pas viser le même élément ; `ClientRequestToken` rend une nouvelle tentative idempotente pendant 10 minutes.

```python
# Python (boto3): optimistic locking
table.update_item(
    Key={"orderId": "o-1001"},
    UpdateExpression="SET orderStatus = :s, #v = #v + :one",
    ConditionExpression="#v = :expected",
    ExpressionAttributeNames={"#v": "version"},
    ExpressionAttributeValues={":s": "SHIPPED", ":one": 1, ":expected": current_version},
)
```

> **Piège d'examen.** Ajouter une expression de filtre à un Scan n'en réduit pas le coût : toute la table est quand même lue. « Récupérer efficacement les commandes d'un client » désigne une Query sur une clé (ou un GSI) qui commence par `customerId`.

<!-- section: key-points -->
## Points clés

- Outils de cycle de vie : S3 Lifecycle et Object Lock, TTL DynamoDB (secondes epoch, suppression sous quelques jours, sans WCU), rétention des groupes de journaux, rétention des files et des flux.
- DynamoDB pour des modèles d'accès connus par clé, RDS ou Aurora pour les jointures et le SQL ad hoc, ElastiCache pour les données chaudes, S3 pour les objets et les éléments de plus de 400 Ko.
- DAX met en cache les lectures DynamoDB à cohérence éventuelle ; ElastiCache exige du code de chargement différé ou d'écriture simultanée ; CloudFront pour S3 ; API Gateway met en cache les réponses REST.
- Des clés de partition à cardinalité élevée évitent les partitions chaudes ; les clés de tri permettent les plages.
- GSI : n'importe quelle clé, à tout moment, cohérence éventuelle ; LSI : même clé de partition, à la création, cohérence forte possible.
- RCU par tranche de 4 Ko (moitié en cohérence éventuelle, double en transaction), WCU par Ko, arrondies au supérieur par élément.
- Query plutôt que Scan ; les filtres n'économisent pas de capacité ; paginez avec `LastEvaluatedKey`.
- Écritures conditionnelles, verrouillage optimiste, compteurs atomiques, limites des lots (25 écritures, 100 lectures) et transactions (100 actions).
