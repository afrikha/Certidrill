Une stratégie de création de branches décide où le travail se fait, comment il rejoint la branche principale et comment les versions sont stabilisées. À l'examen, elle se présente en deux couches : choisir la stratégie d'une équipe (basée sur le tronc, branches de fonctionnalité, branches de mise en production), puis imposer le workflow de pull request et les règles de fusion avec les **stratégies de branche** d'Azure Repos ou les **règles de protection de branche et ensembles de règles (rulesets)** de GitHub. Attendez-vous à une exigence (« deux approbations mais pas par le dernier à avoir poussé », « historique linéaire ») et à la question : quel paramètre, sur quelle plateforme ?

<!-- section: branch-strategies | objectives: 2.1.1 -->
## Choisir une stratégie de branche

| Stratégie | Fonctionnement | Convient à |
| --- | --- | --- |
| Développement basé sur le tronc (trunk-based) | Tout le monde intègre dans `main` (le tronc) au moins une fois par jour, directement ou par des branches qui vivent quelques heures ou un ou deux jours. Le travail inachevé est masqué derrière des **indicateurs de fonctionnalité (feature flags)**. Les versions sont construites depuis le tronc | Intégration et livraison continues, tests automatisés matures, changements petits et fréquents |
| Branche de fonctionnalité (topic branch) | Chaque fonctionnalité ou correctif a sa branche issue de `main` et revient par une pull request. **GitHub Flow** en est la forme légère : créer la branche, valider, ouvrir une pull request, relire et tester, fusionner, supprimer la branche ; `main` reste déployable | La plupart des équipes ; revue de code de chaque changement ; applications web déployées en continu |
| Branche de mise en production | Une branche comme `release/20` est créée depuis `main` à l'approche d'un jalon, stabilisée, et conservée tant que cette version est prise en charge | Plusieurs versions prises en charge en parallèle, logiciels mobiles ou empaquetés, mises en production planifiées |
| Git Flow (non cité par le guide, distracteur fréquent) | Branches durables `develop` et `main`, plus des branches de fonctionnalité, de mise en production et de correctif | Produits strictement versionnés ; lourd pour la livraison continue |

Les recommandations de Microsoft pour Azure Repos combinent les trois premières : des branches de fonctionnalité pour **toutes** les nouvelles fonctionnalités et tous les correctifs, fusionnées dans `main` uniquement par pull request, une branche `main` qui se construit et passe les tests en permanence, et des branches de mise en production créées depuis `main` à l'approche d'une version. Une branche de mise en production n'est **jamais refusionnée** dans `main` par pull request. Les correctifs arrivent d'abord dans `main` puis sont **sélectionnés (cherry-pick)** vers la branche de mise en production (ou l'inverse), pour ne déplacer que les commits choisis. Verrouillez une branche de mise en production quand sa version n'est plus prise en charge. Les branches d'environnement (`deploy/performance-test`) se traitent comme des branches de mise en production, sauf en déploiement continu, où Azure Pipelines promeut les builds de `main` vers les cibles de déploiement.

Les conventions de nommage organisent les branches et permettent des autorisations par dossier : `feature/<name>`, `bugfix/<description>`, `hotfix/<description>`, `users/<alias>/<description>`, `release/<version>`.

```bash
# Feature branch, GitHub Flow style
git switch -c feature/1234-login-throttling main
git commit -am "Throttle failed sign-ins AB#1234"
git push -u origin feature/1234-login-throttling
# Open a pull request to main, address the review, merge, delete the branch

# Port a fix already merged in main to the release branch
git switch -c hotfix/port-4567 origin/release/20
git cherry-pick -x 3f9c2ab
git push -u origin hotfix/port-4567
# Open a pull request to release/20
```

| Exigence de la question | Réponse |
| --- | --- |
| Intégrer plusieurs fois par jour, éviter les conflits de fusion des branches durables | Développement basé sur le tronc avec indicateurs de fonctionnalité |
| Chaque changement relu, `main` toujours déployable, une seule version en production | Branches de fonctionnalité avec pull requests (GitHub Flow) |
| Prendre en charge la version 3 pendant le développement de la version 4 | Branches de mise en production ; reporter les correctifs par cherry-pick |
| Livrer du code inachevé désactivé, l'activer plus tard sans nouveau déploiement | Indicateurs de fonctionnalité (par exemple la gestion des fonctionnalités d'Azure App Configuration) |
| Contributeurs extérieurs à l'organisation | Forks et pull requests |

