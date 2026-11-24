Un modèle entraîné devient un actif géré quand vous l'inscrivez : il reçoit un nom, une version, une traçabilité (lineage) vers le travail qui l'a produit, et tout ce dont le déploiement a besoin. Ce chapitre couvre le format de modèle MLflow, l'inscription depuis une exécution ou une sortie de travail, l'empaquetage d'une spécification de récupération de caractéristiques avec le modèle, le tableau de bord IA responsable, et les commandes de cycle de vie (mise à jour, archivage, restauration, partage). Les questions d'examen demandent quel URI ou quelle commande inscrit un modèle en gardant sa traçabilité, ce qu'apporte le format MLflow et ce que devient un modèle archivé.

<!-- section: feature-retrieval-spec | objectives: 2.2.1 -->
## Empaqueter une spécification de récupération de caractéristiques

Quand les caractéristiques proviennent d'un **magasin de caractéristiques managé** (managed feature store) Azure Machine Learning, le modèle doit être servi avec exactement les caractéristiques sur lesquelles il a été entraîné. La **spécification de récupération de caractéristiques** (feature retrieval specification) est une définition portable de la liste de caractéristiques associée à un modèle. Vous la créez pendant l'expérimentation, elle devient une entrée du pipeline d'entraînement, et elle est **empaquetée avec le modèle**.

```text
features = [
    accounts_featureset.get_feature("accountAge"),
    transactions_featureset.get_feature("transaction_amount_7d_sum"),
]
features += featurestore.resolve_feature_uri(
    ["transactions:1:transaction_amount_3d_sum"]   # feature set:version:feature
)

featurestore.generate_feature_retrieval_spec(spec_folder, features)
```

| Phase | Utilisation de la spécification |
| --- | --- |
| Expérimentation | `generate_feature_retrieval_spec(folder, features)` écrit la spécification des caractéristiques sélectionnées |
| Pipeline d'entraînement | Le composant intégré de **récupération de caractéristiques** (feature retrieval) prend la spécification, les données d'observation et le nom de la **colonne d'horodatage**, joint les caractéristiques à la date de chaque observation et produit les données d'entraînement, dans un travail Spark managé |
| Inscription | L'étape d'inscription du modèle du pipeline empaquette la spécification avec le modèle : elle fait désormais partie de la définition du modèle |
| Inférence par lots | Le même composant de récupération de caractéristiques prend le **modèle inscrit** en entrée et cherche la spécification dans l'artefact du modèle, puis joint les caractéristiques aux données d'observation avant le scoring |

Le fichier doit s'appeler **`feature_retrieval_spec.yaml`** quand vous l'empaquetez avec le modèle, pour que le système le reconnaisse. Utiliser la spécification et le composant intégré est facultatif : le code peut aussi appeler directement `get_offline_features()`, mais plus rien ne lie alors le modèle à sa liste de caractéristiques.

Le composant de récupération de caractéristiques n'exige qu'une de ses entrées `input_model` (un `custom_model`) et `feature_retrieval_spec`, et produit toujours des données Parquet avec `feature_retrieval_spec.yaml` à la racine du dossier de sortie. Quand les données d'entraînement viennent d'une autre méthode, comme `get_offline_features()`, passez la spécification au travail d'entraînement comme entrée et copiez-la dans le dossier du modèle dans le script d'entraînement.

> **Piège d'examen.** La spécification voyage **dans l'artefact du modèle**, pas comme une ressource de données séparée ni comme une variable d'environnement. Un pipeline d'inférence par lots qui reçoit le modèle inscrit l'y trouve ; s'il ne reçoit que les données d'observation, il n'a aucune liste de caractéristiques à récupérer.

<!-- section: mlflow-models | objectives: 2.2.2 -->
## Le format de modèle MLflow

Un modèle MLflow est un dossier qui contient un fichier **MLmodel**, la source unique de vérité pour charger le modèle, ainsi que le modèle sérialisé et son environnement (`conda.yaml`).

