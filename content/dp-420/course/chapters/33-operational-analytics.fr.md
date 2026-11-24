L'analytique opérationnelle consiste à produire des rapports et de la science des données sur les données Cosmos DB en direct, sans ralentir l'application et sans pipelines ETL. Pour le DP-420, elle passe par Microsoft Fabric : soit la base de données vit dans Fabric (Cosmos DB dans Microsoft Fabric, mise en miroir automatiquement dans OneLake), soit un compte Azure Cosmos DB for NoSQL est mis en miroir dans Fabric. Les questions demandent lequel choisir, comment configurer et surveiller la mise en miroir, comment interroger le JSON en miroir avec T-SQL ou Spark, et comment lire et écrire les conteneurs opérationnels avec le connecteur Spark.

<!-- section: azure-or-fabric | objectives: 3.3.1 -->
## Azure Cosmos DB ou Cosmos DB dans Microsoft Fabric

Les deux exécutent le même moteur Cosmos DB for NoSQL : même langage de requête, mêmes SDK, même indexation (vectorielle et en texte intégral comprises) et même lot transactionnel. Ils diffèrent par l'approvisionnement, la sécurité, la facturation et l'analytique.

| Aspect | Azure Cosmos DB for NoSQL | Cosmos DB dans Microsoft Fabric |
| --- | --- | --- |
| Emplacement | Abonnement Azure, ressource Azure Resource Manager | Élément d'un espace de travail Fabric, sous licence capacité Fabric, Power BI Premium ou capacité d'essai |
| Débit | Manuel, mise à l'échelle automatique (autoscale) ou serverless | **Autoscale uniquement** : 5 000 RU/s maximum par défaut dans le portail, de 1 000 à 50 000 RU/s par le SDK ; au-delà, par un ticket de support |
| Facturation | Unités de requête et stockage sur la facture Azure | Unités de capacité Fabric (CU) : 100 RU/s = 0,067 CU par heure, soit environ 1 500 RU/s par CU ; le débit autoscale le plus élevé de chaque heure est facturé |
| Authentification | Clés de compte ou RBAC du plan de données Microsoft Entra ID | **Microsoft Entra ID uniquement**, pas de clé primaire ni secondaire ; les autorisations d'élément Fabric s'appliquent à tous les éléments Cosmos DB de l'espace de travail |
| Connexion du SDK | Mode direct ou passerelle | **Mode passerelle uniquement** : à définir explicitement en .NET et en Java |
| Régions | Une ou plusieurs régions, écritures multirégions | Région de la capacité de l'espace de travail, pas de multirégion (zones de disponibilité là où elles existent) |
| Réseau et clés | Points de terminaison privés, clés gérées par le client | Pas de Private Link sur l'élément (liaisons privées Fabric au niveau du locataire uniquement), pas de clés gérées par le client |
| Code côté serveur | Procédures stockées, déclencheurs, UDF | Non pris en charge |
| Limites | Limites de compte et de conteneur d'Azure Cosmos DB | 25 conteneurs par base de données par défaut, 2 Mo par élément |
| Analytique | Mise en miroir facultative dans Fabric (exige la sauvegarde continue) | Toujours mise en miroir dans OneLake au format Delta Parquet, impossible à désactiver |

| Exigence | Choix |
| --- | --- |
| Nouvelle application NoSQL ou d'IA développée par une équipe qui travaille déjà dans Fabric, données analysées dans OneLake et Power BI, aucune infrastructure Azure à gérer | Cosmos DB dans Microsoft Fabric |
| Écritures multirégions, SLA de distribution mondiale, débit serverless ou manuel | Azure Cosmos DB |
| Point de terminaison privé sur la base de données, clés gérées par le client, clés de compte pour un client existant | Azure Cosmos DB |
| Procédures stockées ou déclencheurs déjà utilisés par l'application | Azure Cosmos DB |
| Compte Azure Cosmos DB de production existant qui a besoin d'analytique en quasi temps réel | Le conserver et le mettre en miroir dans Fabric |
| Une seule facture et une seule capacité pour la base de données et son analytique | Cosmos DB dans Microsoft Fabric |

