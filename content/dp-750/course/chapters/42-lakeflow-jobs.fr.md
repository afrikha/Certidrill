Lakeflow Jobs est l'orchestrateur d'Azure Databricks : un job regroupe des tâches, leur calcul, leurs paramètres, leurs déclencheurs, leurs notifications et leurs stratégies de nouvelles tentatives. L'examen demande comment configurer un job pour une exigence donnée : sous quelle identité il s'exécute, quand il démarre, qui est prévenu en cas d'échec et comment il se rétablit tout seul.

<!-- section: create-job | objectives: 4.2.1 -->
## Créer et configurer un job

Dans la barre latérale de l'espace de travail, ouvrez **Jobs & Pipelines** et créez un job, puis ajoutez ses tâches (type, source, paramètres, calcul, dépendances). Un nouveau job s'appelle `New Job <date> <time>` jusqu'à ce que vous le renommiez ; le nom doit être unique. Par défaut, un job ne s'exécute que s'il est lancé manuellement : ajoutez un déclencheur pour l'automatiser.

| Paramètre du job | À savoir |
| --- | --- |
| Calcul | Calcul serverless, **calcul de jobs** classique (un cluster créé pour l'exécution et arrêté ensuite, moins cher qu'un cluster polyvalent) ou un cluster polyvalent. Sans serverless, Databricks recommande le calcul de jobs ; plusieurs tâches peuvent partager un même cluster de job |
| Performance optimized (serverless) | Activé : démarrage plus rapide pour les jobs urgents. Désactivé (standard) : moins de DBU, latence de démarrage de 4 à 6 minutes. Même SKU ; ne concerne que les tâches serverless |
| Paramètres de job | Paires clé-valeur transmises à toutes les tâches qui acceptent des paramètres ; modifiables pour une exécution |
| Max concurrent runs | **1** par défaut. Une exécution qui le dépasserait est ignorée, ou mise en file d'attente si la file est activée |
| Queue | Activée par défaut pour les jobs créés dans l'interface depuis le 15 avril 2024 ; une exécution attend jusqu'à 48 heures quand les limites du job, de l'espace de travail ou des tâches Run Job sont atteintes |
| Seuils de durée | **Warning** (durée attendue, pour les notifications) et **Timeout** (exécution passée à l'état `Timed Out`) |
| Tags | Étiquettes ou paires clé-valeur ; elles se propagent aux clusters du job. Pas pour des valeurs sensibles |
| Git | Les tâches peuvent extraire le code source d'un dépôt Git distant |
| Run as | L'identité dont l'exécution utilise les autorisations ; le propriétaire par défaut |

Autorisations sur un job (chacune inclut celles du dessous) :

| Autorisation | Permet |
| --- | --- |
| IS OWNER | Identité **Run as** par défaut ; un seul propriétaire par job, jamais un groupe ; seuls les administrateurs de l'espace de travail le changent |
| CAN MANAGE | Modifier le job, ses tâches et ses autorisations ; suspendre et reprendre les planifications |
| CAN MANAGE RUN | Déclencher et annuler des exécutions |
| CAN VIEW | Consulter les résultats, les détails, l'historique et l'état des exécutions |

Les exécutions lancées avec **Run now** utilisent les autorisations de l'identité **Run as**, pas celles de l'utilisateur qui a cliqué. Modifier **Run as** demande CAN MANAGE ou IS OWNER, et vous ne pouvez choisir un principal de service que si vous avez le rôle **Service Principal User** sur lui. Par défaut, les administrateurs de l'espace de travail peuvent définir le propriétaire ou **Run as** sur n'importe quel utilisateur ou principal de service de l'espace de travail ; les administrateurs de compte peuvent restreindre ce droit avec le paramètre `RestrictWorkspaceAdmins`. Exécutez les jobs de production sous un principal de service, pour qu'ils ne dépendent pas du compte d'une personne.

```json
{
  "name": "contoso-orders-daily",
  "max_concurrent_runs": 1,
  "queue": { "enabled": true },
  "run_as": { "service_principal_name": "00000000-0000-0000-0000-000000000000" },
  "parameters": [ { "name": "run_date", "default": "{{job.start_time.iso_date}}" } ],
  "tasks": [
    {
      "task_key": "ingest",
      "notebook_task": { "notebook_path": "/Workspace/orders/01_ingest" },
      "max_retries": 2,
      "min_retry_interval_millis": 60000,
      "retry_on_timeout": false,
      "timeout_seconds": 3600
    },
    {
      "task_key": "refresh_gold",
      "depends_on": [ { "task_key": "ingest" } ],
      "run_if": "ALL_SUCCESS",
      "pipeline_task": { "pipeline_id": "<pipeline-id>" }
    }
  ]
}
```

> **Piège d'examen.** Un utilisateur qui a CAN MANAGE RUN peut lancer le job, mais l'exécution reçoit les autorisations de l'identité **Run as**. Accorder `SELECT` sur les tables à l'utilisateur ne corrige pas une exécution qui échoue faute de privilèges : c'est l'identité Run as qui en a besoin.

<!-- section: triggers | objectives: 4.2.2 -->
## Configurer les déclencheurs de job

Ajoutez des déclencheurs dans **Job details > Schedules & Triggers > Add trigger**.

| Déclencheur | Lance une exécution quand | À utiliser pour |
| --- | --- | --- |
| None (manuel) | **Run now**, l'API Jobs ou un orchestrateur externe l'appelle | Exécutions ad hoc, orchestration par Azure Data Factory |
| Scheduled | Une planification horaire se déclenche | Fenêtres de traitement fixes (section suivante) |
| File arrival | De nouveaux fichiers arrivent dans un emplacement externe ou un volume Unity Catalog | Dépôts de fichiers irréguliers |
| Table update | Des tables sources sont mises à jour | Exécuter quand les données en amont sont prêtes |
| Continuous | L'exécution précédente se termine (réussite ou échec) | Streaming toujours actif |

**File arrival** : surveille la racine ou un sous-chemin d'un emplacement externe ou d'un volume, de façon récursive, sans caractères génériques. Il recherche de nouveaux fichiers environ chaque minute, sans autre coût que le listage du stockage. Il faut `READ` sur l'emplacement et CAN MANAGE sur le job. Seuls les nouveaux fichiers déclenchent une exécution : remplacer un fichier portant le même nom ne le fait pas. Avec les **événements de fichiers** (file events) activés sur l'emplacement externe (recommandé ; les activer exige d'être propriétaire de l'emplacement ou d'avoir `MANAGE` sur lui), il n'y a pas de limite de nombre de fichiers ; sans eux, au plus 50 jobs par espace de travail utilisent un tel déclencheur et le chemin contient au plus 10 000 fichiers. Dans la tâche déclenchée, lisez les fichiers avec Auto Loader, `cloudFiles.useManagedFileEvents` défini sur `true` et `trigger(availableNow=True)`, pour que chaque exécution ne traite que les nouveautés.

**Table update** : surveille jusqu'à 10 tables (tables managées Delta ou Iceberg, tables externes Delta, vues matérialisées, tables de diffusion en continu, vues ou vues de métriques sur des tables prises en charge, objets OpenSharing, tables système ; les tables sources d'une vue comptent dans les 10) et démarre quand **une** ou **toutes** sont mises à jour. L'identité **Run as** doit avoir `SELECT` sur chaque table, ainsi que `USE CATALOG` et `USE SCHEMA` ; sinon, l'évaluation du déclencheur échoue. Pour les tables situées dans des emplacements sans événements de fichiers, au plus 1 000 jobs peuvent avoir un déclencheur Table update. `{{job.trigger.table_update.updated_tables}}` liste les tables mises à jour.

Les déclencheurs File arrival et Table update ont deux paramètres facultatifs :

| Paramètre | Modèle | Exemple |
| --- | --- | --- |
| Minimum time between triggers in seconds | Temps de récupération : au plus une exécution par intervalle après la fin d'une exécution | `900` : exécuter au plus toutes les 15 minutes |
| Wait after last change in seconds | Anti-rebond : attendre après la dernière arrivée ou mise à jour ; chaque nouvelle remet le minuteur à zéro | `60` : laisser un lot de fichiers finir d'arriver |

**Continuous** : une exécution toujours active ; une nouvelle exécution démarre moins de 60 secondes après la fin de la précédente. Il ne peut pas être combiné avec d'autres déclencheurs, et les dépendances de tâches avec `Run if` ainsi que les stratégies de nouvelles tentatives par tâche ne sont pas disponibles. Si le job exécute un pipeline, une **Maintenance window** (fenêtre de maintenance, sous **Advanced**) facultative détermine quand sont appliquées les mises à jour qui redémarrent le pipeline. Sur le calcul serverless, `Trigger.ProcessingTime` et `Trigger.Continuous` ne sont pas pris en charge : utilisez un déclencheur borné comme `AvailableNow`, et le planificateur redémarre la tâche quand elle se termine.

Limites : jusqu'à 12 000 déclencheurs actifs par espace de travail (les déclencheurs suspendus ne comptent pas) ; un job peut avoir jusqu'à cinq déclencheurs pendant la bêta Multiple Triggers, chacun suspendu ou repris indépendamment. Dans l'API Jobs 2.1 et versions ultérieures, les déclencheurs vont dans le tableau `triggers` ; ne le mélangez pas avec les anciens champs `schedule`, `trigger` ou `continuous`.

> **Piège d'examen.** « Les fichiers arrivent à des heures imprévisibles ; traitez-les en quelques minutes sans payer de calcul inactif » correspond à un déclencheur **File arrival**, pas à un job continu (toujours actif) ni à une planification toutes les minutes.

<!-- section: schedule | objectives: 4.2.3 -->
## Planifier un job

Un déclencheur **Scheduled** propose deux types de planification :

| Type | Vous définissez | Limitation |
| --- | --- | --- |
| Simple | Une unité et un intervalle (toutes les 12 heures) | Vous ne pouvez pas choisir l'heure de la première exécution |
| Advanced | Période, heure de début et **fuseau horaire** ; **Show Cron Syntax** permet de modifier une expression cron Quartz | |

Une expression cron Quartz comporte des champs pour les secondes, les minutes, les heures, le jour du mois, le mois et le jour de la semaine ; `?` signifie « pas de valeur précise » dans l'un des deux champs de jour.

| Expression | S'exécute |
| --- | --- |
| `0 0 2 * * ?` | Tous les jours à 02:00 |
| `0 30 6 ? * MON-FRI` | Les jours ouvrés à 06:30 |
| `0 0 * * * ?` | Toutes les heures pile |
| `0 0 1 1 * ?` | Le premier jour de chaque mois à 01:00 |

```json
{
  "schedule": {
    "quartz_cron_expression": "0 30 6 ? * MON-FRI",
    "timezone_id": "Europe/Paris",
    "pause_status": "UNPAUSED"
  }
}
```

Règles de planification :

- Au moins **10 secondes** entre les exécutions lancées par une planification, quelle que soit l'expression cron.
- Dans un fuseau horaire avec heure d'été, un job horaire peut être ignoré ou sembler retardé d'une heure ou deux au moment du changement ; choisissez **UTC** pour exécuter à chaque heure absolue.
- Le planificateur n'est pas conçu pour une faible latence : les exécutions peuvent être retardées de plusieurs minutes, et elles démarrent dès que le service est disponible.
- Si l'exécution précédente est encore active et que max concurrent runs vaut 1, l'exécution planifiée est ignorée (ou mise en file d'attente si la file est activée).
- **Pause** arrête les nouvelles exécutions et laisse les exécutions actives se terminer ; **Resume** revient à la même planification.
- Un pipeline se planifie par un job avec une tâche **Pipeline** ; un notebook peut aussi être planifié depuis l'interface du notebook.

> **Conseil d'examen.** « À 06:30 heure locale, du lundi au vendredi » demande une planification **Advanced** avec le fuseau horaire défini ; une planification Simple ne permet pas de fixer l'heure de début.

<!-- section: alerts | objectives: 4.2.4 -->
## Configurer des alertes pour un job

Les notifications se définissent au niveau du **job** (Job details) ou de la **tâche**, par un utilisateur qui a CAN MANAGE ou IS OWNER.

| Événement | Se déclenche quand |
| --- | --- |
| Start | Une exécution démarre |
| Success | Une exécution se termine, y compris à l'état `Succeeded with failures` |
| Failure | Une exécution échoue |
| Duration warning | Une exécution dépasse le seuil de durée **Warning**, qui doit être défini au préalable |
| Streaming backlog (préversion publique) | Le backlog moyen sur 10 minutes dépasse le seuil (puis au plus toutes les 30 minutes) ; pas pour les tâches de pipeline |
| Maintenance start, Maintenance complete | Un job continu doté d'une fenêtre de maintenance configurée commence ou termine une maintenance |

| Destination | Remarques |
| --- | --- |
| Adresses e-mail | Une ou plusieurs |
| Destinations système : Slack, Microsoft Teams, PagerDuty, webhook HTTP | Créées d'abord par un administrateur (**Edit system notifications**) ; au plus **trois** par job ou tâche pour chaque type d'événement |

Options et comportements :

- **Mute notifications for skipped runs** et **Mute notifications for canceled runs** (niveau du job). Elles ne filtrent pas les notifications des tâches.
- **Mute notifications until the last retry** (niveau de la tâche) évite une alerte par tentative en échec.
- Les notifications du job ne sont pas envoyées quand des tâches en échec sont relancées ; utilisez les notifications de tâche pour être informé de chaque tâche en échec.
- Un webhook reçoit `jobs.on_start`, `jobs.on_success`, `jobs.on_failure` ou `jobs.on_duration_warning_threshold_exceeded`. Utilisez un webhook quand vous avez besoin d'un schéma de message stable.
- Un pipeline a ses propres notifications par e-mail sur des conditions de réussite ou d'échec, dans ses paramètres.

> **Piège d'examen.** « Prévenir l'équipe d'astreinte dans Microsoft Teams quand le job échoue » exige qu'un administrateur crée d'abord la destination système Teams ; le propriétaire d'un job ne peut que choisir des destinations existantes.

<!-- section: automatic-restarts | objectives: 4.2.5 -->
## Configurer des redémarrages automatiques

**Nouvelles tentatives de tâche** : dans les paramètres de la tâche, cliquez sur **Add** à côté de **Retries** pour définir combien de fois et à quelle fréquence une tâche en échec est relancée. L'intervalle se mesure entre le début de l'exécution en échec et la tentative suivante. `retry_on_timeout` (false par défaut) décide si une tentative qui a dépassé son délai est relancée ; quand le délai d'expiration et les nouvelles tentatives sont tous deux définis, le délai s'applique à chaque tentative.

| Configuration | Comportement de nouvelle tentative par défaut |
| --- | --- |
| La plupart des configurations de job | Aucune nouvelle tentative |
| Tâches serverless | L'**auto-optimisation** relance les tâches en échec ; décochez **Enable serverless auto-optimization (may include additional retries)** pour les tâches qui doivent s'exécuter au plus une fois |
| Job continu | Interruption exponentielle (exponential backoff) pour tout le job, sans limite du nombre de tentatives |
| Mise à jour de pipeline depuis un job, l'API ou en mode continu | Nouvelle tentative automatique et redémarrage du cluster pour les erreurs récupérables |

**Jobs continus** : les stratégies de nouvelles tentatives par tâche ne sont pas utilisables. Avec **Task retry mode** On failure (la valeur par défaut), une tâche en échec est relancée avec des délais croissants jusqu'à un maximum (trois pour un job à une seule tâche), puis l'exécution est annulée et une nouvelle démarre. Après des échecs répétés, tout le job redémarre avec une période de nouvelle tentative croissante, plafonnée par le système ; l'interruption se réinitialise après une exécution réussie. Pour redémarrer un job en interruption, cliquez sur **Restart run** (cela annule l'exécution active, réinitialise la période de nouvelle tentative et démarre une nouvelle exécution) ou envoyez une requête `run-now` avec l'ID du job. Databricks recommande un job continu plutôt que l'ancien modèle de nouvelles tentatives illimitées avec une seule exécution simultanée.

**Tâches de streaming** : un flux Auto Loader en mode `addNewColumns` s'arrête volontairement quand le schéma change ; une stratégie de nouvelles tentatives sur la tâche (ou un job continu) le redémarre avec le nouveau schéma.

**Pipelines** : dans les exécutions de production (depuis un job, l'API ou en mode continu), le runtime relance un flux en échec jusqu'à `pipelines.maxFlowRetryAttempts` fois (2 par défaut) et toute la mise à jour jusqu'à `pipelines.numUpdateRetryAttempts` fois (5 par défaut pour les pipelines déclenchés, illimité pour les pipelines continus), et redémarre le cluster pour les erreurs récupérables comme les fuites de mémoire ou les informations d'identification expirées. Un **Run now** manuel depuis l'éditeur désactive ces nouvelles tentatives pour le débogage.

| Exigence | Configuration |
| --- | --- |
| Des erreurs réseau transitoires ne doivent pas faire échouer le job de nuit | Nouvelles tentatives de tâche avec un intervalle |
| Un job de streaming doit redémarrer seul après tout échec, indéfiniment | Déclencheur Continuous |
| Une tâche serverless non idempotente ne doit jamais s'exécuter deux fois | Désactiver l'auto-optimisation serverless |
| Une seule alerte après la dernière tentative en échec, pas une par tentative | Notification de tâche avec **Mute notifications until the last retry** |
| Une exécution en échec doit reprendre à partir de la tâche en échec après correction | Réparation de l'exécution (manuelle), pas une nouvelle tentative automatique |

> **Piège d'examen.** Une nouvelle tentative réexécute une tâche après un échec, dans la même exécution ; la **réparation** (repair) réexécute les tâches en échec sélectionnées d'une exécution terminée, après que vous avez corrigé la cause. Un redémarrage automatique est une stratégie de nouvelles tentatives ou un déclencheur Continuous, jamais une réparation.

<!-- section: key-points -->
## Points clés

- Exécutez les jobs de production sous un principal de service ; Run now utilise les autorisations de l'identité Run as ; IS OWNER n'est jamais un groupe.
- Max concurrent runs vaut 1 par défaut ; les exécutions en trop sont ignorées ou mises en file d'attente (jusqu'à 48 heures).
- Déclencheurs : manuel, planifié, arrivée de fichiers, mise à jour de table, continu ; les paramètres de temps de récupération et d'anti-rebond absorbent les rafales.
- Les planifications Advanced utilisent le cron Quartz avec un fuseau horaire ; 10 secondes minimum entre exécutions ; UTC évite les surprises de l'heure d'été.
- Notifications : start, success, failure, duration warning, streaming backlog (préversion publique), maintenance start et complete ; les destinations système viennent d'un administrateur, trois par type d'événement.
- Les nouvelles tentatives sont désactivées par défaut, sauf l'auto-optimisation serverless ; les jobs continus utilisent une interruption exponentielle sans limite ; les pipelines relancent flux et mises à jour dans les exécutions de production.
