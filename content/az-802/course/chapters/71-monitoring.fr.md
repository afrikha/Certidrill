La supervision de Windows Server utilise deux familles d'outils : les outils intégrés (Analyseur de performances, jeux de collecteurs de données, Observateur d'événements, System Insights, Windows Admin Center), qui travaillent sur un serveur ou quelques-uns, et Azure Monitor (agent Azure Monitor, règles de collecte de données, alertes, VM Insights) pour les machines virtuelles Azure et les serveurs activés pour Azure Arc à grande échelle. Les questions d'examen décrivent un besoin (« collecter uniquement les erreurs », « être averti avant que le volume soit plein », « envoyer un e-mail quand le processeur reste élevé ») et demandent quel outil ou quel paramètre y répond.

<!-- section: performance-monitor | objectives: 7.1.1 -->
## Analyseur de performances

L'Analyseur de performances (`perfmon.exe`) affiche des compteurs en temps réel, du serveur local ou de serveurs distants, sous forme de **graphique en courbes**, d'**histogramme** ou de **rapport**. Les compteurs se nomment `\Object(Instance)\Counter`.

| Ressource | Compteur | Signes d'un goulot d'étranglement |
| --- | --- | --- |
| Processeur | `\Processor(_Total)\% Processor Time` | Valeurs élevées durables (environ 80 % ou plus) |
| Processeur | `\System\Processor Queue Length` | Régulièrement plus d'environ 2 threads par cœur |
| Mémoire | `\Memory\Available MBytes` | Faible et en baisse |
| Mémoire | `\Memory\Pages/sec` | Pagination élevée et durable, souvent avec peu de mémoire disponible |
| Disque | `\PhysicalDisk(*)\Avg. Disk sec/Read` et `Avg. Disk sec/Write` | Latence élevée (dizaines de millisecondes) |
| Disque | `\PhysicalDisk(*)\Current Disk Queue Length` | Requêtes constamment en attente |
| Réseau | `\Network Interface(*)\Bytes Total/sec` | Proche de la bande passante de la carte |

```powershell
Get-Counter -Counter "\Processor(_Total)\% Processor Time" -SampleInterval 5 -MaxSamples 12
Get-Counter -ComputerName SRV1, SRV2 -Counter "\Memory\Available MBytes"
```

Pour afficher les compteurs d'un serveur distant sans en être administrateur, un utilisateur doit être membre de **Performance Monitor Users** sur ce serveur ; pour créer et exécuter des jeux de collecteurs de données, de **Performance Log Users**.

> **Conseil d'examen.** Lisez une valeur processeur élevée avec la longueur de file d'attente et avec la mémoire : une pagination constante peut faire accuser le disque ou le processeur alors que c'est la mémoire qui manque.

<!-- section: data-collector-sets | objectives: 7.1.2 -->
## Jeux de collecteurs de données

Un **jeu de collecteurs de données** enregistre des données dans la durée au lieu de les afficher en direct. Types de collecteurs :

| Collecteur | Enregistre |
| --- | --- |
| Compteur de performance | Valeurs des compteurs à un intervalle d'échantillonnage, dans un fichier `.blg` |
| Données de suivi d'événements | Événements ETW de fournisseurs |
| Informations de configuration système | Clés de Registre et leurs valeurs |
| Alerte de compteur de performance | Déclenche des actions quand un compteur franchit un seuil |

- Les jeux **Système** (System Performance, System Diagnostics ; Active Directory Diagnostics sur les contrôleurs de domaine) sont des modèles prêts à l'emploi. Les jeux **Définis par l'utilisateur** se créent à partir d'un modèle ou manuellement.
- Propriétés : **planification** (date de début, jours, heure), **condition d'arrêt** (durée totale, taille maximale, redémarrage quand une limite est atteinte), dossier de sortie (par défaut sous `%SystemDrive%\PerfLogs\Admin`) et l'utilisateur sous lequel il s'exécute.
- **Gestionnaire de données** : limite l'espace utilisé (nombre maximal de dossiers, taille, ancienneté) et crée des rapports.
- Une **alerte de compteur de performance** peut écrire une entrée dans le journal Application, démarrer un autre jeu de collecteurs de données et exécuter une tâche planifiée.

```powershell
logman create counter Baseline -c "\Processor(_Total)\% Processor Time" "\Memory\Available MBytes" -si 00:00:15 -o C:\PerfLogs\Baseline
logman start Baseline
logman query
relog C:\PerfLogs\Baseline_000001.blg -f csv -o C:\PerfLogs\Baseline.csv
```

