Un projet d'ingénierie des données est un logiciel : des notebooks, des modules Python, des fichiers SQL et les définitions des jobs et des pipelines qui les exécutent. Ce chapitre couvre le contrôle de version avec les dossiers Git, les branches et les pull requests, une stratégie de test à quatre niveaux, puis l'empaquetage et le déploiement d'un bundle avec l'interface CLI Databricks ou par les API REST. Les questions décrivent une équipe, un dépôt et des contraintes (isolation, privilège minimum, aucune étape manuelle) et demandent quelle pratique, quelle commande ou quelle configuration convient.

<!-- section: git-folders | objectives: 4.3.1 -->
## Contrôle de version avec les dossiers Git

Les **dossiers Git** (Git folders, anciennement Repos) sont un client Git visuel et une API dans l'espace de travail. Un dossier Git est connecté à un dépôt distant (Azure DevOps, GitHub, GitLab, Bitbucket...) et en reflète la structure : vous clonez, créez des branches, validez (commit), poussez (push), tirez (pull) et fusionnez sans quitter Azure Databricks.

Pour cloner : **Workspace** > emplacement cible > **Create** > **Git folder**, saisissez l'URL du dépôt (`https://example.com/organization/project.git`), choisissez le fournisseur, nommez le dossier, puis **Create Git folder**.

Ce que les dossiers Git placent sous contrôle de version, et ce qu'ils n'y placent pas :

| Ressource | Versionnée dans le dossier Git ? |
| --- | --- |
| Notebooks, fichiers Python, fichiers SQL, autres fichiers d'espace de travail | Oui |
| Sorties des notebooks, formats source (`.py`, `.sql`, `.scala`, `.r`) | Non, les sorties ne sont pas validées par défaut |
| Sorties des notebooks, format IPYNB | Oui, si vous devez versionner les sorties |
| Configuration des jobs et des pipelines, paramètres de publication des tableaux de bord | Non : utilisez un bundle pour les placer sous contrôle de source |

Les bonnes pratiques attendues à l'examen :

- **Un dossier Git par développeur**, mappé sur le dépôt partagé : dans un dossier partagé, un utilisateur qui change de branche la change pour tout le monde.
- **Tirer régulièrement**, surtout avant un nouveau travail. Un pull qui modifie la source d'un notebook efface ses sorties, ses commentaires et son historique de versions.
- **`.gitignore`** exclut les sorties temporaires, les informations d'identification et la configuration propre à un environnement ; un fichier déjà suivi doit d'abord être retiré de Git.
- **Supprimer les branches fusionnées** chez le fournisseur ; une branche locale persiste jusqu'à 30 jours après la suppression de sa branche distante.
- **Placer les fonctions dans des fichiers `.py`** et les importer dans les notebooks : le code est réutilisable et testable unitairement.

Limites : **1 Go** par branche de travail, moins de **20 000** ressources recommandées ; utilisez le **sparse checkout** pour un dépôt volumineux.

Les **dossiers Git de production** sont créés par un administrateur hors de `/Workspace/Users/`, contiennent une branche de déploiement et ne sont mis à jour que par l'automatisation lorsqu'une pull request est fusionnée. Les utilisateurs du projet, et les principaux de service qui exécutent de l'automatisation sur le dossier, reçoivent **Can Run** (éventuellement **Can View** pour tous les autres) ; seuls les administrateurs et les principaux de service les modifient. Le principal de service a besoin d'informations d'identification Git pour le dépôt.

> **Piège d'examen.** Un dossier Git ne versionne que du code. Pour versionner et promouvoir la **définition du job** (tâches, planification, calcul) avec le code, utilisez un bundle.

<!-- section: branching-pull-requests | objectives: 4.3.2 -->
## Branches, pull requests et conflits

Chaque développeur travaille sur une **branche de fonctionnalité** créée à partir de `main` et nommée de façon cohérente :

| Modèle | Usage |
| --- | --- |
| `feature/feature-name` | Nouvelle fonctionnalité |
| `bugfix/issue-description` | Correctif |
| `users/username/description` | Travail de développement personnel |

Créez une branche depuis la boîte de dialogue Git > **Create branch**. Quand vous changez de branche :

- Les **modifications non validées sont reportées** sur la nouvelle branche si elles n'entrent pas en conflit ; annulez-les d'abord si vous ne les voulez pas.
- Les ressources absentes de la branche cible sont **supprimées de l'espace de travail** ; vérifiez avant de changer, surtout pour les notebooks partagés ou mis en favori.