Passer à Cosmos DB dans Fabric est une migration de données (Data Factory, importation en bloc par le SDK, Spark ou l'outil Desktop Data Migration Tool), avec un code converti à l'authentification Microsoft Entra et au mode passerelle.

> **Piège d'examen.** Un conteneur créé avec le SDK dans Cosmos DB dans Fabric doit recevoir un débit autoscale. Un code qui le crée avec un débit manuel échoue avec `Offer Type is restricted to Autoscale for your account.`

<!-- section: configure-mirroring | objectives: 3.3.2 -->
## Configurer la mise en miroir depuis Azure Cosmos DB

La mise en miroir réplique une base de données Azure Cosmos DB for NoSQL entière, ou certains de ses conteneurs, dans OneLake sous forme de tables Delta. La première copie est lue depuis la **sauvegarde continue** du compte ; ensuite, les insertions, mises à jour et suppressions sont lues dans les conteneurs en direct, en quasi temps réel (en général quelques minutes pour le chargement initial, davantage pour de gros volumes). Elle n'utilise ni le magasin analytique ni le flux de modification et ne consomme aucune unité de requête de l'application ; Azure Synapse Link et les consommateurs du flux de modification continuent de fonctionner à côté.

Prérequis et limites à connaître :

- **API for NoSQL uniquement** : ni MongoDB, ni Cassandra, ni Gremlin, ni Table, ni DocumentDB (vCore). Indisponible dans Azure Government et Azure China.
- **Sauvegarde continue, 7 jours ou 30 jours**. Le niveau 7 jours est gratuit et suffit pour la mise en miroir. Le passage d'un compte à la sauvegarde continue est irréversible.
- **Pas de compte à écritures multirégions**. Avec une région d'écriture et des régions de lecture, la mise en miroir lit depuis la région d'écriture, y compris après un basculement.
- **Authentification** : une clé de compte en lecture-écriture, ou Microsoft Entra ID (*Organizational account*) avec un rôle du plan de données qui accorde `Microsoft.DocumentDB/databaseAccounts/readMetadata` et `Microsoft.DocumentDB/databaseAccounts/readAnalytics`. Les clés en lecture seule et les identités managées ne sont pas prises en charge.
- **Rôle d'espace de travail** Admin ou Member pour créer la base de données mise en miroir.
- Non pris en charge : clés gérées par le client sur OneLake, suppression réversible par TTL (un élément qui expire est supprimé du miroir comme toute suppression), partitionnement personnalisé.

Étapes dans le portail : dans l'espace de travail, **Create** > **Mirrored Azure Cosmos DB**, nommez l'élément, créez une connexion (**Azure Cosmos DB for NoSQL**, point de terminaison, type d'authentification **Account key** ou **Organizational account**), sélectionnez la base de données et éventuellement les conteneurs, puis **Mirror database**. Les conteneurs ajoutés plus tard sont pris en compte automatiquement, et la sélection des conteneurs peut être modifiée à tout moment.

Rôle personnalisé du plan de données pour l'authentification Microsoft Entra :

```bash
az cosmosdb sql role definition create -a cosmos-litware -g rg-litware --body '{
  "RoleName": "Fabric Mirroring Metadata Reader",
  "Type": "CustomRole",
  "AssignableScopes": ["/"],
  "Permissions": [{ "DataActions": [
    "Microsoft.DocumentDB/databaseAccounts/readMetadata",
    "Microsoft.DocumentDB/databaseAccounts/readAnalytics"
  ]}]
}'
```

Un compte dont l'accès réseau public est désactivé derrière un point de terminaison privé peut être mis en miroir : ajoutez la fonctionnalité `EnableFabricNetworkAclBypass`, autorisez l'espace de travail Fabric avec `--network-acl-bypass-resource-ids` (contournement de l'ACL réseau), créez une passerelle de données de réseau virtuel et une connexion OAuth 2.0, puis créez la base de données mise en miroir avec l'API REST Fabric. L'espace de travail doit être dans la région du compte, le fournisseur de ressources `Microsoft.PowerPlatform` doit être inscrit sur l'abonnement (la passerelle l'utilise pour se lier au réseau virtuel), et le sous-réseau de la passerelle doit être un sous-réseau dédié `/27` ou plus grand, délégué à `Microsoft.PowerPlatform/vnetaccesslinks`. La réplication continue transite par le réseau Microsoft, pas par le point de terminaison privé.

Coût : le calcul de réplication est gratuit, le stockage du miroir dans OneLake est gratuit jusqu'à une limite liée à la taille de la capacité, les requêtes consomment la capacité Fabric, et une capacité dans une autre région que le compte ajoute des frais de sortie et de la latence.

> **Piège d'examen.** La mise en miroir n'est « sans RU » que pour la réplication. Parcourir la source avec l'Explorateur de données de la base mise en miroir (**View** > **Source database**) exécute de vraies requêtes sur le compte et consomme des RU. Aucune écriture vers la source n'est possible depuis l'élément mis en miroir.

<!-- section: monitor-mirroring | objectives: 3.3.2 -->
## Surveiller et gérer la réplication

**Monitor replication** (Surveiller la réplication) dans la base de données mise en miroir affiche un état pour la base de données et pour chaque table :

| État | Signification |
| --- | --- |
| Running (En cours) | L'instantané et les modifications sont en cours de réplication |
| Running with warning (Exécution avec avertissement) | La réplication continue avec des erreurs temporaires (base de données) ou non fatales (table) à corriger |
| Stopping / Stopped (Arrêt / Arrêté) | La réplication est arrêtée |
| Failed (Échec) | Erreur fatale, intervention requise |
| Paused (Suspendu) | Base de données uniquement : la capacité Fabric a été suspendue puis reprise |

La liste des tables affiche **Rows replicated** (Lignes répliquées : cumul des insertions, mises à jour et suppressions appliquées) et **Last completed** (Dernier terminé : dernière actualisation depuis la source). L'état est aussi disponible par l'API REST ou le SDK de mise en miroir de Fabric.

Pour l'historique et les alertes, activez la **surveillance de l'espace de travail** : les journaux d'opérations des bases de données en miroir (préversion) arrivent dans la table `MirroredDatabaseTableExecution` de la base de données KQL de surveillance, avec `OperationName` (`AddTable`, `Snapshotting`, `Replicating`, `StartReseeding`, `FailTable`...), `SourceTableName`, `ProcessedRows`, `ProcessedBytes`, `ReplicatorBatchLatency` (secondes), `ErrorType` (`UserError` ou `SystemError`) et `ErrorMessage`.

```kusto
MirroredDatabaseTableExecution
| where Timestamp > ago(24h) and ItemName == "orders-mirror"
| where OperationName == "Replicating"
| summarize maxLatencySec = max(ReplicatorBatchLatency), rows = sum(ProcessedRows)
    by SourceTableName, bin(Timestamp, 1h)
```

```kusto
MirroredDatabaseTableExecution
| where isnotempty(ErrorType)
| project Timestamp, SourceTableName, OperationName, ErrorType, ErrorMessage
| order by Timestamp desc
```

Actions de gestion :

| Événement ou action | Effet |
| --- | --- |
| Clés de compte renouvelées | La mise en miroir échoue : arrêtez la réplication, mettez à jour les informations d'identification de la connexion, redémarrez |
| Arrêt de la réplication | La mise en miroir est entièrement arrêtée ; les données déjà répliquées dans OneLake restent. Il n'existe pas de pause |
| Redémarrage après un arrêt | Toutes les tables sont réamorcées depuis zéro, sans reprise incrémentielle |
| Conteneur supprimé puis recréé avec le même nom | La table ne contient plus que les données du nouveau conteneur |
| Base de données source supprimée | La réplication échoue ; les données OneLake restent jusqu'à la suppression du miroir |

> **Conseil d'examen.** Pour vérifier que le miroir est à jour, comparez **Last completed** et **Rows replicated** avec la source en direct (vue **Source database** en lecture seule), et examinez `ReplicatorBatchLatency` dans les journaux de surveillance de l'espace de travail (préversion).

<!-- section: query-tsql | objectives: 3.3.3 -->
## Interroger le JSON en miroir avec T-SQL

Chaque base de données mise en miroir dispose d'un **point de terminaison d'analytique SQL** en lecture seule : chaque conteneur y est une table, interrogée en T-SQL depuis l'éditeur de requête Fabric, SSMS, Visual Studio Code ou tout client ODBC/JDBC. Vous pouvez créer des vues, faire des jointures avec les autres bases mises en miroir, entrepôts et lakehouses de l'espace de travail, créer des rapports Power BI en mode Direct Lake, et appliquer la sécurité au niveau des lignes, la sécurité au niveau des colonnes et le masquage dynamique des données. Les requêtes consomment la capacité Fabric, pas des RU.

Comment le JSON arrive dans Delta :

| Changement dans la source | Résultat dans la table |
| --- | --- |
| Propriété de premier niveau | Une colonne |
| Objet ou tableau imbriqué | Une colonne de chaîne JSON |
| Nouvelle propriété | Une nouvelle colonne ; les anciennes lignes sont à null |
| Propriété absente d'un élément | Null |
| Propriété renommée | Les deux colonnes sont conservées ; l'ancienne est à null pour les nouveaux éléments |
| Changement de type incompatible (tableau en chaîne) | Conversion vers un type plus large si possible, sinon null |
| `addressName` et `AddressName` | `addressName` et `AddressName_1` |

Les données imbriquées se développent avec `OPENJSON`. `CROSS APPLY` ne garde que les lignes dont le tableau contient des éléments ; `OUTER APPLY` garde aussi les éléments sans tableau (comme une jointure externe gauche). Une colonne déclarée `nvarchar(max) AS JSON` renvoie un fragment imbriqué qu'un second `OPENJSON` peut développer.

```text
SELECT o.id, o.customerId, l.sku, l.quantity, l.unitPrice
FROM dbo.orders AS o
OUTER APPLY OPENJSON(o.lines) WITH (
    sku        varchar(50) '$.sku',
    quantity   int         '$.quantity',
    unitPrice  float       '$.unitPrice',
    discounts  nvarchar(max) AS JSON
) AS l
WHERE o.status = 'shipped';
```

Sans clause `WITH`, `OPENJSON` déduit le schéma et renvoie des lignes clé/valeur. Dans la clause `WITH`, préférez `varchar(n)` à `varchar(max)` pour les colonnes de chaîne : les types plus petits sont plus performants.

Taille des chaînes : les tables créées après le 18 novembre 2025 utilisent `varchar(max)`, jusqu'à 2 Mo (la taille maximale d'un élément). Les tables créées avant ne prennent en charge que `varchar(8000)` et doivent être recréées. Pour des chaînes JSON très longues, lisez plutôt les données avec Spark.

> **Piège d'examen.** Le point de terminaison d'analytique SQL est en lecture seule : `INSERT`, `UPDATE` ou `DELETE` ne peuvent modifier ni les tables en miroir ni le conteneur source. L'écriture vers Cosmos DB passe par le SDK ou le connecteur Spark.

> **Conseil d'examen.** Les Viewers de l'espace de travail ne peuvent pas interroger le point de terminaison d'analytique SQL. Pour donner les données aux analystes sans l'explorateur de la source en direct, partagez uniquement le point de terminaison d'analytique SQL.

<!-- section: query-spark | objectives: 3.3.3 -->
## Interroger les données en miroir avec Spark

Spark lit le miroir au travers d'un **lakehouse** : **Get Data** > **New shortcut** > **Microsoft OneLake**, puis sélectionnez la base de données mise en miroir et ses tables. Le raccourci pointe vers les tables Delta du miroir : rien n'est copié et aucune RU n'est consommée ; **New or existing notebook** sur une table ouvre un notebook. Cosmos DB dans Microsoft Fabric dispose du même miroir OneLake sans aucune configuration.

Les propriétés imbriquées arrivent sous forme de chaînes JSON : analysez-les avec `from_json` et `explode`.

```text
from pyspark.sql.functions import col, explode, from_json
from pyspark.sql.types import ArrayType, StructType, StructField, StringType, IntegerType, DoubleType

lines_schema = ArrayType(StructType([
    StructField("sku", StringType()),
    StructField("quantity", IntegerType()),
    StructField("unitPrice", DoubleType())
]))

orders = spark.sql("SELECT id, customerId, lines FROM lh_sales.orders")
order_lines = (orders
    .withColumn("line", explode(from_json(col("lines"), lines_schema)))
    .select("id", "customerId", "line.sku", "line.quantity", "line.unitPrice"))
display(order_lines)
```

| Exigence | Outil |
| --- | --- |
| SQL ad hoc, vues, rapports Power BI | Point de terminaison d'analytique SQL (T-SQL) |
| Ingénierie des données, machine learning, chaînes JSON très longues | Raccourci de lakehouse + notebook Spark |
| Données les plus fraîches ou lecture ponctuelle sur la source | Le conteneur opérationnel (SDK ou connecteur Spark, consomme des RU) |

<!-- section: spark-connector | objectives: 3.3.4 -->
## Lire et écrire dans Cosmos DB depuis Fabric avec le connecteur Spark

Le connecteur Spark OLTP Azure Cosmos DB (groupe Maven `com.azure.cosmos.spark`, format `cosmos.oltp`) lit et écrit directement dans les conteneurs **opérationnels** : chaque lecture et chaque écriture consomme des RU. Utilisez-le pour l'**ETL inversé** (reverse ETL) : calculer des résultats dans Fabric (recommandations, agrégats) et les servir à l'application depuis Cosmos DB avec une faible latence. Dans Fabric, créez un environnement sur Runtime 1.3 (Spark 3.5), chargez `azure-cosmos-spark_3-5_2-12` comme bibliothèque personnalisée, publiez-le et attachez-le au notebook.

Pour un **compte Azure Cosmos DB**, configurez le point de terminaison avec une clé de compte (ou un principal de service, `spark.cosmos.auth.type` = `ServicePrincipal`) :

```text
azure_config = {
    "spark.cosmos.accountEndpoint": "https://cosmos-litware.documents.azure.com:443/",
    "spark.cosmos.accountKey": "<account-key>",
    "spark.cosmos.database": "retail",
    "spark.cosmos.container": "recommendations"
}
```

Pour **Cosmos DB dans Microsoft Fabric**, qui n'accepte que Microsoft Entra ID, ajoutez aussi la bibliothèque `fabric-cosmos-spark-auth_3` et utilisez le jeton de l'utilisateur du notebook :

```text
config = {
    "spark.cosmos.accountEndpoint": "https://<endpoint>.cosmos.fabric.microsoft.com:443/",
    "spark.cosmos.database": "retail",
    "spark.cosmos.container": "products",
    "spark.cosmos.accountDataResolverServiceName": "com.azure.cosmos.spark.fabric.FabricAccountDataResolver",
    "spark.cosmos.auth.type": "AccessToken",
    "spark.cosmos.useGatewayMode": "true",
    "spark.cosmos.auth.aad.audience": "https://cosmos.azure.com/"
}

products = (spark.read.format("cosmos.oltp").options(**config)
    .option("spark.cosmos.read.inferSchema.enabled", "true")
    .load())
```

Écrivez avec le même format. Chaque ligne doit avoir une colonne `id` et la propriété de clé de partition :

```text
spark.sql("CREATE TABLE IF NOT EXISTS cosmosCatalog.retail.minPrices USING cosmos.oltp "
          "TBLPROPERTIES(partitionKeyPath = '/id', autoScaleMaxThroughput = '1000')")

write_config = dict(config)
write_config["spark.cosmos.container"] = "minPrices"
write_config["spark.cosmos.write.strategy"] = "ItemOverwrite"
write_config["spark.cosmos.throughputControl.enabled"] = "true"
write_config["spark.cosmos.throughputControl.name"] = "ReverseEtlControl"
write_config["spark.cosmos.throughputControl.targetThroughputThreshold"] = "0.30"
write_config["spark.cosmos.throughputControl.globalControl.useDedicatedContainer"] = "false"

min_prices.withColumn("id", col("productId")) \
    .write.format("cosmos.oltp").options(**write_config).mode("APPEND").save()
```

`CREATE TABLE` utilise le catalogue `com.azure.cosmos.spark.CosmosCatalog`, enregistré comme `spark.sql.catalog.cosmosCatalog` avec les mêmes paramètres de point de terminaison et d'authentification ; Spark SQL peut alors interroger `cosmosCatalog.retail.products`.

| `spark.cosmos.write.strategy` | Comportement |
| --- | --- |
| `ItemOverwrite` (par défaut) | Upsert : crée ou remplace l'élément de même `id` et de même clé de partition |
| `ItemAppend` | Crée les éléments, ignore ceux qui existent déjà |
| `ItemOverwriteIfNotModified` | Remplace seulement si l'ETag correspond toujours, ignore les éléments modifiés |
| `ItemDelete` / `ItemDeleteIfNotModified` | Supprime les éléments correspondants, éventuellement seulement s'ils sont inchangés |
| `ItemPatch` / `ItemPatchIfExists` | Mise à jour partielle ; échoue sur un élément absent / l'ignore |

Autres paramètres : les écritures en bloc sont activées par défaut (`spark.cosmos.write.bulk.enabled`) ; `spark.cosmos.read.customQuery` envoie une requête NoSQL (agrégats compris) à Cosmos DB ; le format `cosmos.oltp.changeFeed` lit le flux de modification en streaming, avec `spark.cosmos.changeFeed.startFrom` (`Beginning`, `Now` ou un horodatage).

> **Piège d'examen.** Pour analyser des données, ne lisez pas le conteneur opérationnel avec `cosmos.oltp` : cela dépense les RU dont l'application a besoin. Lisez le miroir OneLake (raccourci ou point de terminaison d'analytique SQL) et n'utilisez le connecteur que pour réécrire les résultats, avec le contrôle du débit pour plafonner les RU du travail.

<!-- section: key-points -->
## Points clés

- Cosmos DB dans Fabric : même moteur, autoscale uniquement, facturé en CU, Microsoft Entra ID uniquement, mode passerelle, une seule région, toujours mis en miroir dans OneLake.
- Azure Cosmos DB : écritures multirégions, débit serverless ou manuel, points de terminaison privés, clés gérées par le client ; mettez-le en miroir pour l'analytique.
- La mise en miroir exige l'API for NoSQL, la sauvegarde continue et l'absence d'écritures multirégions ; l'authentification utilise une clé en lecture-écriture ou Entra avec `readMetadata` + `readAnalytics` ; la réplication ne consomme aucune RU.
- Surveillez avec les états de réplication (portail ou API REST) et, en préversion, `MirroredDatabaseTableExecution`. Un redémarrage réamorce tout.
- T-SQL sur le point de terminaison d'analytique SQL en lecture seule, JSON imbriqué développé avec `OPENJSON`.
- Spark lit le miroir par un raccourci de lakehouse ; le connecteur `cosmos.oltp` réécrit les résultats (RU, stratégie d'écriture, contrôle du débit).
