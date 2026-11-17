Les pipelines et les workflows accèdent à Azure, à GitHub et à Azure DevOps avec une identité, et les personnes accèdent aux dépôts et aux tableaux avec un rôle et un niveau d'accès. Les questions d'examen donnent une contrainte (« aucun secret stocké », « réduire l'effort d'administration », « privilège minimum », « accès gratuit ») et demandent quelle identité, quel jeton, quel rôle, quel groupe ou quel niveau d'accès convient.

<!-- section: azure-identities | objectives: 4.1.1 -->
## Principaux de service et identités managées

Toute identité de charge de travail dans Microsoft Entra ID est un principal de service ; une identité managée est un principal de service particulier dont Azure gère les informations d'identification.

| Identité | Créée comme | Cycle de vie | Partagée | Information d'identification |
| --- | --- | --- | --- | --- |
| Principal de service d'une inscription d'application | Inscription d'application dans Microsoft Entra ID | Indépendant, supprimé explicitement | Utilisable partout, dans tout locataire si multilocataire | Secret client, certificat ou information d'identification fédérée |
| Identité managée attribuée par le système | Partie d'une ressource Azure (VM, App Service, fonction, AKS...) | Supprimée avec la ressource | Non, une seule ressource | Gérée par Azure, rien à stocker |
| Identité managée attribuée par l'utilisateur | Ressource Azure autonome | Indépendant, supprimée explicitement | Oui, attachée à plusieurs ressources | Gérée par Azure, ou information d'identification fédérée |

| Exigence | Choix |
| --- | --- |
| Du code sur une VM Azure ou un App Service accède à Key Vault, sans secret | Identité managée attribuée par le système |
| Dix VM ou un groupe identique recréé souvent ont besoin des mêmes autorisations | Identité managée attribuée par l'utilisateur (rôle attribué une fois, conservé au redéploiement) |
| Accorder l'accès avant que la ressource existe (pré-autorisation dans un déploiement IaC) | Identité managée attribuée par l'utilisateur |
| Un exécuteur hébergé par GitHub ou un agent hébergé par Microsoft déploie dans Azure | Fédération d'identité de charge de travail sur une inscription d'application ou une identité managée attribuée par l'utilisateur |
| Un outil hors d'Azure qui ne gère qu'un secret client ou un certificat | Principal de service avec certificat (durée de vie la plus courte possible, stocké dans Key Vault) |
| Vous ne pouvez pas créer d'inscriptions d'application dans le locataire | Identité managée attribuée par l'utilisateur avec une information d'identification fédérée |

La **fédération d'identité de charge de travail** permet à une inscription d'application ou à une identité managée **attribuée par l'utilisateur** de faire confiance aux jetons d'un fournisseur d'identité externe (GitHub Actions, Azure Pipelines, Kubernetes, Google Cloud, AWS) et de les échanger contre des jetons d'accès Microsoft Entra. Une information d'identification fédérée compare `issuer`, `subject` et `audience` en respectant la casse ; l'audience recommandée est `api://AzureADTokenExchange`. Une application ou une identité managée attribuée par l'utilisateur accepte au maximum **20** informations d'identification fédérées.

> **Piège d'examen.** Une identité managée attribuée par le système ne peut pas porter d'information d'identification fédérée et ne fonctionne que pour du code exécuté sur sa propre ressource Azure. Un exécuteur hébergé par GitHub ou un agent hébergé par Microsoft n'est pas votre ressource Azure : il faut la fédération d'identité de charge de travail, pas « activer l'identité managée ».

<!-- section: github-authentication | objectives: 4.1.2 -->
## Authentification GitHub : GITHUB_TOKEN, GitHub Apps et jetons d'accès personnels

**GITHUB_TOKEN** est créé au début de chaque job et expire à la fin du job (24 heures au maximum sur un exécuteur auto-hébergé, dont le job peut durer plus longtemps). Il est limité au dépôt qui contient le workflow. Ses autorisations par défaut viennent du paramètre de dépôt ou d'organisation **Workflow permissions** : permissif (lecture et écriture sur toutes les étendues) ou restreint (lecture sur `contents` et `packages`). Appliquez le privilège minimum dans le workflow :

