Les pipelines représentent la moitié de l'examen AZ-400. Les questions montrent un pipeline YAML ou un workflow avec un blanc, décrivent une équipe et une contrainte (coût, aucun secret stocké, cible locale, effort minimal) et demandent quel agent, quel déclencheur, quel modèle ou quelle vérification utiliser. Chaque sujet ci-dessous existe dans les deux chaînes d'outils : Azure Pipelines et GitHub Actions.

<!-- section: automation-solution | objectives: 3.3.1 -->
## Choisir GitHub Actions ou Azure Pipelines

Les deux exécutent des pipelines YAML sur des machines hébergées ou auto-hébergées et déploient vers n'importe quel cloud. Le choix suit en général l'endroit où se trouvent déjà le code, le suivi du travail et la gouvernance.

| Exigence | Meilleur choix |
| --- | --- |
| Code sur GitHub, l'équipe veut une seule plateforme avec Dependabot et GitHub Advanced Security | GitHub Actions |
| Large catalogue d'actions de la communauté, workflows stockés à côté du code | GitHub Actions |
| Azure Boards, Azure Repos et Azure Artifacts déjà utilisés, traçabilité de l'élément de travail jusqu'à la mise en production | Azure Pipelines |
| Approbations et vérifications sur des ressources partagées (connexions de service, pools d'agents, groupes de variables) | Azure Pipelines |
| Pipelines de build ou de mise en production classiques à moderniser | Azure Pipelines (migration vers YAML) |
| Azure DevOps Server local | Azure Pipelines avec des agents auto-hébergés |
| Code sur GitHub mais l'organisation standardise sur Azure DevOps | Azure Pipelines avec l'application GitHub Azure Pipelines |

Seuls les pipelines de build classiques proposent **Export to YAML** : les pipelines de mise en production classiques n'ont pas d'exportation YAML, leurs tâches s'exportent donc une par une. Après une migration, vérifiez les planifications cron : les planifications YAML utilisent l'UTC, les planifications classiques le fuseau horaire de l'organisation.

Le vocabulaire se correspond terme à terme :

| Azure Pipelines | GitHub Actions |
| --- | --- |
| Pipeline (`azure-pipelines.yml`, n'importe quel chemin) | Workflow (`.github/workflows/*.yml`) |
| Phase (stage) / travail (job) / étape / tâche | (pas de phase) job / étape / action |
| Agent, pool d'agents | Exécuteur (runner), groupe d'exécuteurs, étiquettes |
| `dependsOn` | `needs` |
| Groupe de variables, variable secrète | Variables et secrets (dépôt, environnement, organisation) |
| Modèle, modèle extends | Workflow réutilisable, action composite |
| Environnement avec approbations et vérifications | Environnement avec règles de protection de déploiement |
| Connexion de service | `azure/login` avec OpenID Connect, ou des secrets |

> **Conseil d'examen.** Les projets publics Azure DevOps sont retirés : on ne peut plus en créer, et les projets existants deviennent privés en 2027. Pour un projet open source qui a besoin d'une CI publique gratuite, la réponse est un dépôt GitHub public avec GitHub Actions.

<!-- section: agents-runners | objectives: 3.3.2 -->
## Infrastructure d'agents et d'exécuteurs

| Option | Qui gère la machine | Machine neuve par travail | Accès aux réseaux privés | Raison typique |
| --- | --- | --- | --- | --- |
| Agent hébergé par Microsoft | Microsoft | Oui | Non (réseau public uniquement, ni VPN ni ExpressRoute) | Administration minimale |
| Agent auto-hébergé | Vous | Non : outils et caches persistent | Oui | Logiciels spécifiques, cibles locales, travaux longs |
| Agents Azure Virtual Machine Scale Set | Vous (groupe identique dans votre abonnement), Azure Pipelines le met à l'échelle | En option (suppression après chaque utilisation) | Oui | Pool auto-hébergé avec mise à l'échelle automatique |
| Managed DevOps Pools | Service Microsoft, machines virtuelles dans un abonnement Microsoft | Configurable ; état conservé jusqu'à sept jours | Oui (réseau de l'entreprise) | Évolution recommandée des agents de groupe identique |
| Exécuteur hébergé par GitHub | GitHub | Oui | Uniquement avec la mise en réseau privée Azure | Administration minimale sur GitHub |
| Exécuteur auto-hébergé | Vous | Non, sauf s'il est éphémère | Oui | Matériel spécifique, accès local |

Les agents hébergés par Microsoft tournent sur Standard_DS2_v2 (2 cœurs, 7 Go de RAM) pour Windows et Linux, avec au moins 10 Go de disque libre ; impossible d'obtenir des machines plus puissantes, de s'y connecter à distance ou de préinstaller des logiciels. On les choisit par image : `vmImage: ubuntu-latest`, `windows-latest` (Windows Server 2025), `windows-2025-vs2026`, `macOS-latest`. L'image Windows Server 2019 a été retirée le 31 décembre 2025. Ils ne sont pas identifiables par une étiquette de service : un pare-feu doit autoriser les plages d'adresses IP publiées chaque semaine pour toutes les régions de la zone géographique de l'organisation.

Les **travaux parallèles** sont l'unité de licence d'Azure Pipelines, achetés par organisation et partagés par tous les projets :

| Élément | Valeur |
| --- | --- |
| Octroi gratuit hébergé par Microsoft (projets privés) | 1 travail parallèle, 60 minutes par exécution, 1 800 minutes par mois |
| Travail parallèle hébergé par Microsoft payant | Pas de limite mensuelle, 360 minutes par travail ; le premier achat ne fait que lever les limites de temps du travail gratuit : deux travaux simultanés exigent deux achats |
| Octroi gratuit auto-hébergé | 1 travail parallèle, minutes illimitées ; les travaux auto-hébergés achetés s'y ajoutent (5 travaux simultanés = 4 achats) |
| Plafond par défaut des nouvelles organisations | 25 travaux parallèles hébergés par Microsoft (demande au support pour l'augmenter) |
| Qui achète | Project Collection Administrators, Paramètres de l'organisation > Travaux parallèles, facturation configurée via un abonnement Azure |
| Ne consomment pas de travail parallèle | Exécutions en attente d'une approbation ou d'une intervention manuelle, travaux serveur (sans agent), mises en production qui déploient vers un groupe de déploiement ; une exécution n'en consomme un que pendant qu'elle s'exécute sur un agent |

Managed DevOps Pools coûte le calcul, le stockage et la sortie de données Azure **plus** les travaux parallèles auto-hébergés : un pool dont Maximum agents vaut 5 avec seulement le travail parallèle gratuit n'exécute qu'un travail à la fois.

Limites de GitHub Actions : un job dure au plus 6 heures sur un exécuteur hébergé par GitHub et 5 jours sur un exécuteur auto-hébergé ; une exécution de workflow au plus 35 jours ; une matrice au plus 256 jobs ; un job auto-hébergé en file d'attente plus de 24 heures échoue. Les exécuteurs auto-hébergés sont gratuits (vous payez les machines). Les exécuteurs plus grands (plus de cœurs, GPU, IP statique, images personnalisées) demandent GitHub Team ou Enterprise Cloud.

Les machines auto-hébergées n'ouvrent que des connexions HTTPS **sortantes** (port 443 pour les exécuteurs GitHub) : aucun port entrant n'est nécessaire. Un agent Azure Pipelines est inscrit par un utilisateur qui a le rôle **Agent pool administrator**, avec un PAT, le flux de code d'appareil ou un principal de service ; exécutez-le comme service en production. Les travaux choisissent un agent auto-hébergé avec `demands` (capacités) et un exécuteur avec les étiquettes de `runs-on`, par exemple `runs-on: [self-hosted, linux, x64]`.

> **Piège d'examen.** N'exécutez pas de code non fiable, comme des demandes de tirage issues de duplications (forks), sur un agent ou un exécuteur auto-hébergé de votre réseau : il conserve son état et peut atteindre les ressources internes. Utilisez des agents hébergés par Microsoft ou des exécuteurs hébergés par GitHub pour les builds de duplications, et des exécuteurs éphémères (`--ephemeral`, un seul job puis désinscription) pour les parcs auto-hébergés mis à l'échelle automatiquement.

<!-- section: github-integration | objectives: 3.3.3 -->
## Intégrer des dépôts GitHub à Azure Pipelines

| Authentification | Exécuté en tant que | GitHub Checks | Usage |
| --- | --- | --- | --- |
| **Application GitHub** Azure Pipelines | Identité Azure Pipelines | Oui, par exécution et par travail | Recommandé |
| OAuth | Votre identité GitHub personnelle | Non (API Status) | Configuration rapide |
| PAT (`repo`, `admin:repo_hook`, `read:user`, `user:email`) | Votre identité GitHub personnelle | Non | Quand l'application ne peut pas être installée |

L'installation de l'application exige un propriétaire de l'organisation GitHub ou un administrateur du dépôt ; sélectionnez explicitement les dépôts plutôt que tous les dépôts. Pour bloquer les fusions tant que le pipeline n'a pas réussi, exécutez le pipeline une fois, puis ajoutez-le comme vérification d'état obligatoire dans la règle de protection de branche GitHub (le pipeline doit utiliser l'application GitHub).

Les demandes de tirage issues de **duplications** ne sont pas buildées automatiquement. Quand elles le sont, les secrets (connexions de service, fichiers sécurisés, variables secrètes) ne sont pas disponibles par défaut, et **Require a team member's comment before building a pull request** permet à un collaborateur disposant de l'autorisation Write de lancer le build avec `/azp run`.

> **Piège d'examen.** Les règles de protection de branche (GitHub) et les stratégies de branche (Azure Repos) sont des paramètres différents. Avec un dépôt GitHub, le build obligatoire est une vérification d'état dans GitHub, pas une stratégie de branche de validation de build.

<!-- section: triggers | objectives: 3.3.4 -->
## Règles de déclencheur de pipeline

```yaml
trigger:                  # CI trigger
  batch: true             # one run for the commits pushed while a run is in progress
  branches:
    include: [ main, releases/* ]
    exclude: [ releases/old* ]
  paths:
    exclude: [ docs ]
pr:                       # PR trigger: GitHub and Bitbucket Cloud only
  branches:
    include: [ main ]
schedules:
- cron: '0 2 * * Mon-Fri'  # UTC, no daylight saving adjustment
  displayName: Nightly
  branches:
    include: [ main ]
  always: false            # default: run only if the code changed since the last successful scheduled run
resources:
  pipelines:
  - pipeline: lib          # alias
    source: security-lib-ci
    trigger:
      branches:
        include: [ main ]
```

| Exigence | Règle |
| --- | --- |
| Pas de CI à chaque push | `trigger: none` (sans section `trigger`, toutes les branches déclenchent) |
| Pas de validation des demandes de tirage | `pr: none` |
| Validation des demandes de tirage pour Azure Repos | **Stratégie de branche** de validation de build (le mot clé `pr` est ignoré) |
| Ignorer les modifications de documentation | `paths: exclude` |
| Ignorer la CI pour un commit | `[skip ci]` ou `***NO_CI***` dans le message de commit |
| Exécuter après la fin d'un autre pipeline | `resources.pipelines` avec `trigger` |
| Build nocturne même sans modification | `always: true` |
| Planifications YAML ignorées | Supprimez les planifications définies dans l'interface : elles ont priorité |

Les variables ne sont pas autorisées dans les déclencheurs, et les déclencheurs ne peuvent pas être placés dans des modèles. Les déclencheurs planifiés ne désactivent ni le déclencheur CI ni le déclencheur de demande de tirage.

GitHub Actions utilise `on:` :

```yaml
on:
  push:
    branches: [ main ]
    paths-ignore: [ 'docs/**' ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '30 1 * * *'   # UTC, runs on the default branch
  workflow_dispatch:        # manual run, optional inputs
  workflow_run:             # after another workflow
    workflows: [ Build ]
    types: [ completed ]
  repository_dispatch:      # external system through the REST API
    types: [ deploy-request ]
```

<!-- section: yaml-pipelines | objectives: 3.3.5 -->
## Développer des pipelines en YAML

La hiérarchie est pipeline > phases > travaux > étapes. Un pipeline à une seule phase peut lister directement `jobs`, et un seul travail peut lister directement `steps`. Les étapes sont `script`, `bash`, `pwsh`, `powershell`, `task` (`Name@MajorVersion`), `checkout`, `download` et `publish`.

| Syntaxe | Évaluée | Usage typique |
| --- | --- | --- |
| `${{ variables.name }}` / `${{ parameters.name }}` | À la compilation (expansion des modèles) | Insérer ou retirer des étapes, `${{ if }}`, `${{ each }}` |
| `$[ variables.name ]` | À l'exécution, avant le travail ou la phase | `condition`, variables calculées à partir des dépendances |
| `$(name)` | À l'exécution, avant chaque tâche (macro) | Entrées de tâches et scripts |

Les variables secrètes ne sont pas mappées automatiquement en variables d'environnement : mappez-les avec `env:` sur l'étape. Les variables ont une portée pipeline, phase ou travail, la plus spécifique l'emporte. Une variable de sortie se définit avec `##vso[task.setvariable variable=ver;isOutput=true]1.4` et se lit dans un travail ultérieur via `dependencies.<job>.outputs['<step>.ver']`.

> **Piège d'examen.** Les paramètres d'exécution (`parameters:` en tête du pipeline) sont typés et choisis au moment de la mise en file d'attente ; ils sont résolus à la compilation et peuvent donc ajouter ou retirer des phases. Les variables, non.

<!-- section: execution-order | objectives: 3.3.6 -->
## Ordre d'exécution des travaux, parallélisme et pipelines à phases multiples

| Élément | Par défaut | Pour le modifier |
| --- | --- | --- |
| Phases | S'exécutent en séquence, chacune dépend de la précédente | `dependsOn: []` (parallèle), `dependsOn: [A, B]` (convergence) |
| Travaux d'une phase | S'exécutent en parallèle | `dependsOn` |
| Condition | S'exécute si toutes les dépendances ont réussi | `condition: failed()`, `always()`, `and(succeeded(), eq(...))` |
| Délai d'expiration du travail | 60 minutes | `timeoutInMinutes` (0 = maximum autorisé : sans limite sur les agents auto-hébergés, 360 minutes sur les agents hébergés par Microsoft pour un projet public, 60 minutes pour un projet privé sauf capacité supplémentaire payée) |

```yaml
stages:
- stage: Build
  jobs:
  - job: Test
    strategy:
      matrix:
        linux:   { imageName: ubuntu-latest }
        windows: { imageName: windows-latest }
      maxParallel: 2
    pool:
      vmImage: $(imageName)
    steps:
    - script: dotnet test
- stage: DeployTest
  dependsOn: Build
- stage: DeployProd
  dependsOn: DeployTest
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

`strategy: parallel: 5` duplique un travail pour découper les tests (`System.JobPositionInPhase`, `System.TotalJobsInPhase`) ; `matrix` et `parallel` s'excluent mutuellement. Une phase contient jusqu'à 256 travaux. Une `condition` personnalisée remplace la vérification de réussite par défaut : encadrez-la avec `and(succeeded(), ...)`. `trigger: manual` sur une phase attend qu'un utilisateur la lance ; `isSkippable: false` empêche d'ignorer une phase obligatoire.

GitHub Actions : les jobs s'exécutent en parallèle sauf si `needs` est défini ; `strategy.matrix` avec `max-parallel` et `fail-fast` ; `concurrency` avec une clé `group` et `cancel-in-progress: false` sérialise les déploiements vers une même cible.

> **Piège d'examen.** Les travaux parallèles d'un pipeline YAML ne s'exécutent en parallèle que si l'organisation possède assez de travaux parallèles et d'agents. Cinq branches de matrice avec un seul travail parallèle s'exécutent quand même une par une.

<!-- section: complex-scenarios | objectives: 3.3.7 -->
## Scénarios de pipelines complexes

| Scénario | Conception |
| --- | --- |
| Hybride : build dans le cloud, déploiement vers des serveurs locaux | Travail de build sur un agent hébergé par Microsoft, travail de déploiement sur un agent auto-hébergé (ou des ressources machine virtuelle d'un environnement) dans le réseau |
| Serveurs cibles inscrits une fois, déployés par lots successifs | Environnement avec des ressources machine virtuelle (agent installé sur chaque machine) |
| Machines de build identiques et versionnées | Créer une image de machine virtuelle avec Azure VM Image Builder (basé sur HashiCorp Packer) ou Packer, la publier dans une Azure Compute Gallery, l'utiliser dans Managed DevOps Pools ou un groupe identique |
| Image personnalisée de groupe identique | Généraliser la machine (`sysprep` ou `waagent -deprovision+user`), créer l'image, mettre à jour le groupe identique ; les machines existantes gardent l'ancienne image |
| Outils de build sans maintenir d'image de machine | Travail de conteneur (`container:` sur le travail) sur un agent Windows ou Ubuntu (les agents macOS ne prennent pas en charge les conteneurs) |
| Travail de plus de 6 heures | Agent ou exécuteur auto-hébergé (Managed DevOps Pools : jusqu'à deux jours par travail) |
| Attente sans agent, appel REST ou validation manuelle | Travail serveur (`pool: server`) avec Delay, Invoke REST API ou Manual Validation |

<!-- section: reusable-elements | objectives: 3.3.8 -->
## Éléments de pipeline réutilisables

| Élément | Portée | Remarque |
| --- | --- | --- |
| Modèle d'étapes, de travail, de phase (`template:`) | Tout pipeline YAML | Inclus avec des `parameters` typés |
| Modèle de variables | Tout pipeline YAML | Uniquement des variables |
| Modèle extends | Le pipeline doit l'étendre | Imposer une structure, avec la vérification **Required template** |
| Groupe de tâches | Pipelines classiques uniquement | Non pris en charge en YAML : utilisez des modèles |
| Groupe de variables (Bibliothèque) | Projet | Autoriser le pipeline ; peut être lié à Azure Key Vault |
| Workflow réutilisable GitHub (`on: workflow_call`) | Appelé depuis un job | 10 niveaux d'imbrication, 50 workflows uniques par fichier ; le `env` de l'appelant n'est pas transmis |
| Action composite GitHub | Appelée depuis une étape | Regroupe des étapes dans un `action.yml` |

```yaml
resources:
  repositories:
  - repository: templates
    type: git                       # Azure Repos; github for GitHub
    name: Platform/pipeline-templates
    ref: refs/tags/v2.1             # pin a tag or commit
variables:
- group: shop-prod                  # variable group, authorized for this pipeline
- template: vars/common.yml@templates
- name: buildConfiguration
  value: Release
extends:
  template: secure-pipeline.yml@templates
  parameters:
    environment: prod
```

Limites des modèles : 100 fichiers YAML, 100 niveaux d'imbrication, 20 Mo de mémoire pendant l'analyse. Si deux groupes de variables définissent le même nom, le dernier référencé l'emporte. Un groupe de variables lié à Azure Key Vault ne stocke que les noms des secrets et récupère les dernières valeurs à l'exécution ; sa connexion de service a besoin des autorisations de secret **Get** et **List** ou du rôle **Key Vault Secrets User**, et les nouveaux secrets du coffre doivent être ajoutés explicitement au groupe.

<!-- section: environments-checks | objectives: 3.3.9 -->
## Vérifications et approbations avec les environnements YAML

Un environnement est référencé par un **travail de déploiement** (`environment: prod`) ; les approbations et vérifications se configurent dans l'interface web, sur l'environnement (onglet Approbations et vérifications), jamais dans le YAML. Les mêmes vérifications existent sur les connexions de service, les pools d'agents, les dépôts, les groupes de variables et les fichiers sécurisés.

| Vérification | Objectif |
| --- | --- |
| Approbations | Utilisateurs ou groupes (un membre du groupe suffit) ; peut interdire d'approuver sa propre exécution ; à expiration, la phase est ignorée |
| Contrôle de branche (Branch control) | N'autoriser que les ressources buildées depuis `refs/heads/main` et similaires, avec protection de branche en option |
| Heures ouvrables (Business hours) | Démarrer uniquement dans une plage horaire |
| Invoke REST API / Invoke Azure Function | Conditionner à la réponse d'un système externe |
| Query Azure Monitor alerts | Continuer seulement si aucune alerte n'est active |
| Required template | Le pipeline doit étendre un modèle donné |
| Evaluate artifact | Stratégie sur une image conteneur |
| Exclusive lock | Une seule exécution à la fois sur la ressource (`lockBehavior: sequential` ou `runLatest`) |

Ordre : vérifications statiques (contrôle de branche, modèle obligatoire, évaluation d'artefact), approbations préalables, vérifications dynamiques, approbations postérieures, verrou exclusif. Rôles de sécurité d'un environnement : Creator, Reader, User, Administrator ; Creator, User et Administrator (pas Reader) peuvent gérer les approbations et les vérifications, et seul le créateur d'un environnement reçoit le rôle Administrator. Une exécution manuelle ou CI qui référence un environnement inexistant échoue : l'environnement n'est créé automatiquement que depuis l'assistant de création de pipeline ou l'éditeur web.

Dans GitHub, un job avec `environment: production` attend ses **règles de protection de déploiement** : jusqu'à six réviseurs obligatoires (une approbation suffit, empêchement de l'auto-révision en option), un minuteur d'attente jusqu'à 43 200 minutes, et les branches et étiquettes autorisées au déploiement. Les secrets d'environnement ne sont lisibles qu'une fois les règles satisfaites. Sur les plans Free, Pro et Team, les réviseurs obligatoires et les minuteurs d'attente ne s'appliquent qu'aux dépôts publics.

> **Piège d'examen.** Une approbation manuelle au milieu d'une phase, sans environnement, c'est la tâche `ManualValidation` dans un travail serveur. Une approbation avant chaque déploiement en production, c'est une vérification Approbations sur l'environnement de production.

<!-- section: key-points -->
## Points clés

- Hébergé par Microsoft : effort minimal, pas de réseau privé ; auto-hébergé, groupe identique ou Managed DevOps Pools : accès réseau et outils spécifiques.
- Un travail parallèle hébergé par Microsoft gratuit (60 minutes, 1 800 minutes par mois) et un travail auto-hébergé gratuit ; le parallélisme exige d'acheter des travaux parallèles (le premier achat hébergé par Microsoft n'ajoute aucune simultanéité).
- Utilisez l'application GitHub Azure Pipelines pour les dépôts GitHub ; les builds de duplications n'ont pas de secrets.
- `trigger: none`, `pr: none`, filtres de chemins, planifications en UTC, `resources.pipelines` pour enchaîner ; les builds de demandes de tirage Azure Repos viennent des stratégies de branche.
- `${{ }}` à la compilation, `$[ ]` à l'exécution, `$( )` macro.
- Modèles et groupes de variables pour le YAML ; les groupes de tâches sont réservés au classique.
- Les approbations et vérifications se définissent sur l'environnement dans l'interface, pas dans le YAML.
