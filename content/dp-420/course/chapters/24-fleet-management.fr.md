Les flottes (fleets) organisent de nombreux comptes Azure Cosmos DB for NoSQL, répartis sur plusieurs abonnements et groupes de ressources, comme une seule unité gérable. Elles visent les éditeurs de logiciels indépendants (ISV) qui donnent à chaque locataire d'une application B2B multilocataire son propre compte : une forte isolation des performances et de la sécurité par locataire, avec des RU/s partagées et une surveillance à l'échelle de la flotte pour maîtriser le coût et la gestion. Les flottes sont en préversion. Les questions d'examen testent la hiérarchie, les règles et limites du pool, et quel outil de surveillance répond à quelle question.

<!-- section: fleet-model | objectives: 2.4.1 -->
## Flottes, fleetspaces et comptes de fleetspace

| Ressource | Rôle | Règles |
| --- | --- | --- |
| Flotte (`Microsoft.DocumentDB/fleets`) | Entité de premier niveau ; une flotte = une application multilocataire | Sa région ne détermine pas les régions de ses comptes |
| Fleetspace (`.../fleets/fleetspaces`) | Groupe logique de comptes dans une flotte ; partage éventuellement un pool de débit | Chaque compte d'une flotte appartient à un fleetspace |
| Compte de fleetspace (`.../fleetspaces/fleetspaceAccounts`) | Lien vers un compte NoSQL existant (un compte = un locataire) | Un compte n'appartient qu'à un fleetspace et qu'à une flotte ; retirez-le avant de l'ajouter ailleurs |

Les comptes peuvent provenir de n'importe quel abonnement ou groupe de ressources. L'ordre de création est toujours **flotte, puis fleetspace, puis compte de fleetspace**. Dans le portail : recherchez Azure Cosmos DB Fleets, Create ; puis Fleet resources > Fleetspaces ; puis Fleet resources > Database accounts > Browse accounts to add to this fleetspace > Add to fleetspace.

Avec Azure CLI, les flottes sont des ressources génériques et exigent les versions d'API en préversion :

```bash
az resource create --resource-group rg-saas --name fleet-contoso \
  --resource-type "Microsoft.DocumentDB/fleets" --location westeurope \
  --latest-include-preview --properties "{}"

# Add an existing account (tenant) to fleetspace fs-eu
accountId=$(az resource show --resource-group rg-tenant-042 --name cosmos-tenant-042 \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" --query id --output tsv)
az resource create --resource-group rg-saas \
  --name "fleet-contoso/fleetspaces/fs-eu/fleetspaceAccounts/tenant-042" \
  --resource-type "Microsoft.DocumentDB/fleets/fleetspaces/fleetspaceAccounts" \
  --location westeurope --latest-include-preview \
  --properties "{\"accountLocation\":\"westeurope\",\"accountResourceIdentifier\":\"$accountId\"}"
```

```bicep
resource fleet 'Microsoft.DocumentDB/fleets@2025-10-25' = {
  name: 'fleet-contoso'
  location: 'westeurope'
  properties: {}
}
```

Limites par défaut (relevées par une demande de support) :

| Limite | Valeur |
| --- | --- |
| Comptes de base de données par fleetspace | 3 000 |
| RU/s maximales d'un pool | 1 000 000 RU/s |
| RU/s du pool qu'une partition physique peut consommer | 5 000 RU/s |

<!-- section: throughput-pooling | objectives: 2.4.1 -->
## Gestion du débit au niveau de la flotte (pool)

Sans pool, un conteneur qui dépasse ses RU/s provisionnées est limité (429). Le contournement classique pour des locataires aux pics imprévisibles consiste à provisionner chaque locataire pour son pic, ce qui gaspille des RU/s quand les locataires sont inactifs. Un **pool** est une réserve de RU/s au niveau du fleetspace dans laquelle toute base de données ou tout conteneur des comptes du fleetspace peut puiser :

| Débit | Où | Comportement |
| --- | --- | --- |
| RU/s dédiées | Base de données ou conteneur, comme d'habitude | Garanties, toujours consommées **en premier**. Point d'entrée : mise à l'échelle automatique de 100 à 1 000 RU/s ; avec la mise à l'échelle automatique, RU/s dédiées = le maximum de mise à l'échelle automatique |
| RU/s du pool | Fleetspace | Utilisées seulement quand une ressource dépasse ses RU/s dédiées, en plus de celles-ci |

Exemple : 1 000 locataires, un compte et un conteneur chacun, mise à l'échelle automatique de 100 à 1 000 RU/s, avec des pics à 5 000 RU/s pour les quelques locataires actifs à un instant donné. Plutôt que 5 000 RU/s par conteneur, conservez le petit débit dédié et ajoutez un pool de, par exemple, 100 000 à 500 000 RU/s qui absorbe les pics.

Paramètres du pool :

