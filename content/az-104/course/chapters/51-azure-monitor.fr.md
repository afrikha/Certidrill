Azure Monitor collecte les métriques et les journaux de chaque ressource, les stocke, permet de les interroger et déclenche des alertes. L'examen vérifie que vous savez quelles données existent sans configuration, lesquelles vous devez acheminer vous-même, et quel type d'alerte convient à un besoin.

<!-- section: monitor-data | objectives: 5.1.1, 5.1.2 -->
## Ce qu'Azure Monitor collecte

| Données | Contenu | Collecte | Conservation |
| --- | --- | --- | --- |
| **Métriques de plateforme** | Valeurs numériques d'une ressource à intervalles réguliers : Percentage CPU, Transactions, Availability | **Automatique**, sans agent | **93 jours** |
| **Journal d'activité** | Opérations du **plan de contrôle** sur l'abonnement : qui a créé, modifié, supprimé, démarré quoi ; événements d'intégrité du service | Automatique | **90 jours**, non modifiable |
| **Journaux de ressources** | Opérations du **plan de données** à l'intérieur d'une ressource : lecture d'un secret, requêtes vers un compte de stockage, blocages d'un pare-feu | **Seulement avec un paramètre de diagnostic** | Selon la destination |
| Données du **système d'exploitation invité** | Événements Windows, Syslog, compteurs de performances comme la mémoire et l'espace disque libre | Seulement avec l'**agent Azure Monitor** et une **règle de collecte de données** | Selon l'espace de travail |
| Journaux Microsoft Entra | Connexions et audit de l'annuaire | Dans Microsoft Entra ID ; exportables par un paramètre de diagnostic | |

Deux magasins : la **base de données de métriques** (rapide, numérique, quasi temps réel) et les **espaces de travail Log Analytics** (journaux interrogés en KQL).

<!-- section: metrics | objectives: 5.1.1 -->
## Interpréter les métriques

Dans **Metrics Explorer** (Moniteur > Métriques, ou la page Métriques d'une ressource), un graphique est défini par :

| Réglage | Sens |
| --- | --- |
| Étendue | Une ou plusieurs ressources. Plusieurs ressources sur un même graphique doivent avoir **le même type, la même région et le même abonnement** |
| Espace de noms de métrique et métrique | Par exemple *Virtual Machine Host* > *Percentage CPU* |
| **Agrégation** | Comment les valeurs de chaque intervalle sont combinées : **Avg**, **Min**, **Max**, **Sum**, **Count** |
| Plage de temps et **granularité temporelle** | La période affichée et la taille de chaque intervalle (1 minute, 1 heure...) |
| **Filtre** | Ne garder que certaines valeurs d'une dimension |
| **Fractionnement** (split) | Tracer une ligne par valeur d'une dimension (par nom d'API, par type de réponse, par disque) |

Choisir l'agrégation : **Sum** pour les totaux (octets envoyés, transactions), **Avg** pour les niveaux (pourcentage de processeur), **Max** pour voir les pics qu'une moyenne masque, **Count** pour le nombre d'échantillons. Un graphique couvre au plus 30 jours à la fois, dans la limite des 93 jours.

> **Piège d'examen.** Les métriques d'hôte (processeur, réseau, opérations disque) ne demandent aucun agent. **La mémoire et l'espace disque libre sont des métriques d'invité** : elles exigent l'agent Azure Monitor et une règle de collecte de données.

Pour garder les métriques plus longtemps ou les interroger en KQL, un paramètre de diagnostic envoie *AllMetrics* vers un espace de travail (table `AzureMetrics`).

<!-- section: log-settings | objectives: 5.1.2 -->
## Configurer les paramètres de journal

Un **espace de travail Log Analytics** stocke les journaux dans des tables. Il appartient à une région, mais accepte les données de ressources de toute région et de tout abonnement.

Les **paramètres de diagnostic** acheminent les journaux de ressources et les métriques d'une ressource, ou le journal d'activité d'un abonnement :

