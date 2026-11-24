Les actifs sont les briques versionnées que les travaux et les déploiements référencent par leur nom : ressources de données, environnements, composants et modèles. Les questions d'examen demandent quel type de ressource de données convient aux données, comment définir un environnement à partir d'une image, d'un Dockerfile ou d'un fichier conda, comment écrire et inscrire un composant puis le brancher dans un pipeline, et comment partager tout cela entre espaces de travail avec un registre.

<!-- section: data-assets | objectives: 1.2.1 -->
## Créer et gérer des ressources de données

Une **ressource de données** (data asset) est une référence nommée et versionnée à des données, comme un favori de navigateur : les données restent où elles sont (pas de copie, pas de coût de stockage supplémentaire) et les travaux utilisent `azureml:<name>:<version>` ou `azureml:<name>@latest` au lieu d'un long URI. Une ressource de données n'est pas obligatoire : un travail peut lire directement un URI de magasin de données.

| Type | Pointe vers | À utiliser pour |
| --- | --- | --- |
| `uri_file` | Un seul fichier, de tout format | Un fichier CSV ou Parquet |
| `uri_folder` | Un dossier | Fichiers Parquet ou CSV lus dans pandas ou Spark ; données non structurées (images, texte, audio) |
| `mltable` | Un dossier qui contient un fichier `MLTable` | Données tabulaires au schéma qui change souvent, sous-ensemble d'une grande table, AutoML avec des tables, données réparties sur plusieurs emplacements de stockage |

Le `path` peut être un chemin local (chargé automatiquement dans le magasin de données par défaut), `azureml://datastores/<datastore>/paths/<path>`, une URL `https` publique ou un URI de stockage (`wasbs://`, `abfss://`).

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/data.schema.json
type: uri_folder
name: sales-transactions
version: "3"
description: Daily sales extracts, curated zone
path: azureml://datastores/lake_curated/paths/sales/2026/
tags:
  medallion: silver
```

```bash
az ml data create -f sales-transactions.yml
az ml data list --output table
az ml data update --name sales-transactions --version 3 --set tags.sensitivity=nonPII
```

Une ressource `mltable` se crée à partir d'un dossier qui contient un fichier nommé exactement `MLTable` (pas `MLTable.yaml`), qui liste les chemins et les étapes de chargement :

```yaml
paths:
  - file: wasbs://data@stcontososales.blob.core.windows.net/churn.csv
transformations:
  - read_delimited:
      delimiter: ','
      header: all_files_same_headers
      encoding: utf8
  - drop_columns:
      - CustomerId
type: mltable
```

```bash
az ml data create --path ./churn --name churn-table --version 1 --type mltable
```

**Les versions sont immuables.** Une version de ressource de données ne peut être ni modifiée ni supprimée : les travaux restent reproductibles, la traçabilité montre quels travaux ont utilisé quelle version, et l'historique d'audit reste complet. Au lieu de supprimer :

| Problème | Solution |
| --- | --- |
| Nom incorrect, ressource plus utilisée, liste encombrée | Archiver la ressource de données |
| Chemin incorrect | Créer une nouvelle version du même nom avec le bon chemin |
| Type incorrect | L'archiver et créer une ressource sous un autre nom : une nouvelle version ne peut pas changer de type |

```bash
az ml data archive --name sales-transactions               # all versions
az ml data archive --name sales-transactions --version 2   # one version
az ml data restore --name sales-transactions
```

Une ressource archivée est masquée dans `az ml data list` et dans la liste du studio, mais les travaux peuvent toujours l'utiliser. Si toutes les versions ont été archivées, vous devez restaurer toutes les versions, pas une seule.

Une sortie de travail peut devenir une ressource de données : donnez un `name` à la sortie, et le travail l'inscrit quand il écrit les données.

```yaml
outputs:
  scored:
    type: uri_folder
    mode: rw_mount
    path: azureml://datastores/workspaceblobstore/paths/scoring/2026-11/
    name: scored-customers