| Paramètre | Règle |
| --- | --- |
| Mise à l'échelle | Automatique par défaut, entre un minimum et un maximum |
| RU/s minimales et maximales | Nombres entiers, au moins 100 000, multiples de 1 000 ; le maximum est au moins égal au minimum et au plus **10 fois** le minimum |
| Niveau de service | `GeneralPurpose` (écritures dans une seule région) ou `BusinessCritical` (écritures multirégions) |
| Régions de données | Les régions des comptes qui partagent le pool |
| Modifications | Minimum et maximum modifiables à tout moment ; niveau de service et régions **non** modifiables après la création du fleetspace |

Tous les comptes d'un fleetspace avec pool doivent avoir la **même configuration de régions et de niveau de service**. Les RU/s du pool ne sont pas partagées entre régions : chaque région a sa propre capacité de pool.

| Comptes du fleetspace | Peuvent-ils partager un pool ? |
| --- | --- |
| Deux comptes à écriture dans une seule région, tous deux dans les deux mêmes régions | Oui |
| Deux comptes à écritures multirégions, tous deux dans les deux mêmes régions | Oui |
| Un compte à écriture dans une seule région réparti sur deux régions, un autre dans une seule autre région | Non : régions différentes |
| Deux comptes répliqués vers deux ensembles de régions différents | Non |
| Un compte à écritures multirégions, un compte à écriture dans une seule région | Non : niveau de service différent |

Le pool ne supprime pas les limites des partitions physiques. Une partition physique peut puiser au plus 5 000 RU/s supplémentaires dans le pool, et son total (dédié plus pool) ne peut pas dépasser 10 000 RU/s :

```text
max RU/s of a physical partition = min(5000 + dedicated RU/s of the partition, 10000)

dedicated 1,000 RU/s  -> up to  6,000 RU/s
dedicated 6,000 RU/s  -> up to 10,000 RU/s (only 4,000 from the pool)
```

> **Piège d'examen.** Un pool ne corrige pas une partition chaude. Une seule clé de partition logique qui a besoin de plus que la limite par partition reste limitée, quelle que soit la capacité libre du pool : la correction porte sur la clé de partition, pas sur la taille du pool.

Facturation : chaque heure, le pool est facturé au **plus haut niveau de RU/s atteint** pendant cette heure, dans chacune de ses régions. Un pool inactif est facturé à son minimum de RU/s par région. Le pool est rentable avec de nombreux locataires dont les pics ne coïncident pas ; avec peu de locataires, ou des locataires tous constamment actifs ou tous constamment inactifs, il apporte peu.

Surveiller le pool :

| Question | Métrique |
| --- | --- |
| Jusqu'où le pool a-t-il monté ? | `FleetspaceAutoscaledThroughput` (niveau flotte) |
| Les requêtes ont-elles utilisé le pool ou les RU/s dédiées ? | Total Requests fractionné par **Capacity Type** (niveau compte) |
| Combien un conteneur a-t-il consommé par rapport à ses RU/s dédiées ? | Total Request Units, filtré sur la base de données et le conteneur |
| Combien de RU/s dédiées chaque partition physique possède-t-elle ? | `PhysicalPartitionThroughput` |

> **Conseil d'examen.** « Des milliers de locataires, un compte chacun, des pics imprévisibles, réduire le coût sans limitation » désigne une flotte avec un pool de débit. « Quelques gros locataires à charge constante » non : provisionnez leur propre débit.

<!-- section: fleet-analytics | objectives: 2.4.2 -->
## Surveillance de la flotte avec l'analytique de la flotte

L'**analytique de la flotte** (Fleet analytics, en préversion, comptes NoSQL d'une flotte uniquement) regroupe en un seul endroit les données de coût, d'utilisation et de configuration de tous les comptes de la flotte, préagrégées avec une **granularité d'une heure**, sous forme de tables **Delta Lake** open source (fichiers Parquet) dans un **schéma en étoile** : tables de faits pour l'utilisation, les performances et le coût, tables de dimensions pour le contexte.

| | Métriques Azure Monitor | Journaux Azure Monitor | Analytique de la flotte |
| --- | --- | --- | --- |
| Étendue | Compte | Compte | Flotte entière |
| Agrégation | 1 minute, préagrégée | Chaque requête | 1 heure, préagrégée |
| Rétention | 93 jours | À votre choix | À votre choix |
| Coût | Aucun | Stockage des journaux | Fabric ou stockage |
| Outils | Explorateur de métriques, Grafana | Log Analytics, classeurs | Point de terminaison SQL Fabric ou KQL, Spark, Power BI |

Choisissez l'analytique de la flotte pour les tendances, la répartition des coûts et les audits de configuration sur de nombreux comptes ; les métriques pour les vérifications et alertes quasi temps réel ; les journaux pour le dépannage au niveau de la requête.

Destinations et configuration (flotte > Supervision > Fleet analytics > Add destination) :

