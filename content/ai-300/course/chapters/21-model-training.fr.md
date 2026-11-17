Dans Azure Machine Learning, l'entraînement est un ensemble de travaux (jobs) : un script s'exécute dans un travail de commande, un travail de balayage (sweep) le règle, un travail AutoML cherche les algorithmes à votre place et un travail de pipeline enchaîne les étapes. MLflow enregistre ce que chaque exécution a fait pour que vous puissiez comparer les exécutions et choisir un modèle. Les questions d'examen donnent un YAML de travail ou un extrait du SDK v2 à compléter, une contrainte (coût le plus bas, recherche la plus rapide, GPU sur plusieurs nœuds) et demandent quelle clé, quelle valeur ou quel type de travail convient.

<!-- section: mlflow-tracking | objectives: 2.1.1 -->
## Suivi des expériences avec MLflow

Les espaces de travail Azure Machine Learning sont des serveurs de suivi MLflow. Chaque espace de travail a un URI de suivi qui commence par `azureml://`.

| Où le code s'exécute | Ce que vous configurez |
| --- | --- |
| Travail sur un cluster de calcul ou un calcul serverless, notebook sur une instance de calcul | Rien : l'URI de suivi est défini automatiquement |
| Machine locale, Azure Synapse Analytics, Azure Databricks | Installer `mlflow` et `azureml-mlflow`, puis `mlflow.set_tracking_uri()` avec l'URI de l'espace de travail |
| Cluster partagé hors d'Azure Machine Learning | La variable d'environnement `MLFLOW_TRACKING_URI` au niveau du cluster |

```bash
pip install mlflow azureml-mlflow
az ml workspace show --query mlflow_tracking_uri
```

Hors d'Azure Machine Learning, le plug-in essaie l'authentification dans cet ordre : variables d'environnement, identité managée, Azure CLI, Azure PowerShell, puis navigateur interactif. Le navigateur interactif bloque le code sans surveillance : définissez donc `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` et `AZURE_CLIENT_SECRET` pour un principal de service (secret conservé dans Azure Key Vault).

Les exécutions vont dans l'expérience active : `Default`, sauf si vous appelez `mlflow.set_experiment()` ou définissez `experiment_name` dans le YAML du travail.

```text
import mlflow

mlflow.set_experiment("churn-training")
mlflow.autolog()                      # params, metrics and model for supported frameworks

with mlflow.start_run(run_name="rf-baseline"):
    mlflow.log_param("n_estimators", 200)
    mlflow.log_params({"max_depth": 8, "criterion": "gini"})
    mlflow.log_metric("val_auc", 0.91)
    mlflow.log_metric("loss", 0.42, step=3)
    mlflow.log_figure(fig, "roc.png")
    mlflow.log_artifact("outputs/report.html")
    mlflow.sklearn.log_model(model, "model")
```

| Appel | Enregistre |
| --- | --- |
| `log_metric(key, value, step=...)` | Une valeur numérique ; des appels répétés forment une courbe (`step` vaut 0 par défaut) |
| `log_param` / `log_params` | Des valeurs de configuration, une seule ou un dictionnaire |
| `log_artifact` / `log_artifacts` | Un fichier existant / le contenu d'un dossier |
| `log_figure`, `log_image`, `log_text`, `log_dict` | Un graphique, une image, du texte, un dictionnaire en JSON ou YAML |
| `mlflow.<flavor>.log_model` | Un modèle au format MLflow (voir le chapitre suivant) |
| `MlflowClient().log_batch(...)` | Plusieurs métriques en un seul appel |

`mlflow.autolog(log_models=False)` enregistre tout sauf le modèle. Pour enregistrer beaucoup de valeurs sans ralentir l'entraînement, évitez `log_metric` dans des boucles serrées : utilisez `log_batch` ou la journalisation asynchrone (`mlflow.config.enable_async_logging()` ou `synchronous=False`, MLflow 2.8.0+ et `azureml-mlflow` 1.55+).

> **Piège d'examen.** Un travail d'entraînement n'a besoin ni de `set_tracking_uri()` ni d'informations d'identification : Azure Machine Learning les injecte. Ajouter un principal de service au script n'est la bonne réponse que si le code s'exécute hors du calcul de l'espace de travail.