> **Piège d'examen.** Les branches de fonctionnalité durables contredisent l'intégration continue : plus une branche vit longtemps, plus la fusion est grosse. Quand l'énoncé dit « intégrer en continu » ou « réduire la dette de fusion », la réponse est des branches de courte durée ou le développement basé sur le tronc avec des indicateurs de fonctionnalité, pas une branche par version ou par environnement.

<!-- section: pull-request-azure-repos | objectives: 2.1.2 -->
## Workflow de pull request avec les stratégies de branche d'Azure Repos

Les stratégies de branche se configurent par branche dans **Repos > Branches > Plus d'options > Stratégies de branche** (ou **Paramètres du projet > Dépôts > Stratégies**) par un membre de Project Administrators ou un utilisateur qui a l'autorisation **Edit policies**. Dès qu'une branche a une stratégie **obligatoire (Required)**, on ne peut plus y pousser directement ni la supprimer : tout changement passe par une pull request. Une branche qui n'a que des stratégies facultatives accepte encore les push directs. Pour protéger de nombreux dépôts à la fois, les **stratégies de branche inter-dépôts** (paramètres du projet, tous les dépôts) s'appliquent à **la branche par défaut de chaque dépôt** ou aux **branches actuelles et futures correspondant à un modèle** (sensible à la casse ; la branche n'a pas besoin d'exister).