```yaml
permissions:
  contents: read

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - run: gh issue edit "$NUMBER" --add-label triage --repo "$GITHUB_REPOSITORY"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NUMBER: ${{ github.event.issue.number }}
```

Dès qu'une autorisation est listée, toutes celles qui ne le sont pas passent à `none`. `read-all`, `write-all` et `permissions: {}` appliquent un même niveau à toutes les étendues. `id-token` n'accepte que `write` ou `none`.

Les événements créés avec GITHUB_TOKEN ne déclenchent pas de nouvelles exécutions de workflow (protection contre la récursivité), sauf `workflow_dispatch` et `repository_dispatch`. Une pull request ouverte avec GITHUB_TOKEN crée des exécutions qui attendent une approbation. Pour pousser un commit ou ouvrir une pull request qui doit déclencher la CI, utilisez un jeton de GitHub App ou un PAT. Le paramètre **Allow GitHub Actions to create and approve pull requests** décide si GITHUB_TOKEN peut le faire.

Une **GitHub App** s'installe sur une organisation ou sur des dépôts choisis, a des autorisations précises, n'est liée à aucun compte d'utilisateur, ne consomme pas de siège et a des limites de débit qui augmentent avec l'organisation. Son **jeton d'accès d'installation expire au bout d'une heure** et peut être restreint à certains dépôts et autorisations. Dans un workflow :

```yaml
steps:
  - name: Generate a token
    id: generate-token
    uses: actions/create-github-app-token@v3
    with:
      client-id: ${{ vars.APP_CLIENT_ID }}
      private-key: ${{ secrets.APP_PRIVATE_KEY }}
  - name: Use the token
    env:
      GH_TOKEN: ${{ steps.generate-token.outputs.token }}
    run: gh api octocat
```

Les **jetons d'accès personnels** agissent au nom d'un utilisateur. GitHub recommande les PAT fine-grained plutôt que les PAT classiques :

| | PAT fine-grained | PAT classique |
| --- | --- | --- |
| Étendue | Un seul propriétaire de ressources (utilisateur ou organisation), dépôts choisis | Tous les dépôts accessibles à l'utilisateur |
| Autorisations | Autorisations précises par ressource | Étendues larges comme `repo` |
| Contrôle de l'organisation | Les propriétaires peuvent exiger une approbation et fixer une durée de vie maximale | Les propriétaires peuvent bloquer les PAT classiques |
| Non pris en charge | Packages, API Checks, plusieurs organisations à la fois, accès de collaborateur externe | |

| Exigence | Choix |
| --- | --- |
| Le workflow commente sa propre pull request | GITHUB_TOKEN avec `pull-requests: write` |
| Le workflow pousse dans un autre dépôt de l'organisation, sans dépendre d'une personne | Jeton d'installation de GitHub App |
| Un commit créé par l'automatisation doit déclencher d'autres workflows | Jeton de GitHub App (ou PAT) |
| Un développeur appelle l'API sur deux dépôts depuis un script | PAT fine-grained avec une expiration |
| Déployer dans Azure | OIDC (`id-token: write`), aucun jeton GitHub en jeu |

> **Piège d'examen.** Un PAT stocké en secret fonctionne, mais casse quand son propriétaire part et consomme l'identité de cet utilisateur. « Non lié à un utilisateur » et « effort d'administration minimal pour une automatisation à l'échelle de l'organisation » désignent une GitHub App.

<!-- section: azure-devops-authentication | objectives: 4.1.3 -->
## Connexions de service et jetons d'accès personnels Azure DevOps

Une **connexion de service** stocke la façon dont un pipeline s'authentifie auprès d'un service externe (Azure Resource Manager, registre Docker, Kubernetes, GitHub, générique). Pour Azure Resource Manager :

