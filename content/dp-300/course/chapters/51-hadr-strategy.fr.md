Une conception de haute disponibilité et de récupération d'urgence (HA/DR) part de deux chiffres fournis par le métier : l'objectif de point de récupération (RPO, la quantité de données que vous pouvez perdre) et l'objectif de temps de récupération (RTO, la durée d'interruption admise). Les questions d'examen donnent ces chiffres avec une contrainte de coût ou d'effort, et attendent la fonctionnalité la moins chère de la bonne offre qui respecte les deux.

<!-- section: rpo-rto | objectives: 5.1.1 -->
## Choisir selon le RPO et le RTO

Commencez par distinguer la panne contre laquelle vous vous protégez :

| Panne | Protection | Ce qui ne protège pas |
| --- | --- | --- |
| Défaillance d'un nœud, d'un disque ou d'un processus | HA intégrée (PaaS), groupe de disponibilité ou instance de cluster de basculement (machines virtuelles) | Les sauvegardes seules (RTO trop long) |
| Panne d'une zone de disponibilité | Redondance interzone (PaaS), réplicas ou machines virtuelles répartis entre les zones | Un groupe à haute disponibilité (protège au sein d'un seul centre de données) |
| Panne d'une région | Groupe de basculement, géoréplication active, géorestauration, groupe de disponibilité interrégion ou copie des journaux de transaction | La redondance interzone |
| `DELETE` accidentel, déploiement défectueux, corruption | Restauration à un point dans le temps, rétention à long terme, sauvegardes de journaux | Tout réplica : la réplication copie l'erreur en quelques secondes |

Objectifs publiés par Microsoft pour Azure SQL Database :

| Option | RTO | RPO |
| --- | --- | --- |
| Haute disponibilité avec redondance interzone | Généralement moins de 30 secondes | 0 |
| Groupe de basculement (stratégie gérée par le client) ou géoréplication active | Généralement moins de 60 secondes | 0 ou plus : les modifications non encore répliquées sont perdues lors d'un basculement forcé |
| Géorestauration à partir de sauvegardes géoredondantes | Minutes à heures | Minutes à heures (dernière sauvegarde géorépliquée) |

Table de décision :

| Exigence | Réponse |
| --- | --- |
| Survivre à la panne d'une zone sans perte de données, avec un effort minimal, Azure SQL Database ou SQL Managed Instance | Activer la redondance interzone |
| Récupération d'urgence régionale, RTO inférieur à une minute, les applications doivent garder la même chaîne de connexion | Groupe de basculement |
| Récupération d'urgence régionale pour une base, plusieurs secondaires lisibles ou un secondaire dans la même région | Géoréplication active (SQL Database uniquement) |
| Récupération d'urgence régionale au moindre coût, RPO et RTO de plusieurs heures acceptables | Géorestauration (nécessite un stockage de sauvegarde géoredondant) |
| SQL Server sur des machines virtuelles Azure, basculement automatique, aucune perte de données au sein d'une région | Groupe de disponibilité, validation synchrone, machines virtuelles dans des zones de disponibilité différentes |
| SQL Server sur des machines virtuelles Azure, protection au niveau de l'instance (travaux, connexions, toutes les bases) avec un stockage partagé | Instance de cluster de basculement |
| SQL Server sur des machines virtuelles Azure, récupération d'urgence dans une autre région, RPO de quelques minutes, coût et complexité minimaux | Copie des journaux de transaction ou réplica asynchrone de groupe de disponibilité |
| Récupérer les données telles qu'elles étaient il y a 3 jours | Restauration à un point dans le temps |

> **Piège d'examen.** La validation synchrone garantit l'absence de perte de données mais ajoute de la latence à chaque validation ; entre régions, utilisez la validation **asynchrone** et acceptez un RPO supérieur à zéro. Le basculement automatique exige la validation synchrone.

> **Conseil d'examen.** Un géosecondaire utilisé uniquement pour la récupération d'urgence, sans charge de lecture, peut être désigné comme réplica de **secours** (standby) sans licence dans SQL Database (bases uniques vCore provisionnées General Purpose ou Business Critical uniquement), et un réplica réservé à la récupération d'urgence dans un groupe de basculement SQL Managed Instance obtient gratuitement des vCores équivalents à ceux du primaire (paramètre **Failover rights**, sur l'instance secondaire). « Réduire les coûts » plus « le secondaire n'est pas utilisé » désigne cette option.

<!-- section: hybrid-hadr | objectives: 5.1.2 -->
## HA/DR pour les déploiements hybrides

Hybride signifie un primaire en local (ou dans un autre cloud) et un secondaire dans Azure, ou l'inverse. La connectivité vient d'abord : VPN site à site ou ExpressRoute.