```

Modes d'accès des entrées et sorties de travail :

| Mode | Sens | Comportement |
| --- | --- | --- |
| `ro_mount` | Entrée | Montage en lecture seule du chemin de stockage |
| `download` | Entrée | Données copiées sur le disque du calcul avant le démarrage du travail |
| `direct` | Entrée | L'URI est passé sous forme de chaîne ; votre code le lit |
| `rw_mount` | Sortie | Montage en lecture-écriture |
| `upload` | Sortie | Les fichiers écrits localement sont chargés à la fin du travail |
| `eval_mount`, `eval_download` | Entrée, `mltable` uniquement | Le runtime de données évalue le fichier `MLTable`, puis monte ou télécharge les chemins listés |

> **Piège d'examen.** « Créer la version 2 d'une ressource `uri_file` existante en `mltable` » est impossible : le type est fixé pour un nom. Et « supprimer la ressource de données incorrecte » n'est jamais disponible : archivez-la.

<!-- section: environments | objectives: 1.2.2 -->
## Créer et gérer des environnements

Un **environnement** définit le conteneur Docker dans lequel s'exécute un travail ou un déploiement : image de base, packages Python, variables d'environnement. Azure Machine Learning construit l'image, la stocke dans le registre de conteneurs de l'espace de travail et la met en cache : le temps de construction complet n'est payé qu'une fois par définition.

Les **environnements organisés** (curated) sont maintenus par Microsoft (frameworks courants, correctifs de sécurité, images en cache). Dans la CLI et le SDK, leurs noms commencent par `AzureML-` ; le studio les affiche dans un onglet séparé, sans le préfixe. Référencez-les depuis le registre système `azureml` :

```yaml
environment: azureml://registries/azureml/environments/sklearn-1.5/labels/latest
```

Les **environnements personnalisés** ont trois sources possibles :

| Source | Clés YAML | Quand l'image est construite |
| --- | --- | --- |
| Image Docker | `image` | Pas de construction : l'image est tirée |
| Contexte de build Docker | `build.path` (dossier avec un Dockerfile de 1 Mo maximum), `build.dockerfile_path` facultatif (par défaut `Dockerfile` à la racine) | Dès la création de l'environnement |
| Fichier conda plus image de base | `image` et `conda_file` | À la première utilisation de l'environnement par un travail ou un déploiement |

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/environment.schema.json
name: churn-train-env
version: "4"
image: mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04
conda_file: conda.yml
description: scikit-learn 1.5 and MLflow for churn training
```

```yaml
# conda.yml
name: churn-train
channels:
  - conda-forge
dependencies:
  - python=3.10
  - pip
  - pip:
      - scikit-learn==1.5.2
      - mlflow
      - azureml-mlflow
```

```bash
az ml environment create --file churn-train-env.yml
az ml environment list --name churn-train-env
az ml environment show --name churn-train-env --version 4
az ml environment update --name churn-train-env --version 4 --set description="Validated by QA"
az ml environment archive --name churn-train-env --version 3
```

Les règles qui décident des réponses :