> **Piège d'examen.** Une alerte de compteur seule ne conserve aucun historique. « Enregistrer des compteurs pendant une semaine pour établir une base de référence » exige un jeu de collecteurs de type **compteur de performance** avec une planification et une condition d'arrêt ; « agir quand le seuil est franchi » exige une **alerte de compteur de performance**.

<!-- section: windows-admin-center | objectives: 7.1.3 -->
## Surveiller les serveurs avec Windows Admin Center

Windows Admin Center (WAC) regroupe des outils de supervision dans le navigateur, pour les serveurs locaux et, depuis le portail Azure, pour les machines virtuelles Azure et les serveurs activés pour Azure Arc.

| Outil WAC | Usage |
| --- | --- |
| Vue d'ensemble | Activité actuelle du processeur, de la mémoire et du réseau ; redémarrer ou arrêter |
| Analyseur de performances | Afficher des compteurs de performance et des rapports |
| Événements | Parcourir, rechercher, afficher, effacer et exporter les journaux des événements |
| System Insights | Analytique prédictive (Windows Server 2019 ou ultérieur) |
| Azure Monitor | Connecter le serveur à Azure Monitor et configurer des alertes |

WAC n'a pas de moteur d'alertes propre : les alertes et les notifications par e-mail sont des alertes Azure Monitor. Depuis l'outil **Azure Monitor**, vous inscrivez WAC auprès d'Azure et intégrez le serveur ; les règles d'alerte se créent ensuite dans le portail Azure (groupe d'actions avec une notification par e-mail).

> **Piège d'examen.** « Recevoir un e-mail quand la mémoire libre d'un serveur est faible, avec Windows Admin Center » signifie intégrer le serveur à **Azure Monitor** depuis WAC et créer une règle d'alerte, pas configurer les outils Vue d'ensemble ou Analyseur de performances.

<!-- section: system-insights | objectives: 7.1.4 -->
## System Insights

**System Insights** (Windows Server 2019, 2022 et 2025) exécute une analytique prédictive **localement** sur le serveur, sans dépendance au cloud. Fonctionnalités par défaut :

| Fonctionnalité | Données | Prévoit |
| --- | --- | --- |
| CPU capacity forecasting | % Processor Time (moyenne maximale sur 2 heures par jour) | L'utilisation du processeur |
| Networking capacity forecasting | Bytes Total/sec | L'utilisation réseau par carte |
| Total storage consumption forecasting | Somme des tailles des volumes et des disques | L'utilisation totale du stockage |
| Volume consumption forecasting | Taille du volume | L'utilisation de chaque volume |

États : **OK** (la prévision reste dans la capacité), **Warning** (capacité dépassée dans les **30 jours**), **Critical** (dans les **7 jours**), **Error**, **None** (données insuffisantes). Aucune prévision n'est faite avec 5 jours de données ou moins ; le modèle complet exige trois semaines de données. Chaque fonctionnalité s'exécute **tous les jours à 3 h** par défaut. Les résultats sont écrits dans le journal **Microsoft-Windows-System-Insights/Admin** (événement 148 Warning, 150 Critical).

```powershell
Get-InsightsCapability
Invoke-InsightsCapability -Name "Volume consumption forecasting"
Get-InsightsCapabilityResult -Name "Volume consumption forecasting" -History
Set-InsightsCapabilitySchedule -Name "CPU capacity forecasting" -Daily -At 2:00AM
$cred = Get-Credential
Set-InsightsCapabilityAction -Name "Volume consumption forecasting" -Type Critical -Action "C:\Scripts\Extend-Volume.ps1" -ActionCredential $cred
```

> **Conseil d'examen.** « Exécuter automatiquement un script quand le stockage doit être épuisé d'ici une semaine » correspond à une **action de correction** System Insights sur l'état **Critical**, exécutée avec les informations d'identification passées par `-ActionCredential`.

<!-- section: event-logs | objectives: 7.1.5 -->
## Gérer les journaux des événements

