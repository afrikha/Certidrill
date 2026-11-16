Sauvegarde Azure (Azure Backup) conserve des points de récupération pour revenir en arrière ; Azure Site Recovery maintient une copie prête à démarrer dans une autre région pour repartir vite après un sinistre. Les questions testent quel coffre protège quoi, où le coffre doit se trouver, et l'ordre des opérations.

<!-- section: vaults | objectives: 5.2.1, 5.2.2 -->
## Coffres Recovery Services et coffres de sauvegarde

Il existe deux types de coffres ; chacun protège sa propre liste de charges de travail :

| | **Coffre Recovery Services** | **Coffre de sauvegarde** (Backup vault) |
| --- | --- | --- |
| Charges Sauvegarde Azure | **Machines virtuelles Azure**, partages **Azure Files**, SQL Server et SAP HANA dans des machines virtuelles Azure, fichiers et serveurs locaux (agent MARS, Azure Backup Server) | **Disques managés Azure**, **objets blob Azure**, Azure Database pour PostgreSQL, Azure Kubernetes Service |
| Azure Site Recovery | **Oui** | Non |

Un scénario avec une machine virtuelle et des objets blob demande donc **un coffre de chaque type**.

**Règles d'emplacement :**

- Pour **Sauvegarde Azure**, le coffre doit être dans la **même région que la source de données**. Des ressources dans trois régions demandent trois coffres. Le coffre peut se trouver dans un autre groupe de ressources que la source de données.
- Pour **Azure Site Recovery** (Azure vers Azure), le coffre doit être dans **n'importe quelle région sauf la région source**, en général la région cible.

**Réglages d'un coffre Recovery Services :**