<!-- section: notebooks | objectives: 2.1.3 -->
## Notebooks pour l'expérimentation

Les notebooks du studio sont la partie interactive du cycle de vie : explorer les données, essayer des caractéristiques, appeler MLflow à la main, puis déplacer le code dans un script et un travail.

| Fait | Détail |
| --- | --- |
| Calcul | Modifier ne demande aucun calcul ; **exécuter des cellules demande une instance de calcul**. Une instance de calcul arrêtée démarre quand vous exécutez la première cellule |
| Stockage | Les fichiers sont dans **Fichiers utilisateur** (User files), dans le compte de stockage de l'espace de travail, dans un dossier au nom de l'utilisateur, partagé par toutes les instances de calcul de l'espace de travail |
| Partage | Les instances de calcul sont personnelles : la personne qui ouvre votre notebook partagé l'exécute sur sa propre instance. Contributor peut le modifier, Reader seulement le consulter |
| Noyaux | Tous les noyaux Jupyter installés sur l'instance de calcul sont listés ; changer de noyau ou de calcul réinitialise les variables |
| Autres éditeurs | Jupyter, JupyterLab, VS Code Desktop ou VS Code pour le Web connectés à la même instance de calcul |
| Packages | `%pip install` et `%conda install` (les commandes magiques ciblent le noyau en cours), pas `!pip` |
| Historique | Enregistrement automatique toutes les 30 secondes ; points de contrôle nommés pour revenir en arrière ; export en Python, HTML ou LaTeX |

Un notebook n'est pas un artefact de production : il dépend de l'instance de calcul d'une personne et de l'ordre des cellules. Pour un entraînement reproductible, exportez ou réécrivez la logique sous forme de script, puis soumettez-le comme travail de commande ou étape de pipeline. Le même client `azure-ai-ml` utilisé dans le notebook peut soumettre le travail.

> **Piège d'examen.** Un cluster de calcul ne peut pas exécuter de cellules de notebook. « Interactif », « notebook » et « explorer » désignent une instance de calcul ; « planifié », « reproductible » et « montée en charge » désignent un travail sur un cluster ou un calcul serverless.

<!-- section: training-scripts | objectives: 2.1.5 -->
## Exécuter des scripts d'entraînement dans des travaux de commande

Un **travail de commande** (command job) charge un dossier de code, exécute une commande dans un environnement sur une cible de calcul, et enregistre les entrées, les sorties, les journaux et les métriques.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
type: command
code: ./src
command: >-
  python train.py
  --data ${{inputs.training_data}}
  --learning-rate ${{inputs.learning_rate}}
  --model-dir ${{outputs.model_dir}}
inputs:
  training_data:
    type: uri_folder
    path: azureml:churn-data@latest
    mode: ro_mount
  learning_rate: 0.01
outputs:
  model_dir:
    type: uri_folder
environment: azureml:AzureML-sklearn-1.5@latest
compute: azureml:cpu-cluster
experiment_name: churn-training
display_name: churn-train-lr001
limits:
  timeout: 3600
