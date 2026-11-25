Un modèle qui a réussi son évaluation peut encore se dégrader en production : les données d'entrée changent, les prédictions dérivent, la qualité des données se dégrade ou le point de terminaison ralentit. Azure Machine Learning couvre deux niveaux : la **surveillance des modèles** (des travaux planifiés qui comparent les données de production à une référence et calculent des signaux de dérive, de qualité et de performances) et la **surveillance des points de terminaison** (métriques et journaux Azure Monitor du point de terminaison en ligne). Les questions d'examen demandent quel signal détecte un symptôme, de quelles données et de quelle référence il a besoin, quelle clé YAML définit un seuil, et comment un seuil dépassé peut alerter des personnes ou lancer un réentraînement.

<!-- section: collect-production-data | objectives: 2.4.1 -->
## Collecter les données d'inférence de production

La surveillance a besoin des entrées et sorties que le modèle a réellement vues. Pour les **points de terminaison en ligne**, le **collecteur de données** (data collector) les écrit dans le stockage blob et les inscrit comme ressources de données ; pour les points de terminaison par lots et les modèles déployés hors d'Azure Machine Learning, vous collectez et inscrivez vous-même les données de production.

```yaml
data_collector:
  sampling_rate: 1.0
  rolling_rate: Hour
  collections:
    model_inputs:
      enabled: 'True'
    model_outputs:
      enabled: 'True'
```

```text
# score.py (package azureml-ai-monitoring in the environment)
from azureml.ai.monitoring import Collector

def init():
    global model, inputs_collector, outputs_collector
    inputs_collector = Collector(name="model_inputs")
    outputs_collector = Collector(name="model_outputs")
    # load the model here

def run(data):
    input_df = parse_request(data)                 # pandas DataFrame
    context = inputs_collector.collect(input_df)   # returns the correlation context
    output_df = model.predict(input_df)
    outputs_collector.collect(output_df, context)
    return output_df.tolist()
```

| Fait | Détail |
| --- | --- |
| Noms | `model_inputs` et `model_outputs` sont reconnus automatiquement par la surveillance des modèles ; `request` et `response` sont réservés à la journalisation brute des charges utiles HTTP sans modifier le code |
| Journalisation des charges utiles | Pas forcément tabulaire : la surveillance demande alors un composant de prétraitement, d'où la recommandation du SDK de journalisation personnalisée |
| Modèles MLflow | La collecte de données s'active avec un seul paramètre sur la page de déploiement du studio |
| Type de données | `collect()` ne journalise que des **DataFrames pandas** |
| Corrélation | Un `correlationid` est généré pour joindre entrées et sorties (ou passez votre propre ID) |
| Stockage | `azureml://datastores/workspaceblobstore/paths/modelDataCollector/` puis `{endpoint}/{deployment}/{collection}/{yyyy}/{MM}/{dd}/{HH}/` en JSON Lines |
| Valeurs par défaut | `sampling_rate` 1.0 (100 %), `rolling_rate` `Hour` ; ressources de données nommées `<endpoint>-<deployment>-<collection>` |

> **Piège d'examen.** Par défaut, un échec de `collect()` lève une exception dans votre script de scoring. Passez `on_error` au `Collector` pour journaliser l'erreur au lieu de faire échouer la requête.

<!-- section: drift-signals | objectives: 2.4.1 -->
## Détecter et analyser la dérive des données

Chaque signal de surveillance compare une fenêtre de données de **production** à des données de **référence** et calcule des métriques par rapport à des seuils.

| Signal | Compare | Référence | Métriques |
| --- | --- | --- | --- |
| Dérive des données (data drift) | Distribution des **entrées** du modèle | Données d'entraînement ou données de production récentes | Distance de Jensen-Shannon, indice de stabilité de la population, distance de Wasserstein normalisée, test de Kolmogorov-Smirnov à deux échantillons, test du khi carré de Pearson |
| Dérive des prédictions (prediction drift) | Distribution des **sorties** du modèle | Données de validation ou données de production récentes | Même famille, plus la distance de Chebyshev |
| Qualité des données (data quality) | Intégrité des entrées | Données d'entraînement ou données de production récentes | Taux de valeurs nulles, taux d'erreurs de type de données, taux hors limites |
| Dérive de l'attribution des caractéristiques (préversion) | Importance des caractéristiques en production par rapport à l'entraînement | Données d'entraînement (obligatoires) | Gain cumulé actualisé normalisé (NDCG) |
| Performances du modèle (préversion) | Prédictions par rapport à la **vérité terrain** (ground truth) | Données de vérité terrain (obligatoires) | Classification : exactitude, précision, rappel. Régression : MAE, MSE, RMSE |