```yaml
artifact_path: classifier
flavors:
  fastai:
    data: model.fastai
    fastai_version: 2.4.1
  python_function:
    data: model.fastai
    env: conda.yaml
    loader_module: mlflow.fastai
    python_version: 3.8.12
model_uuid: e694c68eba484299976b06ab9058f636
run_id: e13da8ac-b1e6-45d4-a9b2-6a0a5cfac537
signature:
  inputs: '[{"type": "tensor", "tensor-spec": {"dtype": "uint8", "shape": [-1, 300, 300, 3]}}]'
  outputs: '[{"type": "tensor", "tensor-spec": {"dtype": "float32", "shape": [-1, 2]}}]'
```

| Élément | Rôle |
| --- | --- |
| Saveur (flavor) | Manière propre à un framework d'enregistrer et de charger (`sklearn`, `fastai`...). La saveur `python_function` (pyfunc) fournit une fonction `predict` générique, que le déploiement sans code appelle |
| Signature | Contrat de données entre le modèle et le serveur. **Basée sur les colonnes** (tabulaire, DataFrame pandas) ou **basée sur les tenseurs** (tableaux numpy). Quand elle existe, MLflow impose les types d'entrée et Azure Machine Learning génère un fichier swagger pour le déploiement |
| Environnement | `conda.yaml`, utilisé pour reconstruire le runtime |

```text
import mlflow
from mlflow.models import infer_signature

signature = infer_signature(X_test, model.predict(X_test))
with mlflow.start_run() as run:
    mlflow.sklearn.log_model(model, "model", signature=signature)
```

Enregistrer un modèle MLflow plutôt qu'un simple artefact `model.pkl` permet de déployer sur des points de terminaison en ligne ou par lots **sans script de scoring ni environnement** (déploiement sans code), d'utiliser l'onglet **Tester** du studio, de passer le modèle en entrée d'un pipeline et de créer un tableau de bord IA responsable. Autolog déduit une signature au mieux ; enregistrez-la explicitement quand celle qui est déduite est fausse.

> **Piège d'examen.** `mlflow.log_artifact("model.pkl")` stocke un fichier, pas un modèle : le résultat ne peut pas être inscrit comme `mlflow_model` ni profiter du déploiement sans code. Utilisez `mlflow.<flavor>.log_model()`.

<!-- section: register-models | objectives: 2.2.2 -->
## Inscrire un modèle

