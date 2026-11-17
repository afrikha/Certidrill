Une fois la télémétrie collectée, l'examen vous demande de la lire : quelle métrique révèle le goulot d'étranglement d'une machine virtuelle, quel outil d'Application Insights répond à une question d'utilisation ou de performances, comment suivre une requête en échec à travers les services, et quelle requête KQL renvoie le résultat attendu. Attendez-vous à des captures de graphiques, à des requêtes à compléter et à des questions « quel outil utiliser ».

<!-- section: infrastructure-indicators | objectives: 5.2.1 -->
## Indicateurs de performances de l'infrastructure

Une machine virtuelle expose deux familles de métriques :

| Famille | Collectée par | Exemples | Coût et configuration |
| --- | --- | --- | --- |
| Métriques de l'hôte (de plateforme) | L'hôte Azure, sans agent | `Percentage CPU`, `Available Memory Bytes`, `Available Memory Percentage`, `Disk Read Bytes`, `OS Disk IOPS Consumed Percentage`, `Data Disk Queue Depth`, `Network In Total`, `Network Out Total`, `VmAvailabilityMetric` | Automatiques et gratuites, granularité de 1 minute, conservées 93 jours dans la base de métriques |
| Métriques de l'invité | Azure Monitor Agent dans le système d'exploitation, piloté par une règle de collecte de données (DCR) | Espace libre par volume logique, processeur et mémoire par processus, compteurs de performances du système | Nécessitent la supervision avancée (VM Insights) ; l'ingestion est facturée au-delà des valeurs par défaut gratuites |

Quand vous activez la supervision de l'invité, vous choisissez entre deux expériences :

| Expérience | Stockée dans | Interrogée avec | Remarques |
| --- | --- | --- | --- |
| Métriques OpenTelemetry (recommandées pour les nouveaux déploiements) | Espace de travail Azure Monitor | PromQL | L'ensemble par défaut est gratuit : `system.cpu.time`, `system.memory.usage`, `system.disk.io`, `system.network.io`, `system.filesystem.usage`... Les métriques supplémentaires comme `system.cpu.utilization` ou `process.cpu.utilization` sont facturées |
| Métriques basées sur les journaux (classiques) | Espace de travail Log Analytics, table `InsightsMetrics` | KQL | Alimentent la vue Performances de VM Insights ; espaces de noms `Processor`, `Memory`, `LogicalDisk`, `Network` |

La vue **Performances** de VM Insights (Monitor > Machines virtuelles, ou Insights de la machine virtuelle) affiche, pour l'expérience basée sur les journaux :

| Indicateur | Graphiques | Agrégation par défaut |
| --- | --- | --- |
| Processeur | CPU Utilization % | Moyenne et 95e centile |
| Mémoire | Available Memory | Moyenne, 5e et 10e centile (ce sont les valeurs basses qui posent problème) |
| Disque | Logical Disk Space Used %, Logical Disk IOPS, Logical Disk MB/s, Max Logical Disk Used % | Moyenne et 95e centile |
| Réseau | Bytes Sent Rate, Bytes Receive Rate | Moyenne |

Sur plusieurs machines, **Top N Charts** montre les cinq pires machines par métrique, **Aggregated Charts** la tendance de l'ensemble et **Top N List** un tableau triable (20 machines par défaut, jusqu'à 500). La plage de temps va jusqu'à 30 jours. Il faut le rôle Monitoring Reader sur les machines virtuelles et sur la DCR de VM Insights.

Lire les indicateurs :

| Observation | Cause probable | Action |
| --- | --- | --- |
| 95e centile du processeur proche de 100 % pendant de longues périodes | Charge limitée par le processeur | Augmenter la taille ou le nombre d'instances |
| Machine virtuelle de série B ralentie, `CPU Credits Remaining` à 0 | Crédits de burst épuisés | Passer à une taille non burstable |
| Available Memory basse au 5e centile | Pression mémoire, pagination | Taille supérieure ou correction d'une fuite |
| `Data Disk IOPS Consumed Percentage` à 100 %, `Data Disk Queue Depth` en hausse | Disque limité à son plafond d'IOPS | Niveau de disque plus rapide ou disque plus grand |
| Logical Disk Space Used % proche de 100 % | Volume plein | Étendre le disque, purger les journaux |
| Débits réseau élevés, processeur inactif | Charge limitée par le réseau ou dépendance trop bavarde | Mise en réseau accélérée, taille supérieure, cache |

