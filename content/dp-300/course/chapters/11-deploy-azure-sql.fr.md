Chaque scénario du DP-300 commence par une offre. Le même moteur SQL Server fonctionne en tant qu'Azure SQL Database, Azure SQL Managed Instance, SQL Server sur les machines virtuelles Azure, base de données SQL dans Microsoft Fabric, et SQL Server hors d'Azure géré via Azure Arc ; ce qui change, c'est ce que Microsoft exploite pour vous et les fonctionnalités que vous conservez.

<!-- section: choose-offering | objectives: 1.1.1 -->
## Choisir l'offre de base de données

| Critère | Azure SQL Database | Azure SQL Managed Instance | SQL Server sur les machines virtuelles Azure |
| --- | --- | --- | --- |
| Modèle | PaaS, une base (ou un pool élastique) sur un serveur logique | PaaS, une instance entière dans votre réseau virtuel | IaaS, vous gérez le système d'exploitation et l'instance |
| Compatibilité | La plupart des fonctionnalités au niveau de la base | Presque toutes les fonctionnalités au niveau de l'instance et de la base | Parité complète avec la même version de SQL Server |
| Accès au système d'exploitation | Non | Non | Oui |
| Taille maximale | Jusqu'à 128 To (Hyperscale) | Jusqu'à 16 To, 32 To avec Next-gen General Purpose | Jusqu'à 256 To par instance |
| Réseau | Point de terminaison public ou point de terminaison privé (Private Link) | IP privée dans un sous-réseau dédié | IP privée dans votre réseau virtuel |
| Correctifs, sauvegardes | Automatiques | Automatiques | À votre charge (aidé par des extensions) |
| Changer le calcul | En ligne, connexions coupées brièvement à la fin | En ligne, bref basculement à la fin | Redimensionner la machine virtuelle implique un temps d'arrêt |

Règles de décision :

| Exigence | Réponse |
| --- | --- |
| Nouvelle application cloud, pas d'équipe DBA, effort d'administration minimal | Azure SQL Database |
| Nombreuses bases de locataires aux pics imprévisibles qui ne se chevauchent pas | Pool élastique Azure SQL Database |
| Lift and shift avec des travaux SQL Server Agent, des requêtes entre bases, du CLR, des serveurs liés | Azure SQL Managed Instance |
| Accès au système, agents tiers sur le serveur, SQL Server Reporting Services sur le même hôte, une fonctionnalité non prise en charge en PaaS | SQL Server sur les machines virtuelles Azure |
| Base opérationnelle dont les données doivent être immédiatement disponibles pour l'analytique Fabric | Base de données SQL dans Microsoft Fabric |
| Garder SQL Server dans votre centre de données ou un autre cloud, mais le gérer depuis Azure | SQL Server activé par Azure Arc |

Azure SQL Database propose deux modèles d'achat :

