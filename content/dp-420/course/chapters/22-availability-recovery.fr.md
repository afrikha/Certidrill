Les questions de disponibilité et de récupération donnent une exigence de récupération (restaurer à la seconde près, restauration en libre-service, un conteneur supprimé, une panne régionale, une panne partielle d'une partition) et demandent le mode de sauvegarde, la méthode de restauration, la configuration des régions ou l'option de basculement qui y répond au coût le plus bas ou avec le moins de perte de données.

<!-- section: backup-modes | objectives: 2.2.1 -->
## Sauvegarde périodique et sauvegarde continue

Les sauvegardes ne consomment jamais de RU provisionnées et n'affectent pas les performances. Chaque compte utilise l'un des deux modes :

| | Périodique | Continue |
| --- | --- | --- |
| Fonctionnement | Sauvegarde complète à intervalle fixe | Chaque modification sauvegardée en 100 secondes environ |
| Point de restauration | L'un des instantanés conservés | **N'importe quelle seconde** dans la fenêtre de rétention |
| Qui restaure | **Le support Azure** (demande de support) | Vous : portail, CLI, PowerShell, modèle ARM |
| Cible de la restauration | Toujours un nouveau compte | Un nouveau compte, ou des bases de données et conteneurs supprimés dans le **même compte** |
| Rétention | Configurable (voir ci-dessous) | Niveau `Continuous7Days`, `Continuous30Days` ou `Continuous35Days` |
| Stockage des sauvegardes | Géoredondant par défaut si la région le permet ; redondant interzone ou localement redondant sur demande | Localement redondant dans chaque région du compte, redondant interzone là où la région a des zones de disponibilité ; non modifiable |
| Coût | Deux copies gratuites, copies supplémentaires facturées | Niveau de 7 jours : pas de frais de stockage des sauvegardes. Niveaux de 30 et 35 jours : stockage des sauvegardes facturé par Go et par région. Chaque restauration facturée par Go |

**Paramètres du mode périodique** (volet **Sauvegarde et restauration** du portail, CLI, PowerShell, ARM) :

- Par défaut : une sauvegarde complète toutes les **4 heures**, les **deux dernières** conservées (8 heures de couverture), gratuitement.
- Intervalle : 1 à 24 heures. Rétention : au moins **deux fois l'intervalle**, au plus 720 heures.
- Les sauvegardes sont prises dans la région d'écriture, puis géorépliquées vers la région jumelée avec un stockage géoredondant. Changer la redondance s'applique aux sauvegardes futures et supprime immédiatement l'accès aux anciennes.
- Après la suppression d'un conteneur ou d'une base de données, ses instantanés existants sont conservés 30 jours.
- Après une suppression ou une corruption accidentelle, **augmentez d'abord la rétention à au moins sept jours**, idéalement dans les 8 heures, puis ouvrez la demande de support.

```bash
# Periodic: back up every 8 hours, keep 24 hours
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --backup-interval 480 --backup-retention 24

# Create an account with continuous backup, 7-day tier
az cosmosdb create --resource-group rg-contoso --name cosmos-contoso-pitr \
  --backup-policy-type Continuous --continuous-tier Continuous7Days \
  --locations regionName="West Europe"

# Migrate an existing periodic account (one way); default tier is 30 days
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --backup-policy-type Continuous --continuous-tier Continuous7Days
```

En ARM ou Bicep, la propriété `backupPolicy` du compte vaut `{ "type": "Periodic", "periodicModeProperties": { "backupIntervalInMinutes", "backupRetentionIntervalInHours", "backupStorageRedundancy" } }` ou `{ "type": "Continuous", "continuousModeProperties": { "tier": "Continuous7Days" } }`.

La migration du mode périodique vers le mode continu est **à sens unique** : impossible de revenir en arrière. Vous pouvez passer librement d'un niveau continu à l'autre ; passer à un niveau plus court fait perdre immédiatement les points de restauration plus anciens, et passer à un niveau plus long ne se remplit qu'au fur et à mesure des nouvelles sauvegardes. La sauvegarde continue est prise en charge pour les API NoSQL, MongoDB, Gremlin et Table, pas pour Cassandra.

La sauvegarde continue est aussi le prérequis du mode **Toutes les versions et suppressions** du flux de modification.

> **Piège d'examen.** « Restaurer un conteneur dans son état d'il y a 37 minutes, sans ouvrir de ticket de support » désigne la sauvegarde continue. La sauvegarde périodique ne peut revenir qu'à l'un de ses instantanés, par le support Azure. « Coût le plus bas » avec une fenêtre d'une semaine désigne le niveau de 7 jours, qui n'a pas de frais de stockage des sauvegardes.

<!-- section: restore | objectives: 2.2.1 -->
## Restaurer des données

| Scénario | Méthode |
| --- | --- |
| Données corrompues ou écrasées dans un conteneur actif | Restauration à un instant dans le passé de ce conteneur vers un **nouveau compte**, puis recopie de ce qui est nécessaire |
| Un conteneur ou une base de données a été supprimé | **Restauration dans le même compte** de la ressource supprimée (mode continu) |
| Le compte entier a été supprimé | Restaurer le compte supprimé depuis la liste **Restaurer** vers un nouveau compte |
| Copie des données dans une région précise | Restauration à un instant dans le passé avec cette région comme cible (une région où le compte existait) |
| Vous ne savez pas quand la suppression a eu lieu | Le **flux d'événements** des bases de données et conteneurs restaurables donne les horodatages de création, de modification et de suppression |

```bash
# Restore selected containers to a new account, at a UTC time
az cosmosdb restore --resource-group rg-contoso \
  --account-name cosmos-contoso \
  --target-database-account-name cosmos-contoso-restored \
  --restore-timestamp 2026-11-12T08:15:00+0000 \
  --location "West Europe" \
  --databases-to-restore name=sales collections=orders customers \
  --public-network-access Disabled --disable-ttl True

# Restore a deleted container into the same account
az cosmosdb sql container restore --resource-group rg-contoso \
  --account-name cosmos-contoso --database-name sales --name orders \
  --restore-timestamp 2026-11-12T08:15:00+0000 --disable-ttl True
```

Les règles que l'examen vérifie :

- L'horodatage de restauration est en UTC, précis à la seconde, dans la fenêtre de rétention et postérieur à la création de la ressource. Utilisez le **dernier horodatage restaurable** de la ressource dans la région pour restaurer un compte actif dans son état cohérent le plus récent.
- Sans `--disable-ttl True`, le conteneur restauré garde son TTL et les éléments expirés peuvent être supprimés juste après la restauration.
- Dans une base de données à débit partagé, vous restaurez toute la base, pas une partie de ses conteneurs. Pour restaurer un conteneur supprimé dont la base de données a aussi été supprimée, restaurez d'abord la base : la restauration d'une base de données supprimée restaure aussi ses conteneurs enfants.
- Une restauration dans le même compte ne réussit que si la ressource existait dans la **région d'écriture actuelle** du compte à l'heure de restauration. Elle ne peut pas s'exécuter pendant une opération au niveau du compte (ajout ou suppression de région, basculement), et elle échoue si une autre restauration de la même ressource est déjà en cours.
- **Non restaurés** : paramètres de pare-feu, de réseau virtuel, de point de terminaison privé et de RBAC du plan de données, attributions de rôles, autres régions du compte source, procédures stockées, déclencheurs et UDF (les restaurations périodiques perdent aussi les clés du compte, les vues matérialisées et les éléments expirés par TTL). Reconfigurez-les après la restauration. Une restauration peut ne pas rétablir le débit en vigueur au point de restauration.
- Un compte restauré est accessible depuis les réseaux publics, sauf si vous passez `--public-network-access Disabled`.
- Au plus trois opérations de restauration peuvent être actives en même temps sur un même compte.
- Dans un compte à écritures multirégions, seules les écritures **confirmées par la région hub** à l'heure de restauration sont restaurées, et les conteneurs dotés d'une stratégie de résolution de conflit personnalisée reviennent en « le dernier écrivain gagne ».

Autorisations : les pages de restauration du portail exigent `Microsoft.DocumentDB/locations/restorableDatabaseAccounts/*/read` ; le rôle intégré **CosmosRestoreOperator** effectue les restaurations en mode continu. En mode périodique, CosmosBackupOperator, Owner ou Contributor peuvent demander une restauration ou modifier la rétention.

> **Piège d'examen.** Une restauration dans le même compte ne ramène qu'une base de données ou un conteneur **supprimé**. Pour récupérer un conteneur actif dont les éléments ont été mis à jour par erreur, restaurez-le vers un nouveau compte et recopiez les éléments corrects.

<!-- section: multi-region | objectives: 2.2.2 -->
## Lectures et écritures multirégions

Ajouter des régions à un compte donne des réplicas en lecture, et éventuellement en écriture, dans chaque région. Les régions peuvent être ajoutées ou supprimées à tout moment (mais pas dans la même opération que d'autres modifications de propriétés) ; une nouvelle région devient disponible une fois toutes les données répliquées.

```bash
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --locations regionName="West Europe" failoverPriority=0 isZoneRedundant=True \
  --locations regionName="North Europe" failoverPriority=1 isZoneRedundant=True

az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --enable-multiple-write-locations true
```

C'est l'application qui choisit où vont ses requêtes. Indiquez la région où elle s'exécute : le SDK classe les autres régions par proximité et bascule automatiquement vers elles :

```text
// C# (.NET SDK v3)
CosmosClient client = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { ApplicationRegion = Regions.WestEurope });
// or an explicit ordered list
new CosmosClientOptions { ApplicationPreferredRegions = new List<string> { "West Europe", "North Europe" } };

# Python
client = CosmosClient(endpoint, credential,
                      multiple_write_locations=True,
                      preferred_locations=["West Europe", "North Europe"])
```

| | Une région d'écriture, plusieurs régions de lecture | Plusieurs régions d'écriture |
| --- | --- | --- |
| Écritures | Une région | Toutes les régions (latence d'écriture locale) |
| Cohérence forte | Prise en charge | **Non prise en charge** |
| Panne de la région d'écriture | Écritures indisponibles jusqu'au basculement (forcé, géré par le service ou au niveau des partitions) | Aucune interruption attendue si le SDK a `ApplicationRegion` ou des régions préférées |
| Conflits | Aucun | Conflits d'insertion, de remplacement et de suppression, résolus par une stratégie |
| Coût | Chaque région ajoutée ajoute le coût de débit et de stockage de cette région | Idem, avec des régions d'écriture |

Détails des **écritures multirégions** :

- La première région du compte est la **région hub** ; les écritures dans les régions satellites sont validées localement, puis confirmées dans la région hub. Les écritures confirmées reçoivent un horodatage `crts` (l'ordre utilisé par le flux de modification) ; les autres sont provisoires.
- Stratégies de résolution de conflit, par conteneur : **le dernier écrivain gagne** (Last Write Wins, par défaut, sur `_ts` ou sur une propriété numérique personnalisée, le chemin de résolution de conflit ; la valeur la plus élevée gagne, et une suppression l'emporte toujours sur une insertion ou un remplacement) ou **personnalisée** (une procédure stockée de fusion ; si elle est absente ou échoue, les conflits vont dans le **flux de conflits**, que l'application doit résoudre). La stratégie personnalisée est réservée à NoSQL et ne peut être définie qu'à la création du conteneur.
- Bonnes pratiques : garder le trafic de chaque application dans sa région locale, ne pas envoyer la même écriture à toutes les régions ni choisir les régions au hasard, éviter de dépendre du délai de réplication (écrire en A, lire en B), ne transmettre les jetons de session entre clients que pour les lectures, et éviter les mises à jour rapides et répétées du même élément.

**Options de basculement pour un compte à une seule région d'écriture :**

| Option | Comportement |
| --- | --- |
| Basculement forcé (**Offline region**) | Vous mettez la région en panne hors connexion ; la région de lecture de plus haute priorité de basculement devient la région d'écriture. Méthode recommandée pour rétablir vite les écritures pendant une panne. Les écritures non répliquées peuvent être perdues |
| Basculement géré par le service | Activez-le (`--enable-automatic-failover true`) et définissez les priorités ; Microsoft décide quand basculer, ce qui peut prendre une heure ou plus |
| Changer la région d'écriture | Déplacement planifié de la région d'écriture quand toutes les régions sont saines. Jamais pendant une panne |
| Basculement automatique par partition | Ne bascule que les partitions touchées (voir la section suivante) |

```bash
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --enable-automatic-failover true

# Changing the region with priority 0 triggers a manual failover
az cosmosdb failover-priority-change --resource-group rg-contoso --name cosmos-contoso \
  --failover-policies "West Europe=0" "North Europe=1"
```

La perte de données possible lors d'une panne régionale (RPO) dépend du niveau de cohérence : **0 avec Strong**, K versions ou T secondes avec Bounded staleness (au moins 100 000 écritures ou 300 secondes dans les comptes multirégions), **moins de 15 minutes** avec Session, Consistent prefix et Eventual. Avec Strong et seulement deux régions, ou Bounded staleness au-delà de sa fenêtre, la perte de la région de lecture arrête aussi les écritures jusqu'à ce qu'elle soit mise hors connexion.

> **Piège d'examen.** « Les écritures doivent continuer pendant une panne régionale sans action manuelle » désigne les écritures multirégions, qui excluent la cohérence Strong. « Aucune perte de données lors d'une panne régionale » désigne la cohérence Strong avec une seule région d'écriture (RPO de 0), dont la disponibilité en écriture repose alors sur le basculement.

<!-- section: partition-failover | objectives: 2.2.3 -->
## Basculement automatique par partition

Les données sont réparties sur de nombreuses partitions physiques, et un problème d'infrastructure peut n'en toucher que certaines. Le **basculement automatique par partition (PPAF)** permet à un compte à une seule région d'écriture de basculer **uniquement les partitions touchées** vers une autre région, automatiquement, pendant que les partitions saines continuent d'écrire dans la région principale.

Prérequis :

- Un compte à **une seule région d'écriture** avec au moins une autre région (de lecture).
- API NoSQL, dans une région Azure mondiale.
- Cohérence **Strong, Session, Consistent prefix ou Eventual**. Bounded staleness n'est pas encore pris en charge.
- **Toutes** les instances de l'application sur un SDK qui implémente PPAF : .NET v3 3.62.0 ou ultérieur, Java 4.79.0 ou ultérieur, Python 4.16.0 ou ultérieur, Node.js 4.7.0 ou ultérieur. Un SDK plus ancien peut subir des écritures en échec pendant un basculement de partition.

Activez-le dans le portail : **Paramètres** du compte > **Fonctionnalités** > **Per-partition automatic failover** > **Enable**. PPAF fait partie du niveau de service **Business Critical** et est facturé en conséquence.

| | Basculement automatique par partition | Basculement géré par le service | Basculement forcé |
| --- | --- | --- | --- |
| Portée | Partitions touchées | Compte entier | Compte entier |
| Déclenchement | Automatique, par partition | Automatique, décidé par Microsoft | Vous |
| Délai typique de rétablissement des écritures | Environ 3 minutes | Peut atteindre une heure ou plus | Dès la fin de l'opération |
| Action nécessaire | Aucune | Aucune | Détecter la panne et mettre la région hors connexion |

Test : une simulation de défaillance de partition (API REST, encapsulée par le script `EnableDisableChaosFault.ps1` avec `-FaultType "PerPartitionAutomaticFailover"`) injecte une panne dans 10 % des partitions d'un conteneur (minimum 1, maximum 10) ; elle met jusqu'à 15 minutes à démarrer ou à s'arrêter. Consultez **Total Requests** par région et la métrique **PartitionWriteGlobalStatus**, qui compte les partitions d'écriture par région, pour voir les écritures passer dans la région secondaire. PPAF peut aussi intervenir lors d'une panne de la région de lecture, quand un compte Strong à deux régions perdrait sinon son quorum.

> **Piège d'examen.** PPAF exige une seule région d'écriture : ce n'est pas une fonctionnalité des comptes à écritures multirégions, qui acceptent déjà les écritures partout. Et il ne fait rien pour les clients sur d'anciennes versions du SDK ; la mise à niveau de toutes les instances passe avant l'activation.

<!-- section: key-points -->
## Points clés

- Périodique : toutes les 4 heures, deux copies, restauration par le support Azure vers un nouveau compte ; intervalle de 1 à 24 h, rétention d'au moins deux fois l'intervalle, au plus 720 h.
- Continue : restauration à la seconde, en libre-service, niveaux de 7 jours (pas de frais de stockage des sauvegardes), 30 ou 35 jours ; migration depuis le mode périodique à sens unique ; exigée par le mode Toutes les versions et suppressions du flux de modification.
- `az cosmosdb restore` crée un nouveau compte ; `az cosmosdb sql container restore` ou `database restore` ramène une ressource supprimée dans le même compte ; utilisez `--disable-ttl True` ; les paramètres réseau et les attributions de rôles sont à réappliquer.
- Écritures multirégions : `--enable-multiple-write-locations`, `ApplicationRegion` ou `preferred_locations` dans le SDK, pas de cohérence Strong, le dernier écrivain gagne (`_ts` ou un chemin numérique) ou personnalisée (procédure de fusion, définie à la création, flux de conflits).
- Une seule région d'écriture : basculement forcé (le plus rapide, déclenché par vous), basculement géré par le service (priorités, peut prendre une heure ou plus), changement de région d'écriture (planifié uniquement).
- PPAF : une région d'écriture plus une région de lecture, NoSQL, pas Bounded staleness, SDK récents partout, niveau Business Critical, environ 3 minutes, partitions touchées uniquement.
