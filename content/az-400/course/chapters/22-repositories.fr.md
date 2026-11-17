Configurer un dépôt, c'est le garder rapide à mesure qu'il grossit, contrôler l'accès, étiqueter son historique et corriger cet historique : une branche supprimée à récupérer, un secret ou un énorme binaire à purger. Les questions portent sur le choix du bon outil (Git LFS ou un flux de packages, Scalar ou un clone superficiel, revert ou reset, filter-repo ou un simple nouveau commit) et sur la commande ou l'autorisation exacte.

<!-- section: large-files | objectives: 2.2.1 -->
## Gérer les grands fichiers avec Git LFS et git-fat

Git conserve chaque version de chaque fichier dans chaque clone : les gros binaires qui changent souvent (images, vidéos, ressources de jeu, jeux de données) rendent clones et fetch lents pour toujours. Les options :

| Contenu | Stockage recommandé |
| --- | --- |
| Code source, scripts, configuration en formats texte | Git |
| Gros binaires qui changent et ne se comparent pas bien | **Git LFS** |
| Bibliothèques, dépendances, composants réutilisables | Un flux de packages (Azure Artifacts, GitHub Packages), pas le dépôt |
| Sorties de build, journaux, code compilé | Nulle part dans Git : les reconstruire ou les publier comme artefacts de pipeline |
| Gros fichiers à distribuer aux utilisateurs | Les releases GitHub, ou un package |

**Git LFS** stocke un petit **fichier pointeur** dans le dépôt et le contenu sur le serveur LFS. Azure Repos (gratuitement) et GitHub le prennent en charge. Chaque client doit installer l'extension Git LFS, sinon il récupère les pointeurs au lieu des fichiers.

```bash
git lfs install                       # once per machine
git lfs track "*.psd" "*.mp4"         # writes the patterns to .gitattributes
git add .gitattributes design/hero.psd
git commit -m "Track design files with Git LFS"
git push

git lfs migrate import --include="*.psd" --everything   # move files already in history (rewrites it)
git lfs lock design/hero.psd                            # file locking for unmergeable files
```

Validez `.gitattributes` **avant** les gros fichiers. Dans les pipelines, le contenu LFS n'est récupéré que sur demande : `checkout: self` avec `lfs: true` dans Azure Pipelines, `lfs: true` sur `actions/checkout` dans GitHub Actions.

| Limite | Azure Repos | GitHub |
| --- | --- | --- |
| Fichier unique dans Git | Doit rester sous 100 Mo | Avertissement au-delà de 50 Mio, **bloqué au-delà de 100 Mio** (25 Mio par le navigateur) |
| Dépôt | Doit rester sous 250 Go, idéalement 10 Go | Idéalement sous 1 Go, sous 5 Go fortement recommandé |
| Push | 5 Go par push (objets LFS non comptés) | |
| Fichier LFS | Limite d'une heure par chargement | 2 Go (Free, Pro), 4 Go (Team), 5 Go (Enterprise Cloud) |
| Remarques | SSH non pris en charge pour les dépôts contenant des fichiers LFS ; un fichier déposé dans l'interface web est validé comme fichier normal | LFS inutilisable avec les sites GitHub Pages et les dépôts modèles |

Les stratégies de dépôt d'Azure Repos peuvent aussi bloquer au moment du push une **taille de fichier maximale (Maximum file size)** ou des chemins interdits (**File path validation**).

**git-fat** est une alternative open source plus ancienne (Python et rsync). Les fichiers concernés sont déclarés dans `.gitattributes` avec un filtre `fat`, `git fat init` l'active, le contenu part vers une destination rsync déclarée dans un fichier `.gitfat` validé dans le dépôt, et `git fat push` / `git fat pull` le transfèrent.

```text
# .gitattributes
*.png filter=fat -crlf
*.gz  filter=fat -crlf

# .gitfat
[rsync]
remote = storage01.contoso.com:/share/fat-store
```

> **Piège d'examen.** Git LFS ne réduit pas un dépôt qui contient déjà les binaires : leur historique est toujours là. Utilisez `git lfs migrate import` (une réécriture de l'historique, avec un push forcé) ou repartez d'un nouveau dépôt. Et une DLL partagée a sa place dans un flux de packages, pas dans LFS.