Le taux hors limites s'appuie sur la référence : l'intervalle du minimum au maximum pour les caractéristiques numériques, l'ensemble des valeurs connues pour les caractéristiques catégorielles. Fenêtres : la fenêtre de rétrospection de production vaut par défaut la fréquence de surveillance ; la référence peut être une fenêtre fixe (`window_start_date`, `window_end_date`) ou glissante (`lookback_window_size`, `lookback_window_offset`, par exemple `P7D`). Le décalage de la référence vaut par défaut deux fois la `lookback_window_size` de production ; pour que les deux fenêtres ne se chevauchent pas, fixez-le au moins à la taille de la fenêtre de production plus son décalage.

La **surveillance prête à l'emploi** (out-of-box) ne demande que le déploiement : elle détecte les ressources de données collectées, prend les données de production récentes comme référence et exécute la dérive des données, la dérive des prédictions et la qualité des données, en envoyant un e-mail à l'utilisateur qui l'a configurée quand un seuil est dépassé. La **surveillance avancée** choisit les signaux, les données de référence, les caractéristiques et les seuils :

```yaml
$schema: http://azureml/sdk-2-0/Schedule.json
name: churn_model_monitoring
trigger:
  type: recurrence
  frequency: day
  interval: 1
  schedule:
    hours: 3
    minutes: 15
create_monitor:
  compute:
    instance_type: standard_e4s_v3
    runtime_version: "3.4"
  monitoring_target:
    ml_task: classification
    endpoint_deployment_id: azureml:churn-api:blue
  monitoring_signals:
    churn_data_drift:
      type: data_drift
      reference_data:
        input_data:
          path: azureml:churn-train:3
          type: mltable
        data_context: training
        data_column_names:
          target_column: churned
      features:
        top_n_feature_importance: 10
      alert_enabled: true
      metric_thresholds:
        numerical:
          jensen_shannon_distance: 0.01
        categorical:
          pearsons_chi_squared_test: 0.02
    churn_data_quality:
      type: data_quality
      reference_data:
        input_data:
          path: azureml:churn-train:3
          type: mltable
        data_context: training
      alert_enabled: true
      metric_thresholds:
        numerical:
          null_value_rate: 0.05
        categorical:
          out_of_bounds_rate: 0.03
  alert_notification:
    emails:
      - mlops@contoso.com
```

```bash
az ml schedule create --file churn-monitoring.yml
```

Les travaux de surveillance s'exécutent sur un calcul **Spark serverless** (tailles comme `Standard_E4s_v3`, `Standard_E8s_v3`). Microsoft recommande une fréquence quotidienne pour les modèles à fort trafic quotidien, hebdomadaire ou mensuelle sinon. La surveillance des modèles ne prend pas en charge le mode d'isolement de réseau managé `AllowOnlyApprovedOutbound`. Les métriques de dérive sont calculées **par caractéristique** : les résultats montrent quelles caractéristiques ont dérivé ; `top_n_feature_importance` limite la surveillance de la dérive aux caractéristiques les plus importantes, là où une dérive explique le plus probablement une baisse de qualité.

> **Piège d'examen.** La dérive des données porte sur les entrées, la dérive des prédictions sur les sorties, et aucune des deux n'a besoin d'étiquettes. Seul le signal de performances du modèle (préversion) mesure l'exactitude, et il a besoin de la **vérité terrain** jointe aux prédictions par un ID de corrélation. « Les clients ont changé » relève de la dérive des données ; « le modèle prédit maintenant deux fois plus d'attrition » relève de la dérive des prédictions ; « des valeurs nulles sont apparues » relève de la qualité des données.

<!-- section: performance-metrics | objectives: 2.4.2 -->
## Surveiller les métriques de performances des modèles déployés