Les autres ressources suivent la même logique : un plan App Service expose `CPU Percentage`, `Memory Percentage`, `Disk Queue Length` et `Http Queue Length` ; un compte de stockage expose `Transactions` (fractionnée par `ResponseType` ou `ApiName`), `Availability`, `SuccessE2ELatency` et `SuccessServerLatency`. Dans Container Insights, **Memory working set** inclut le cache, tandis que **Memory RSS** ne montre que la mémoire résidente ; les visualisations Managed Prometheus sont à privilégier par rapport aux visualisations Log Analytics.

> **Piège d'examen.** `SuccessE2ELatency` inclut le temps réseau et l'accusé de réception du client ; `SuccessServerLatency` ne mesure que le traitement dans Stockage Azure. Une latence de bout en bout élevée avec une latence serveur basse désigne le réseau ou le client, pas le stockage.

> **Piège d'examen.** Les métriques de l'hôte ne montrent ni l'espace libre par volume ni la consommation par processus : il faut l'agent (métriques de l'invité). Le graphique réseau de VM Insights compte tout le trafic TCP/IP de l'invité, il diffère donc du graphique de la vue d'ensemble de la machine virtuelle.

<!-- section: metrics-explorer | objectives: 5.2.1, 5.2.2 -->
## Analyser des métriques avec Metrics Explorer

Metrics Explorer (Monitor > Métriques, ou **Métriques** sur une ressource) affiche toute métrique de plateforme ou métrique standard d'Application Insights :

| Paramètre | À retenir |
| --- | --- |
| Étendue | Une ressource, ou plusieurs du même type, de la même région et du même abonnement (Monitoring Reader à l'étendue de l'abonnement pour les graphiques multiressources) |
| Agrégation | Sum, Count, Average, Min, Max ; seules celles qui s'appliquent à la métrique sont proposées |
| Plage de temps | 24 dernières heures par défaut ; jusqu'à 30 jours par graphique, panoramique pour atteindre la rétention de 93 jours |
| Granularité temporelle | Automatique par défaut |
| Ajouter un filtre | Ne garder que certaines valeurs d'une dimension, par exemple `ResponseType = ServerBusyError` |
| Appliquer la division | Une ligne par valeur de dimension, 10 valeurs par défaut (de 1 à 50), ordre décroissant |
| Ajouter une métrique / Nouveau graphique | Même graphique pour la même unité, nouveau graphique pour une autre unité |
| Enregistrer dans le tableau de bord | Épingler au tableau de bord ou enregistrer dans un classeur |
| Nouvelle règle d'alerte | Crée une alerte de métrique qui reprend la métrique, les filtres et la division du graphique |

> **Conseil d'examen.** « Afficher le taux de 5xx par instance » = filtrer sur la dimension du code de résultat, puis diviser par instance. Le filtre réduit les données, la division trace une série par valeur.

<!-- section: application-performance | objectives: 5.2.2 -->
## Télémétrie des performances de l'application

Les ressources Application Insights sont basées sur un espace de travail : la télémétrie arrive dans un espace de travail Log Analytics, et les métriques standard dans la base de métriques.

| Type de métrique | Source | Affectée par l'échantillonnage | Dimensions | Usage typique |
| --- | --- | --- | --- | --- |
| Standard (préagrégée) | Agrégée à l'exécution avant l'échantillonnage, granularité de 1 minute | Non | Dimensions clés uniquement | Tableaux de bord, alertes de métrique, taux exacts |
| Basée sur les journaux | Requêtes Kusto sur la télémétrie stockée | Oui | Toutes les propriétés journalisées | Analyse ponctuelle selon n'importe quelle propriété |
| Personnalisée (préversion) | Votre code via le SDK ou l'API OpenTelemetry | Les instruments préagrégés restent exacts | Stockées avec les journaux ; aucune dans la base de métriques sauf activation | Indicateurs métier |

Les noms de métriques standard incluent `requests/count`, `requests/duration`, `requests/failed`, `dependencies/duration`, `dependencies/failed`, `exceptions/count` et `availabilityResults/availabilityPercentage`.

L'échantillonnage limite le volume de télémétrie : la Microsoft OpenTelemetry Distro pour .NET, Node.js et Python applique par défaut un échantillonnage à débit limité de cinq traces par seconde, et l'échantillonneur conserve les traces entières. Chaque ligne stockée porte `itemCount` (`ItemCount` dans l'espace de travail), le nombre d'éléments d'origine qu'elle représente. Comptez avec `sum(itemCount)`, pas avec `count()`.

```kusto
// Request volume corrected for sampling, per hour
AppRequests
| where TimeGenerated > ago(1d)
| summarize Requests = sum(ItemCount) by bin(TimeGenerated, 1h)
| render timechart
```

Les outils du portail pour les performances :

| Outil | Répond à |
| --- | --- |
| Vue Performances | Quelles opérations sont les plus lentes, la distribution de leur durée et leur nombre ; bascule **Server / Browser** pour les temps de chargement des pages (nécessite le SDK JavaScript) |
| Vue Échecs | Opérations en échec avec les 3 principaux codes de réponse, types d'exception et dépendances en échec |
| Live Metrics | Taux de requêtes, de dépendances et d'exceptions, processeur et mémoire, en moins d'une seconde ; rien n'est stocké, les données n'existent que tant que le volet est ouvert |
| Annotations de mise en production | Marqueurs de déploiement sur les graphiques Performances, Échecs et Utilisation, pour relier une régression à une mise en production |
| Afficher dans les journaux | Ouvre la requête KQL de la vue actuelle |

> **Piège d'examen.** Un tableau de bord construit sur une requête de journal qui utilise `count()` sous-estime le trafic quand l'échantillonnage est actif. Utilisez une métrique standard, ou `sum(itemCount)` dans la requête.

> **Piège d'examen.** Live Metrics sert à suivre un déploiement en temps réel. Il ne garde aucun historique : pour analyser le ralentissement d'hier, utilisez la vue Performances ou les journaux.

<!-- section: usage-analysis | objectives: 5.2.2 -->
## Analyse de l'utilisation

Les outils d'utilisation ont besoin de la télémétrie du navigateur envoyée par le **SDK JavaScript d'Application Insights** (vues de page et événements personnalisés) ; l'instrumentation côté serveur seule ne suffit pas.

| Question | Outil |
| --- | --- |
| Combien d'utilisateurs uniques, de quel pays ou navigateur ? | Utilisateurs |
| Combien de sessions et quelle durée ? | Sessions (une session se termine après plus de 30 minutes d'inactivité ou 24 heures d'utilisation continue) |
| À quelle fréquence une page ou une fonctionnalité est-elle utilisée ? | Événements (vues de page et événements personnalisés) |
| Quel pourcentage termine une séquence ordonnée connue, comme panier > paiement > confirmation ? | Entonnoirs (six étapes au maximum) |
| Où vont les utilisateurs après une page, où partent-ils ? | Flux d'utilisateurs |
| Analyser un groupe réutilisable, comme les utilisateurs d'une nouvelle fonctionnalité | Cohortes (définies par une requête KQL, réutilisées dans Utilisateurs, Sessions, Événements et Flux d'utilisateurs) |
| Les utilisateurs reviennent-ils ? | Classeur Analyse de rétention des utilisateurs |
| Le temps de chargement d'une page affecte-t-il la conversion ? | Classeur Analyse de l'impact utilisateur |
| Satisfaction, engagement, adoption, rétention, réussite des tâches | Classeur HEART (nécessite le plug-in Click Analytics) |

Les utilisateurs sont comptés par des ID anonymes stockés dans un cookie du navigateur : un autre navigateur, un autre appareil ou des cookies effacés créent un nouvel utilisateur. Pour suivre la même personne sur plusieurs appareils, définissez l'ID d'utilisateur authentifié (`setAuthenticatedUserContext()` dans le navigateur, `enduser.id` sur le span avec OpenTelemetry). Les actions métier se suivent avec des événements personnalisés :

```text
appInsights.trackEvent({name: "CheckoutCompleted"});
```

> **Piège d'examen.** Les entonnoirs demandent une séquence ordonnée que vous connaissez déjà ; les flux d'utilisateurs explorent des chemins que vous ne connaissez pas encore. « Depuis la page d'accueil, quelles pages les utilisateurs visitent-ils ensuite ? », c'est Flux d'utilisateurs.

<!-- section: distributed-tracing | objectives: 5.2.3 -->
## Traçage distribué

Le traçage distribué suit une opération logique à travers tous les composants. Le modèle de données :

| Champ (classique / espace de travail) | Sens |
| --- | --- |
| `operation_Id` / `OperationId` | Partagé par toute la télémétrie de l'opération ; égal au `trace-id` W3C |
| `id` / `Id` | ID unique d'une requête ou d'une dépendance (le span) |
| `operation_ParentId` / `ParentId` | ID du parent immédiat ; vide pour le span racine |
| `cloud_RoleName` / `AppRoleName` | Le nom du composant (service) |
| `cloud_RoleInstance` / `AppRoleInstance` | La machine ou l'instance |

Les appels entrants sont des **requêtes** (`AppRequests`), les appels sortants des **dépendances** (`AppDependencies`). L'`Id` d'une dépendance devient le `ParentId` de la requête qu'elle déclenche dans le service suivant. Le contexte voyage dans les en-têtes W3C Trace Context `traceparent` et `tracestate` ; l'ancien protocole `Request-Id` est déprécié. Utilisez la Microsoft OpenTelemetry Distro (.NET, Node.js, Python) ou l'Azure Monitor OpenTelemetry Distro (Java) : le SDK .NET Classic API 2.x est mis hors service le 31 mars 2027. Les composants peuvent envoyer leur télémétrie à des ressources Application Insights différentes, même dans des abonnements différents, et rester corrélés.

Les outils :

| Outil | Pour |
| --- | --- |
| Cartographie d'application | Voir la topologie : les nœuds sont les composants identifiés par le nom de rôle cloud, les connecteurs montrent les appels avec le taux d'erreur, la durée moyenne et le nombre d'appels. La **Vue intelligente** met en évidence les causes probables d'échec (sensibilité High, Medium par défaut, Low ; jusqu'à sept jours) |
| Détails de la transaction de bout en bout (diagnostics de transaction) | Ouvrir un exemple depuis Performances, Échecs ou Recherche : diagramme de Gantt de chaque requête et dépendance à travers les composants, liste de séquences chronologiques, détails avec la pile des appels ou la commande SQL |
| Journaux | Reconstituer une trace par `OperationId` |

```kusto
// Every request and dependency of one distributed operation
union AppRequests, AppDependencies
| where OperationId == "4bf92f3577b34da6a3ce929d0e0e4736"
| project TimeGenerated, Type, AppRoleName, Name, Id, ParentId, DurationMs, Success
| order by TimeGenerated asc
```

> **Piège d'examen.** Si tous les microservices apparaissent comme un seul nœud sur la cartographie, les services ne définissent pas de nom de rôle cloud distinct. Avec OpenTelemetry, définissez les attributs de ressource `service.name` (et éventuellement `service.namespace`) pour le nom du rôle et `service.instance.id` pour l'instance du rôle.

> **Conseil d'examen.** Dans le diagramme de Gantt, un intervalle couvert par aucune dépendance est du temps passé dans le processus : profilez le code, pas la base de données. Un service en aval affiché seulement comme dépendance externe n'est pas instrumenté, ou vous n'avez pas accès à sa ressource.

<!-- section: kql-basics | objectives: 5.2.4 -->
## Requêtes KQL de base

Une requête KQL part d'une table et fait passer les lignes dans des opérateurs, de haut en bas :

| Opérateur | Rôle | Exemple |
| --- | --- | --- |
| `where` | Filtrer les lignes | `where TimeGenerated > ago(1h)` |
| `project` | Garder ou renommer des colonnes | `project Computer, CounterValue` |
| `extend` | Ajouter une colonne calculée, garder les autres | `extend DurationSec = DurationMs / 1000` |
| `summarize` | Agréger par groupes | `summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer` |
| `count`, `distinct` | Nombre de lignes, valeurs uniques | `distinct Computer` |
| `sort by` / `order by`, `top` | Trier (décroissant par défaut), N premières lignes | `top 10 by DurationMs desc` |
| `take` | Lignes quelconques, pour un aperçu | `take 10` |
| `join` | Combiner deux tables ; type par défaut `innerunique` | `join kind=leftouter (Heartbeat) on Computer` |
| `union` | Ajouter des tables bout à bout | `union AppRequests, AppDependencies` |
| `render` | Graphique ; doit être en dernier | `render timechart` |

Fonctions utiles : `ago()`, `bin()`, `avg()`, `percentile()`, `percentiles()`, `arg_max()`, `dcount()`, `countif()`.

```kusto
// CPU trend per computer from the Perf table
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

```kusto
// Ten machines with the least free disk space (VM insights)
InsightsMetrics
| where TimeGenerated > ago(24h)
| where Origin == "vm.azm.ms"
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| summarize P90 = percentile(Val, 90) by Computer
| top 10 by P90 asc
```

```kusto
// Machines that stopped sending a heartbeat in the last 15 minutes
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| where LastHeartbeat < ago(15m)
```

```kusto
// Failure rate and 95th percentile duration per operation
AppRequests
| where TimeGenerated > ago(1d)
| summarize Total = sum(ItemCount), Failed = sumif(ItemCount, Success == false), P95 = percentile(DurationMs, 95) by Name
| extend FailureRate = round(100.0 * Failed / Total, 2)
| top 5 by FailureRate desc
```

Opérateurs de chaîne :

| Opérateur | Correspond à | Casse |
| --- | --- | --- |
| `==` / `=~` | Valeur exacte | Sensible / insensible |
| `has` | Un terme entier, utilise l'index de termes (rapide) | Insensible (`has_cs` sensible) |
| `contains` | N'importe quelle sous-chaîne, parcourt la colonne (plus lent) | Insensible (`contains_cs` sensible) |
| `startswith` | Début de la chaîne | Insensible (`startswith_cs` sensible) |
| `in` | Une valeur d'une liste | Sensible (`in~` insensible) |

> **Piège d'examen.** `"KustoExplorerQueryRun" has "Explorer"` est faux, `contains "Explorer"` est vrai : `has` ne trouve que des termes entiers. Pour les performances, préférez `has` et les opérateurs sensibles à la casse quand ils donnent le bon résultat.

> **Piège d'examen.** Dans les journaux d'une ressource Application Insights, les noms classiques s'appliquent (`requests`, `timestamp`, `duration`, `operation_Id`) ; dans l'espace de travail Log Analytics, utilisez `AppRequests`, `TimeGenerated`, `DurationMs`, `OperationId`. Un `summarize` sans `bin()` renvoie une ligne par groupe, pas une série chronologique.

<!-- section: key-points -->
## Points clés

- Les métriques de l'hôte sont gratuites et sans agent ; l'espace disque par volume et les données par processus nécessitent Azure Monitor Agent (métriques de l'invité, VM Insights).
- Métriques de l'invité de VM Insights : métriques OpenTelemetry dans un espace de travail Azure Monitor (PromQL), ou métriques basées sur les journaux dans `InsightsMetrics` (KQL).
- Metrics Explorer : le filtre réduit, la division trace une ligne par valeur, 30 jours par graphique, 93 jours de rétention.
- Les métriques standard ignorent l'échantillonnage ; les requêtes de journal doivent utiliser `sum(itemCount)`.
- Live Metrics est en temps réel et ne stocke rien.
- Entonnoirs pour une séquence connue, Flux d'utilisateurs pour explorer, Cohortes pour des groupes réutilisables ; l'utilisation nécessite le SDK JavaScript.
- `OperationId` = ID de trace, `ParentId` = span parent ; les nœuds de la Cartographie d'application viennent du nom de rôle cloud.
- KQL : `where`, `summarize ... by bin()`, `render` en dernier, `has` avant `contains`.