<!-- section: scaling-repositories | objectives: 2.2.2 -->
## Mettre un dépôt à l'échelle : Scalar et partage entre dépôts

Un dépôt grossit par un long historique, un grand nombre de fichiers ou de gros binaires. Les techniques côté client :

| Technique | Commande | Effet |
| --- | --- | --- |
| Clone superficiel (shallow clone) | `git clone --depth 1 <url>` | Seulement les derniers commits ; le comportement par défaut d'Azure Pipelines (`fetchDepth`) et d'`actions/checkout` |
| Clone partiel | `git clone --filter=blob:none <url>` | Historique complet, contenu des fichiers téléchargé à la demande |
| Extraction partielle (sparse checkout) | `git sparse-checkout set --cone src/payments` | Seulement les dossiers listés dans l'arborescence de travail |
| Scalar | `scalar clone <url>` ou `scalar register` | Configure tout ce qui précède, plus la maintenance en arrière-plan |

**Scalar** est fourni avec Git (depuis la version 2.38) et configure un dépôt pour la grande échelle : clone partiel, extraction partielle en mode cône, moniteur du système de fichiers, commit-graph, multi-pack-index et **maintenance en arrière-plan** (prérécupération horaire des objets, recompactage incrémentiel). `scalar clone` crée un nouvel enrôlement (le dépôt dans un dossier `src`) ; `scalar register` applique les paramètres à un clone existant.

```bash
scalar clone https://dev.azure.com/contoso/Platform/_git/monorepo
cd monorepo/src
git sparse-checkout set services/payments shared/contracts
```