```

```bash
az ml job create --file job.yml --resource-group rg-ml --workspace-name mlw-contoso
az ml job stream --name <job-name>
```

| Clé | Valeurs à connaître |
| --- | --- |
| `environment` | `azureml:<name>:<version>`, `azureml:<name>@latest`, ou en ligne (image + fichier conda, sans nom ni version). Les environnements organisés (curated) commencent par `AzureML-` |
| `compute` | `azureml:<compute-name>` ; `local` n'est pas pris en charge dans les pipelines ; **omettez `compute` pour exécuter sur un calcul serverless** |
| `inputs.<name>.mode` | `ro_mount` (par défaut), `download`, `direct` (vous gérez l'URL de stockage et les informations d'identification) |
| `outputs.<name>.mode` | `rw_mount` (par défaut) ou `upload` (fichiers écrits à la fin du travail) |
| `limits.timeout` | Durée maximale en secondes ; le travail est annulé ensuite |
| `identity.type` | `user_identity` (l'auteur de la soumission), `managed` (l'identité managée du calcul), `aml_token` |
| `resources.shm_size` | Mémoire partagée, `2g` par défaut (à augmenter pour les chargeurs de données PyTorch) |

Le **calcul serverless** supprime la gestion des clusters : aucun calcul à créer, vous choisissez seulement `resources.instance_type` et `resources.instance_count`, ainsi que `queue_settings.job_tier` (`Spot` pour des machines virtuelles de faible priorité, `Standard` pour des machines virtuelles dédiées). Il exécute les travaux de commande, de balayage, AutoML, parallèles et de pipeline, utilise l'identité de l'utilisateur ou l'identité managée affectée par l'utilisateur de l'espace de travail (pas d'identité affectée par le système), fonctionne avec l'isolement de réseau managé et consomme toujours le quota de calcul de l'espace de travail. Sans type d'instance, il utilise un nœud CPU dédié.

> **Conseil d'examen.** Les valeurs d'entrée dans la commande s'écrivent `${{inputs.<name>}}` et les chemins de sortie `${{outputs.<name>}}`. Un `path` local est chargé à la soumission ; `azureml:<asset>@latest` lit une ressource de données inscrite.

<!-- section: automl | objectives: 2.1.2 -->
## Machine learning automatisé

AutoML entraîne en parallèle de nombreuses combinaisons d'algorithmes et de caractérisation, et les classe selon une **métrique principale**. C'est la réponse quand l'exigence est « trouver le meilleur modèle avec le moins de code » pour des données tabulaires, des images ou du texte.

| Données | Types de tâches |
| --- | --- |
| Tabulaires | `classification`, `regression`, `forecasting` |
| Images | Classification d'images, détection d'objets |
| Texte | Classification de texte, reconnaissance d'entités nommées |

Les données d'entraînement tabulaires doivent être une **MLTable** contenant la colonne cible.

```text
from azure.ai.ml import automl, Input
from azure.ai.ml.constants import AssetTypes

job = automl.classification(
    compute="cpu-cluster",
    experiment_name="churn-automl",
    training_data=Input(type=AssetTypes.MLTABLE, path="azureml:churn-train@latest"),
    target_column_name="churned",
    primary_metric="AUC_weighted",
    n_cross_validations=5,
    enable_model_explainability=True,
)
job.set_limits(timeout_minutes=120, trial_timeout_minutes=20,
               max_trials=40, max_concurrent_trials=4,
               enable_early_termination=True)
job.set_training(blocked_training_algorithms=["logistic_regression"])
job.set_featurization(mode="auto")
ml_client.jobs.create_or_update(job)
```

| Paramètre | Détail |
| --- | --- |
| Métriques de classification | `accuracy`, `AUC_weighted`, `average_precision_score_weighted`, `norm_macro_recall`, `precision_score_weighted`. Préférez `AUC_weighted` sur des données petites ou déséquilibrées |
| Métriques de régression et de prévision | `r2_score`, `normalized_mean_absolute_error`, `normalized_root_mean_squared_error`, `spearman_correlation` |
| Validation par défaut | Plus de 20 000 lignes : 10 % réservés à la validation. 20 000 lignes ou moins : validation croisée (10 plis sous 1 000 lignes, 3 plis sinon) |
| `timeout_minutes` | Le travail entier, 8 640 minutes (6 jours) par défaut |
| `trial_timeout_minutes` | Un essai |
| `max_trials` | 1 000 par défaut |
| `max_concurrent_trials` | Essais en parallèle ; alignez-le sur le nombre de nœuds du cluster |
| `enable_early_termination` | Arrête le travail quand le score ne s'améliore plus |
| Algorithmes | `allowed_training_algorithms` ou `blocked_training_algorithms` |
| Ensembles | `enable_vote_ensemble`, `enable_stack_ensemble` |
| Caractérisation | `auto` (par défaut), `off` ou `custom` (imputeurs, transformateurs bloqués, types de colonnes) |

Chaque essai est un travail enfant ; le meilleur porte le modèle, ses métriques et, si l'explicabilité est activée, l'importance des caractéristiques.

> **Piège d'examen.** AutoML n'accepte ni un chemin CSV ni un `uri_folder` comme données d'entraînement tabulaires : il lui faut une MLTable. Et la métrique doit correspondre à la tâche : `r2_score` pour un travail de classification est invalide.

<!-- section: hyperparameter-tuning | objectives: 2.1.4 -->
## Réglage des hyperparamètres avec les travaux de balayage

Un **travail de balayage** (sweep job) exécute votre travail de commande de nombreuses fois avec différentes valeurs d'hyperparamètres et garde le meilleur essai selon une métrique que le script enregistre.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/sweepJob.schema.json
type: sweep
trial:
  code: ./src
  command: >-
    python train.py
    --data ${{inputs.training_data}}
    --learning-rate ${{search_space.learning_rate}}
    --max-depth ${{search_space.max_depth}}
  environment: azureml:AzureML-sklearn-1.5@latest
inputs:
  training_data:
    type: uri_folder
    path: azureml:churn-data@latest
compute: azureml:cpu-cluster
sampling_algorithm: random
search_space:
  learning_rate:
    type: loguniform
    min_value: -6
    max_value: -1
  max_depth:
    type: choice
    values: [4, 8, 16]
objective:
  goal: maximize
  primary_metric: val_auc
early_termination:
  type: bandit
  slack_factor: 0.1
  evaluation_interval: 1
  delay_evaluation: 5
limits:
  max_total_trials: 40
  max_concurrent_trials: 4
  timeout: 7200
  trial_timeout: 900
```

