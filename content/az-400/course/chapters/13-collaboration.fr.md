Les questions sur la collaboration testent la tuyauterie autour du code : la documentation, les notes de publication, les webhooks et les connexions entre Azure Boards, GitHub et Microsoft Teams. Attendez-vous à des détails de configuration : noms de fichiers, clés YAML, autorisations et commandes de conversation.

<!-- section: wikis | objectives: 1.3.1 -->
## Wikis, Markdown et diagrammes Mermaid

Azure DevOps propose deux types de wiki, tous deux stockés dans Git :

| Caractéristique | Wiki de projet (provisionné) | Code publié en tant que wiki |
| --- | --- | --- |
| Nombre | Un par projet | Plusieurs, chacun à partir d'un dossier d'un dépôt Git |
| Stockage | Dépôt masqué `<ProjectName>.wiki`, branche `wikiMain` | Votre dépôt, sur la branche de votre choix |
| Modification | **Wiki > Pages** dans le portail | Fichiers Markdown modifiés dans Repos, idéalement par pull requests |
| Ordre des pages | Géré pour vous | Maintenu manuellement dans des fichiers `.order` |
| Versions | Non | Une version du wiki par branche (par exemple par branche de mise en production) |
| Rétablissement | Menu **Revert** | Une pull request depuis une branche locale |

> **Conseil d'examen.** « Une documentation versionnée avec le code et relue par pull requests » désigne **la publication du code en tant que wiki**. « Des contributeurs non techniques modifient les pages dans le navigateur » désigne **le wiki de projet**.

Dans le dépôt Git d'un wiki, chaque page est un fichier Markdown, une page qui a des sous-pages possède un dossier du même nom, un fichier `.order` dans chaque dossier fixe l'ordre des pages (alphabétique par défaut) et les pièces jointes vont dans `.attachments`. Un trait d'union dans le nom de fichier représente une espace dans le titre (`How-to-contribute.md`) ; un vrai trait d'union est donc encodé `%2D`, et les autres caractères spéciaux sont encodés aussi (`:` devient `%3A`). Limites : 235 caractères pour le chemin complet, 18 Mo par page, 19 Mo par pièce jointe.

Les wikis Azure DevOps ajoutent leur propre syntaxe au Markdown :

```text
[[_TOC_]]

## Release process

Related bug: #1423.

:::
query-table 6ff7777e-8ca5-4f04-a7f6-9e63737dddf7
:::

::: mermaid
graph LR
    A[Feature branch] --> B{Pull request}
    B -->|Approved| C[main]
    B -->|Changes requested| A
    C --> D[Deploy to staging]
:::

[[_TOSP_]]
```

| Syntaxe | Affiche |
| --- | --- |
| `[[_TOC_]]` | La table des matières des titres de la page (sensible à la casse, première occurrence seulement) |
| `[[_TOSP_]]` | La table des sous-pages de la page |
| `query-table <query id>` entre deux lignes `:::` | Les résultats à jour d'une requête d'éléments de travail |
| `#1423` | Un lien vers un élément de travail |
| Mention `@` | Notifie un utilisateur ou un groupe |
| `::: mermaid` ou un bloc délimité marqué `mermaid` | Un diagramme Mermaid |
| `$...$` et `$$...$$` | Des formules mathématiques (KaTeX) |

Mermaid dans Azure DevOps prend en charge les diagrammes de séquence, de Gantt, les organigrammes (`graph`), les diagrammes de classes, d'états, de parcours utilisateur, circulaires, d'exigences, Gitgraph, entité-relation et chronologiques, avec une syntaxe limitée : pas de Font Awesome, la plupart des balises HTML non prises en charge.

> **Piège d'examen.** Les wikis Azure DevOps ne prennent en charge ni le mot-clé `flowchart` ni les liens vers ou depuis un `subgraph` : écrivez `graph LR` ou `graph TD`. Sur GitHub, les deux mots-clés fonctionnent.

Sur **GitHub**, un dépôt peut avoir un wiki, mais une documentation conservée sous forme de fichiers Markdown dans le dépôt (`README.md`, un dossier `docs/`) est relue avec le code. Les diagrammes Mermaid s'affichent dans les fichiers Markdown, les issues, les pull requests, les discussions et les wikis, à partir d'un bloc de code délimité marqué `mermaid`.

<!-- section: release-docs | objectives: 1.3.2 -->
## Notes de publication et documentation d'API

Les **releases GitHub** reposent sur des balises Git. Quand vous créez une release, **Generate release notes** liste les pull requests fusionnées depuis la release précédente (vous pouvez choisir la balise précédente), les contributeurs et un lien vers le journal complet des modifications. Configurez les catégories dans `.github/release.yml` :