| Destination | Prérequis | Autorisation à accorder |
| --- | --- | --- |
| Espace de travail Microsoft Fabric | Capacité Fabric (sous licence ou d'évaluation), un lakehouse OneLake existant ; un espace de travail dédié est recommandé | Dans le portail Fabric (espace de travail > Manage), le principal de service **Cosmos DB Fleet Analytics** comme **Contributor** de l'espace de travail |
| Compte Stockage Azure | Azure Data Lake Storage Gen2 : **espace de noms hiérarchique** activé à la création du compte, un conteneur existant | Sur le compte de stockage (Contrôle d'accès (IAM)), **Storage Blob Data Contributor** pour le principal de service **Cosmos DB Fleet Analytics** |

> **Piège d'examen.** Sans l'attribution de rôle au principal de service Cosmos DB Fleet Analytics, la destination est enregistrée mais aucune donnée n'est écrite. Un espace de travail Fabric dédié est conseillé, car le principal obtient Contributor sur tout l'espace de travail.

Tables :

| Table | Contenu |
| --- | --- |
| `FactAccountHourly` | Paramètres du compte par heure : `ResourceGroup`, niveau de cohérence par défaut, niveau gratuit, capacité en rafale, mode et rétention des sauvegardes, `TotalRUPerSecLimit`, paramètres des clés et dernière rotation de clé |
| `FactRequestHourly` | `TotalRequestCount` et `TotalRequestChargeInRU` par ressource, opération et code d'état, par heure |
| `FactResourceUsageHourly` | `MaxDataStorageInKB`, `MaxIndexStorageInKB` |
| `FactMeterUsageHourly` | `ConsumedUnits` par compteur de facturation (`MeterId`) |
| `DimResource` | `ResourceId` avec `SubscriptionId`, `AccountName`, `Region`, `DatabaseName`, `CollectionName` (pas de groupe de ressources) |
| `DimMeter` | Compteurs de facturation |

Les faits se joignent à `DimResource` sur `ResourceId`. Les 100 comptes ayant le plus de requêtes du plan de données sur 7 jours, depuis le point de terminaison SQL Fabric :

```text
SELECT TOP 100 DR.[SubscriptionId], DR.[AccountName],
       SUM(FRH.[TotalRequestCount]) AS sum_total_requests
FROM [FactRequestHourly] FRH
JOIN [DimResource] DR ON FRH.[ResourceId] = DR.[ResourceId]
WHERE FRH.[Timestamp] >= DATEADD(DAY, -7, GETDATE())
  AND FRH.[ResourceName] IN ('Document', 'StoredProcedure')
GROUP BY DR.[AccountName], DR.[SubscriptionId]
ORDER BY sum_total_requests DESC;
```

Les vues enregistrées apparaissent dans le dossier Views du point de terminaison SQL et se visualisent dans Power BI (par exemple, la part de la flotte qui utilise la mise à l'échelle automatique). Avec ADLS Gen2, un notebook Spark crée des tables Delta sur les dossiers `abfss://<container>@<account>.dfs.core.windows.net/<table>` et les interroge de la même façon. Le stockage et le calcul des requêtes sont facturés par Fabric ou Stockage Azure comme d'habitude.

| Exigence | Outil |
| --- | --- |
| Quels locataires ont le plus grossi en stockage ce trimestre ? | Analytique de la flotte, `FactResourceUsageHourly` |
| Quels comptes utilisent encore la sauvegarde périodique ou n'ont jamais fait tourner leurs clés ? | Analytique de la flotte, `FactAccountHourly` |
| Coût par locataire pour la refacturation | Analytique de la flotte, `FactMeterUsageHourly` |
| Être alerté en quelques minutes quand un locataire est limité | Alerte de métrique Azure Monitor |
| Trouver la requête qui a consommé 4 000 RU à 10 h 42 | Journaux de ressources dans Log Analytics |

<!-- section: key-points -->
## Points clés

- Flotte (une application) > fleetspace (groupe de comptes, pool facultatif) > compte de fleetspace (un locataire) ; un compte n'appartient qu'à un seul fleetspace.
- Les RU/s dédiées sont consommées en premier ; le pool ajoute de la capacité par-dessus, avec une mise à l'échelle automatique entre un minimum (au moins 100 000 RU/s) et un maximum (au plus 10 fois le minimum).
- Les comptes d'un pool partagent les mêmes régions et le même niveau de service (`GeneralPurpose` à écriture dans une seule région ou `BusinessCritical` à écritures multirégions), tous deux fixés à la création ; les pools ne sont pas partagés entre régions.
- Une partition physique prend au plus 5 000 RU/s dans le pool et 10 000 RU/s au total.
- Facturation : plus haut niveau de RU/s du pool atteint chaque heure, par région ; le minimum quand il est inactif.
- Analytique de la flotte : schéma en étoile Delta Lake horaire dans Fabric OneLake ou ADLS Gen2 ; accordez l'accès au principal de service Cosmos DB Fleet Analytics, sinon rien n'est écrit.