| | Modèle DTU | Modèle vCore |
| --- | --- | --- |
| Dimensionnement | Calcul, mémoire et E/S regroupés : Basic (5 DTU, 2 Go), Standard (jusqu'à 3 000 DTU, 1 To), Premium (jusqu'à 4 000 DTU, 4 To) | vCores et matériel choisis, stockage dimensionné à part |
| Niveaux | Basic, Standard, Premium | General Purpose (Usage général), Business Critical (Critique pour l'entreprise), Hyperscale |
| Serverless, Hyperscale, Azure Hybrid Benefit | Non | Oui |

Niveaux de service vCore d'Azure SQL Database :

| | General Purpose | Business Critical | Hyperscale |
| --- | --- | --- | --- |
| Stockage | Stockage premium distant, 1 Go à 4 To | SSD local, 1 Go à 4 To | Stockage distribué avec cache SSD local, 10 Go à 128 To |
| Latence | 5 à 10 ms | 1 à 2 ms | 1 à 2 ms pour les données souvent lues |
| Réplicas | Un, pas de scale-out en lecture | Trois réplicas secondaires, un réplica lisible gratuit | 0 à 4 réplicas de haute disponibilité, réplicas nommés |
| OLTP en mémoire | Non | Oui | Non |
| Calcul serverless | Oui | Non | Oui |

> **Piège d'examen.** L'OLTP en mémoire exige Business Critical (ou Premium en DTU). Hyperscale répond aux besoins de taille et de mise à l'échelle rapide, pas aux tables en mémoire.

Le **serverless** (General Purpose et Hyperscale, matériel série Standard) se met à l'échelle entre un minimum et un maximum de vCores, est facturé à la seconde et peut se **mettre en pause automatiquement** : en General Purpose, le délai va de 15 minutes à 7 jours (60 minutes par défaut, `-1` désactive la pause), et seul le stockage est facturé pendant la pause. Il convient à un usage intermittent et imprévisible ; une charge qui ne peut pas attendre une reprise exige le calcul provisionné ou la pause automatique désactivée.

Un **pool élastique** partage des eDTU ou des vCores entre les bases d'un **même serveur logique**. Il fait économiser quand de nombreuses bases ont une moyenne faible et des pics à des moments différents ; des bases à l'activité soutenue, moyenne à élevée, n'ont pas leur place dans un pool. Déplacer une base dans un pool ou hors d'un pool ne coupe les connexions que quelques secondes.

<!-- section: deploy-methods | objectives: 1.1.2, 1.1.7 -->
## Déployer avec l'automatisation

| Méthode | Choisissez-la quand |
| --- | --- |
| Portail Azure | Déploiement ponctuel, apprentissage, vérification des options |
| Bicep ou modèle ARM | Déploiement déclaratif, reproductible et idempotent, gardé dans le contrôle de code source et exécuté par un pipeline |
| Azure CLI (`az sql ...`) | Scripts Bash ou Cloud Shell, étapes impératives |
| Azure PowerShell (`New-AzSqlServer`, `New-AzSqlDatabase`, `New-AzSqlInstance`) | Scripts PowerShell |

Un serveur logique et une base en Bicep :

```bicep
param location string = resourceGroup().location
param adminLogin string
@secure()
param adminPassword string

resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: 'sql-contoso-prod'
  location: location
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: 'SalesDb'
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    autoPauseDelay: 60
  }
}
```

```bash
az deployment group create --resource-group RG1 \
  --template-file main.bicep --parameters adminLogin=sqladmin
```

La même chose avec Azure CLI :

```bash
az sql server create --name sql-contoso-prod --resource-group RG1 \
  --location westeurope --admin-user sqladmin --admin-password "<password>"

# Serverless General Purpose, 2 vCores max, pause after 120 minutes
az sql db create -g RG1 -s sql-contoso-prod -n SalesDb \
  -e GeneralPurpose -f Gen5 -c 2 --compute-model Serverless --auto-pause-delay 120

# Hyperscale with 2 high availability replicas
az sql db create -g RG1 -s sql-contoso-prod -n BigDb \
  -e Hyperscale -f Gen5 -c 4 --ha-replicas 2

# Backup storage redundancy: Local, Zone, Geo or GeoZone
az sql db create -g RG1 -s sql-contoso-prod -n LocalDb \
  --service-objective S0 --backup-storage-redundancy Local
```

Un objectif de service encode le niveau, le matériel et la taille : `S0`, `P1`, `GP_Gen5_2`, `GP_S_Gen5_8` (serverless), `BC_Gen5_2`, `HS_Gen5_32`.

Une **instance managée** exige un sous-réseau dédié dans un réseau virtuel. `--storage` se définit par incréments de 32 Go, `--license-type BasePrice` applique Azure Hybrid Benefit (`LicenseIncluded` paie la licence), et `--gpv2 true` avec `--iops` et `--memory` déploie Next-gen General Purpose :

```bash
az sql mi create -g RG1 -n mi-contoso -l westeurope \
  -u miadmin -p "<password>" \
  --subnet "<subnet resource ID>" \
  -e GeneralPurpose -f Gen5 -c 8 --storage 256GB \
  --license-type BasePrice
```

**SQL Server sur une machine virtuelle Azure** se déploie en général depuis une image de la Place de marché Azure qui contient déjà SQL Server ; une telle machine virtuelle est inscrite automatiquement auprès de l'**extension SQL IaaS Agent** (un SQL Server 2016 ou ultérieur installé par vous est en général inscrit à sa détection, sinon inscrivez-le vous-même). L'inscription de base donne la gestion dans le portail et permet de passer du paiement à l'utilisation à Azure Hybrid Benefit, ou de mettre à jour les métadonnées d'édition sans redéployer. Les fonctionnalités comme la sauvegarde automatisée, la mise à jour corrective automatisée, l'intégration Azure Key Vault, la configuration de `tempdb`, l'authentification Microsoft Entra et l'évaluation des bonnes pratiques installent l'agent quand vous les activez. Une instance de cluster de basculement ne prend pas en charge les fonctionnalités de l'agent.

> **Piège d'examen.** Créer une instance managée dans un sous-réseau vide crée d'abord son cluster virtuel : cela prend bien plus longtemps que créer une base. Une question qui demande la cible disponible le plus vite, sans préparation réseau, désigne Azure SQL Database.

<!-- section: arc-fabric | objectives: 1.1.3, 1.1.4 -->
## Azure Arc et base de données SQL dans Fabric

**SQL Server activé par Azure Arc** apporte la gestion Azure à SQL Server 2014 et ultérieur exécuté hors d'Azure : dans votre centre de données, sur des sites en périphérie ou dans un autre cloud. Il ne concerne pas SQL Server sur les machines virtuelles Azure (celles-ci utilisent l'extension SQL IaaS Agent).