| Stratégie | Options utilisées à l'examen |
| --- | --- |
| Require a minimum number of reviewers (nombre minimal de réviseurs) | Nombre d'approbations ; **Allow requestors to approve their own changes** ; **Prohibit the most recent pusher from approving their own changes** ; **Allow completion even if some reviewers vote to wait or reject** ; quand de nouveaux changements sont poussés : exiger une approbation sur la dernière itération, réinitialiser les votes d'approbation, ou réinitialiser tous les votes des réviseurs |
| Check for linked work items (éléments de travail liés) | Obligatoire ou facultative : traçabilité vers Azure Boards |
| Check for comment resolution (résolution des commentaires) | Obligatoire ou facultative : tous les commentaires résolus avant l'achèvement |
| Limit merge types (types de fusion) | Types de fusion autorisés (voir les sections suivantes) |
| Build validation (validation de build) | Pipeline à exécuter ; déclenchement automatique ou manuel ; obligatoire ou facultative ; expiration du build (dès que la branche cible est mise à jour, après n heures, jamais) ; filtre de chemin |
| Status checks (vérifications d'état) | Un état publié par un service externe via l'API Status des pull requests (`genre/name`), obligatoire ou facultatif, éventuellement appliqué seulement après la publication du premier état |
| Automatically included reviewers (réviseurs inclus automatiquement) | Utilisateurs ou groupes ajoutés à la pull request, facultatifs ou obligatoires, avec un **filtre de chemin** (`/src/Payments/*;!/src/Payments/Tests/*`) |

Deux détails sur les réviseurs tranchent beaucoup de questions : quand des groupes sont réviseurs obligatoires, au moins un membre de chaque groupe doit approuver (si un seul groupe est obligatoire, le nombre minimal de ses membres défini dans la stratégie doit approuver) ; et la séparation des tâches (« le développeur qui a poussé en dernier ne peut pas approuver ») correspond à **Prohibit the most recent pusher**, pas à l'option du demandeur. Un utilisateur peut activer la **saisie semi-automatique (auto-complete)** pour que la pull request se termine dès que toutes les stratégies sont satisfaites.

```bash
az repos policy approver-count create --repository-id <repo-id> \
  --branch main --blocking true --enabled true \
  --minimum-approver-count 2 --creator-vote-counts false \
  --allow-downvotes false --reset-on-source-push true
```

La validation de build exécute le pipeline sur le résultat de la fusion de la pull request. Pour un dépôt Azure Repos Git, le déclencheur `pr:` d'un pipeline YAML est **ignoré** : les builds de pull request viennent uniquement de la stratégie Build validation.

```yaml
# azure-pipelines.yml stored in Azure Repos Git
trigger:
  branches:
    include:
      - main
pr: none   # PR validation is configured with the Build validation branch policy
pool:
  vmImage: ubuntu-latest
steps:
  - script: dotnet test --configuration Release
```

> **Piège d'examen.** Pour Azure Repos, « exécuter le pipeline CI pour chaque pull request vers main » est une stratégie de branche **Build validation** sur `main`, pas une section `pr:` dans le YAML. Le déclencheur `pr:` ne fonctionne que pour les dépôts GitHub et Bitbucket Cloud.

<!-- section: pull-request-github | objectives: 2.1.2 -->
## Workflow de pull request avec les règles de protection de branche et les rulesets de GitHub

Une **règle de protection de branche** cible un modèle de nom de branche (`main`, `release/*`). Par défaut, elle bloque les push forcés et la suppression des branches correspondantes. Les branches protégées sont disponibles pour les dépôts publics avec tous les plans, et pour les dépôts privés avec GitHub Pro, Team et Enterprise.

| Paramètre | Effet |
| --- | --- |
| Require a pull request before merging, avec des approbations requises | Les changements n'arrivent dans la branche que par une pull request approuvée par le nombre de réviseurs disposant de l'accès en écriture |
| Dismiss stale pull request approvals when new commits are pushed | Une approbation est rejetée quand le diff change |
| Require review from Code Owners | Une pull request qui touche des fichiers ayant un propriétaire exige l'approbation de l'un de leurs propriétaires de code |
| Require approval of the most recent reviewable push | Une autre personne que le dernier à avoir poussé doit approuver |
| Require status checks to pass before merging | Des vérifications nommées (noms de jobs de workflows, ou états publiés par des applications) doivent réussir. **Require branches to be up to date before merging** = mode strict |
| Require conversation resolution before merging | Tous les commentaires de revue résolus |
| Require deployments to succeed before merging | Un déploiement dans un environnement choisi (par exemple staging) doit d'abord réussir |
| Require merge queue | Les pull requests sont fusionnées dans l'ordre, chacune testée avec la dernière version de la branche cible plus les pull requests qui la précèdent. Dépôts publics appartenant à une organisation, et dépôts privés sur GitHub Enterprise Cloud |

Les propriétaires de code viennent d'un fichier `CODEOWNERS` placé dans `.github/`, à la racine ou dans `docs/` (recherchés dans cet ordre) sur la **branche de base** de la pull request. Les propriétaires sont sollicités automatiquement ; **le dernier modèle correspondant l'emporte** ; utilisateurs et équipes doivent avoir l'accès en écriture.

```text
# CODEOWNERS on main: the last matching pattern takes precedence
*            @contoso/app-team
/infra/      @contoso/platform-team
*.bicep      @contoso/platform-team
/docs/       @contoso/tech-writers
```

Un workflow qui fournit des vérifications requises doit se déclencher sur `pull_request`, et aussi sur `merge_group` quand la branche utilise une file d'attente de fusion (merge queue). Gardez des noms de jobs uniques entre workflows : le nom du job est le nom de la vérification.

```yaml
name: ci
on:
  pull_request:
    branches: [main]
  merge_group:
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: dotnet test --configuration Release
```

Les **rulesets** sont le mécanisme plus récent. Ils portent les mêmes règles et d'autres encore (restreindre les créations, mises à jour et suppressions, exiger les résultats de l'analyse du code), et ils diffèrent des règles de protection de branche :

| Règles de protection de branche | Rulesets |
| --- | --- |
| Une seule règle s'applique à une branche | Plusieurs rulesets s'appliquent ensemble et **s'agrègent** : la version la plus restrictive de chaque règle l'emporte ; ils se cumulent aussi avec les règles de protection de branche |
| Supprimer pour désactiver | État d'application **Active** ou **Disabled**, plus **Evaluate** (rapport seul, GitHub Enterprise) |
| Visibles par les administrateurs | Toute personne ayant l'accès en lecture voit les rulesets actifs |
| Par dépôt | Aussi au niveau de l'organisation (plans GitHub Team et Enterprise), pour cibler de nombreux dépôts ; jusqu'à 75 rulesets par dépôt |
| Contournées par les administrateurs sauf blocage | **Liste de contournement (bypass list)** explicite (rôles, équipes, GitHub Apps) |

