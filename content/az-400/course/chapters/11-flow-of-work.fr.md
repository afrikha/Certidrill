Avant qu'un pipeline s'exécute, le travail doit être planifié, attribué et suivi, et chaque modification doit être traçable depuis l'exigence jusqu'au commit, au build, au test et au déploiement. Les questions d'examen demandent quel processus ou quelle structure d'éléments de travail convient à une équipe, comment fonctionne GitHub Flow, comment les retours parviennent aux bonnes personnes, et quel lien ou quel paramètre apporte la traçabilité exigée par un scénario.

<!-- section: work-structure | objectives: 1.1.1 -->
## Structurer le flux de travail

Dans Azure Boards, le **processus** d'un projet fixe ses types d'éléments de travail, leurs états et les niveaux de backlog. Il existe quatre processus système :

| Processus | Niveaux de backlog (portefeuille, exigence, tâche) | Convient à |
| --- | --- | --- |
| Basic | Epic, Issue, Task | Petites équipes qui veulent le modèle le plus simple |
| Agile | Epic, Feature, User Story, Task (plus Bug) | Équipes qui utilisent des user stories et Kanban |
| Scrum | Epic, Feature, Product Backlog Item, Task (plus Bug, Impediment) | Équipes qui travaillent en sprints avec un backlog de produit |
| CMMI | Epic, Feature, Requirement, Task (plus Bug, Change Request, Issue, Review, Risk) | Processus formels qui exigent demandes de modification, risques et pistes d'audit |

Un processus système ne peut pas être modifié. Pour ajouter un champ, un état, un type d'élément de travail ou un niveau de backlog, créez un **processus hérité** à partir de lui et basculez le projet sur ce processus.

> **Piège d'examen.** « Ajouter un champ personnalisé au type d'élément de travail User Story » ne signifie jamais modifier le processus Agile : vous créez un processus hérité, le personnalisez, puis changez le processus du projet.

Deux arborescences de classification organisent les éléments :

| Champ | Répond à | Usage type |
| --- | --- | --- |
| Chemin de zone (Area path) | Qui porte le travail | Un chemin de zone par équipe ou composant du produit ; chaque équipe sélectionne ses zones |
| Chemin d'itération (Iteration path) | Quand le travail a lieu | Des sprints datés, sélectionnés par chaque équipe |

Chaque équipe dispose d'un **tableau** dont les colonnes correspondent aux états du workflow. Configurez des **limites de WIP** par colonne pour faire apparaître les goulets d'étranglement, des **colonnes fractionnées** (Doing et Done) pour montrer le travail qui attend l'étape suivante, une **définition de terminé** par colonne et des **couloirs** (swimlanes) pour les classes de service, comme un couloir d'urgence. Un paramètre d'équipe détermine si les bogues sont gérés avec les exigences, avec les tâches ou en dehors des backlogs.

Sur GitHub, la structure équivalente est faite d'**issues** planifiées dans des **projets GitHub** : un projet affiche les mêmes éléments sous forme de tableau, de tableau Kanban ou de feuille de route, et ajoute des champs personnalisés (texte, nombre, date, sélection unique, itération) aux étiquettes, jalons et personnes assignées.

<!-- section: github-flow | objectives: 1.1.1 -->
## GitHub Flow

GitHub Flow est un workflow léger fondé sur les branches, avec une seule branche de longue durée, la branche par défaut, toujours déployable :

| Étape | Ce qui se passe |
| --- | --- |
| Créer une branche | Une branche de courte durée créée depuis la branche par défaut, au nom explicite |
| Apporter des modifications | De petits commits ciblés, poussés sur la branche |
| Créer une pull request | Demander des retours ; une pull request en brouillon sollicite un avis précoce avant que le travail soit prêt |
| Traiter les commentaires de revue | Pousser d'autres commits ; la pull request se met à jour et les vérifications s'exécutent de nouveau |
| Fusionner la pull request | Après approbation et réussite des vérifications ; les règles de protection de branche peuvent exiger les deux |
| Supprimer la branche | La pull request et les commits restent dans l'historique |

```bash
git switch -c feature/invoice-export
git add .
git commit -m "Add CSV export to invoices"
git push -u origin feature/invoice-export
gh pr create --base main --title "Add CSV export to invoices" --body "Fixes #214"
```