| Option | Quand |
| --- | --- |
| Inscription d'application (automatique) avec fédération d'identité de charge de travail | Par défaut pour une nouvelle connexion ; exige le rôle Owner sur l'abonnement ; Azure DevOps crée l'application et la fédération |
| Identité managée (attribuée par l'utilisateur, existante) avec fédération d'identité de charge de travail | Vous ne pouvez pas créer d'inscriptions d'application |
| Inscription d'application ou identité managée (manuelle) | La création automatique a échoué ou l'identité est gérée par une autre équipe ; fédération ou secret |
| Secret, identité managée affectée à l'agent, profil de publication | Rétrocompatibilité uniquement |

Niveaux d'étendue : abonnement (éventuellement restreint à un groupe de ressources), groupe d'administration ou espace de travail Machine Learning. Une connexion de principal de service **automatique** existante utilisée par **un seul projet** se convertit en fédération d'identité de charge de travail avec **Convert** (retour arrière possible pendant sept jours) ; une connexion créée manuellement ou partagée entre projets ne peut pas l'être.

Sécuriser une connexion de service :

- **Sécurité** de la connexion : User (l'utiliser dans les pipelines) et Administrator (gérer ses rôles ; attribué à son créateur).
- **Autorisations de pipeline** : autoriser des pipelines précis plutôt que « Grant access permission to all pipelines ».
- **Approbations et vérifications** sur la connexion (approbation, contrôle de branche, heures ouvrables) exécutées avant toute phase qui l'utilise.

```yaml
steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'sc-contoso-prod-wif'
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: az group list --output table
```

Les **PAT Azure DevOps** authentifient les outils qui ne prennent pas en charge Microsoft Entra ID (authentification HTTP Basic avec un nom d'utilisateur vide). Un PAT ne peut pas accorder plus que ce que possède son propriétaire ; choisissez des étendues personnalisées (par exemple **Agent Pools (Read & manage)** pour inscrire un agent auto-hébergé) et la durée de vie la plus courte. Azure DevOps envoie une notification avant l'expiration. Les **PAT globaux** (valides dans toutes les organisations) sont en cours de retrait : utilisez des PAT limités à une organisation. Les administrateurs peuvent restreindre les PAT globaux et à étendue complète, fixer une durée de vie maximale, restreindre la création de PAT et révoquer les PAT des utilisateurs.

> **Conseil d'examen.** Pour l'automatisation, l'ordre de préférence de Microsoft est : connexion de service avec fédération d'identité de charge de travail, identité managée ou principal de service avec des jetons Microsoft Entra, et un PAT seulement quand l'outil ne prend rien d'autre en charge.

<!-- section: github-permissions | objectives: 4.1.4 -->
## Autorisations et rôles dans GitHub

Rôles d'organisation : **Owner** (administration complète, en garder au moins deux), **Member** (par défaut), **Moderator**, **Billing manager**, **Security manager** (voir les alertes de sécurité et gérer les paramètres de sécurité sur tous les dépôts), **GitHub App manager**. Des rôles d'organisation prédéfinis existent dans toute organisation ; les **rôles d'organisation personnalisés** et les **rôles de dépôt personnalisés** exigent GitHub Enterprise Cloud.

Rôles de dépôt, du moins au plus étendu :

| Rôle | Ajoute |
| --- | --- |
| Read | Pull, fork, ouvrir des issues, commenter, faire des revues |
| Triage | Étiquettes, fermer/rouvrir/attribuer issues et pull requests, demander des revues ; pas de push |
| Moderate | Modérer et modifier issues et discussions, gérer les pull requests ; pas de push |
| Write | Push, fusion de pull requests, approbation des revues obligatoires, releases, exécution et annulation de workflows, réception des alertes Dependabot |
| Maintain | Description et sujets du dépôt, options de fusion, Pages ; aucun paramètre sensible ou destructif |
| Admin | Règles de protection de branche et ensembles de règles (rulesets), webhooks, clés de déploiement, paramètres, visibilité, accès des équipes et collaborateurs, suppression ou archivage |

Règles de conception : donnez l'accès par des **équipes** (les équipes imbriquées héritent de l'accès de leur parent), définissez des **autorisations de base** pour tous les membres (souvent Read ou aucune) et utilisez le rôle le plus restreint.

> **Piège d'examen.** Maintain ne peut pas modifier les règles de protection de branche ni les rulesets. Un chef d'équipe qui doit changer les relecteurs obligatoires a besoin d'Admin sur ce dépôt (ou d'un rôle de dépôt personnalisé sur GitHub Enterprise Cloud).

<!-- section: azure-devops-permissions | objectives: 4.1.5 -->
## Autorisations et groupes de sécurité dans Azure DevOps

Les autorisations se définissent à trois niveaux : organisation (collection), projet et objet (chemins de zone et d'itération, dépôts et branches, pipelines, dossiers de requêtes, connexions de service, pools d'agents).

| Groupe | Niveau | Rôle |
| --- | --- | --- |
| Project Collection Administrators | Organisation | Projets, stratégies, processus, rétention, pools d'agents, extensions |
| Project Collection Valid Users | Organisation | Tous les utilisateurs de l'organisation (automatique) |
| Project Administrators | Projet | Équipes, chemins de zone et d'itération, dépôts, hooks de service, connexions de service |
| Contributors | Projet | Lecture et écriture sur les dépôts, le suivi du travail, les pipelines |
| Readers | Projet | Lecture seule |
| Build Administrators / Release Administrators | Projet | Gérer les pipelines et les mises en production |
| Project Valid Users | Projet | Tous les membres du projet (automatique) |
| *NomÉquipe* Team | Projet | Créé avec chaque équipe ; les membres héritent des autorisations de Contributors |

États d'autorisation : **Allow**, **Deny**, **Not set**, ainsi que leurs formes héritées et système. Résolution :

1. À la même étendue, **Deny l'emporte sur Allow**, y compris entre groupes.
2. **Not set** n'accorde ni ne refuse ; sans autre attribution, l'accès est refusé.
3. Une autorisation définie explicitement sur un objet enfant remplace la valeur héritée du parent (un Allow explicite sur `Area1/Sub1` l'emporte sur un Deny explicite hérité de `Area1`).

Ajoutez des groupes Microsoft Entra aux groupes Azure DevOps pour que l'appartenance suive l'annuaire (les changements sont pris en compte en moins d'une heure). Ne modifiez pas les autorisations par défaut des groupes Valid Users.

> **Piège d'examen.** Retirer un utilisateur de Contributors ne retire pas ce qu'un autre groupe accorde, et un Deny dans un groupe l'emporte sur un Allow dans un autre. Pour bloquer un dépôt à une équipe, définissez Deny dans les autorisations de ce dépôt (niveau objet) pour le groupe de l'équipe.

<!-- section: access-levels | objectives: 4.1.6 -->
## Niveaux d'accès : Stakeholder et collaborateurs externes

Dans Azure DevOps, le **niveau d'accès** décide quelles fonctionnalités un utilisateur voit ; les groupes de sécurité décident ce qu'il peut en faire.

| Niveau d'accès | Donne |
| --- | --- |
| Stakeholder (partie prenante) | Gratuit, nombre d'utilisateurs illimité : éléments de travail, tableaux (limités), tableaux de bord, pages wiki, consultation des builds et des mises en production, **approbation des mises en production qui lui sont attribuées** ; pas de code Azure Repos, ne peut pas créer de pipelines |
| Basic | La plupart des fonctionnalités, dont Repos, Pipelines, Artifacts, Boards |
| Basic + Test Plans | Basic plus Azure Test Plans |
| Visual Studio subscriber | Détecté automatiquement à partir de l'abonnement (Professional donne Basic, Enterprise donne Basic + Test Plans) |
| GitHub Enterprise | Les utilisateurs disposant d'une licence GitHub Enterprise reçoivent Basic |

```bash
az devops user add --email-id pm@contoso.com --license-type stakeholder \
  --org https://dev.azure.com/contoso
```

Les projets publics sont retirés : les projets publics existants deviennent privés en 2027.

Dans GitHub, un **collaborateur externe** (outside collaborator) n'est pas membre de l'organisation et reçoit un rôle de dépôt sur des dépôts précis. Sur les dépôts privés, il consomme une licence payante ; il ne peut pas être ajouté à une équipe ; il doit activer l'authentification à deux facteurs si l'organisation l'exige ; les forks demandent un accès distinct.

| Exigence | Réponse |
| --- | --- |
| Un responsable métier consulte les éléments de travail et approuve les mises en production, sans coût de licence | Stakeholder Azure DevOps |
| Un chef de produit doit lire le code dans Azure Repos | Basic |
| Un consultant externe contribue à un dépôt GitHub pendant trois mois | Collaborateur externe avec Write sur ce dépôt |
| De nombreux employés doivent accéder à de nombreux dépôts | Membre de l'organisation dans une équipe |

> **Piège d'examen.** Stakeholder peut approuver une mise en production et consulter les pipelines, mais ne voit pas le code du dépôt ; et un collaborateur externe ne peut pas recevoir d'accès par une équipe.

<!-- section: projects-teams | objectives: 4.1.7 -->
## Projets et équipes dans Azure DevOps

Un **projet** contient des dépôts, des pipelines, des tableaux, des artefacts et des plans de test avec un processus (Basic, Agile, Scrum ou CMMI) et sa propre sécurité. En créer un exige d'être membre de Project Collection Administrators ou d'avoir **Create new projects** au niveau de l'organisation ; une organisation contient au maximum **1 000** projets.

Une **équipe** est un groupe de membres du projet avec son propre backlog, ses tableaux, ses sprints et ses tableaux de bord. Chaque projet démarre avec une équipe par défaut qui porte le nom du projet (elle peut être renommée ou remplacée comme équipe par défaut). Les Project Administrators créent les équipes ; les **administrateurs d'équipe** ajoutent des membres et configurent les paramètres de l'équipe. Créer une équipe crée un groupe de sécurité `[Projet]\Équipe` (utilisable dans les requêtes et les @mentions), un tableau de bord par défaut et, si l'option est cochée, un chemin de zone au nom de l'équipe.

Configuration de l'équipe dans **Paramètres du projet > Équipes** et **Configuration de l'équipe** : **chemins de zone** sélectionnés (quels éléments de travail apparaissent dans le backlog de l'équipe, 300 au maximum, avec ou sans les sous-zones), **chemin de zone par défaut** (obligatoire pour que les outils de l'équipe fonctionnent), **chemins d'itération** avec une itération de backlog et une itération par défaut, niveaux de backlog, bogues dans les backlogs, jours ouvrés.

```bash
az devops project create --name Fabrikam-Mobile --process Agile \
  --source-control git --visibility private --org https://dev.azure.com/fabrikam
az devops team create --name "Mobile Payments" --project Fabrikam-Mobile \
  --org https://dev.azure.com/fabrikam
```

| Exigence | Conception |
| --- | --- |
| Plusieurs équipes partagent un produit, le code et la cadence de mise en production | Un projet, plusieurs équipes, un chemin de zone par équipe |
| Un responsable voit le travail de toutes les équipes de fonctionnalités | Équipe de gestion qui sélectionne le chemin de zone parent avec les sous-zones |
| Une division a besoin d'un autre processus et d'une administration séparée | Projet distinct |
| Restreindre qui peut modifier les éléments de travail d'un composant | Autorisations du chemin de zone (niveau objet) |

> **Conseil d'examen.** Les chemins de zone décident quels éléments de travail une équipe voit et qui peut les modifier ; les chemins d'itération décident des sprints. Les autorisations de chemin de zone ne contrôlent pas l'accès au projet lui-même.

<!-- section: key-points -->
## Points clés

- Identité attribuée par le système : une ressource, supprimée avec elle. Attribuée par l'utilisateur : partagée, indépendante, fédérable. Exécuteurs et agents externes : fédération d'identité de charge de travail.
- GITHUB_TOKEN : par job, un dépôt, privilège minimum avec `permissions`, ne déclenche pas de nouvelles exécutions. GitHub App : non liée à un utilisateur, jetons d'une heure. PAT fine-grained plutôt que classique.
- Connexions de service Azure Resource Manager : fédération d'identité de charge de travail par défaut ; sécurisez-les avec les autorisations de pipeline, les rôles et les vérifications. Les PAT globaux sont retirés ; préférez les jetons Microsoft Entra.
- Rôles GitHub : Read, Triage, Moderate, Write, Maintain, Admin ; seul Admin gère la protection de branche. Utilisez les équipes et les autorisations de base.
- Azure DevOps : Deny l'emporte sur Allow à la même étendue ; une autorisation explicite sur l'enfant l'emporte sur l'héritage ; les niveaux d'accès s'ajoutent aux autorisations des groupes.
- Stakeholder est gratuit et peut approuver des mises en production mais ne lit pas le code ; les collaborateurs externes consomment un siège sur les dépôts privés et ne rejoignent pas d'équipe.