| Échantillonnage | Prend en charge | Quand l'utiliser |
| --- | --- | --- |
| `random` | Discret et continu ; `rule: sobol` avec un `seed` | Choix par défaut ; exploration large et peu coûteuse |
| `grid` | **`choice` uniquement** | Petit espace discret à couvrir entièrement |
| `bayesian` | `choice`, `uniform`, `quniform` | Chaque essai s'appuie sur les résultats précédents ; prévoyez au moins 20 essais par hyperparamètre et moins d'essais simultanés |

Types d'espace de recherche : `choice` et `randint` (discrets) ; `uniform`, `loguniform`, `normal`, `lognormal` et leurs variantes `q` (`quniform`, `qloguniform`, `qnormal`, `qlognormal`). `loguniform` échantillonne entre `exp(min_value)` et `exp(max_value)`.

| Arrêt anticipé | Règle |
| --- | --- |
| `bandit` | Annule les essais dont la métrique sort de `slack_factor` (ratio) ou `slack_amount` (valeur absolue) par rapport au meilleur essai |
| `median_stopping` | Annule les essais sous la médiane des moyennes courantes de tous les essais |
| `truncation_selection` | Annule les `truncation_percentage` % d'essais les moins bons à chaque intervalle |
| Aucun (par défaut) | Tous les essais vont jusqu'au bout |

`evaluation_interval` se compte en valeurs enregistrées de la métrique principale ; `delay_evaluation` ignore les premiers intervalles. Dans les limites, `max_total_trials` et `timeout` arrêtent le balayage au premier atteint ; `trial_timeout` plafonne chaque essai.

> **Piège d'examen.** `objective.primary_metric` doit correspondre exactement au nom que le script enregistre avec `mlflow.log_metric()`. Un balayage sur `accuracy` alors que le script enregistre `val_accuracy` ne produit aucun classement. De même, `grid` avec un paramètre `uniform` est invalide.

<!-- section: distributed-training | objectives: 2.1.6 -->
## Entraînement distribué pour les modèles volumineux et d'apprentissage profond

L'entraînement distribué exécute un seul travail sur plusieurs processus et nœuds. Le parallélisme des données distribué (chaque GPU détient une copie du modèle et traite une partie des données, `DistributedDataParallel` de PyTorch) est le bon choix dans la plupart des cas. Vous déclarez le framework dans `distribution` et le nombre de nœuds dans `resources` :

```yaml
distribution:
  type: pytorch
  process_count_per_instance: 4
resources:
  instance_count: 2
compute: azureml:gpu-cluster
```