Pour valider : ouvrez la boîte de dialogue Git, examinez les différences visuelles, saisissez un message, puis **Commit & Push**. Si `main` est une branche protégée, poussez une branche de fonctionnalité et ouvrez une pull request.

**Les pull requests sont créées, revues et fusionnées chez le fournisseur Git**, pas dans Azure Databricks. Le flux :

1. Cloner le dépôt et créer une branche de fonctionnalité à partir de `main`.
2. Modifier les notebooks et les fichiers, puis valider et pousser.
3. Créer la pull request sur le site du fournisseur ; l'équipe la revoit.
4. Fusionner dans la branche de déploiement, puis tirer la branche mise à jour dans votre dossier Git.

Les **conflits** apparaissent lors d'un pull, d'une fusion (merge) ou d'un rebase quand deux personnes ont modifié les mêmes lignes. Pour chaque fichier en conflit, utilisez le menu kebab pour conserver toutes les modifications actuelles ou prendre toutes les modifications entrantes, ou modifiez le fichier et retirez les marqueurs :

```text
<<<<<<< HEAD
Your current changes
=======
Incoming changes
>>>>>>> branch-name
```

Sélectionnez ensuite **Mark As Resolved**, puis **Continue Merge** ou **Continue Rebase**. **Abort** annule l'opération et revient à l'état précédent.

> **Conseil d'examen.** « Revoir la modification avant qu'elle n'atteigne `main` » signifie une pull request chez le fournisseur Git, avec une protection de branche sur `main`. Azure Databricks n'a pas de fonctionnalité de pull request propre.

<!-- section: testing-strategy | objectives: 4.3.3 -->
## Stratégie de test

La stratégie suit la **pyramide des tests** : beaucoup de tests unitaires rapides, moins de tests d'intégration, quelques tests de bout en bout et scénarios UAT.

| Type de test | Vérifie | Étendue | Exécuté sur | Vitesse |
| --- | --- | --- | --- | --- |
| Unitaire | Une fonction fonctionne correctement isolément | Fonction ou classe | Données synthétiques en mémoire (fixtures) | Millisecondes |
| Intégration | Les composants fonctionnent ensemble (ingestion, transformation, stockage) | Plusieurs composants | Ressources Databricks réelles, catalogue ou schéma de test dédié | Secondes |
| De bout en bout | Un flux complet produit le résultat attendu | Pipeline complet | Fichiers d'entrée de test, le job entier | Minutes |
| Acceptation utilisateur (UAT) | La solution répond aux exigences métier | Scénarios métier | Environnement intermédiaire (staging) identique à la production | Variable |

Les **tests unitaires** utilisent `pytest`. Les fichiers de test commencent par `test_` ou se terminent par `_test.py`, en général sous `tests/unit/`. Une `@pytest.fixture` construit des données de test synthétiques réutilisables. Concevez des fonctions qui renvoient un seul type prévisible : une fonction qui renvoie un DataFrame ou `False` est difficile à tester, renvoyez donc toujours un DataFrame, même vide. Exécutez les tests depuis un notebook :

```text
%pip install pytest

import pytest
import sys

sys.dont_write_bytecode = True
retcode = pytest.main(["tests/", "-v", "-p", "no:cacheprovider"])
assert retcode == 0, "Test suite failed"
```

`-p no:cacheprovider` et `sys.dont_write_bytecode` empêchent pytest d'écrire des fichiers de cache sur un système de fichiers en lecture seule ; l'`assert` fait échouer la tâche du job quand un test échoue.

Les **tests d'intégration** utilisent des catalogues ou des schémas de test dédiés, avec des données représentatives et non sensibles, jamais les tables de production. Les **tests de bout en bout** sont lents : exécutez-les en heures creuses ou dans le pipeline de déploiement, pas à chaque modification. L'**UAT** commence avant le développement : critères d'acceptation convenus avec les parties prenantes, environnement intermédiaire, scénarios métier avec résultats attendus (« le chiffre d'affaires correspond au système financier à 1 % près ») et processus de retour.

Une organisation type :

```text
project/
├── src/
│   └── transforms.py
├── tests/
│   ├── unit/
│   │   └── test_transforms.py
│   ├── integration/
│   │   └── test_pipeline.py
│   └── e2e/
│       └── test_daily_workflow.py
├── notebooks/
│   └── run_tests.py
└── requirements.txt
```