Les **Journaux Windows** sont Application, Sécurité, Installation, Système et Événements transférés ; les **Journaux des applications et des services** contiennent des journaux par composant (certains, comme les journaux d'analyse et de débogage, sont masqués ou désactivés par défaut).

- **Propriétés du journal** : taille maximale et rétention : *Remplacer les événements si nécessaire (les événements les plus anciens d'abord)*, *Archiver le journal lorsqu'il est plein, ne pas remplacer les événements* ou *Ne pas remplacer les événements (nettoyage manuel)*.
- **Vues personnalisées** : filtres enregistrés (niveau, ID d'événement, sources, journaux) sur plusieurs journaux ; **Joindre une tâche à cet événement** exécute une tâche quand un événement se produit.
- Les **abonnements aux événements** transfèrent des événements vers un serveur collecteur (journal Événements transférés) :

| Mode | Qui se connecte | Configuration |
| --- | --- | --- |
| Initié par le collecteur | Le collecteur extrait les événements des sources listées | Sources : WinRM activé ; compte d'ordinateur du collecteur dans **Event Log Readers** |
| Initié par l'ordinateur source | Les sources envoient au collecteur | GPO **Configure target Subscription Manager** qui pointe vers le collecteur ; adapté à de nombreuses sources |

Sur le collecteur, exécutez `wecutil qc` (service Collecteur d'événements de Windows) ; sur les sources, `winrm quickconfig`. Pour transférer le journal **Sécurité**, le compte **Network Service** doit avoir l'accès en lecture sur les sources (Event Log Readers).

```powershell
Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)}
wevtutil sl Application /ms:104857600
wevtutil epl System C:\Logs\System.evtx
```

> **Piège d'examen.** Les abonnements initiés par la source se configurent par stratégie de groupe et ne listent pas les sources sur le collecteur ; les abonnements initiés par le collecteur, si. « Des centaines de serveurs, ajoutés automatiquement par UO » désigne le mode **initié par l'ordinateur source**.

<!-- section: data-collection-rules | objectives: 7.1.6 -->
## Règles de collecte de données pour Azure Monitor

L'**agent Azure Monitor** (AMA) collecte les données invitées des machines virtuelles Azure et des serveurs activés pour Azure Arc (installez d'abord l'agent Connected Machine). Ce qu'il collecte et où il l'envoie est défini dans des **règles de collecte de données (DCR)**, liées aux machines par des **associations de DCR**. Une machine peut avoir plusieurs DCR, et une DCR peut avoir jusqu'à 10 sources de données.

| Source de données | Destination | Table |
| --- | --- | --- |
| Événements Windows | Espace de travail Log Analytics | `Event` |
| Compteurs de performance | Espace de travail Log Analytics et/ou Métriques Azure Monitor | `Perf` |
| Journaux texte et JSON | Espace de travail Log Analytics | Table personnalisée |
| Journaux IIS | Espace de travail Log Analytics | `W3CIISLog` |

- Création dans **Moniteur > Règles de collecte de données > Créer** ; la DCR doit se trouver dans la **même région** que son espace de travail Log Analytics. Ajouter des ressources dans le portail installe AMA si nécessaire et crée les associations.
- Les événements Windows se filtrent avec des requêtes **XPath** ; ne collecter que le nécessaire réduit le coût.
- Les données arrivent en 5 minutes environ ; AMA écrit un enregistrement `Heartbeat` chaque minute.
- Évitez les doublons : deux DCR qui collectent les mêmes événements, ou des événements de sécurité collectés par une DCR **et** par Microsoft Sentinel (`Event` et `SecurityEvent`).

```text
System!*[System[(Level=1 or Level=2 or Level=3)]]
Application!*[System[(Level=1 or Level=2)]]
Security!*[System[(EventID=4624 or EventID=4625)]]
```

```powershell
# Test an XPath query locally before using it in a DCR
Get-WinEvent -LogName System -FilterXPath "*[System[(Level=1 or Level=2 or Level=3)]]"
Get-AzDataCollectionRuleAssociation -ResourceUri $vm.Id
```

> **Piège d'examen.** L'agent Log Analytics (MMA) est mis hors service : les nouvelles collectes utilisent AMA et des DCR. Une DCR située dans une autre région que l'espace de travail est inutilisable, et installer l'agent sans associer de DCR ne collecte rien d'autre que le signal de pulsation (heartbeat).

<!-- section: azure-alerts | objectives: 7.1.7 -->
## Créer des alertes

Une **règle d'alerte** définit une étendue (ressources), une condition sur un signal, des **actions** (groupes d'actions) et des détails (gravité de **Sev0** Critique à **Sev4** Détaillé).

| Type d'alerte | Signal | État |
| --- | --- | --- |
| Alerte de métrique | Métriques de plateforme ou invitées ; seuils statiques ou dynamiques ; plusieurs conditions | Avec état par défaut : résolue après trois vérifications sans la condition |
| Alerte de recherche dans les journaux | Requête KQL sur un espace de travail Log Analytics à une fréquence donnée | Avec ou sans état |
| Alerte de journal d'activité | Événements du plan de contrôle, y compris Service Health et Resource Health | Toujours sans état |

- **Groupes d'actions** : notifications par e-mail, SMS, push et appel vocal ; runbooks Automation, Azure Functions, Logic Apps, webhooks, ITSM, Event Hubs. Un groupe d'actions sert de nombreuses règles.
- **Règles de traitement des alertes** : suppriment les notifications pendant une fenêtre de maintenance, ou ajoutent des groupes d'actions aux alertes déclenchées, par étendue et par planification.
- Les **règles d'alerte recommandées** s'activent en une étape depuis la page **Alertes** d'une machine virtuelle.
- États utilisateur d'une alerte déclenchée : **Nouveau**, **Reconnu**, **Fermé**. Les alertes sont conservées 30 jours.

```kusto
// Log search alert: servers that stopped sending a heartbeat
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| where LastHeartbeat < ago(10m)
```

> **Piège d'examen.** « Ne pas envoyer de notifications pendant la fenêtre de mise à jour du samedi » ne se règle pas en désactivant les règles : utilisez une **règle de traitement des alertes** qui supprime les actions selon une planification. Et un compteur uniquement invité, comme l'espace disque libre, exige des données AMA (alerte de recherche dans les journaux ou métriques invitées), pas une métrique de plateforme.

<!-- section: vm-insights | objectives: 7.1.8 -->
## Surveiller les performances avec VM Insights

VM Insights (« supervision améliorée » dans le portail) installe AMA et collecte un ensemble prédéfini de données de performance invitées pour les machines virtuelles Azure, les groupes de machines virtuelles identiques et les serveurs activés pour Azure Arc. Deux options de métriques :

| Option | Destination | Expérience |
| --- | --- | --- |
| Métriques OpenTelemetry (recommandées pour les nouveaux déploiements) | Espace de travail Azure Monitor | Nouvelle expérience des métriques, métriques par processus en option |
| Métriques basées sur les journaux (classique) | Espace de travail Log Analytics, table `InsightsMetrics` | Vue **Performances** classique et classeurs |

Activez-la depuis la machine virtuelle (**Supervision > Insights** ou l'option de supervision améliorée), depuis **Moniteur > Machines virtuelles**, ou à grande échelle avec Azure Policy, l'interface CLI, PowerShell ou des modèles. Le portail crée la DCR et l'association. Les machines hors d'Azure ont d'abord besoin de l'**agent Azure Connected Machine**.

La vue **Performances** compare le processeur, la mémoire disponible, l'utilisation et les IOPS des disques logiques, et le réseau entre machines, avec des listes des N premières et des tendances, pour trouver la machine virtuelle saturée. La vue **Carte** classique (processus et dépendances) exige aussi l'**agent Dependency**.

```kusto
// Classic logs-based VM insights: free space per logical disk
InsightsMetrics
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| summarize avg(Val) by Computer, bin(TimeGenerated, 1h)
```

> **Conseil d'examen.** Les métriques de l'hôte (processeur, disque et réseau vus depuis l'hyperviseur) sont collectées gratuitement pour toute machine virtuelle Azure, sans agent. L'utilisation de la mémoire et l'espace libre par volume ne viennent que de l'intérieur de l'invité : c'est ce qu'ajoute VM Insights.

<!-- section: key-points -->
## Points clés

- L'Analyseur de performances affiche des compteurs en direct ; les jeux de collecteurs de données les enregistrent selon une planification ; les alertes de compteur agissent sur des seuils.
- Performance Monitor Users peut afficher les compteurs à distance ; Performance Log Users peut exécuter des jeux de collecteurs.
- Les alertes WAC sont des alertes Azure Monitor.
- System Insights : prévisions locales, Warning à 30 jours, Critical à 7 jours, tous les jours à 3 h, scripts de correction par état.
- Abonnements aux événements : initiés par la source via GPO pour la grande échelle ; Event Log Readers et WinRM sur les sources.
- AMA + DCR + association ; XPath filtre les événements ; DCR dans la région de l'espace de travail.
- Alertes : métrique, recherche dans les journaux, journal d'activité ; les groupes d'actions notifient ; les règles de traitement des alertes suppriment.
- VM Insights : AMA, OpenTelemetry ou basé sur les journaux (`InsightsMetrics`) ; agent Arc pour les machines hors Azure.