Monodépôt ou plusieurs dépôts ? Un monodépôt facilite les changements atomiques entre composants et l'outillage partagé, au prix de l'échelle (d'où Scalar). Plusieurs dépôts donnent des autorisations, des pipelines et des cycles de mise en production indépendants, au prix du partage de code entre eux :

| Besoin | Solution |
| --- | --- |
| Réutiliser une bibliothèque qui a ses propres versions | La publier comme **package** (Azure Artifacts, GitHub Packages) et référencer une version |
| Inclure le code d'un autre dépôt à un commit figé | **Sous-module Git** (`.gitmodules`, `git submodule update --init --recursive`) |
| Copier l'historique d'un autre dépôt dans un dossier, sans étape supplémentaire pour les consommateurs | **Git subtree** (`git subtree add --prefix=libs/shared <url> main --squash`) |
| Construire à partir de plusieurs dépôts dans un même pipeline | **Extraction multidépôt (multi-repo checkout)** d'Azure Pipelines (`resources.repositories` et plusieurs étapes `checkout`) |
| Partager la logique de pipeline | Modèles YAML dans un autre dépôt, workflows réutilisables dans GitHub |
| Créer de nouveaux dépôts avec la même structure | Dépôt modèle (template repository) GitHub |

```yaml
resources:
  repositories:
    - repository: contracts
      type: git
      name: Platform/shared-contracts
      ref: refs/heads/main
steps:
  - checkout: self
    submodules: true
  - checkout: contracts
```

<!-- section: repository-permissions | objectives: 2.2.3 -->
## Configurer les autorisations du dépôt

Les autorisations **Azure Repos** se définissent sur **All Repositories** (le projet), sur un dépôt ou sur une branche, pour des groupes ou des utilisateurs. Un dépôt hérite du niveau projet sauf si l'**héritage** est désactivé ; les branches héritent d'un sous-ensemble.

| Autorisation | Permet |
| --- | --- |
| Read | Cloner, récupérer, parcourir ; créer des pull requests, les commenter et y voter |
| Contribute | Pousser des changements |
| Create branch / Create tag | Créer des branches / des balises |
| Force push | Réécrire l'historique, supprimer des branches et des balises |
| Edit policies | Configurer les stratégies de branche |
| Manage permissions | Modifier les autorisations |
| Bypass policies when completing pull requests / when pushing | Passer outre les stratégies de branche |
| Create, Delete, Rename repository | Gérer les dépôts |

Readers a Read ; Contributors ajoute Contribute, Create branch, Create tag et Manage notes ; Project Administrators peut tout faire. **Deny (Refuser)** l'emporte sur **Allow (Autoriser)** ; **Not set (Non défini)** n'accorde rien (refus implicite sauf si un autre groupe autorise). Le niveau d'accès passe en premier : dans un projet privé, un **Stakeholder (Partie prenante)** n'a pas accès à Azure Repos, donnez-lui **Basic (De base)**.

Rôles de dépôt **GitHub** pour les dépôts d'organisation, du moins au plus étendu :

| Rôle | Pour |
| --- | --- |
| Read | Consulter et discuter, cloner les dépôts privés |
| Triage | Gérer les issues et les pull requests sans accès en écriture |
| Moderate | Modérer et modifier les issues et gérer les pull requests sans accès en écriture |
| Write | Pousser, fusionner les pull requests |
| Maintain | Gérer le dépôt sans les actions sensibles ou destructrices |
| Admin | Tout, y compris les paramètres de sécurité et la suppression du dépôt |

Attribuez les rôles à des **équipes** plutôt qu'à des personnes ; les propriétaires de l'organisation définissent une **autorisation de base** pour tous les membres ; les **collaborateurs externes (outside collaborators)** sont des personnes extérieures à l'organisation qui ont accès à des dépôts précis ; les **rôles de dépôt personnalisés** exigent GitHub Enterprise Cloud.

> **Piège d'examen.** Un utilisateur qui doit contribuer au code d'un projet Azure DevOps privé a besoin du niveau d'accès **Basic** et de l'autorisation Contribute ; l'accès Stakeholder est gratuit mais sans accès au code. Sur GitHub, un prestataire qui a besoin d'un seul dépôt est un **collaborateur externe**, pas un membre de l'organisation.

<!-- section: tags | objectives: 2.2.4 -->
## Organiser le dépôt avec des balises

Une balise (tag) nomme un commit, en général une version (`v2.3.0`). Les balises **légères (lightweight)** sont un simple pointeur ; les balises **annotées (annotated)** stockent l'auteur de la balise, la date et un message (et peuvent être signées) : utilisez-les pour les versions. Le portail web d'Azure Repos et Visual Studio créent des balises annotées ; une balise légère exige la ligne de commande.

```bash
git tag -a v2.3.0 -m "Release 2.3.0" 9fceb02   # annotated tag on a commit
git push origin v2.3.0                          # tags aren't pushed by default
git push origin --tags                          # or push all tags
git tag -d v2.3.0-rc1                           # delete locally
git push origin --delete v2.3.0-rc1             # delete on the server
```

| Besoin | Azure DevOps | GitHub |
| --- | --- | --- |
| Lancer un pipeline quand une balise de version est poussée | `trigger: tags: include: [ 'v*' ]` | `on: push: tags: [ 'v*' ]` |
| Qui peut créer / supprimer des balises | **Create tag** (Contributors) ; la suppression exige **Force push** sur le dépôt ou sur **All tags** | Accès en écriture ; restreindre avec un **ruleset de balises** (restreindre créations, mises à jour, suppressions) |
| Publier une version à partir d'une balise | Pipeline ayant la balise comme source | **Releases** (balise, notes, binaires) |

Les noms de balises ne peuvent contenir ni espace, ni `~`, ni `:` ; évitez les noms hexadécimaux de 40 caractères.

<!-- section: recover-data | objectives: 2.2.5 -->
## Récupérer des données avec des commandes Git

Git perd rarement un commit : `git reflog` liste où `HEAD` et les branches ont pointé, y compris les commits qui ne sont plus accessibles depuis aucune branche.

| Situation | Commande |
| --- | --- |
| Retrouver le commit de tête d'avant un mauvais reset ou d'une branche locale supprimée | `git reflog`, puis `git branch recovered 4e1d2c7` |
| Restaurer un fichier tel qu'il était dans un commit antérieur | `git restore --source=4e1d2c7 -- src/app.config` (ou `git checkout 4e1d2c7 -- src/app.config`) |
| Abandonner les modifications non validées d'un fichier | `git restore src/app.config` |
| Annuler un commit poussé sans réécrire l'historique partagé | `git revert 4e1d2c7` (un nouveau commit qui l'inverse) |
| Annuler des commits locaux non poussés | `git reset --soft HEAD~1` (changements gardés indexés), `--mixed` (non indexés), `--hard` (abandonnés) |
| Appliquer un commit d'une autre branche | `git cherry-pick 4e1d2c7` |
| Trouver des commits orphelins après expiration du reflog | `git fsck --lost-found` |