| Destination | Usage | Contrainte |
| --- | --- | --- |
| **Espace de travail Log Analytics** | Interroger en KQL, alerter, alimenter les insights | Toute région |
| **Compte de stockage** | Archivage long et bon marché, audits | Même région que la ressource (pour une ressource régionale) ; pas un compte Premium |
| **Event Hub** | Diffuser vers un SIEM ou un outil externe | Même région que la ressource |
| Solution partenaire | Produits de supervision intégrés | |

- Un paramètre de diagnostic sélectionne des **catégories de journaux** (ou des groupes de catégories comme `allLogs`, `audit`) et, en option, `AllMetrics`.
- Un paramètre contient **une destination de chaque type** au plus ; une ressource accepte jusqu'à **cinq** paramètres.
- Chaque ressource a besoin de son propre paramètre ; utilisez Azure Policy (`deployIfNotExists`) pour les appliquer à grande échelle.
- Journal d'activité : *Journal d'activité > Exporter les journaux d'activité* crée un paramètre de diagnostic au niveau de l'abonnement ; dans un espace de travail, les événements arrivent dans `AzureActivity`.

Les **données de l'invité** passent par l'**agent Azure Monitor** (l'ancien agent Log Analytics est retiré) :

1. Créez l'espace de travail.
2. Créez une **règle de collecte de données** (DCR) : quelles données (journaux d'événements Windows et niveaux, facilités Syslog, compteurs de performances, journaux texte) et où les envoyer.
3. **Associez** la DCR aux machines ; le portail installe automatiquement l'extension de l'agent. Une machine peut avoir plusieurs DCR, et une DCR de nombreuses machines.

Les machines hors Azure sont d'abord connectées avec **Azure Arc**.

**Rétention** d'un espace de travail : *rétention interactive* de 30 jours par défaut (réglable jusqu'à 2 ans), puis *rétention à long terme* facultative, jusqu'à 12 ans au total. La rétention se règle **table par table**.

```bash
az monitor diagnostic-settings create --name to-law --resource <resource ID> \
  --workspace <workspace ID> --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
az monitor log-analytics workspace table update -g RG1 --workspace-name law1 -n AzureActivity \
  --retention-time 90 --total-retention-time 730
```

<!-- section: kql | objectives: 5.1.3 -->
## Interroger et analyser les journaux

Les journaux s'interrogent en **langage de requête Kusto** (KQL) dans *Journaux*. Une requête part d'une table et la fait passer par des opérateurs :

```kusto
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize AvgCpu = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| where AvgCpu > 85
| order by AvgCpu desc
```

| Opérateur | Rôle |
| --- | --- |
| `where` | Filtre les lignes : `where Level == "Error"`, `where TimeGenerated > ago(2h)` |
| `project` | Ne garde (renomme, calcule) que les colonnes listées. Une colonne écartée ici n'existe plus ensuite |
| `extend` | Ajoute une colonne calculée et garde les autres |
| `summarize ... by` | Agrège : `count()`, `avg()`, `min()`, `max()`, `sum()`, `dcount()` ; regroupe avec `by` |
| `bin(TimeGenerated, 1h)` | Arrondit les horodatages pour former des tranches de temps |
| `order by` / `sort by`, `top N by`, `take N` | Tri et limitation |
| `join`, `union` | Combinent des tables |
| `render timechart` | Trace le résultat |

Comparaison : `==` respecte la casse, `=~` non ; `contains`, `has`, `startswith`, `in (...)`.

Tables à reconnaître :

| Table | Contenu |
| --- | --- |
| `AzureActivity` | Journal d'activité |
| `AzureDiagnostics` ou tables propres à la ressource (`StorageBlobLogs`, `AppServiceHTTPLogs`...) | Journaux de ressources |
| `AzureMetrics` | Métriques de plateforme exportées |
| `Heartbeat` | Un enregistrement par minute et par agent : détecte les machines qui ne répondent plus |
| `Perf`, `InsightsMetrics` | Compteurs de performances |
| `Event`, `Syslog` | Événements Windows, Syslog Linux |

```kusto
// Machines silent for more than 15 minutes
Heartbeat
| summarize LastSeen = max(TimeGenerated) by Computer
| where LastSeen < ago(15m)

// Who deleted resources in the last 7 days
AzureActivity
| where TimeGenerated > ago(7d) and OperationNameValue endswith "delete"
| project TimeGenerated, Caller, ResourceGroup, OperationNameValue
```

<!-- section: alerts | objectives: 5.1.4 -->
## Règles d'alerte, groupes d'actions et règles de traitement des alertes

Trois objets aux rôles distincts :

| Objet | Rôle |
| --- | --- |
| **Règle d'alerte** | Détecte : une étendue, une **condition** sur un signal, une gravité (0 critique à 4 détaillé) |
| **Groupe d'actions** | Réagit : qui est notifié et ce qui est exécuté. Réutilisable par de nombreuses règles |
| **Règle de traitement des alertes** | Modifie les alertes **déjà déclenchées** : ajoute des groupes d'actions ou **supprime les notifications**, sur une étendue et selon une planification |

Types de règles d'alerte :

| Type | Signal | Exemple | Prérequis |
| --- | --- | --- | --- |
| Alerte de **métrique** | Une métrique, évaluée à intervalles réguliers | Percentage CPU moyen > 85 sur 5 minutes | Aucun pour les métriques de plateforme |
| Alerte de **recherche dans les journaux** | Une requête KQL exécutée selon une planification | Plus de 10 erreurs dans la table Event ; mémoire libre de l'invité | Des données dans un espace de travail |
| Alerte de **journal d'activité** | Un événement du journal d'activité | Une machine virtuelle a été supprimée ; une stratégie a été modifiée | Aucun |
| Alertes Service Health / Resource Health | Alertes de journal d'activité sur ces catégories | Un incident Azure dans votre région ; une ressource devient indisponible | Aucun |

- Les seuils de métrique sont **statiques** (une valeur) ou **dynamiques** (appris de l'historique de la métrique, avec une sensibilité). Un seuil dynamique a besoin d'un historique avant de pouvoir se déclencher (au moins trois jours de données) et ne s'utilise pas dans une règle à plusieurs conditions.
- Les alertes de métrique et de journaux peuvent être **avec état** : elles se déclenchent une fois, puis passent à *Résolue* quand la condition disparaît. Les alertes de journal d'activité sont **sans état** : elles se déclenchent à chaque événement.
- Un journal d'activité ne peut pas dire que le processeur est élevé, et une alerte de métrique ne peut pas dire qui a supprimé une ressource : accordez le signal au besoin.

Contenu d'un **groupe d'actions** :

| Notifications | Actions |
| --- | --- |
| E-mail, SMS, notification push de l'application mobile Azure, appel vocal, **e-mail au rôle Azure Resource Manager** (tous les utilisateurs détenant un rôle comme Owner sur l'abonnement) | Runbook Automation, fonction Azure, application logique, webhook, Event Hub, connecteur ITSM |

Les **règles de traitement des alertes** sont la réponse à « ne pas notifier pendant la fenêtre de maintenance » (suppression avec une planification ponctuelle ou récurrente ; les alertes se déclenchent toujours et restent visibles) et à « ajouter ce groupe d'actions à toutes les alertes de ce groupe de ressources, y compris celles des futures règles ». Elles ne créent jamais d'alertes.

```bash
az monitor action-group create -g RG1 -n ag-ops --short-name ops \
  --action email admin admin@contoso.com
az monitor metrics alert create -g RG1 -n cpu-high --scopes <VM resource ID> \
  --condition "avg Percentage CPU > 85" --window-size 5m --evaluation-frequency 1m \
  --severity 2 --action ag-ops
```

<!-- section: insights | objectives: 5.1.5 -->
## Azure Monitor Insights

Les insights sont des vues de supervision prêtes à l'emploi, par type de ressource.

| Insight | Montre | Prérequis |
| --- | --- | --- |
| **VM Insights** | Les performances de l'invité (processeur, mémoire, disques, réseau) des machines et des groupes identiques, les tendances et, en option, la **carte** (Map) des processus et des connexions | Agent Azure Monitor + règle de collecte de données envoyant vers un espace de travail (l'intégration les crée) ; la carte demande l'agent Dependency |
| **Storage Insights** | Disponibilité, latence, transactions et capacité de tous les comptes de stockage | **Aucun** : fondé sur les métriques de plateforme |
| **Network Insights** | Intégrité et métriques de toutes les ressources réseau, topologie, accès au Moniteur de connexion, aux journaux de flux et à Traffic Analytics | Aucun pour la vue d'ensemble |
| Container Insights, Application Insights | Clusters Kubernetes ; performances applicatives | Activés par cluster ou par application |