Automatisez avec un job qui exécute le notebook de test avant le déploiement en production.

> **Piège d'examen.** « Tester la logique en quelques millisecondes sans cluster » est un test unitaire. « Vérifier le schéma que le job écrit dans une table » demande une ressource Databricks : test d'intégration. « Les utilisateurs métier valident le rapport » est de l'UAT, pas un test de bout en bout.

<!-- section: bundle-configuration | objectives: 4.3.4 -->
## Configurer et empaqueter des bundles

Les **bundles de ressources Databricks** (Databricks Asset Bundles), désormais nommés **Declarative Automation Bundles** sur Microsoft Learn, décrivent un projet sous forme de code YAML : fichiers source, définitions des ressources (Lakeflow Jobs, pipelines, tableaux de bord, schémas, volumes...) et paramètres par environnement. Les commandes commencent toujours par `databricks bundle` ; l'interface CLI doit être en version **0.218.0 ou ultérieure**.

Le fichier `databricks.yml` se trouve à la racine du projet :

```yaml
bundle:
  name: sales-pipeline

include:
  - resources/*.yml

variables:
  catalog:
    description: Target catalog
    default: dev_sales
  warehouse_id:
    lookup:
      warehouse: 'Shared SQL warehouse'

artifacts:
  default:
    type: whl
    build: poetry build
    path: .

resources:
  jobs:
    daily_sales:
      name: daily-sales
      tasks:
        - task_key: ingest
          job_cluster_key: main
          notebook_task:
            notebook_path: ./notebooks/ingest.py
            base_parameters:
              catalog: ${var.catalog}
        - task_key: transform
          depends_on:
            - task_key: ingest
          job_cluster_key: main
          python_wheel_task:
            package_name: sales_etl
            entry_point: main
          libraries:
            - whl: ./dist/*.whl
      job_clusters:
        - job_cluster_key: main
          new_cluster:
            spark_version: 15.4.x-scala2.12
            node_type_id: Standard_DS3_v2
            num_workers: 2

targets:
  dev:
    default: true
    mode: development
    workspace:
      host: https://adb-1234567890123456.7.azuredatabricks.net
  prod:
    mode: production
    git:
      branch: main
    workspace:
      host: https://adb-9876543210987654.3.azuredatabricks.net
    variables:
      catalog: prod_sales
    run_as:
      service_principal_name: 9f2b5c1e-1111-2222-3333-444455556666
```

| Mappage | Rôle |
| --- | --- |
| `bundle` | Obligatoire ; `name` est l'identité du bundle |
| `include` | Autres fichiers YAML à charger |
| `variables` | `${var.name}` ; `lookup` résout l'ID d'un objet à partir de son nom ; `type: complex` pour une valeur structurée |
| `artifacts` | Ce qu'il faut générer avant le déploiement : `type: whl` avec une commande `build` (`poetry build`, setuptools, `uv`) |
| `resources` | Jobs, pipelines, tableaux de bord... avec des chemins **relatifs à la racine du bundle** |
| `targets` | Environnements ; une seule cible a `default: true` ; chacune remplace `workspace`, `variables`, `resources`, `mode`, `run_as`... |
| `workspace` | `host`, `profile`, `root_path` (par défaut `~/.bundle/${bundle.name}/${bundle.target}`) |
| `run_as`, `permissions` | Identité qui exécute les jobs ; autorisations appliquées à chaque ressource |

Omettez `artifacts` si la wheel est déjà générée : l'interface CLI charge alors les fichiers listés dans les entrées `whl` de `libraries`.

Les substitutions incluent `${bundle.target}`, `${workspace.current_user.userName}` et `${resources.jobs.<job-key>.id}`. Une variable sans valeur par défaut doit être définie au déploiement ; l'interface CLI retient la première valeur trouvée :

1. `--var="catalog=qa_sales"` sur la commande.
2. Une variable d'environnement `BUNDLE_VAR_catalog`.
3. `.databricks/bundle/<target>/variable-overrides.json`.
4. Le mappage `variables` de la cible.
5. La valeur `default` de la déclaration de premier niveau.

Les variables de bundle sont des valeurs de déploiement : pour changer une entrée le temps d'une exécution, utilisez des paramètres de job.

Les **modes de déploiement** appliquent un ensemble de paramètres à une cible :