Un modèle inscrit est un **nom** plus des **versions** immuables. Types : `mlflow_model`, `custom_model` (n'importe quel fichier ou dossier), `triton_model`.

| Source | Commande | Traçabilité vers le travail |
| --- | --- | --- |
| Exécution MLflow | `az ml model create --name churn --version 1 --path runs:/<run-id>/model/ --type mlflow_model` | Oui |
| Sortie de travail | `--path azureml://jobs/<job-name>/outputs/artifacts/paths/model/` (équivalent à `runs:/` pour l'emplacement d'artefacts par défaut ; fonctionne aussi pour les sorties nommées) | Oui |
| Magasin de données | `--path azureml://datastores/<datastore>/paths/models/churn/` | Non |
| Dossier local | YAML avec `path: ./model` et `az ml model create -f model.yml` (les fichiers sont chargés) | Non |

```bash
az ml model create --name churn-classifier --version 4 \
  --path azureml://jobs/<job-name>/outputs/artifacts/paths/model/ \
  --type mlflow_model --resource-group rg-ml --workspace-name mlw-contoso
```

```text
# MLflow SDK, from the run that logged the model (same workspace)
mlflow.register_model(f"runs:/{run.info.run_id}/model", "churn-classifier")

client = mlflow.tracking.MlflowClient()
client.update_model_version("churn-classifier", version=4, description="AUC 0.91")
client.set_model_version_tag("churn-classifier", version="4", key="validated", value="true")
model = mlflow.pyfunc.load_model("models:/churn-classifier/4")
```

Dans un pipeline, une étape finale d'**inscription** n'inscrit le modèle que si l'étape d'évaluation a réussi : chaque version inscrite est ainsi rattachée à un travail d'entraînement, à des données et à des métriques. URI de chargement : `models:/<name>/<version>` et `models:/<name>/latest`.

> **Conseil d'examen.** « Conserver la traçabilité », « remonter du modèle au travail » → inscrivez depuis `runs:/` ou `azureml://jobs/...`, ou depuis l'exécution elle-même avec `mlflow.register_model`. Charger depuis un portable les fichiers téléchargés perd le lien avec le travail.

<!-- section: responsible-ai | objectives: 2.2.3 -->
## Évaluer un modèle à l'aide des principes d'IA responsable

Les principes d'IA responsable de Microsoft sont l'équité, la fiabilité et la sécurité, la confidentialité et la sécurité, l'inclusivité, la transparence et la responsabilité. Le **tableau de bord IA responsable** (Responsible AI dashboard) les traduit en analyses d'un modèle inscrit :

| Composant | Question traitée | Principe |
| --- | --- | --- |
| Analyse des erreurs | Quelles cohortes (sous-groupes de données) ont le taux d'erreur le plus élevé ? | Fiabilité et sécurité |
| Vue d'ensemble du modèle et métriques d'équité | Les métriques de performances diffèrent-elles entre groupes (âge, genre, région) ? | Équité et inclusivité |
| Analyse des données | Les données sont-elles équilibrées et représentatives selon les caractéristiques et les cohortes ? | Équité |
| Importance des caractéristiques (explications du modèle) | Quelles caractéristiques déterminent les prédictions, globalement et pour une ligne ? | Transparence |
| Simulation contrefactuelle (what-if) | Quel changement minimal inverserait une prédiction ? (`total_CFs` : 10 par ligne de test par défaut) | Transparence, responsabilité |
| Analyse causale | Quel est l'effet de la modification d'une caractéristique de traitement sur un résultat réel ? | Responsabilité |

Exigences et construction :

- Le modèle doit être inscrit **au format MLflow avec la saveur `sklearn`**, chargeable et sérialisable avec pickle. Types de tâches : `classification`, `regression` (et `forecasting`). Les modèles MLflow AutoML et les modèles AutoML inscrits depuis l'interface utilisateur ne sont pas pris en charge.
- Les données d'entraînement et de test sont des entrées **`mltable`**. Par défaut, le jeu de test affiché dans l'interface est limité à 5 000 lignes (`maximum_rows_for_test_dataset`).
- Le tableau de bord est un pipeline de composants du registre `azureml` : **RAI Insights dashboard constructor** et **Gather RAI Insights dashboard** sont toujours obligatoires, plus au moins un composant d'outil (Add Explanation, Add Causal, Add Counterfactuals, Add Error Analysis), référencés sous la forme `azureml://registries/azureml/components/microsoft_azureml_rai_tabular_insight_constructor/versions/<version>` et ainsi de suite. Le modèle inscrit est passé à l'entrée de modèle du constructeur avec `type: mlflow_model` et `path: azureml:<name>:<version>`. Vous générez le tableau de bord depuis l'interface du studio ou avec la CLI ou le SDK.
- Une analyse uniquement causale demande quand même un modèle : utilisez `DummyClassifier` ou `DummyRegressor`.

Pour le consulter, ouvrez le modèle inscrit et sélectionnez l'onglet **IA responsable** ; plusieurs tableaux de bord peuvent être attachés à un même modèle. Les fonctionnalités interactives (contrefactuels what-if, graphiques ICE, changement des cohortes de l'analyse des erreurs) demandent une **instance de calcul en cours d'exécution** connectée au tableau de bord. Moindre privilège pour l'utiliser : Reader plus AzureML Compute Operator. La **carte de performance IA responsable** (Responsible AI scorecard, préversion, composant `rai_score_card`) exporte un résumé PDF avec des seuils cibles pour les métriques, les principales caractéristiques (10 au maximum) et l'équité en `difference` ou `ratio`, pour les parties prenantes qui n'utilisent pas le studio.

> **Piège d'examen.** Une exactitude globale peut masquer un sous-groupe en échec. « Trouver les cohortes où le modèle échoue » relève de l'analyse des erreurs ; « comparer les résultats entre groupes » relève de l'équité ; « expliquer pourquoi ce demandeur a été refusé » relève de l'importance des caractéristiques pour un point de données.