| `distribution.type` | Clés | Azure Machine Learning fournit |
| --- | --- | --- |
| `pytorch` | `process_count_per_instance` (1 par défaut) | `MASTER_ADDR`, `MASTER_PORT`, `WORLD_SIZE`, `NODE_RANK`, `RANK`, `LOCAL_RANK` ; aucun `torch.distributed.launch` nécessaire |
| `tensorflow` | `worker_count` (vaut `instance_count` par défaut), `parameter_server_count` (0 par défaut, TensorFlow 1.x hérité) | `TF_CONFIG` sur chaque worker |
| `mpi` | `process_count_per_instance` (obligatoire) | Lancement MPI, utilisé par exemple par DeepSpeed |

Réglez `process_count_per_instance` sur le **nombre de GPU par nœud** : l'exemple ci-dessus exécute 8 processus (`WORLD_SIZE` 8) sur deux nœuds de 4 GPU. Sans ce réglage, un seul processus s'exécute par nœud et les autres GPU restent inactifs. Pour PyTorch sur GPU, initialisez le groupe de processus avec le backend `nccl`. DeepSpeed s'exécute avec la distribution PyTorch ou MPI.

L'entraînement GPU multinœud est limité par la communication entre les nœuds. **InfiniBand** demande des tailles compatibles RDMA, généralement avec un **r** dans le nom (`Standard_NC24rs_v3` l'a, `Standard_NC24s_v3` non) ; les clusters de calcul de ces tailles sont livrés avec les pilotes InfiniBand configurés.

> **Piège d'examen.** `resources.instance_count` est le nombre de **nœuds**, pas de GPU. Deux nœuds de quatre GPU chacun demandent `instance_count: 2` et `process_count_per_instance: 4`, pas `instance_count: 8`.

<!-- section: training-pipelines | objectives: 2.1.7 -->
## Pipelines d'entraînement

Un **travail de pipeline** enchaîne des **composants** réutilisables (préparer, entraîner, évaluer, inscrire) pour que chaque étape s'exécute sur son propre calcul, transmette des données à l'étape suivante et puisse être réutilisée quand rien n'a changé.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
type: command
name: train_churn_model
version: 3
inputs:
  training_data:
    type: uri_folder
  learning_rate:
    type: number
    default: 0.01
outputs:
  model_output:
    type: uri_folder
code: ./train_src
environment: azureml:AzureML-sklearn-1.5@latest
command: >-
  python train.py --data ${{inputs.training_data}}
  --learning-rate ${{inputs.learning_rate}}
  --model-dir ${{outputs.model_output}}
```

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/pipelineJob.schema.json
type: pipeline
display_name: churn-training-pipeline
inputs:
  raw_data:
    type: uri_folder
    path: azureml:churn-raw@latest
outputs:
  trained_model:
    mode: rw_mount
settings:
  default_compute: azureml:cpu-cluster
  continue_on_step_failure: false
jobs:
  prep:
    type: command
    component: ./prep.yml
    inputs:
      raw_data: ${{parent.inputs.raw_data}}
  train:
    type: command
    component: azureml:train_churn_model:3
    compute: azureml:gpu-cluster
    inputs:
      training_data: ${{parent.jobs.prep.outputs.clean_data}}
    outputs:
      model_output: ${{parent.outputs.trained_model}}
```

| Liaison | Sens |
| --- | --- |
| `${{parent.inputs.<name>}}` | Une entrée du pipeline transmise à une étape |
| `${{parent.jobs.<step>.outputs.<name>}}` | La sortie d'une étape précédente ; crée la dépendance et l'ordre |
| `${{parent.outputs.<name>}}` | Promeut une sortie d'étape en sortie du pipeline |

| Paramètre | Par défaut | Effet |
| --- | --- | --- |
| `default_compute` | aucun | Calcul des étapes sans `compute` propre ; `azureml:serverless` pour le calcul serverless |
| `default_datastore` | Magasin de données blob de l'espace de travail | Où les sorties sont écrites |
| `continue_on_step_failure` | `True` | `False` arrête le pipeline et annule les étapes en cours quand une étape échoue |
| `force_rerun` | `False` | `True` réexécute toutes les étapes au lieu de réutiliser les sorties précédentes |