Côté serveur, Azure Repos restaure une **branche supprimée** depuis **Branches > recherche du nom exact > Search for exact match in deleted branches > Restore branch** (sans limite de durée ; ses stratégies et autorisations ne sont pas restaurées). Un **dépôt** Azure Repos supprimé reste **30 jours** dans une corbeille et se restaure avec l'API REST. GitHub propose **Restore branch** sur la pull request fermée, et restaure un dépôt supprimé pendant **90 jours** (s'il n'appartient pas à un réseau de forks non vide).

> **Piège d'examen.** Sur une branche partagée, utilisez `git revert`, jamais `git reset` suivi d'un push forcé : reset réécrit un historique que d'autres ont déjà récupéré. `git reset --hard` abandonne aussi le travail non validé, que le reflog ne peut pas ramener.

<!-- section: remove-data | objectives: 2.2.6 -->
## Supprimer des données précises du contrôle de code source

| Situation | Action |
| --- | --- |
| Un fichier a été ajouté dans le dernier commit, non poussé | `git rm --cached secrets.json`, puis `git commit --amend` |
| Un fichier ne doit plus être suivi, l'historique peut le garder | `git rm --cached` plus `.gitignore` |
| Un secret a été poussé | **Le révoquer ou le renouveler d'abord**, puis réécrire l'historique si nécessaire |
| Un fichier ou un texte doit disparaître de tout l'historique | **git filter-repo** (recommandé) ou **BFG Repo-Cleaner** ; `git filter-branch` est lent et déconseillé |

```bash
git clone https://github.com/contoso/webshop.git
cd webshop
git filter-repo --sensitive-data-removal --invert-paths --path config/secrets.json
git filter-repo --sensitive-data-removal --replace-text ../passwords.txt
git push --force --mirror origin
```

Conséquences d'une réécriture de l'historique : tous les hachages de commits suivants changent, les collaborateurs doivent recloner ou rebaser (une fusion réintroduit les données), les branches protégées doivent autoriser temporairement le push forcé (l'autorisation **Force push** dans Azure Repos), et les pull requests ouvertes sont cassées. Les données peuvent subsister dans les forks, les autres clones et les caches du serveur : sur GitHub, contactez le support GitHub pour supprimer les vues en cache et les références des pull requests. Azure Repos avertit qu'un fichier retiré de l'historique des branches peut encore être renvoyé par les clones du dépôt.

Prévenez plutôt que purger : `.gitignore`, la **protection push** de l'analyse des secrets dans GitHub et dans GitHub Advanced Security pour Azure DevOps, et les stratégies de dépôt d'Azure Repos (taille de fichier maximale, validation des chemins de fichiers).

> **Piège d'examen.** Supprimer le fichier dans un nouveau commit ne le retire pas : il reste dans l'historique. Et réécrire l'historique ne rend pas inoffensif un secret divulgué, car des copies existent ailleurs : le renouvellement est toujours la première étape.

<!-- section: key-points -->
## Points clés

- Git LFS pour les gros binaires qui changent (fichiers pointeurs, `.gitattributes`, installation sur chaque client) ; git-fat est l'alternative basée sur rsync ; les packages pour les dépendances.
- Scalar = clone partiel + extraction partielle + moniteur du système de fichiers + maintenance en arrière-plan ; partager du code entre dépôts avec des packages, des sous-modules, des subtrees ou l'extraction multidépôt.
- Azure Repos : Deny l'emporte sur Allow, l'accès Basic est nécessaire pour le code ; rôles GitHub de Read à Admin, collaborateurs externes pour les non-membres.
- Balises annotées pour les versions, poussées explicitement ; supprimer une balise dans Azure Repos exige Force push.
- `git reflog` retrouve les commits perdus ; `revert` pour l'historique partagé, `reset` uniquement pour les commits locaux.
- Purger l'historique avec git filter-repo ou BFG, pousser en force, coordonner les clones, et renouveler les secrets d'abord.