| Réglage | Valeurs | Règle |
| --- | --- | --- |
| **Type de réplication de stockage** | **GRS** (par défaut), LRS, ZRS | Modifiable **seulement avant la protection du premier élément** |
| **Restauration interrégion** (Cross Region Restore) | Désactivée par défaut | Exige GRS. Permet de restaurer dans la **région jumelée** à tout moment, même sans panne. Ne se désactive plus une fois activée |
| **Suppression réversible** | Activée par défaut : les données de sauvegarde supprimées sont conservées **14 jours** (réglable jusqu'à 180) | Protège contre la suppression accidentelle ou malveillante ; peut être rendue permanente (irréversible) |
| Coffre immuable | Empêche les opérations qui raccourciraient ou supprimeraient des points de récupération | Verrouillable |
| Chiffrement | Clés gérées par la plateforme, ou clés gérées par le client | Les clés gérées par le client se configurent avant la protection du moindre élément |

Pour **supprimer un coffre**, il faut d'abord arrêter la protection et supprimer les données de sauvegarde de chaque élément (y compris les éléments supprimés de façon réversible), et désinscrire les serveurs et les comptes de stockage.

```bash
az backup vault create -g RG1 -n rsv-we --location westeurope
az backup vault backup-properties set -g RG1 -n rsv-we \
  --backup-storage-redundancy GeoRedundant --cross-region-restore-flag true
```

<!-- section: backup-vault-workloads | objectives: 5.2.2 -->
## Charges de travail d'un coffre de sauvegarde

Un coffre de sauvegarde utilise son **identité managée** pour atteindre les sources de données ; vous lui accordez des rôles.

| Charge | Fonctionnement | Rôles de l'identité du coffre |
| --- | --- | --- |
| **Sauvegarde de disque Azure** | **Instantanés incrémentiels** planifiés d'un disque managé, plusieurs fois par jour, stockés dans un **groupe de ressources d'instantanés** de votre abonnement (niveau opérationnel). Aucun agent, aucun impact sur la machine. La restauration crée toujours un **nouveau disque** | Disk Backup Reader sur le disque ; Disk Snapshot Contributor sur le groupe de ressources d'instantanés ; Disk Restore Operator pour les restaurations |
| **Objets blob Azure, sauvegarde opérationnelle** | Continue, locale au compte de stockage : repose sur la restauration à un instant dans le passé, le versioning, la suppression réversible et le flux de modification, que Sauvegarde Azure active | Storage Account Backup Contributor sur le compte |
| **Objets blob Azure, sauvegarde dans le coffre** | Copies planifiées transférées dans le coffre : protège contre la suppression du compte | Idem |

Ordre de création : le coffre de sauvegarde, la **stratégie de sauvegarde**, puis l'**instance de sauvegarde** (l'association d'une source de données à une stratégie).

<!-- section: backup-policy | objectives: 5.2.3 -->
## Stratégies de sauvegarde

Une stratégie de sauvegarde définit **quand** les points de récupération sont pris (planification) et **combien de temps** ils sont conservés (rétention : points quotidiens, hebdomadaires, mensuels et annuels). Un coffre peut contenir plusieurs stratégies ; une stratégie peut protéger de nombreux éléments ; un élément suit une seule stratégie.

Stratégies pour les machines virtuelles Azure :

| | Stratégie **Standard** | Stratégie **Enhanced** (améliorée) |
| --- | --- | --- |
| Fréquence | Une fois par jour (ou par semaine) | **Plusieurs par jour** : toutes les 4, 6, 8, 12 ou 24 heures |
| Rétention des instantanés de restauration instantanée | 1 à 5 jours (2 par défaut) | 1 à 30 jours (7 par défaut) |
| Obligatoire pour | | Les machines à lancement fiable (trusted launch), les disques SSD Premium v2 et Ultra |
| Changement | | Une machine ne peut pas revenir d'Enhanced à Standard |

Déroulement de la sauvegarde d'une machine virtuelle :

1. L'**extension** de sauvegarde prend un instantané des disques : **cohérent au niveau de l'application** (VSS sous Windows, scripts de pré et post-traitement sous Linux), sinon cohérent au niveau du système de fichiers, sinon cohérent en cas d'incident (crash-consistent).
2. L'instantané est gardé avec les disques pendant la rétention de **restauration instantanée** : les restaurations depuis cet instantané sont rapides.
3. Les données sont ensuite transférées vers le **niveau coffre**, où s'applique la rétention de la stratégie.

Autres charges : **SQL Server dans une machine virtuelle Azure** utilise des sauvegardes complètes, différentielles et **de journaux, jusqu'à toutes les 15 minutes**, pour la restauration à un instant donné. La sauvegarde d'**Azure Files** repose sur des instantanés de partage, avec des copies dans le coffre en option.

La stratégie par défaut sauvegarde une fois par jour et conserve les points 30 jours.

<!-- section: backup-restore | objectives: 5.2.4 -->
## Opérations de sauvegarde et de restauration

**Activer la sauvegarde** d'une machine virtuelle : depuis la machine (*Sauvegarde*), depuis le coffre (*+ Sauvegarde*) ou depuis le centre de sauvegarde. Choisissez le coffre (même région) et la stratégie. La première sauvegarde est une copie complète ; les suivantes sont incrémentielles. **Sauvegarder maintenant** déclenche une sauvegarde à la demande, avec sa propre rétention.

**Options de restauration d'une machine virtuelle Azure :**

| Option | Résultat |
| --- | --- |
| **Créer** une machine virtuelle | Une nouvelle machine issue du point de récupération, dans le réseau de votre choix |
| **Restaurer les disques** | Seulement les disques (et un modèle), pour construire ou personnaliser la machine vous-même |
| **Remplacer l'existant** | Remplace les disques de la machine actuelle, qui doit encore exister ; les anciens disques sont conservés |
| **Restauration interrégion** | Créer une machine ou restaurer les disques dans la région jumelée (coffre en GRS avec l'option activée) |
| **Récupération de fichiers** | Monte le point de récupération comme des lecteurs (iSCSI) grâce à un script téléchargé, pour copier des fichiers isolés ; démontez ensuite (valable 12 heures) |

Une restauration utilise un **compte de stockage intermédiaire** dans la même région que le coffre.

**Azure Files :** restaurez le **partage complet** ou des fichiers et dossiers isolés (**récupération au niveau de l'élément**), à l'**emplacement d'origine** (écraser ou ignorer) ou à un **autre emplacement**.

**Sauvegarde locale et au niveau de l'invité :**

| Outil | Protège |
| --- | --- |
| **Agent MARS** (Microsoft Azure Recovery Services) | Les fichiers, dossiers, volumes et l'état du système de machines **Windows**, locales ou dans Azure. Installé sur la machine, inscrit avec le fichier d'informations d'identification du coffre, chiffré avec une phrase secrète à conserver |
| Azure Backup Server (MABS) / DPM | Des charges comme les machines Hyper-V et VMware, SQL Server, SharePoint, Exchange |

**Arrêter la protection :** *Arrêter la sauvegarde et conserver les données* (les points de récupération restent, facturés) ou *Arrêter la sauvegarde et supprimer les données* (les données passent en suppression réversible pendant 14 jours). Rôles : **Backup Contributor** (tout sauf supprimer le coffre et donner accès), **Backup Operator** (ni suppression de sauvegardes ni gestion des stratégies), **Backup Reader**.

```bash
az backup protection enable-for-vm -g RG1 --vault-name rsv-we --vm VM1 --policy-name DefaultPolicy
az backup protection backup-now -g RG1 --vault-name rsv-we --container-name VM1 --item-name VM1 \
  --backup-management-type AzureIaasVM --retain-until 31-12-2026
```

<!-- section: site-recovery | objectives: 5.2.5 -->
## Azure Site Recovery pour les ressources Azure

Site Recovery **réplique** en continu des machines virtuelles vers une autre région, pour qu'elles puissent y démarrer si la région primaire tombe.

| | Sauvegarde Azure | Azure Site Recovery |
| --- | --- | --- |
| But | Récupérer des données : suppression, corruption, rançongiciel, rétention longue | Garder le **service en marche** : sinistre régional |
| Copie | Points de récupération planifiés | Réplication continue |
| RPO / RTO | Heures | Minutes |

Le **RPO** (objectif de point de récupération) est la perte de données maximale acceptable, mesurée en temps ; le **RTO** (objectif de délai de récupération) est la durée d'interruption maximale acceptable.

Composants de la réplication Azure vers Azure :

| Composant | Rôle |
| --- | --- |
| Coffre Recovery Services | Dans une région **autre que la source** |
| Extension du **service Mobilité** | Installée automatiquement sur chaque machine répliquée ; capture les écritures disque |
| **Compte de stockage de cache** | Dans la région **source** ; reçoit les écritures avant leur envoi vers la cible |
| Disques managés réplicas | Dans la région cible |
| Groupe de ressources, réseau virtuel et option de disponibilité cibles | Créés par défaut par Site Recovery, ou choisis par vous |
| **Stratégie de réplication** | Rétention des points de récupération (1 jour par défaut, jusqu'à 15) et fréquence des instantanés **cohérents au niveau de l'application**. Des points cohérents en cas d'incident sont pris toutes les 5 minutes |

Étapes : créer le coffre ; **Activer la réplication** (région source, machines, paramètres cibles, stratégie de réplication) ; attendre la fin de la réplication initiale (état *Protégé*).

Les machines répliquées ont besoin d'un accès HTTPS **sortant** vers les points de terminaison du stockage, de Microsoft Entra ID et de Site Recovery ; Site Recovery n'a jamais besoin d'un accès entrant vers elles. Les machines virtuelles cibles ne tournent pas, et ne coûtent donc que du stockage, jusqu'à un basculement.

<!-- section: failover | objectives: 5.2.6 -->
## Basculer avec Site Recovery

| Opération | Ce qu'elle fait |
| --- | --- |
| **Test de basculement** | Crée une copie de la machine dans la région cible, dans un **réseau de votre choix (isolé, hors production)**, sans arrêter la réplication ni toucher à la production. Terminez par **Nettoyer le test de basculement** |
| **Basculement** | Démarre les machines dans la région cible à partir d'un point de récupération. Option pour arrêter d'abord les machines sources |
| **Valider** (commit) | Confirme le basculement ; les autres points de récupération sont abandonnés |
| **Reprotéger** | Inverse la réplication : de la cible vers la région d'origine |
| **Restauration automatique** (failback) | Un basculement dans l'autre sens, suivi d'une nouvelle reprotection |

Cycle complet : test de basculement (régulièrement) → basculement → validation → reprotection → restauration automatique (basculement vers la région primaire) → reprotection.

Point de récupération à choisir au basculement :

| Choix | Effet |
| --- | --- |
| **Le plus récent** (Latest, RPO le plus bas) | Traite d'abord toutes les données reçues : perte de données minimale, RTO plus long |
| **Dernier point traité** (Latest processed, RTO bas) | Utilise le dernier point déjà traité : le plus rapide |
| **Dernier point cohérent au niveau de l'application** | Dernier point cohérent pour les applications : aucune récupération applicative nécessaire |
| Personnalisé | Un point que vous sélectionnez |

Un **plan de récupération** orchestre le basculement de plusieurs machines : des **groupes** qui démarrent dans l'ordre (niveau base de données, puis niveau applicatif, puis niveau web), les machines d'un groupe basculant en parallèle, plus des **actions manuelles** et des **runbooks Azure Automation** avant ou après un groupe. Un clic fait basculer toute l'application.

<!-- section: backup-reports-alerts | objectives: 5.2.7 -->
## Rapports et alertes pour les sauvegardes

| Besoin | Outil |
| --- | --- |
| Voir les travaux, les éléments protégés et l'intégrité de tous les coffres | Centre de sauvegarde (centre de continuité d'activité), *Travaux de sauvegarde*, *Éléments de sauvegarde* |
| Historique, tendances, consommation, respect des stratégies sur plusieurs mois | **Rapports de sauvegarde** |
| Être notifié des échecs et des opérations à risque | **Alertes Azure Monitor** pour Sauvegarde Azure |

Les **rapports de sauvegarde** reposent sur les journaux Azure Monitor :

1. Créez un **espace de travail Log Analytics** (toute région, tout abonnement ; un seul espace de travail peut servir tous les coffres). Allongez sa rétention au-delà des 30 jours par défaut s'il vous faut un historique plus long.
2. Sur chaque coffre, ajoutez un **paramètre de diagnostic** qui envoie les événements de sauvegarde vers l'espace de travail, en mode **propre à la ressource** (resource-specific).
3. Ouvrez les rapports ; les premières données peuvent mettre jusqu'à 24 heures à arriver.

**Alertes :**

- Les **alertes intégrées** sont émises par défaut, sans créer aucune règle : **alertes de sécurité** (suppression de données de sauvegarde, désactivation de la suppression réversible, stratégie modifiée vers une rétention plus courte... toujours actives) et **alertes d'échec de travail** (sauvegarde ou restauration en échec ; désactivables).
- Une alerte intégrée ne notifie personne par elle-même. Créez une **règle de traitement des alertes** sur l'abonnement, le groupe de ressources ou le coffre, qui attache un **groupe d'actions** (e-mail, ITSM, webhook, application logique).
- Pour des conditions personnalisées, créez des **alertes de métrique** sur les métriques *Backup Health Events* et *Restore Health Events* du coffre, ou des alertes de recherche dans les journaux sur l'espace de travail.

<!-- section: key-points -->
## Points clés

- Coffre Recovery Services : machines virtuelles, Azure Files, SQL dans des machines virtuelles, MARS, Site Recovery. Coffre de sauvegarde : disques, objets blob, PostgreSQL, AKS.
- Sauvegarde : coffre dans la **même** région que la source. Site Recovery : coffre **hors** de la région source.
- GRS par défaut ; réglez le type de réplication avant de protéger quoi que ce soit ; la restauration interrégion exige GRS ; la suppression réversible garde les données supprimées 14 jours.
- Stratégie Standard : quotidienne. Stratégie Enhanced : toutes les 4 à 24 heures, obligatoire pour le lancement fiable et les disques Ultra.
- Restauration : créer une machine, restaurer les disques, remplacer l'existant, récupération de fichiers. MARS : fichiers, dossiers et état du système de machines Windows.
- Site Recovery : extension Mobilité, compte de stockage de cache dans la région source, points cohérents en cas d'incident toutes les 5 minutes.
- Test de basculement dans un réseau isolé ; puis basculement, validation, reprotection, restauration automatique.
- Les rapports de sauvegarde demandent un espace de travail Log Analytics et des paramètres de diagnostic ; les alertes intégrées demandent une règle de traitement des alertes et un groupe d'actions pour notifier.