Les composants sont **déterministes** par défaut (`is_deterministic: true`) : une étape dont le code, l'environnement, les entrées et les paramètres n'ont pas changé réutilise la sortie précédente. Mettez-le à `false` pour une étape qui lit des données depuis une URL qui change. Les étapes d'un pipeline sont des travaux de commande ou de balayage. Inscrivez les composants avec `az ml component create --file train.yml`, exécutez le pipeline avec `az ml job create --file pipeline.yml` et planifiez-le avec une ressource de planification (voir le chapitre sur la surveillance).

> **Piège d'examen.** Une étape ne s'exécute pas après une autre à cause de sa position dans le YAML : l'ordre vient des liaisons de données. Une étape qui doit attendre `prep` doit consommer une sortie de `prep`.

<!-- section: compare-jobs | objectives: 2.1.8 -->
## Comparer les performances des modèles entre les travaux

Dans le studio, **Travaux** (Jobs) liste tous les travaux (filtre par expérience). L'onglet **Métriques** trace les valeurs enregistrées ; **Sorties + journaux** contient `user_logs/std_log.txt`. Avec la fonctionnalité de panneau d'aperçu activée, vous sélectionnez plusieurs travaux et comparez côte à côte leurs paramètres, métriques et étiquettes. Un travail parent de balayage ou AutoML classe ses essais enfants selon la métrique principale.

Dans le code, `mlflow.search_runs()` renvoie un DataFrame pandas avec des colonnes `params.*` et `metrics.*` :

```text
import mlflow

runs = mlflow.search_runs(
    experiment_names=["churn-training"],
    filter_string="metrics.val_auc > 0.85 AND attributes.status = 'Finished'",
)
best = runs.sort_values("metrics.val_auc", ascending=False).head(1)

child_runs = mlflow.search_runs(
    filter_string=f"tags.mlflow.parentRunId = '{parent_run_id}'"
)
history = mlflow.tracking.MlflowClient().get_metric_history(run_id, "loss")
```

| Règle dans Azure Machine Learning | Conséquence |
| --- | --- |
| Les filtres se combinent avec `AND` uniquement | Pas de `OR` ; lancez deux requêtes |
| `order_by` n'accepte ni `metrics.*`, ni `params.*`, ni `tags.*` | Triez avec `sort_values` de pandas |
| Les paramètres se filtrent avec `=`, `!=`, `like` | Les paramètres sont des chaînes : `params.num_boost_round='100'` |
| Les valeurs `attributes.*` sont des chaînes entre guillemets | `attributes.status = 'Failed'` |
| La recherche renvoie la **dernière** valeur de chaque métrique | Utilisez `get_metric_history` pour la courbe |
| Aucune expérience indiquée | Recherche dans l'expérience active seulement ; `search_all_experiments=True` élargit la recherche |

> **Conseil d'examen.** Pour choisir la meilleure exécution par programmation, filtrez avec `search_runs` et triez le DataFrame ; pour comparer visuellement quelques exécutions, sélectionnez-les dans la liste des travaux et comparez-les.

<!-- section: key-points -->
## Points clés

- Les travaux sur le calcul Azure Machine Learning journalisent dans MLflow sans configuration ; en dehors, installez `azureml-mlflow` et définissez l'URI de suivi.
- Les notebooks s'exécutent sur une instance de calcul ; l'entraînement de production s'exécute en travaux de commande ou de pipeline, sur un cluster ou un calcul serverless (omettez `compute`).
- AutoML demande des données MLTable et une métrique principale adaptée à la tâche ; les limites plafonnent la durée et les essais.
- Balayage : `grid` n'accepte que `choice`, `bayesian` s'appuie sur les résultats précédents, `primary_metric` doit correspondre exactement au nom enregistré.
- Distribué : `instance_count` = nœuds, `process_count_per_instance` = GPU par nœud ; InfiniBand demande une taille avec « r ».
- Les pipelines ordonnent les étapes par les liaisons de données ; la réutilisation est activée par défaut, `force_rerun` la désactive.
- `search_runs` filtre avec AND uniquement et ne trie pas par métrique : triez avec pandas.