| Cas d'usage | Remarques |
| --- | --- |
| Un inventaire unique des instances et des bases | Portail Azure, Azure Resource Graph |
| Licences SQL Server en paiement à l'utilisation facturées par Azure | Au lieu d'acheter des licences |
| Mises à jour de sécurité étendues pour les versions hors support | Abonnement facturé par Azure |
| Microsoft Defender pour le cloud, évaluation des bonnes pratiques | Exigent Azure Monitor Agent |
| Authentification Microsoft Entra | SQL Server 2022 ou ultérieur |
| Évaluation de migration et migration de bases | Préparation, recommandation de SKU, migration vers Managed Instance |
| Sauvegardes automatisées, restauration à un point dans le temps, mises à jour automatiques | Indisponibles avec le type de licence « licence uniquement » |

Le type de licence détermine les fonctionnalités : « licence uniquement » donne l'inventaire, l'authentification Entra, Defender, Purview et la migration ; la Software Assurance, un abonnement SQL Server ou le paiement à l'utilisation ajoutent l'évaluation des bonnes pratiques, les mises à jour automatiques, les sauvegardes automatisées et les mises à jour de sécurité étendues.

La **base de données SQL dans Microsoft Fabric** est une base transactionnelle bâtie sur le moteur d'Azure SQL Database et créée dans un espace de travail Fabric. Ses données sont répliquées automatiquement, quasiment en temps réel, dans OneLake dans un format prêt pour l'analytique, avec un point de terminaison d'analytique SQL : Spark, les notebooks et Power BI les utilisent sans pipeline ETL. Cas d'usage : base opérationnelle d'une solution analytique Fabric, ETL inversé, magasin de données opérationnel, applications translytiques et d'IA.

| Exigence | Base de données SQL dans Fabric ? |
| --- | --- |
| Données opérationnelles disponibles pour l'analytique Fabric sans pipeline | Oui |
| Authentification Microsoft Entra uniquement | Oui (pas de connexions, seulement des utilisateurs pour des principaux Entra) |
| Authentification SQL, pools élastiques, groupes de basculement, Always Encrypted, registre (ledger), rétention à long terme | Non : Azure SQL Database |
| Plus de 32 vCores ou plus de 4 To | Non : Azure SQL Database |

<!-- section: plan-partitioning | objectives: 1.1.5 -->
## Planifier le partitionnement de tables

Le partitionnement découpe horizontalement une table ou un index dans **une seule base**, par plages d'une colonne de partitionnement. Il se planifie en trois objets : une **fonction de partition** (valeurs limites), un **schéma de partition** (partitions associées à des groupes de fichiers) et la table ou l'index créé sur le schéma.