- Avec un fichier conda, Azure Machine Learning construit un environnement conda au-dessus de l'image de base et y exécute le travail : les packages Python installés dans l'image de base ne sont pas disponibles pour le travail.
- Seuls `description` et `tags` d'une version d'environnement peuvent être mis à jour. Tout autre changement (un package, l'image) exige une nouvelle version.
- Un environnement défini en ligne dans un travail, sans `name` ni `version`, est un environnement non inscrit (anonyme) : il n'est pas suivi comme actif.
- Référencez un environnement inscrit avec `azureml:<name>:<version>` ou `azureml:<name>@latest`.
- Archiver une version ne supprime pas son image en cache dans le registre de conteneurs. Une nouvelle version créée sous un nom archivé est archivée elle aussi.
- La construction de l'image utilise un jeton Microsoft Entra vers le registre de l'espace de travail qui dure de 60 à 90 minutes : une construction plus longue échoue.
- Par défaut, les images sont construites sur un calcul serverless, ce qui ne fonctionne que si les ressources dépendantes de l'espace de travail (compte de stockage, registre de conteneurs) n'ont aucune restriction réseau. Derrière des points de terminaison privés, définissez `image_build_compute` sur l'espace de travail avec un cluster de calcul CPU dans le même réseau virtuel ; un cluster sans adresse IP publique a besoin d'un itinéraire défini par l'utilisateur pour atteindre Internet (référentiels de packages, Microsoft Container Registry).

> **Piège d'examen.** « Le package est installé dans l'image Docker de base, mais le travail lève `ModuleNotFoundError` » indique une spécification conda au-dessus de l'image : ajoutez le package au `conda_file`, ou utilisez un environnement image seule ou Dockerfile.

<!-- section: components | objectives: 1.2.3 -->
## Créer et gérer des composants

Un **composant** est une étape de pipeline autonome et versionnée, comme une fonction : des métadonnées (nom, version, type), une interface (entrées et sorties) et la commande, le code et l'environnement qui l'exécutent. Les composants permettent aux équipes de construire, tester et versionner les étapes indépendamment, et de les réutiliser entre pipelines, espaces de travail et abonnements.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
type: command
name: train_churn_model
display_name: Train churn model
version: 2
inputs:
  training_data:
    type: uri_folder
  learning_rate:
    type: number
    default: 0.01
    min: 0.0001
    max: 1
  model_kind:
    type: string
    enum: [logistic, gradient_boosting]
    default: logistic
outputs:
  model_output:
    type: mlflow_model
code: ./train_src
environment: azureml:churn-train-env:4
command: >-
  python train.py
  --data ${{inputs.training_data}}
  --lr ${{inputs.learning_rate}}
  --kind ${{inputs.model_kind}}
  --model ${{outputs.model_output}}
```

| Clé | Règle |
| --- | --- |
| `name` | Obligatoire ; commence par une lettre minuscule ; lettres minuscules, chiffres et traits de soulignement ; 255 caractères maximum |
| `command`, `environment` | Obligatoires |
| `inputs` | Types littéraux (`string`, `number`, `integer`, `boolean`) avec `default`, `min`, `max` ou `enum` ; types objets (`uri_file`, `uri_folder`, `mltable`, `mlflow_model`) qui relient les étapes |
| `is_deterministic` | Par défaut `true` : l'étape réutilise le résultat précédent si ses entrées n'ont pas changé. Mettez `false` pour forcer une réexécution, par exemple pour recharger des données depuis une URL |
| `code` | Dossier local chargé à la soumission du travail |

`min`, `max` et `enum` sont vérifiés à la validation du pipeline, avant la soumission. Ajouter une entrée demande trois modifications : `inputs`, `command` et l'analyse des arguments dans le script.

```bash
az ml component create --file train.yml
az ml component list --output table
az ml component show --name train_churn_model --version 2
az ml component archive --name train_churn_model --version 1
```

Les composants inscrits sont versionnés automatiquement ; `az ml component update` ne modifie que quelques champs comme `description` et `display_name`.

Un travail de pipeline référence les composants par fichier ou par nom inscrit, et relie les données entre les étapes :

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/pipelineJob.schema.json
type: pipeline
display_name: churn-training
settings:
  default_compute: azureml:cpu-cluster
inputs:
  raw_data:
    type: uri_folder
    path: azureml:sales-transactions:3
outputs:
  trained_model:
    type: mlflow_model
jobs:
  prep:
    type: command
    component: ./prep.yml
    inputs:
      raw: ${{parent.inputs.raw_data}}
  train:
    type: command
    component: azureml:train_churn_model@latest
    inputs:
      training_data: ${{parent.jobs.prep.outputs.clean_data}}
      learning_rate: 0.05
    outputs:
      model_output: ${{parent.outputs.trained_model}}
```

| Expression | Relie |
| --- | --- |
| `${{inputs.x}}`, `${{outputs.x}}` | Dans la `command` d'un composant : la valeur ou le chemin de sa propre entrée ou sortie |
| `${{parent.inputs.x}}` | Une entrée d'étape à une entrée du pipeline |
| `${{parent.jobs.step.outputs.y}}` | Une entrée d'étape à la sortie d'une autre étape (ce qui ordonne aussi les étapes) |
| `${{parent.outputs.x}}` | Une sortie d'étape à une sortie du pipeline |

`settings.default_compute` s'applique à chaque étape qui ne définit pas son propre `compute` ; utilisez `azureml:serverless` pour le calcul serverless.

> **Piège d'examen.** Une étape qui lit des données fraîches depuis une URL mais affiche « réutilisée » et se termine en quelques secondes réutilise un résultat précédent : mettez `is_deterministic: false` sur ce composant.

<!-- section: registries | objectives: 1.2.4 -->
## Partager des actifs entre espaces de travail à l'aide de registres

Un **registre** Azure Machine Learning est un catalogue à l'échelle de l'organisation de **modèles, environnements, composants et ressources de données** que tout espace de travail d'une région prise en charge peut utiliser. Deux scénarios : le MLOps entre espaces de travail (entraîner en `dev`, déployer en `test` et `prod` en gardant la traçabilité vers le travail d'entraînement) et le partage d'actifs entre équipes. Le calcul, les travaux et les points de terminaison restent dans les espaces de travail : un travail qui utilise un composant de registre s'exécute sur le calcul de l'espace de travail avec les données de l'espace de travail.

```yaml
# registry.yml
name: contoso_ml_registry
location: westeurope
replication_locations:
  - location: westeurope
  - location: northeurope
  - location: eastus
```