Deux types de performances comptent : la qualité du **modèle** sur les données réelles et la santé opérationnelle du **point de terminaison**.

La qualité du modèle utilise le signal `model_performance`, en **préversion** pour la classification et la régression (sans SLA, déconseillé pour les charges de travail de production) ; la dérive des données, la dérive des prédictions et la qualité des données sont les signaux en disponibilité générale. La vérité terrain arrive plus tard (par exemple, si le client est réellement parti) et elle est inscrite comme ressource de données avec le même ID de corrélation :

```yaml
  monitoring_signals:
    churn_model_performance:
      type: model_performance
      production_data:
        input_data:
          path: azureml:churn-api-blue-model_outputs:1
          type: mltable
        data_column_names:
          prediction: churned
          correlation_id: correlation_id
      reference_data:
        input_data:
          path: azureml:churn-ground-truth:1
          type: mltable
        data_column_names:
          actual: churned
          correlation_id: correlation_id
        data_context: ground_truth
      alert_enabled: true
      metric_thresholds:
        tabular_classification:
          accuracy: 0.95
          precision: 0.8
```

La santé du point de terminaison vient d'**Azure Monitor** :

| Source | Contenu | Usage |
| --- | --- | --- |
| Métriques du point de terminaison | Latence des requêtes, requêtes par minute, nouvelles connexions par seconde, octets réseau ; détail par déploiement ou par état | Tendances de latence et d'erreurs, règles d'alerte |
| Métriques du déploiement | Utilisation du CPU, du GPU, de la mémoire et du disque, jusqu'à l'instance | Dimensionnement et mise à l'échelle automatique |
| `AmlOnlineEndpointTrafficLog` | Chaque requête : `ResponseCode` (renvoyé au client) et `ModelStatusCode` (renvoyé par le modèle), déploiement, `TotalDurationMs`, `RequestDurationMs`, `ResponseDurationMs`, `RequestThrottlingDelayMs`, `ResponseThrottlingDelayMs` | Quel déploiement renvoie des erreurs, d'où vient la latence |
| `AmlOnlineEndpointConsoleLog` | Sortie console du conteneur (stdout) | Erreurs affichées par `score.py` |
| `AmlOnlineEndpointEventLog` | Événements du conteneur : `LivenessProbeFailed`, `ReadinessProbeFailed`, `BackOff`, `Killing`, `Started` | Redémarrages et échecs de sondes |
| Application Insights | Métriques en temps réel, vues des échecs et des performances du déploiement (`app_insights_enabled: true`) | Traçage au niveau de l'application |