| Exigence | Solution |
| --- | --- |
| Récupération d'urgence dans un service PaaS pour un SQL Server 2016 ou ultérieur local, réplication en temps quasi réel | Lien Managed Instance (Managed Instance link) vers SQL Managed Instance |
| Basculer vers Azure puis effectuer la **restauration automatique** (failback) en local | Lien Managed Instance avec SQL Server 2022 ou 2025 (bidirectionnel) et une stratégie de mise à jour SQL Server 2022 ou 2025 correspondante sur l'instance |
| Réplica de récupération d'urgence sur SQL Server sur une machine virtuelle Azure, lisible, amorçage automatique | Groupe de disponibilité avec un réplica asynchrone dans Azure, ou groupe de disponibilité distribué entre un cluster local et un cluster Azure |
| Secours tiède simple et peu coûteux, RPO de quelques minutes, basculement manuel | Copie des journaux de transaction vers SQL Server sur une machine virtuelle Azure |
| Secours froid, coût minimal, RTO de plusieurs heures | Sauvegarde vers une URL dans un stockage géoredondant, restauration à la demande |

Faits sur le lien Managed Instance qui décident des réponses :

- Il utilise des groupes de disponibilité distribués ; il prend en charge les éditions Enterprise, Developer et Standard.
- SQL Server 2016 SP3, 2017 CU31 (tous deux avec l'Azure Connect pack) et 2019 CU20 répliquent dans un seul sens (de SQL Server vers SQL Managed Instance) ; la restauration automatique (failback) n'est pas prise en charge.
- Seules les bases utilisateur sont répliquées : les connexions, les travaux SQL Server Agent et les autres objets de niveau serveur doivent être recréés sur l'instance.
- L'authentification entre les deux côtés repose sur des certificats ; le lien utilise le point de terminaison local du réseau virtuel (VNet-local) de l'instance, pas un point de terminaison public ou privé.
- Une instance qui utilise le lien ne peut pas faire partie d'un groupe de basculement.
- TDE : exportez la clé de chiffrement de base de données de SQL Server vers Azure Key Vault et configurez le TDE BYOK sur l'instance avant de créer le lien. Une base d'instance managée chiffrée avec une clé TDE managée par le service ne peut pas être liée à SQL Server.
- Plusieurs bases dans un même lien (mode de lien multibase de données) exigent SQL Server 2022 CU28 ou SQL Server 2025 CU11, édition Enterprise ou Developer, avec le mode activé sur chaque réplica SQL Server.
- Si le réplica de l'instance managée est réservé à la récupération d'urgence, vous ne payez pas de licence SQL Server pour ses vCores (avantage de basculement hybride, **Hybrid failover rights**).

> **Piège d'examen.** Un groupe de disponibilité qui s'étend entre le local et Azure sous la forme d'un seul cluster Windows exige d'étendre le domaine et le cluster dans Azure. Un groupe de disponibilité **distribué** relie deux groupes de disponibilité distincts sur deux clusters : c'est la conception habituelle entre centres de données ou entre régions.

<!-- section: azure-hadr | objectives: 5.1.3 -->
## Solutions HA/DR spécifiques à Azure

**HA intégrée des offres PaaS.** Rien à configurer, mais l'architecture explique les réponses d'examen :

| Niveau de service | Modèle de disponibilité | Conséquence |
| --- | --- | --- |
| Basic, Standard, General Purpose | Stockage distant : calcul sans état, fichiers de données et de journal sur un stockage Azure distant | En cas de panne, un nouveau nœud de calcul rattache le stockage ; le basculement est plus long, il n'y a pas de réplica lisible |
| Premium, Business Critical | Stockage local : un primaire plus jusqu'à trois réplicas secondaires sur SSD local, comme un groupe de disponibilité | Basculement rapide ; un secondaire sert les connexions en lecture seule grâce au scale-out en lecture, sans frais supplémentaires |
| Hyperscale | Distribué : réplicas de calcul, serveurs de pages, service de journal, stockage | Les réplicas haute disponibilité facultatifs sont les cibles de basculement ; la redondance interzone exige au moins un réplica et un stockage de sauvegarde redondant interzone ou géoredondant interzone, et ne se définit qu'à la création (pour la modifier ensuite, utilisez une copie de base de données, une restauration à un point dans le temps ou un géoréplica) |

La redondance interzone est disponible pour General Purpose, Business Critical, Hyperscale et Premium, pas pour Basic ni Standard. Au sein d'une région, la disponibilité localement redondante comme la disponibilité redondante interzone ont un RPO de zéro.

**Fonctionnalités de géo-récupération comparées :**

| Fonctionnalité | Géoréplication active | Groupe de basculement |
| --- | --- | --- |
| Offre | SQL Database | SQL Database et SQL Managed Instance |
| Unité de basculement | Une base de données | Un groupe de bases (SQL Database) ou toutes les bases utilisateur de l'instance (SQL Managed Instance) |
| Secondaires lisibles | Jusqu'à quatre, dans n'importe quelle région, y compris celle du primaire | Un serveur ou une instance secondaire, dans une autre région (SQL Database : jusqu'à quatre serveurs secondaires en préversion) |
| Chaîne de connexion après basculement | Change pour le nouveau serveur | Inchangée : écouteurs en lecture-écriture et en lecture seule |
| Option de basculement géré par Microsoft (automatique) | Non | Oui, mais la stratégie gérée par le client est recommandée |

**SQL Server sur des machines virtuelles Azure** utilise les fonctionnalités de SQL Server (groupes de disponibilité, instances de cluster de basculement, copie des journaux de transaction, sauvegardes) sur l'infrastructure Azure. Placez les machines virtuelles soit dans des **zones de disponibilité** (protection contre la perte d'un centre de données, latence un peu plus élevée entre réplicas), soit dans un **groupe à haute disponibilité** (protection contre les pannes de rack et la maintenance planifiée) ; une machine virtuelle ne peut pas être dans les deux. Azure Site Recovery peut répliquer toute la machine virtuelle vers une autre région quand la base n'est pas le seul composant à récupérer.

> **Piège d'examen.** Le scale-out en lecture de Business Critical utilise le réplica HA intégré de la **même** région. Ce n'est pas une solution de récupération d'urgence : une panne régionale l'arrête avec le primaire.

<!-- section: testing | objectives: 5.1.4 -->
## Planifier les tests HA/DR

Un plan de récupération d'urgence jamais testé a un RTO inconnu. Une procédure de test comporte ces étapes :

1. Rédigez le runbook : qui décide, quelle commande déclenche le basculement, le RPO et le RTO attendus, les étapes de restauration automatique (failback).
2. Préparez le secondaire : même taille de calcul et même niveau de service, règles de pare-feu, accès réseau, connexions avec les mêmes SID ou utilisateurs contenus, travaux SQL Server Agent, configuration Microsoft Entra.
3. Exécutez le basculement dans une fenêtre de maintenance, puis mesurez le temps jusqu'au retour à la normale de l'application et les données perdues.
4. Validez l'application : chaînes de connexion ou écouteurs, logique de nouvelle tentative pour les erreurs temporaires, routage en lecture seule.
5. Revenez au site d'origine et consignez les enseignements ; recommencez régulièrement et après chaque changement important.

| Solution | Tester sans perte de données |
| --- | --- |
| HA intégrée de SQL Database ou d'un pool élastique | Basculement initié par l'utilisateur : `Invoke-AzSqlDatabaseFailover` ou `Invoke-AzSqlElasticPoolFailover` (une fois toutes les 15 minutes par base ou par pool), ou Maintenance > Redémarrer dans le portail |
| HA intégrée de SQL Managed Instance | `Invoke-AzSqlInstanceFailover` |
| Groupe de basculement ou géoréplication | Basculement planifié (synchronisation complète, sans perte de données), puis restauration automatique |
| Groupe de disponibilité | Basculement manuel planifié vers un secondaire synchrone ; pour un réplica asynchrone de récupération d'urgence, passez-le d'abord en validation synchrone et attendez l'état SYNCHRONIZED |
| Azure Site Recovery | Test de basculement dans un réseau virtuel isolé : la réplication continue |
| Sauvegardes | Restaurez régulièrement sur un serveur de test, puis exécutez `DBCC CHECKDB` |

```powershell
# Test application resilience to a local failover of a database
Invoke-AzSqlDatabaseFailover -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb"
```

> **Piège d'examen.** Un basculement **forcé** (`FORCE_FAILOVER_ALLOW_DATA_LOSS`, `-AllowDataLoss`) est réservé aux vrais sinistres, quand le primaire est inaccessible. Un exercice de récupération d'urgence utilise le basculement planifié.

<!-- section: key-points -->
## Points clés

- Associez chaque panne à une protection : réplicas pour le matériel, les zones et les régions ; sauvegardes pour l'erreur humaine et la corruption.
- Redondance interzone : RTO inférieur à 30 secondes, RPO 0. Groupes de basculement et géoréplication : RTO inférieur à 60 secondes, RPO proche de 0. Géorestauration : plusieurs heures.
- Les groupes de basculement conservent les chaînes de connexion et basculent plusieurs bases ensemble ; la géoréplication active donne jusqu'à quatre secondaires pour une base SQL Database.
- Récupération d'urgence hybride vers le PaaS = lien Managed Instance ; la restauration automatique exige SQL Server 2022 ou 2025 et une stratégie de mise à jour correspondante.
- Validation synchrone pour zéro perte de données et basculement automatique à proximité ; asynchrone entre régions.
- Testez avec des basculements planifiés, mesurez le RPO et le RTO, puis revenez ; gardez le basculement forcé pour les vraies pannes.