| Comportement | `mode: development` | `mode: production` |
| --- | --- | --- |
| Noms des ressources | Préfixés `[dev <short_name>]`, jobs et pipelines étiquetés `dev` | Inchangés |
| Planifications et déclencheurs | En pause | Tels que configurés |
| Exécutions simultanées des jobs | Activées (`max_concurrent_runs: 1` les désactive pour un job) | Telles que configurées |
| Verrou de déploiement | Désactivé (`bundle.deployment.lock.enabled: true` le réactive) | Activé (par défaut) |
| Pipelines | `development: true` | Doivent être `development: false` |
| Remplacement `--cluster-id` | Autorisé | Interdit |
| Validations | Aucune | La branche Git actuelle est égale à `git.branch` ; sans principal de service dans `run_as`, `artifact_path`, `file_path`, `root_path` et `state_path` ne peuvent pas être remplacés par un emplacement propre à un utilisateur, et `run_as` et `permissions` doivent être définis |

Les **presets** (`name_prefix`, `pipelines_development`, `trigger_pause_status`, `jobs_max_concurrent_runs`, `tags`) ajustent une cible comme staging ; les presets remplacent le mode, et le paramètre propre à une ressource remplace les presets.

> **Piège d'examen.** Une planification qui ne se déclenche jamais après un déploiement sur la cible dev n'est pas un bogue : `mode: development` met toutes les planifications en pause. Définissez `pause_status: UNPAUSED` dans le `schedule` (ou `continuous`) de ce job s'il doit s'exécuter.

<!-- section: bundle-cli-deployment | objectives: 4.3.5 -->
## Déployer un bundle avec l'interface CLI Databricks

Authentifiez-vous d'abord : OAuth utilisateur à machine (U2M) pour une personne, un **principal de service** pour l'automatisation.

```bash
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
```

Le cycle de vie, depuis la racine du bundle :

```bash
databricks bundle init                      # new project from a template
databricks bundle validate                  # check the configuration
databricks bundle plan -t prod              # list planned creates, updates, deletes
databricks bundle deploy -t prod            # build, upload, create or update resources
databricks bundle summary -t prod           # deployed resources with workspace links
databricks bundle run -t prod daily_sales   # run a job by its resource key
databricks bundle destroy -t prod           # delete everything the bundle deployed
```