Les trois tables de journaux demandent un **paramètre de diagnostic** sur le point de terminaison qui envoie les journaux à un espace de travail Log Analytics (comptez jusqu'à une heure pour les premières données). La limitation due aux limites de bande passante apparaît dans la métrique des octets réseau et dans les en-têtes de fin de réponse `ms-azureml-bandwidth-request-delay-ms` et `ms-azureml-bandwidth-response-delay-ms`.

> **Conseil d'examen.** « Quel déploiement renvoie des erreurs 5xx et combien de temps prend le modèle » → interrogez `AmlOnlineEndpointTrafficLog`. « Pourquoi le conteneur redémarre » → `AmlOnlineEndpointEventLog`. « L'exactitude du modèle a baissé » → le signal de performances du modèle (préversion), pas les métriques du point de terminaison.

<!-- section: alerts-retraining | objectives: 2.4.3 -->
## Configurer des alertes et des déclencheurs de réentraînement

| Mécanisme | Déclencheur | Action type |
| --- | --- | --- |
| `alert_enabled` + `metric_thresholds` + `alert_notification.emails` dans le moniteur | Un signal dépasse son seuil | E-mail aux adresses listées |
| Azure Event Grid sur l'espace de travail | L'exécution du travail de surveillance échoue à cause d'un dépassement de seuil | Application logique, Azure Function, webhook ou pipeline Azure Data Factory qui soumet le pipeline de réentraînement |
| Règle d'alerte Azure Monitor sur une métrique du point de terminaison | Latence, erreurs ou CPU au-dessus d'un seuil | Groupe d'actions (e-mail, SMS, webhook, runbook) |
| Ressource de planification | Le temps | Pipeline de réentraînement périodique |

Pour un seuil de surveillance, créez un abonnement aux événements sur l'espace de travail :

1. Type d'événement : **Run status changed** uniquement. Ne sélectionnez pas **Dataset drift detected**, qui concerne la dérive des données v1 et non la surveillance des modèles.
2. Filtre avancé : clé `data.RunTags.azureml_modelmonitor_threshold_breached`, opérateur **String contains**, valeur **has failed due to one or more features violating metric thresholds**.
3. Ajoutez éventuellement un filtre sur le nom du signal pour ne réagir qu'à un seul signal.
4. Point de terminaison : une application logique ou une Azure Function qui appelle `az ml job create` (ou le SDK) pour le pipeline de réentraînement, lequel se termine par l'évaluation et l'inscription d'une nouvelle version du modèle.

Événements d'espace de travail disponibles dans Event Grid :

| Type d'événement | Déclenché quand |
| --- | --- |
| `Microsoft.MachineLearningServices.RunCompleted` | Une exécution se termine |
| `Microsoft.MachineLearningServices.RunStatusChanged` | Une exécution change d'état |
| `Microsoft.MachineLearningServices.ModelRegistered` | Un modèle ou une version de modèle est inscrit (filtre sur les étiquettes du modèle ou sur le sujet `models/<name>:<version>` : un filtre sur le nom du modèle doit porter sur le début du sujet, pas sur sa fin) |
| `Microsoft.MachineLearningServices.ModelDeployed` | Des modèles sont déployés sur un point de terminaison |

Les opérations en échec ou annulées ne déclenchent pas les événements de réussite (un déploiement en échec ne déclenche aucun `ModelDeployed`). Créer des abonnements demande Contributor ou Owner sur l'espace de travail et le fournisseur de ressources `Microsoft.EventGrid` inscrit.

Le réentraînement basé sur le temps utilise une planification, qui ne peut pas être déclenchée par un événement :

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/schedule.schema.json
name: churn_weekly_retraining
trigger:
  type: cron
  expression: "0 2 * * 1"
  time_zone: "W. Europe Standard Time"
create_job: ./churn-training-pipeline.yml
```

```bash
az ml schedule create --file retraining-schedule.yml
az ml schedule disable --name churn_weekly_retraining
```

`trigger.type` vaut `recurrence` (`frequency` : minute, hour, day, week ou month, plus `interval` et éventuellement `schedule` avec heures, minutes, jours de la semaine) ou `cron` (les champs jour du mois et mois sont ignorés). `time_zone` vaut UTC par défaut. Désactivez une planification avant de la supprimer ; la suppression est irréversible.

> **Piège d'examen.** Un modèle réentraîné ne doit pas remplacer automatiquement la production : le pipeline inscrit une nouvelle version, et une étape distincte, soumise à validation, la déploie sur `green` avec 0 % de trafic pour un déploiement sécurisé. Event Grid et les planifications démarrent le pipeline ; ils ne décident pas si le nouveau modèle est meilleur.

<!-- section: key-points -->
## Points clés

- Le collecteur de données (`model_inputs`, `model_outputs`, DataFrames pandas) alimente la surveillance des points de terminaison en ligne ; les modèles par lots et externes ont besoin de leurs propres ressources de données.
- Dérive des données = entrées, dérive des prédictions = sorties, qualité des données = valeurs nulles, types, hors limites ; les performances du modèle (préversion) demandent la vérité terrain.
- Surveillance prête à l'emploi : dérive des données, dérive des prédictions et qualité des données par rapport aux données de production récentes, e-mails au créateur.
- Les moniteurs sont des planifications (`az ml schedule create`) exécutées sur Spark serverless, avec des `metric_thresholds` par signal.
- Santé du point de terminaison : métriques Azure Monitor, plus journaux de trafic, de console et d'événements via un paramètre de diagnostic.
- Les dépassements de seuil arrivent dans Event Grid sous forme de **Run status changed** avec l'étiquette `azureml_modelmonitor_threshold_breached` ; une application logique ou une Function lance le réentraînement.
- Les planifications gèrent le réentraînement périodique ; déployez le modèle réentraîné par un déploiement sécurisé.