Avec l'expérience classique de VM Insights, les données de performances arrivent dans la table `InsightsMetrics`. Les machines hors Azure doivent d'abord être connectées par Azure Arc.

<!-- section: network-watcher | objectives: 5.1.6 -->
## Network Watcher et Moniteur de connexion

Network Watcher est un service régional, activé automatiquement dans une région quand vous y créez un réseau virtuel (groupe de ressources `NetworkWatcherRG`).

| Outil | Répond à |
| --- | --- |
| **Vérification du flux IP** (IP flow verify) | Ce paquet est-il autorisé ou refusé pour cette machine virtuelle, et par quelle règle de NSG ? |
| **Diagnostics NSG** | Même question, sur tous les NSG du chemin, pour une machine, un groupe identique ou une passerelle d'application |
| **Tronçon suivant** (Next hop) | Où le routage envoie-t-il cette destination ? |
| Règles de sécurité effectives | Les règles combinées sur une interface |
| **Résolution des problèmes de connexion** (Connection troubleshoot) | Un test de connectivité ponctuel d'une machine vers une adresse IP, un nom de domaine complet ou un URI, avec les sauts |
| **Moniteur de connexion** (Connection Monitor) | Le même genre de test exécuté **en continu** : pourcentage de vérifications en échec et temps d'aller-retour, avec seuils et alertes |
| **Capture de paquets** | Capture les paquets d'une machine vers un compte de stockage ou un fichier local (extension de l'agent Network Watcher requise) |
| Résolution des problèmes VPN | Diagnostique les passerelles et les connexions |
| **Journaux de flux** | Enregistre les flux IP ; analysés par **Traffic Analytics** dans un espace de travail Log Analytics |
| Topologie | Schéma des ressources d'un réseau |