| Objectif | Le partitionnement aide-t-il ? |
| --- | --- |
| Charger ou archiver un mois de données instantanément (fenêtre glissante) | Oui : `SWITCH` d'une partition vers l'intérieur ou l'extérieur, opération de métadonnées |
| Reconstruire, compresser ou tronquer seulement les données récentes | Oui : maintenance par partition |
| Recherches OLTP plus rapides sur une seule ligne | Rarement : les requêtes qui ne peuvent pas éliminer de partitions peuvent ralentir |
| Répartir les données sur plusieurs bases ou serveurs | Non : c'est le sharding |

Règles de planification :

- Choisissez une colonne présente dans la plupart des filtres et dans le schéma de chargement, en général une date. `text`, `ntext`, `image`, `xml`, `varchar(max)`, `nvarchar(max)`, `varbinary(max)`, `timestamp`, les types alias et les types CLR ne peuvent pas être des colonnes de partitionnement ; une colonne calculée doit être `PERSISTED`.
- `RANGE RIGHT` place chaque valeur limite dans la partition à sa droite : le choix naturel pour les dates (`'2026-02-01'` commence la partition de février). `RANGE LEFT` est la valeur par défaut quand aucun des deux n'est écrit.
- n valeurs limites créent n + 1 partitions ; une table ou un index accepte jusqu'à 15 000 partitions, mais les conceptions à plusieurs centaines ou milliers de partitions sont déconseillées.
- Gardez les index **alignés** (créés sur le même schéma) pour pouvoir basculer les partitions.
- Dans Azure SQL Database et la base de données SQL dans Fabric, seul le groupe de fichiers `PRIMARY` existe : toutes les partitions vont sur `PRIMARY`. Plusieurs groupes de fichiers (stockage hiérarchisé, sauvegarde fragmentaire) sont possibles sur Managed Instance et les machines virtuelles.

<!-- section: sharding | objectives: 1.1.6 -->
## Recommander une solution de sharding