GitHub Flow repose sur l'automatisation pour garantir la sécurité : vérifications d'état requises (build et tests d'intégration continue) et revues requises sur la branche par défaut, pour que rien n'y arrive sans réussir les deux. Il convient aux équipes qui déploient en continu. Les équipes qui maintiennent plusieurs versions publiées en parallèle ajoutent des branches de mise en production ; le chapitre sur les branches compare le développement basé sur le tronc, les branches de fonctionnalité et les branches de mise en production.

> **Piège d'examen.** GitHub Flow n'a ni branche `develop` ni branches de mise en production de longue durée : elles appartiennent à Git Flow. Si un énoncé dit « une seule branche de longue durée, des branches de fonctionnalité de courte durée, des modifications fusionnées par pull requests », la réponse est GitHub Flow.

<!-- section: feedback-cycles | objectives: 1.1.2 -->
## Cycles de commentaires : notifications et GitHub Issues

Un cycle de commentaires est le temps qui sépare une action de l'information qui vous dit si elle était juste : une vérification en échec sur une pull request, un commentaire de revue, un bogue signalé par un utilisateur, une alerte de production. L'objectif de conception est de raccourcir chaque boucle et d'envoyer chaque signal uniquement aux personnes qui doivent agir.

**Notifications GitHub.** Vous suivez automatiquement les dépôts sur lesquels vous avez l'accès en écriture (push), sauf les duplications (forks). Vous êtes abonné à une conversation quand vous l'ouvrez, la commentez, en êtes assigné, êtes mentionné (vous ou votre équipe) ou changez son état. Les notifications arrivent dans la boîte de réception web, par e-mail ou dans GitHub Mobile, et la boîte de réception affiche la raison (`mention`, `review requested`, `subscribed`) et permet de filtrer sur elle. Un fichier `CODEOWNERS` demande automatiquement une revue aux propriétaires des chemins modifiés : les bons réviseurs sont notifiés sans tri manuel.

Les **GitHub Issues** recueillent bogues, demandes de fonctionnalités et tâches. Pour obtenir des signalements exploitables, ajoutez des **formulaires d'issue** (fichiers YAML dans `.github/ISSUE_TEMPLATE/`) qui rendent obligatoires les champs nécessaires, et un fichier `config.yml` dans le même dossier pour désactiver les issues vierges ou rediriger les questions de support :

```yaml
name: Bug report
description: Report a defect in the invoicing service
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: input
    id: version
    attributes:
      label: Version
      description: Version where the defect occurs
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: dropdown
    id: environment
    attributes:
      label: Environment
      options:
        - Production
        - Staging
```

Une pull request ferme automatiquement une issue quand sa description ou l'un de ses messages de commit contient un mot-clé de fermeture (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`) suivi de `#214`, ou de `owner/repo#214` pour un autre dépôt.

> **Piège d'examen.** Les mots-clés de fermeture ne sont interprétés que si la pull request cible la branche par défaut. Une pull request fusionnée dans `release/2.1` avec « Fixes #214 » ne ferme pas l'issue 214.

Les **notifications Azure DevOps** sont des abonnements à quatre niveaux :

| Niveau | Qui le gère |
| --- | --- |
| Personnel | L'utilisateur |
| Équipe | Administrateurs d'équipe, Project Administrators, Project Collection Administrators |
| Projet | Project Administrators, Project Collection Administrators |
| Global (tous les projets de l'organisation) | Project Collection Administrators |

Les abonnements par défaut sont prédéfinis et activés ; les administrateurs choisissent ceux qui sont proposés, et chaque utilisateur peut se désinscrire d'un abonnement par défaut, d'équipe ou de projet. Les notifications sont remises par e-mail (à l'adresse de contact préférée de l'utilisateur, la même pour toutes ses organisations) ou, par un crochet de service (service hook), à un autre service.

> **Piège d'examen.** Les macros de requête `@CurrentIteration`, `@Follows`, `@MyRecentActivity`, `@RecentMentions`, `@RecentProjectActivity` et `@TeamAreas` ne fonctionnent que dans le portail web : une requête qui les utilise ne fonctionne pas quand elle est ouverte dans Visual Studio (Team Explorer), Excel ou Project, et `@CurrentIteration` ne fonctionne pas dans l'API REST.

<!-- section: tracking-integration | objectives: 1.1.3 -->
## Intégrer le suivi du travail aux dépôts

Le travail est suivi là où l'équipe planifie, et lié à l'endroit où se trouve le code. Trois combinaisons reviennent dans les questions :

| Scénario | Suivi recommandé |
| --- | --- |
| Code et planification sur GitHub | GitHub Issues planifiées dans des projets GitHub |
| Code et planification dans Azure DevOps | Azure Boards lié à Azure Repos |
| Code sur GitHub ; planification de portefeuille, rapports ou Test Plans dans Azure DevOps | Azure Boards connecté aux dépôts GitHub |

Les **projets GitHub** couvrent plusieurs dépôts : un projet d'organisation peut contenir des issues et des pull requests de plusieurs dépôts. Des workflows intégrés automatisent le champ d'état ; deux sont activés à la création d'un projet (**Item closed** et **Pull request merged**, qui passent tous deux l'état à Done), et d'autres ajoutent automatiquement les éléments d'un dépôt qui correspondent à un filtre ou archivent les éléments qui remplissent des critères.

**Azure Boards avec Azure Repos.** Mentionnez un élément de travail avec `#1423` dans un message de commit ou une pull request pour le lier. À la finalisation d'une pull request, l'option **Complete associated work items after merging** fait changer d'état les éléments liés. La stratégie de branche **Check for linked work items** bloque les pull requests sans élément de travail.

**Azure Boards avec GitHub.** Connectez le projet aux dépôts GitHub (étapes de configuration dans le chapitre sur la collaboration). Ensuite, `AB#1423` dans un message de commit, une description de pull request ou une description d'issue lie l'élément de travail, et les liens apparaissent dans la section **Development** de l'élément de travail et dans la pull request. Vous pouvez aussi créer une branche GitHub depuis un élément de travail (**Work item actions > New GitHub branch**). Quand une branche liée est supprimée, en général après sa fusion, son lien est retiré automatiquement de l'élément de travail.

| Point | Valeur |
| --- | --- |
| Dépôts par connexion à un projet | Jusqu'à 2 000 |
| Organisations par dépôt GitHub | Ne connectez un dépôt qu'aux projets d'une seule organisation Azure DevOps, sinon les liens `AB#` se comportent de façon inattendue |
| Azure DevOps Services | GitHub.com et GitHub Enterprise Server |
| Azure DevOps Server 2020 et versions ultérieures | GitHub Enterprise Server uniquement |
| Autres hébergeurs Git | Non pris en charge |

> **Piège d'examen.** `AB#1423` dans le **titre** d'une pull request ou dans un **commentaire** ne crée aucun lien. Seuls les messages de commit, les descriptions de pull request et les descriptions d'issue sont analysés.

<!-- section: traceability | objectives: 1.1.4 -->
## Traçabilité des sources, des bogues et de la qualité

La traçabilité répond à trois questions : quel code implémente cette exigence (sources), où un défaut a été détecté et corrigé (bogues), et dans quelle mesure une exigence est testée (qualité).

**Traçabilité des sources.** Azure Boards enregistre les liens de développement et de build sur l'élément de travail :

| Catégorie | Types de liens |
| --- | --- |
| Code | Branch, Commit, Pull Request |
| GitHub | GitHub Branch, GitHub Commit, GitHub Pull Request, GitHub Issue |
| Build | Build, Found in build, Integrated in build |
| Déploiement | Integrated in release environment |
| Wiki | Wiki |

Pour les pipelines YAML, activez **Automatically link new work items in this build** dans les paramètres du pipeline : après l'exécution, un lien **Integrated in build** apparaît sur chaque élément de travail lié aux commits du build. Quand une pull request est créée depuis une branche liée à un élément de travail, la pull request est liée elle aussi, de même que le commit de fusion.

Les mentions `AB#` font aussi changer l'état des éléments de travail. Dans une description de pull request, `Fixes AB#1423` fait passer l'élément au premier état de la catégorie Resolved (ou de la catégorie Completed s'il n'y en a pas) quand la pull request est fusionnée dans la branche par défaut ; `Closed AB#1423` le fait passer à l'état Closed. Dans le processus Agile, la table des catégories d'état de Learn ne place dans la catégorie Resolved que l'état Resolved du bogue : pour faire passer une user story à Resolved, écrivez le nom de l'état, `Resolved AB#1423`.

> **Piège d'examen.** Avec `Fixes AB#123, AB#124, AB#125`, les trois éléments sont liés mais seul le premier change d'état. Pour faire changer les trois, répétez le mot-clé : `Fixes AB#123, Fixes AB#124, Fixes AB#125`.

**Traçabilité des bogues.** Un élément de travail Bug enregistre les étapes de reproduction et le lien **Found in build** ; le correctif est lié par son commit ou sa pull request. Depuis l'onglet **Tests** d'une exécution de pipeline, sélectionnez des tests en échec et choisissez **Bug** : le bogue capture le message d'erreur, la trace de la pile et le contexte. Plusieurs résultats en échec peuvent être associés à un seul bogue quand ils ont la même cause.

**Traçabilité de la qualité.** Dans le même onglet **Tests**, sélectionnez un test automatisé et choisissez **Link** pour l'associer à un élément de travail de la catégorie **Requirements**. Le widget de tableau de bord **Requirements quality** liste alors les exigences renvoyées par une requête, avec le taux de réussite et le nombre de tests en échec de leurs tests liés, pour une phase de pipeline choisie, et montre les exigences sans test. Les tests automatisés peuvent aussi être associés à des cas de test dans Azure Test Plans, où ils comptent dans la qualité des exigences qu'ils couvrent.

Sur GitHub, la chaîne est issue, branche, pull request, commit et déploiement : la barre latérale **Development** d'une issue liste ses branches et ses pull requests, et jusqu'à dix issues peuvent être liées manuellement à une pull request.

<!-- section: key-points -->
## Points clés

- Les processus système (Basic, Agile, Scrum, CMMI) ne se modifient pas : personnalisez un processus hérité.
- Chemin de zone = qui, chemin d'itération = quand ; les limites de WIP et les colonnes fractionnées révèlent les goulets d'étranglement.
- GitHub Flow : une branche par défaut déployable, des branches de courte durée, des pull requests avec vérifications et revues requises.
- Les mots-clés de fermeture et les changements d'état par `AB#` ne s'appliquent qu'aux pull requests fusionnées dans la branche par défaut.
- `AB#` crée un lien depuis les messages de commit, les descriptions de pull request et d'issue, pas depuis les titres ni les commentaires.
- Connectez un dépôt GitHub à une seule organisation Azure DevOps ; jusqu'à 2 000 dépôts par connexion.
- Les liens Integrated in build exigent le paramètre du pipeline ; Requirements quality exige des tests liés à des éléments de la catégorie Requirements.