Structure du **Moniteur de connexion** : un moniteur de connexion contient des **groupes de tests** ; un groupe de tests combine des **sources** (machines ou groupes identiques Azure équipés de l'extension Network Watcher, ou machines locales activées par Arc), des **destinations** (machines, adresses IP, noms de domaine complets ou URL : aucun agent nécessaire sur elles) et des **configurations de test** (protocole TCP, ICMP ou HTTP, port, fréquence, seuils). Les résultats vont dans les métriques Azure Monitor et dans un espace de travail Log Analytics ; on peut créer des alertes dessus.

**Journaux de flux :** les **journaux de flux de réseau virtuel** enregistrent les flux de tout un réseau virtuel dans un compte de stockage. Les journaux de flux NSG sont en cours de retrait (30 septembre 2027) et ne peuvent plus être créés.

<!-- section: key-points -->
## Points clés

- Automatique : métriques de plateforme (93 jours) et journal d'activité (90 jours). Sur demande : journaux de ressources (paramètre de diagnostic) et données de l'invité (agent Azure Monitor + DCR).
- Paramètre de diagnostic : une destination de chaque type, cinq paramètres par ressource ; une destination de stockage doit être dans la région de la ressource.
- KQL : `where`, `project`, `extend`, `summarize ... by bin()`, `top`, `render`.
- Alerte de métrique pour les métriques, alerte de recherche dans les journaux pour le KQL, alerte de journal d'activité pour les opérations et l'intégrité du service.
- Groupe d'actions = qui et comment ; règle de traitement des alertes = supprimer ou ajouter des actions sur les alertes déclenchées.
- VM Insights demande l'agent ; Storage Insights et Network Insights ne demandent rien.
- Vérification du flux IP, Tronçon suivant, Résolution des problèmes de connexion (ponctuelle) contre Moniteur de connexion (continu) ; les journaux de flux de réseau virtuel remplacent les journaux de flux NSG.