| Besoin | Commande ou option |
| --- | --- |
| Vérifier la syntaxe et les valeurs résolues avant de déployer | `bundle validate` (`--output json` affiche les variables résolues) |
| Prévisualiser les modifications sans les appliquer | `bundle plan` |
| Déployer sur une cible autre que celle par défaut | `-t` / `--target` |
| Remplacer une variable | `--var="name=value"` |
| Échouer plutôt que perturber des jobs en cours | `deploy --fail-on-active-runs` |
| Lever un verrou obsolète laissé par un déploiement interrompu | `deploy --force-lock` (seulement si aucun déploiement n'est en cours) |
| Passer outre les validations qui bloquent un déploiement (branche Git du mode production ; écrase aussi un tableau de bord modifié dans l'espace de travail) | `deploy --force` |
| Ignorer les invites dans un pipeline | `--auto-approve` |
| Utiliser un cluster existant en développement | `deploy --cluster-id` (mode development uniquement) |
| Exécuter certaines tâches seulement ; redémarrer un job en cours | `run --only ingest,transform` (`+key` ajoute ses tâches en amont, `key+` ses tâches en aval) ; `run --restart` |
| Passer des paramètres de job à une exécution ; ne pas attendre la fin de l'exécution | `run --params run_date=2026-11-24` ; `run --no-wait` |
| Déployer seulement certaines ressources et leurs dépendances en amont (développement uniquement) | `deploy --select jobs.daily_sales` |
| Placer un job existant sous le contrôle du bundle | `bundle generate job --bind`, ou `bundle generate job` puis `bundle deployment bind` |

`bundle deploy` conserve son état dans l'espace de travail : il crée les nouvelles ressources, met à jour celles déjà déployées et **supprime les ressources retirées de la configuration**. L'identité d'un déploiement est nom du bundle + cible + auteur du déploiement : deux personnes qui déploient sur la même cible partagée entrent en conflit, confiez donc ce déploiement à un pipeline qui s'exécute en tant que principal de service. `bundle destroy` est irréversible ; le paramètre `lifecycle` en protège certaines ressources. L'interface de l'espace de travail (volet **Deployments**) déploie aussi, en tant qu'utilisateur actuel et dans l'espace de travail actuel uniquement ; l'interface CLI est la voie pour le CI/CD.

> **Piège d'examen.** Un déploiement depuis une branche de fonctionnalité vers une cible de production échoue à la vérification `git.branch` : fusionnez, puis déployez depuis `main`. `--force` ne fait que contourner la protection.

<!-- section: bundle-rest-ci-cd | objectives: 4.3.6 -->
## Déployer avec les API REST et le CI/CD

L'interface CLI Databricks passe par les **API REST Azure Databricks**. Un système CI/CD peut déployer de deux façons :

| Approche | Ce qu'elle fait | Quand la choisir |
| --- | --- | --- |
| Exécuter l'interface CLI dans le pipeline | `bundle deploy` génère, charge, puis crée ou met à jour les jobs et les pipelines par les API REST, avec un état de déploiement | Recommandée : le bundle est la source unique de vérité |
| Appeler directement les API REST | Requêtes HTTPS vers l'API Jobs (`create`, `update`, `reset`, `run-now`) ou l'API Repos | Un outil qui n'envoie que des requêtes HTTP, ou une seule étape (lancer une exécution, mettre à jour un dossier Git de production) |

Les requêtes portent un jeton du porteur (bearer token) émis pour un **principal de service**, pas le jeton d'un utilisateur. Utilisez l'**API Jobs 2.2** : les jobs créés avec elle **sont mis en file d'attente par défaut** (`queue: false` la désactive), et `jobs/get` pagine `tasks` et `job_clusters` au-delà de 100 éléments avec `next_page_token`.

```bash
# Start a run of a job deployed by the bundle (job ID from bundle summary)
curl -X POST "$DATABRICKS_HOST/api/2.2/jobs/run-now" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  -d '{"job_id": 123456789}'
```

Un workflow GitHub Actions qui déploie le bundle quand une pull request cible `main` :

```yaml
name: Dev deployment
concurrency: 1
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: databricks/setup-cli@main
      - run: databricks bundle deploy
        env:
          DATABRICKS_TOKEN: ${{ secrets.SP_TOKEN }}
          DATABRICKS_BUNDLE_TARGET: dev
```

`DATABRICKS_BUNDLE_TARGET` sélectionne la cible, comme `-t`. Avec la **fédération d'identité de charge de travail** (l'option la plus sûre, aucun secret stocké), le workflow définit `DATABRICKS_AUTH_TYPE: github-oidc`, `DATABRICKS_HOST` et `DATABRICKS_CLIENT_ID` (l'UUID du principal de service) et accorde `id-token: write`.

Pour synchroniser un **dossier Git de production** après une fusion, le pipeline appelle l'API Repos, ici par l'interface CLI :

```bash
databricks repos update /Workspace/Production/sales-pipeline --branch main
```

Sans CI/CD externe, un job planifié peut à la place exécuter un notebook qui appelle le SDK Databricks (`w.repos.update(..., branch="main")`).

> **Conseil d'examen.** « Aucun secret stocké dans le système CI » : fédération d'identité de charge de travail. « Déployer les jobs avec leur configuration » : un bundle. « Seulement actualiser le code d'un dossier de production après une fusion » : une mise à jour par l'API Repos.

<!-- section: key-points -->
## Points clés

- Les dossiers Git versionnent le code (notebooks, fichiers), un dossier par développeur ; les pull requests se font chez le fournisseur Git ; un conflit se termine par Mark As Resolved, puis Continue Merge ou Continue Rebase, ou par Abort.
- Pyramide des tests : unitaires (pytest, fixtures synthétiques, sans cluster), intégration (catalogue de test, ressources réelles), bout en bout (pipeline complet, heures creuses), UAT (critères métier, staging).
- Un bundle (bundles de ressources Databricks, désormais Declarative Automation Bundles) versionne ensemble le code et les définitions de ressources dans `databricks.yml` : cibles, variables, artefacts, `run_as`.
- `mode: development` préfixe les noms, met les planifications en pause et autorise les exécutions simultanées ; `mode: production` valide la branche Git et attend un principal de service.
- `validate`, `plan`, `deploy -t`, `run`, `summary`, `destroy` ; `--force-lock` pour un verrou obsolète, `--fail-on-active-runs` pour protéger les jobs en cours.
- En CI/CD, l'interface CLI appelle les API REST pour vous ; les appels REST directs (API Jobs 2.2, API Repos) s'authentifient en tant que principal de service.