```bash
az ml registry create --file registry.yml --resource-group rg-ml-shared
```

| Règle | Détail |
| --- | --- |
| Régions | La `location` principale figure aussi dans `replication_locations`. La région principale ne peut pas changer ; les autres régions peuvent être mises à jour |
| Espaces de travail | Un espace de travail ne peut utiliser le registre que si sa région fait partie des régions du registre |
| Nom | 2 à 32 caractères (lettres, chiffres, `_` et `-`, en commençant par une lettre ou un chiffre), unique dans le locataire Microsoft Entra, non modifiable |
| Ressources créées | Un compte de stockage par région et un registre de conteneurs répliqué dans chaque région |
| Tirage d'images | L'identité managée du registre a AcrPull sur son registre de conteneurs ; les calculs des espaces de travail reçoivent un jeton limité, pas un accès direct |

Les mêmes commandes CLI ciblent un registre avec `--registry-name` au lieu d'un espace de travail :

```bash
az ml environment create --file churn-train-env.yml --registry-name contoso_ml_registry
az ml component create --file train.yml --registry-name contoso_ml_registry
az ml model create --name churn-model --version 1 --type mlflow_model \
  --path ./artifacts/model/ --registry-name contoso_ml_registry

# Copy a model already registered in a workspace (name and version in the registry are required)
az ml model share --name churn-model --version 7 --registry-name contoso_ml_registry \
  --share-with-name churn-model --share-with-version 7
```

Les actifs de registre se référencent par des URI de registre, par exemple dans un déploiement en ligne :

```yaml
model: azureml://registries/contoso_ml_registry/models/churn-model/versions/7
environment: azureml://registries/contoso_ml_registry/environments/churn-train-env/versions/4
```

Dans le SDK Python, créez un second `MLClient` avec `registry_name` et `registry_location` au lieu d'un nom d'espace de travail. Un registre ne contient que des actifs nommés, et un actif de registre ne peut référencer que des actifs qui existent déjà dans un registre : créez l'environnement dans le registre (ou utilisez un environnement organisé) avant le composant qui l'utilise.

Autorisations sur les registres :

| Besoin | Rôle |
| --- | --- |
| Parcourir et utiliser les actifs du registre dans un espace de travail | Reader, ou un rôle personnalisé avec `registries/read` et `registries/assets/read` |
| Publier et supprimer des actifs, sans gérer le registre | AzureML Registry User, ou un rôle personnalisé qui ajoute `registries/assets/write` et `registries/assets/delete` |
| Créer, mettre à jour ou supprimer des registres | Contributor ou Owner sur le groupe de ressources ou l'abonnement |

| Exigence | Réponse |
| --- | --- |
| Promouvoir le modèle validé de l'espace de travail de dev vers la prod avec sa traçabilité | Partager ou créer le modèle dans un registre, déployer depuis l'URI du registre en prod |
| Un composant d'entraînement utilisé par les espaces de travail de plusieurs équipes | Créer le composant et son environnement dans un registre |
| Les utilisateurs doivent publier des actifs mais ne doivent pas supprimer le registre | AzureML Registry User, pas Contributor |
| Un nouvel espace de travail dans une autre région ne voit pas les actifs du registre | Ajouter cette région aux emplacements de réplication du registre |

> **Piège d'examen.** Contributor sur un registre permet aussi de supprimer le registre lui-même. Quand l'exigence est « gérer uniquement les actifs », répondez AzureML Registry User ou un rôle personnalisé avec les autorisations `registries/assets/*`.

<!-- section: key-points -->
## Points clés

- `uri_file` pour un fichier, `uri_folder` pour un dossier, `mltable` pour des tables définies par un fichier `MLTable` ; le type associé à un nom de ressource de données ne peut pas changer.
- Les versions de ressources de données sont immuables et ne peuvent pas être supprimées : archivez-les, ou créez une nouvelle version pour un chemin incorrect.
- Les environnements proviennent d'une image, d'un contexte de build ou d'un fichier conda plus une image ; seuls `description` et `tags` peuvent être mis à jour.
- Environnements organisés : préfixe `AzureML-` dans la CLI, référencés depuis `azureml://registries/azureml/...`.
- Composants : `name`, `command` et `environment` obligatoires ; `is_deterministic` vaut `true` par défaut (réutilisation) ; reliez les étapes avec `${{parent.jobs.<step>.outputs.<name>}}`.
- Les registres partagent modèles, environnements, composants et données entre les espaces de travail de leurs régions ; ajoutez `--registry-name` aux commandes habituelles ; la région principale et le nom sont définitifs.