```yaml
changelog:
  exclude:
    labels:
      - ignore-for-release
    authors:
      - dependabot
  categories:
    - title: Breaking changes
      labels:
        - breaking-change
    - title: New features
      labels:
        - enhancement
    - title: Bug fixes
      labels:
        - bug
    - title: Other changes
      labels:
        - "*"
```

Chaque catégorie exige un `title` et des `labels` ; `"*"` attrape toutes les pull requests qui ne correspondent à aucune catégorie précédente, et `exclude` retire des pull requests par étiquette ou par auteur, globalement ou par catégorie.

> **Piège d'examen.** Les notes de publication générées sont construites à partir des **pull requests fusionnées et de leurs étiquettes**. Si les notes doivent être regroupées par type de modification, la solution est d'étiqueter les pull requests de façon cohérente (par exemple avec une vérification d'étiquette obligatoire) et de configurer `release.yml`, pas de modifier les notes à la main.

Azure DevOps n'a pas de générateur de notes de publication intégré : une étape de pipeline construit les notes à partir des éléments de travail et des commits de l'exécution (via l'API REST ou l'historique Git) et les publie comme artefact de pipeline, page de wiki ou release GitHub.

La **documentation d'API** est générée à partir du code, pas écrite à la main : le build produit une description OpenAPI de l'API, versionnée avec la mise en production et publiée sur un site de documentation ou importée dans le portail des développeurs d'Azure API Management. Dans ASP.NET Core, le package `Microsoft.AspNetCore.OpenApi` génère le document à l'exécution (`AddOpenApi`, `MapOpenApi`), et `Microsoft.Extensions.ApiDescription.Server` le génère au moment du build (propriété `OpenApiGenerateDocumentsOnBuild`), ce qui convient à un pipeline. Une interface interactive exige un package tiers.

<!-- section: docs-from-git | objectives: 1.3.3 -->
## Automatiser la documentation à partir de l'historique Git

L'historique Git contient déjà un journal des modifications quand les messages de commit sont disciplinés. Une convention comme Conventional Commits (`feat:`, `fix:`, `docs:`, `BREAKING CHANGE:`) permet à un script de regrouper les modifications et de choisir la prochaine version sémantique.

| Besoin | Commande |
| --- | --- |
| Dernière balise avant le commit actuel | `git describe --tags --abbrev=0` |
| Modifications entre deux versions | `git log v2.3.0..v2.4.0 --no-merges --pretty=format:"- %s (%h)"` |
| Uniquement les pull requests fusionnées (commits squash ou de fusion) | `git log v2.3.0..v2.4.0 --first-parent --pretty=format:"- %s"` |
| Contributeurs avec leur nombre de commits | `git shortlog -sn v2.3.0..v2.4.0` |

Dans un pipeline, l'historique doit être complet. De nombreux pipelines Azure Pipelines créés depuis septembre 2022 utilisent une récupération superficielle (shallow fetch) de profondeur 1 et ne synchronisent pas les balises, et `actions/checkout` ne récupère qu'un commit par défaut :

```yaml
steps:
- checkout: self
  fetchDepth: 0
  fetchTags: true
- bash: |
    PREVIOUS=$(git describe --tags --abbrev=0 HEAD^)
    echo "## Changes since $PREVIOUS" > CHANGELOG.md
    git log "$PREVIOUS"..HEAD --no-merges --pretty=format:"- %s (%h, %an)" >> CHANGELOG.md
  displayName: Generate changelog from Git history
- publish: CHANGELOG.md
  artifact: release-notes
```

```yaml
on:
  push:
    tags: ["v*"]
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: gh release create "$GITHUB_REF_NAME" --generate-notes --verify-tag
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`gh release create --generate-notes` utilise le même générateur que l'interface web ; `--notes-start-tag` fixe la balise de départ. Pour publier plutôt dans un wiki de code, le pipeline valide la page générée dans le dépôt du wiki, ce qui exige l'autorisation Contribute pour l'identité du service de build du pipeline sur ce dépôt.

> **Piège d'examen.** Une étape de journal des modifications qui ne renvoie qu'un commit, ou un `git describe` qui échoue avec « No names found », révèle un **clone superficiel sans balises** : définissez `fetchDepth: 0` et `fetchTags: true` (Azure Pipelines) ou `fetch-depth: 0` (GitHub Actions).

<!-- section: webhooks | objectives: 1.3.4 -->
## Intégration à l'aide de webhooks

Les **webhooks GitHub** envoient une requête HTTP POST à une URL de charge utile quand les événements choisis se produisent. Ils sont créés sur un dépôt (par les administrateurs, jusqu'à 20 par événement), sur une organisation (par les propriétaires, jusqu'à 20 par événement) ou par une GitHub App (un webhook par application). Les bonnes pratiques documentées par GitHub :

| Pratique | Pourquoi |
| --- | --- |
| Définir un secret à forte entropie et valider `X-Hub-Signature-256` (HMAC SHA-256, comparaison en temps constant) | Prouve que la livraison vient de GitHub et n'a pas été modifiée ; `X-Hub-Signature` (SHA-1) est hérité |
| S'abonner uniquement aux événements nécessaires | Moins de charge et moins de données exposées |
| Répondre avec un statut 2XX en moins de 10 secondes et traiter en arrière-plan | Les réponses plus lentes comptent comme des livraisons en échec |
| Lire `X-GitHub-Event` et le champ `action` de la charge utile | Identifier ce qui s'est passé avant de traiter |
| Utiliser `X-GitHub-Delivery` pour détecter les doublons, relivrer les livraisons en échec après une panne | Traitement idempotent, aucun événement perdu |

Les **crochets de service (service hooks) Azure DevOps** exécutent une action dans un autre service quand un événement se produit dans un projet (code poussé, pull request mise à jour, build terminé, déploiement de mise en production terminé, élément de travail créé ou mis à jour). Configurez-les dans **Project settings > Service hooks > Create subscription** : choisissez le service, l'événement et ses filtres, l'action, puis **Test**. Gérer les abonnements exige les autorisations **Edit subscriptions** et **View subscriptions**, que seuls les Project Administrators possèdent par défaut.

| Consommateur | Action |
| --- | --- |
| Web Hooks | HTTP POST de l'événement vers n'importe quelle URL |
| Microsoft Teams, Slack | Publier un message dans un canal |
| Azure Service Bus | Message vers une file d'attente, une rubrique ou Notification Hubs |
| Stockage Azure | Message dans une file d'attente Stockage Azure |
| Jenkins | Déclencher un build |

Pour le consommateur Web Hooks, utilisez uniquement HTTPS (obligatoire pour l'authentification de base) et autorisez les plages d'adresses IP d'Azure DevOps si le point de terminaison est derrière un pare-feu ; localhost et les plages d'adresses spéciales ne peuvent pas être des cibles. **Resource details to send** peut valoir All (par défaut), Minimal (champs clés comme l'ID et l'URL) ou None : Minimal et None sont plus sûrs, car le récepteur doit rappeler Azure DevOps avec ses propres autorisations pour lire la ressource.

Dans l'autre sens, un service externe peut **démarrer une exécution Azure Pipelines**. Créez une connexion de service **Incoming WebHook** (avec un secret facultatif et l'en-tête HTTP qui porte le hachage de la charge utile), faites envoyer par le service un JSON en POST à `https://dev.azure.com/<org>/_apis/public/distributedtask/webhooks/<connection name>?api-version=6.0-preview`, et déclarez le webhook comme ressource du pipeline :

```yaml
resources:
  webhooks:
    - webhook: InventoryEvents
      connection: InventoryWebhookConnection
      filters:
        - path: repositoryName
          value: inventory-api
steps:
- script: echo ${{ parameters.InventoryEvents.repositoryName }}
```

Ne référencez que des champs terminaux : un objet JSON entier produit un YAML non valide.

<!-- section: boards-github | objectives: 1.3.5 -->
## Intégration entre Azure Boards et les référentiels GitHub

L'intégration passe par l'**application Azure Boards pour GitHub**. Prérequis : dans Azure DevOps, appartenance à **Project Collection Administrators** (ou être le créateur du projet) ; sur GitHub, être administrateur ou propriétaire des dépôts, ou propriétaire de l'organisation pour installer l'application.

1. Dans Azure DevOps, ouvrez **Project settings > GitHub connections** et sélectionnez **Connect your GitHub account** (ou **New connection**). Vous pouvez aussi partir de l'application Azure Boards dans GitHub Marketplace (plan gratuit).
2. Approuvez, installez et autorisez l'application Azure Boards sur GitHub, avec l'accès à **All repositories** ou à **Only select repositories**.
3. Sélectionnez les dépôts à connecter au projet et enregistrez.
4. Mentionnez `AB#<ID>` dans les messages de commit, les descriptions de pull request et les descriptions d'issue ; les liens apparaissent dans la section **Development** de l'élément de travail.
5. Pour changer les dépôts plus tard, utilisez le menu de la connexion dans **GitHub connections**, ou **Configure** sur l'application installée dans les paramètres GitHub, sous **Repository access**.

| Situation | Ce qu'il faut choisir ou savoir |
| --- | --- |
| GitHub.com | Connexion avec le compte GitHub (recommandée) ou un jeton d'accès personnel |
| GitHub Enterprise Server | OAuth (préféré, exige une application OAuth inscrite), un jeton d'accès personnel ou des informations d'identification ; le serveur doit être accessible depuis internet ; une organisation GitHub par connexion |
| Connexion par jeton d'accès personnel | Les fonctionnalités qui exigent la connexion par GitHub App ne sont pas disponibles |
| Dépôts d'une autre organisation GitHub | Ajoutez une autre connexion |
| Azure DevOps Server | Se connecte uniquement à GitHub Enterprise Server |
| Processus XML hébergé | Mettez à jour les types d'éléments de travail pour afficher la section Development et les types de liens GitHub |

> **Piège d'examen.** L'ajout manuel d'un lien GitHub depuis un élément de travail échoue à la validation quand le dépôt n'est pas connecté au projet Azure Boards. Un dépôt absent de la liste de la connexion signifie généralement que l'application a été installée avec **Only select repositories** : corrigez son **Repository access**.

Retenez les limites de la section sur la traçabilité : jusqu'à 2 000 dépôts par connexion, et chaque dépôt connecté aux projets d'une seule organisation Azure DevOps.

<!-- section: teams | objectives: 1.3.6 -->
## Intégration avec Microsoft Teams

Chaque chaîne d'outils dispose d'applications Teams qui publient des notifications dans les canaux et permettent d'agir dessus :

| Application | Commandes | Points forts |
| --- | --- | --- |
| GitHub | `@github signin`, `@github subscribe owner/repo [feature]`, `@github unsubscribe owner/repo [feature]` | Fonctionnalités par défaut : issues, pulls, commits, comments, deployments, releases ; reviews, workflows, branches et discussions sont désactivées par défaut |
| Azure Boards | `@azure boards signin`, `@azure boards link <project url>`, `@azure boards subscriptions`, `@azure boards addAreapath <area path>`, `@azure boards unlink` | Notifications d'éléments de travail filtrées par chemin de zone, type et étiquettes ; création d'un élément de travail depuis un message |
| Azure Pipelines | `@azure pipelines signin`, `@azure pipelines subscribe` | Un pipeline ou tous les pipelines d'un projet ; approbation ou rejet des déploiements depuis le canal |
| Azure Repos | `@azure repos signin`, `@azure repos subscribe`, `@azure repos subscriptions` | Envois (push), création et mises à jour des pull requests |

Filtres GitHub :

```text
@github subscribe contoso/invoicing reviews workflows
@github subscribe contoso/invoicing commits:*
@github subscribe contoso/invoicing +label:"priority"
@github subscribe contoso/invoicing workflows:{event:"push" branch:"main"}
@github unsubscribe contoso/invoicing commits
```

Les commits sont notifiés pour la branche par défaut, sauf si vous ajoutez un filtre de branche (`commits:main`, `commits:feature/*`, `commits:*`) ; un seul filtre d'étiquette obligatoire est autorisé par dépôt ; sans filtre, les notifications de workflow couvrent les exécutions déclenchées par des pull requests qui ciblent la branche par défaut.

Les applications Azure DevOps fonctionnent uniquement avec Azure DevOps Services et exigent que la stratégie **Third-party application access via OAuth** soit autorisée dans l'organisation. Un canal est lié à un seul projet Azure Boards à la fois ; créer des abonnements aux éléments de travail exige d'être Project Administrator ou Team Administrator, et quand un canal a des abonnements, seuls les Project Administrators peuvent le délier. Les notifications vont dans les canaux, pas dans les conversations.

> **Piège d'examen.** Les connecteurs Office 365 dans Teams sont mis hors service. Pour les nouvelles intégrations, utilisez l'application Azure Boards, Azure Pipelines ou Azure Repos, l'onglet Azure DevOps (un tableau de bord ou un tableau dans un canal) ou l'application **Workflows** (Power Automate), pas un connecteur de webhook entrant.

<!-- section: key-points -->
## Points clés

- Wiki de projet : un par projet, `<ProjectName>.wiki`, modifié dans le portail. Wiki de code : plusieurs, versionnés par branche, `.order` maintenu manuellement.
- Mermaid dans Azure DevOps : `::: mermaid` ou un bloc délimité `mermaid`, `graph` au lieu de `flowchart`.
- Les notes de publication GitHub proviennent des pull requests fusionnées et de leurs étiquettes, configurées dans `.github/release.yml`.
- La documentation tirée de l'historique Git exige un clone complet avec les balises.
- Webhooks GitHub : secret plus `X-Hub-Signature-256`, réponse en moins de 10 secondes. Crochets de service : Project Administrators par défaut, HTTPS, détails de ressource Minimal ou None pour la sécurité.
- Application Azure Boards : Project Collection Administrators plus administrateur du dépôt GitHub ; mentions `AB#` ; une seule organisation Azure DevOps par dépôt.
- Teams : applications GitHub, Azure Boards, Azure Pipelines et Azure Repos ; les connecteurs Office 365 sont mis hors service.