> **Conseil d'examen.** « Appliquer la même protection à tous les dépôts de l'organisation » ou « voir quels push violeraient une règle avant de l'imposer » désigne les rulesets (ruleset d'organisation, mode Evaluate), pas des règles de protection de branche recopiées dans chaque dépôt.

<!-- section: merge-restrictions | objectives: 2.1.3 -->
## Restrictions de fusion et contournement

Le type de fusion détermine la forme de l'historique :

| Azure Repos (Limit merge types) | GitHub (paramètres du bouton de fusion du dépôt) | Historique |
| --- | --- | --- |
| Basic merge (no fast-forward) | Allow merge commits | Tous les commits conservés, plus un commit de fusion |
| Squash merge | Allow squash merging | Un seul commit par pull request sur la branche cible : linéaire, facile à annuler |
| Rebase and fast-forward | Allow rebase merging | Commits rejoués sur la cible, sans commit de fusion : linéaire |
| Rebase with merge commit | (pas d'équivalent) | Commits rejoués, puis un commit de fusion : semi-linéaire |

Dans GitHub, **Require linear history** interdit les commits de fusion sur la branche : la fusion squash ou rebase doit donc être activée dans le dépôt. La règle de pull request d'un ruleset peut aussi imposer la méthode de fusion autorisée.

Qui peut pousser ou fusionner :

| Exigence | Azure Repos | GitHub |
| --- | --- | --- |
| Personne ne pousse directement sur `main` | N'importe quelle stratégie de branche obligatoire | Require a pull request before merging |
| Seule l'équipe de mise en production peut modifier `release/*` | Sécurité de branche : refuser **Contribute** aux autres sur le dossier de branches | **Restrict who can push to matching branches** (dépôts d'organisation ; les administrateurs peuvent toujours pousser tant que le contournement n'est pas bloqué), ou un ruleset **Restrict updates** avec une liste de contournement |
| Rendre une branche en lecture seule | **Verrouiller (Lock)** la branche | **Lock branch** |
| Autoriser la réécriture de l'historique | Autorisation **Force push** (également requise pour supprimer branches et balises ; le créateur d'une branche la reçoit sur cette branche) | **Allow force pushes** (toute personne avec l'accès en écriture, ou des personnes précises) |
| Fusion d'urgence sans satisfaire les règles | **Bypass policies when completing pull requests** | Les administrateurs contournent par défaut ; activez **Do not allow bypassing the above settings** pour les inclure, ou utilisez la liste de contournement du ruleset |
| Pousser en passant outre les règles | **Bypass policies when pushing** | Liste de contournement, ou autoriser les push forcés |
| Uniquement des commits signés | (pas une stratégie de branche) | **Require signed commits** |

Dans Azure Repos, les autorisations de contournement peuvent être accordées au niveau du projet, du dépôt ou de la branche ; accordez-les à un petit groupe, au niveau le plus étroit. L'ancienne autorisation **Exempt from policy enforcement** a été scindée en ces deux autorisations de contournement.

> **Piège d'examen.** Dans GitHub, une règle de protection de branche ne s'applique pas aux administrateurs du dépôt tant que **Do not allow bypassing the above settings** n'est pas activé. Dans Azure Repos, les Project Administrators ne contournent pas les stratégies sauf s'ils détiennent une autorisation **Bypass policies**.

<!-- section: key-points -->
## Points clés

- Développement basé sur le tronc = branches de courte durée et indicateurs de fonctionnalité ; GitHub Flow = branche de fonctionnalité, pull request, fusion, suppression ; les branches de mise en production servent les anciennes versions et reçoivent les correctifs par cherry-pick, sans jamais être refusionnées.
- Azure Repos : une stratégie de branche obligatoire bloque les push directs et la suppression. Réviseurs, éléments de travail liés, résolution des commentaires, types de fusion, validation de build, vérifications d'état et réviseurs automatiques forment l'ensemble des stratégies.
- Séparation des tâches : **Prohibit the most recent pusher** (Azure Repos), **Require approval of the most recent reviewable push** (GitHub).
- Les builds de PR d'Azure Repos viennent de la stratégie Build validation ; le `pr:` du YAML sert à GitHub et Bitbucket Cloud.
- GitHub : une seule règle de protection par branche ; les rulesets s'agrègent, ont des états d'application, une liste de contournement et une portée d'organisation.