<!-- section: model-lifecycle | objectives: 2.2.4 -->
## Gérer le cycle de vie des modèles et l'archivage

| Opération | Commande | Comportement |
| --- | --- | --- |
| Mettre à jour | `az ml model update --name churn-classifier --version 4 --set tags.stage="Prod"` | Seuls `description` et `tags` changent ; tout le reste demande une nouvelle version |
| Lister | `az ml model list --name churn-classifier` | Les versions archivées sont masquées par défaut ; `--include-archived` ou `--archived-only` |
| Archiver une version | `az ml model archive --name churn-classifier --version 2` | Masquée des requêtes de liste ; **toujours utilisable** par référence explicite |
| Archiver le modèle | `az ml model archive --name churn-classifier` | Sans version : archive **toutes** les versions ; les versions créées ensuite sont archivées elles aussi |
| Restaurer | `az ml model restore --name churn-classifier` | Si le conteneur entier a été archivé, restaurez d'abord le conteneur, pas des versions isolées |
| Partager | `az ml model share --name churn-classifier --version 4 --registry-name reg-contoso --share-with-name churn-classifier --share-with-version 4` | Copie la version dans un registre pour l'utiliser depuis d'autres espaces de travail |
| Télécharger | `az ml model download --name churn-classifier --version 4 --download-path ./local` | Tous les fichiers du modèle |
| Supprimer une version | `MlflowClient().delete_model_version(name, version="2")` | Supprimer tout le modèle revient à supprimer chaque version |

Un modèle ne peut pas être renommé : créez un nouveau nom et inscrivez-le à nouveau. Un cycle de vie type utilise des étiquettes pour l'état (`stage=Staging`, `stage=Prod`, `validated=true`), inscrit chaque modèle réentraîné comme nouvelle version, garde la version de production précédente disponible pour un retour arrière, et archive les versions obsolètes pour alléger les listes sans casser les déploiements ou pipelines qui les référencent encore.

Les **phases** (stages) MLflow (`Staging`, `Production`, `Archived`, définies avec `transition_model_version_stage`) n'existent qu'à travers le SDK MLflow dans Azure Machine Learning : elles ne sont pas affichées dans le studio, ne peuvent pas être lues avec la CLI ou le SDK Azure Machine Learning, et vous ne pouvez pas déployer « depuis une phase ». Utilisez plutôt des étiquettes ou des versions explicites. Ne les confondez pas avec le paramètre `--stage` de `az ml model create`, `update` et `list` (« Stage of the model » dans la référence de la CLI) : les phases MLflow ne peuvent toujours pas être lues avec la CLI Azure Machine Learning.

> **Piège d'examen.** Archiver n'est pas supprimer. Une version archivée disparaît des requêtes de liste comme `az ml model list`, mais un déploiement ou un travail qui référence `churn-classifier:2` continue de fonctionner. Pour qu'elle ne soit plus utilisée, mettez à jour les déploiements ; pour l'éliminer, supprimez la version.

<!-- section: key-points -->
## Points clés

- La spécification de récupération de caractéristiques est générée pendant l'expérimentation, nommée `feature_retrieval_spec.yaml` et empaquetée dans l'artefact du modèle ; l'inférence par lots la lit dans le modèle inscrit.
- Les modèles MLflow portent un fichier MLmodel, des saveurs et une signature : déploiement sans code, swagger et prise en charge de l'IA responsable.
- Inscrivez depuis `runs:/` ou `azureml://jobs/...` pour garder la traçabilité ; les versions sont immuables sauf la description et les étiquettes.
- Tableau de bord IA responsable : modèle MLflow `sklearn`, données `mltable`, constructeur + gather + au moins un outil ; la carte de performance (préversion) exporte un PDF.
- Archiver masque sans supprimer ; restaurez le conteneur s'il a été archivé en entier ; le partage copie une version dans un registre.
- Les phases MLflow ne sont pas visibles des outils Azure Machine Learning : utilisez les étiquettes et les versions.