Le **sharding** (scale-out horizontal) répartit des lignes de même schéma sur plusieurs bases, chacune contenant une plage ou une liste de valeurs de la clé de sharding (en général un ID de locataire). Le scale-up (mise à l'échelle verticale) change au contraire la taille de calcul d'une seule base.

| Exigence | Recommandation |
| --- | --- |
| Base plus grande que ce qu'une base unique permet, ou débit supérieur à la plus grande taille de calcul | Sharding sur plusieurs bases, ou d'abord envisager Hyperscale (128 To) |
| Un locataire par base pour l'isolation, la restauration et la mise à l'échelle par locataire | Shards à locataire unique, souvent dans un pool élastique pour partager le coût |
| Nombreux petits locataires par base | Shards multilocataires avec une colonne de clé de locataire, sécurité au niveau des lignes pour filtrer les lignes |
| Router chaque requête vers la bonne base | Bibliothèque cliente Elastic Database (gestionnaire de cartes de shards, routage dépendant des données) |
| Déplacer des locataires entre shards, fractionner ou fusionner des shards | Outil de fractionnement-fusion (split-merge) |
| Exécuter un changement de schéma sur chaque shard | Travaux élastiques |
| Interroger tous les shards pour le reporting | Requête élastique (préversion) |

Le sharding fonctionne le mieux quand chaque transaction reste dans une seule valeur de clé de sharding, donc dans une seule base.

> **Piège d'examen.** Restaurer un seul locataire depuis une base multilocataire n'est pas possible par une restauration de base ; l'isolation et la restauration à un point dans le temps par locataire exigent un locataire par base.

<!-- section: hybrid | objectives: 1.1.8 -->
## Déployer des solutions SQL Server hybrides

Pour connecter à Azure Arc une instance SQL Server hors d'Azure :

1. Intégrez le serveur avec l'**agent Azure Connected Machine** (il devient un serveur activé par Azure Arc).
2. L'**extension Azure pour SQL Server** est installée et découvre les instances ; chaque instance devient une ressource SQL Server - Azure Arc. Attribuez la même région au serveur et à ses instances SQL Server.
3. Choisissez le type de licence, puis activez les fonctionnalités nécessaires (authentification Microsoft Entra, Defender pour le cloud, évaluation des bonnes pratiques, mises à jour automatiques, sauvegardes).

L'agent et l'extension n'utilisent que du **HTTPS sortant sur le port TCP 443**. Windows Server 2016 ou ultérieur et certaines distributions Linux sont pris en charge ; SQL Server dans des conteneurs ne l'est pas.

Autres briques hybrides :

| Besoin | Solution |
| --- | --- |
| Réplica quasi temps réel d'une base locale dans Azure, lisible, pour la reprise d'activité ou le reporting | Lien Managed Instance (groupe de disponibilité distribué), SQL Server 2016 ou ultérieur |
| Basculer vers Azure et revenir en arrière | Lien Managed Instance avec SQL Server 2022 ou ultérieur |
| Réplica de reprise d'activité sans frais de licence SQL Server | Avantage de basculement hybride sur une instance managée passive, réservée à la reprise d'activité |
| Groupe de disponibilité Always On réparti entre le site local et des machines virtuelles Azure | Groupe de disponibilité avec des réplicas sur des machines virtuelles Azure, connectivité réseau par VPN ou ExpressRoute |

<!-- section: patching | objectives: 1.1.9 -->
## Appliquer les correctifs aux déploiements hybrides et IaaS

Azure SQL Database et Managed Instance reçoivent leurs correctifs de Microsoft (une fenêtre de maintenance peut être choisie). Les machines virtuelles et les serveurs activés par Arc sont à votre charge :

| Outil | Étendue | Ce qu'il installe |
| --- | --- | --- |
| Mise à jour corrective automatisée (extension SQL IaaS Agent) | SQL Server sur les machines virtuelles Azure | Mises à jour Windows et SQL Server marquées Important ou Critical, dans une fenêtre de maintenance (jour, heure de début, 30 à 180 minutes). Mise hors service prévue le 17 septembre 2027 |
| Azure Update Manager | Machines virtuelles Azure et serveurs activés par Arc, à grande échelle | Installe aussi les mises à jour cumulatives de SQL Server ; l'outil recommandé |
| Mises à jour automatiques de SQL Server activé par Azure Arc | SQL Server activé par Arc | Désactivées par défaut ; exigent la Software Assurance, un abonnement SQL Server ou le paiement à l'utilisation |
| Mises à jour de sécurité étendues via Azure Arc | Versions de SQL Server hors support | Mises à jour de sécurité pendant trois ans au plus |

```powershell
Update-AzSqlVM -ResourceGroupName RG1 -Name SQLVM1 `
  -AutoPatchingSettingDayOfWeek Thursday `
  -AutoPatchingSettingMaintenanceWindowStartingHour 11 `
  -AutoPatchingSettingMaintenanceWindowDuration 120 `
  -AutoPatchingSettingEnable
```

> **Piège d'examen.** La mise à jour corrective automatisée n'installe pas les mises à jour cumulatives non marquées Important ou Critical. Pour installer automatiquement les mises à jour cumulatives, utilisez Azure Update Manager, et un seul service de correctifs par machine virtuelle : des outils qui se chevauchent font échouer les mises à jour.

Pour un groupe de disponibilité ou une instance de cluster de basculement sur des machines virtuelles, appliquez d'abord les correctifs aux réplicas secondaires, basculez, puis mettez à jour l'ancien principal, afin que la base reste disponible.

<!-- section: key-points -->
## Points clés

- SQL Database = effort minimal et jusqu'à 128 To (Hyperscale) ; Managed Instance = fonctionnalités d'instance et migration la plus simple ; machine virtuelle = accès au système et parité complète.
- Seul Business Critical (avec Premium en DTU) offre l'OLTP en mémoire ; le serverless n'existe qu'en General Purpose et Hyperscale.
- Les pools élastiques partagent des ressources entre bases d'un même serveur aux pics qui ne se chevauchent pas.
- Bicep pour des déploiements déclaratifs reproductibles ; `az sql db create`, `az sql mi create` ; une instance managée exige un sous-réseau dédié.
- Azure Arc gère SQL Server hors d'Azure ; les fonctionnalités dépendent du type de licence.
- Le partitionnement reste dans une base (seulement `PRIMARY` dans SQL Database) ; le sharding répartit les données sur plusieurs bases avec les outils de base de données élastique.
- Appliquez les correctifs aux machines virtuelles avec Azure Update Manager ; la mise à jour corrective automatisée n'installe que les mises à jour Important ou Critical et sera mise hors service en 2027.
