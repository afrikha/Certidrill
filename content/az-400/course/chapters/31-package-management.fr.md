Une stratégie de gestion des packages répond à trois questions : où vivent les packages (GitHub Packages ou Azure Artifacts, quels flux, quelles sources en amont), qui voit quelle qualité de package (vues et autorisations), et comment les versions sont numérotées pour que les consommateurs reçoivent des mises à jour prévisibles et que chaque sortie de pipeline remonte à un build. Les questions d'examen posent une contrainte (« une seule source pour les packages publics et internes », « uniquement des packages validés », « un numéro de version ne doit jamais être réutilisé ») et demandent la fonctionnalité ou le YAML.

<!-- section: package-tools | objectives: 3.1.1 -->
## Choisir entre GitHub Packages et Azure Artifacts

| Critère | GitHub Packages | Azure Artifacts |
| --- | --- | --- |
| Types de packages | npm, NuGet, Maven, Gradle, RubyGems, conteneurs (Container registry `ghcr.io`, images Docker et OCI) | NuGet (et .NET), npm, Maven, Gradle, Python, Cargo, Universal Packages (n'importe quels fichiers, jusqu'à 4 Tio) |
| Autorisations | Héritées d'un dépôt lié, ou granulaires par package (Container registry, npm, NuGet, RubyGems) ; Maven et Gradle ne connaissent que la portée du dépôt | Rôles de flux : Feed Reader, Feed and Upstream Reader (Collaborator), Feed Publisher (Contributor), Feed Owner ; visibilité par vue |
| Proxy des registres publics | Pas de sources en amont | **Sources en amont (upstream sources)** (nuget.org, npmjs.com, PyPI, Maven Central, Google Maven, Gradle Plugins, JitPack, crates.io, PowerShell Gallery, autres flux) |
| Canaux de qualité de version | Non | **Vues** (`@Local`, `@Prerelease`, `@Release`) |
| Coût | Gratuit pour les packages publics ; stockage et transfert privés inclus selon le plan (500 Mo / 1 Go en Free, 2 Go / 10 Go en Pro et Team, 50 Go / 100 Go en Enterprise Cloud), stockage partagé avec les artefacts Actions | 2 Gio gratuits par organisation, puis stockage facturé |
| Authentification en CI | `GITHUB_TOKEN` dans un workflow (avec `packages: write` pour publier) ; un jeton d'accès personnel (classic) ailleurs | Identité du job de pipeline (Build Service) avec un rôle de flux ; `NuGetAuthenticate@1`, `npmAuthenticate@0`, `PipAuthenticate@1` ; jeton d'accès personnel pour les développeurs |

| Exigence | Réponse |
| --- | --- |
| Code et CI déjà dans GitHub, publier une bibliothèque npm ou une image de conteneur | GitHub Packages (Container registry pour les images) |
| Mettre en cache les packages publics et garder des builds fonctionnels quand nuget.org est indisponible | Un flux Azure Artifacts avec des sources en amont |
| Publier un dossier de binaires (outils, modèle de ML) avec une version, sans en faire un package NuGet ou npm | **Universal Packages** d'Azure Artifacts |
| Les consommateurs ne doivent voir que des versions testées | Les vues d'Azure Artifacts (promotion vers `@Release`) |
| Stocker les images de conteneur à déployer dans Azure | Azure Container Registry, ou le Container registry de GitHub |

```yaml
# GitHub Actions: publish a NuGet package to GitHub Packages
permissions:
  contents: read
  packages: write
steps:
  - uses: actions/checkout@v7
  - uses: actions/setup-dotnet@v6
    with:
      dotnet-version: '8.0.x'
  - run: dotnet pack src/Contoso.Core -c Release -o out
  - run: dotnet nuget push "out/*.nupkg" --source "https://nuget.pkg.github.com/contoso/index.json" --api-key ${{ secrets.GITHUB_TOKEN }}
```

> **Piège d'examen.** Un workflow qui publie dans GitHub Packages pour son propre dépôt utilise `GITHUB_TOKEN` avec `packages: write`, pas un jeton d'accès personnel stocké. Un jeton d'accès personnel (classic) avec `read:packages` n'est nécessaire que pour lire les packages d'un autre dépôt privé qui n'a pas accordé l'accès au workflow.

<!-- section: feeds-views-upstream | objectives: 3.1.2 -->
## Flux, vues et sources en amont dans Azure Artifacts

Un **flux (feed)** contient des packages de plusieurs types. Un flux **délimité au projet** n'est visible que dans son projet (l'étendue par défaut et recommandée) ; un flux **délimité à l'organisation** est visible depuis tous les projets et ne peut pas être converti en flux de projet. Les flux publics n'existent que dans les projets publics existants, qui deviennent privés en 2027.

Les **sources en amont** permettent à un même flux de servir les packages internes et publics. Quand un utilisateur ayant le rôle Collaborator ou plus (ou un pipeline) installe un package via le flux, le package et ses dépendances sont **enregistrés** dans le flux et y restent même si la source en amont est supprimée ou indisponible. Ordre de recherche : les packages publiés dans le flux, puis les packages enregistrés depuis les sources en amont, puis les sources en amont dans l'ordre configuré. Une source en amont peut être un autre flux de l'organisation (en choisissant sa vue) ou un flux d'une autre organisation du même locataire Microsoft Entra (`azure-feed://contoso/Platform/core@Release`), partagé avec « All feeds and people in organizations associated with my Microsoft Entra tenant ».

Configurez les clients avec **un seul** flux doté de sources en amont, pour que chaque requête passe par lui :

```text
<packageSources>
  <clear />
  <add key="contoso-core" value="https://pkgs.dev.azure.com/contoso/Platform/_packaging/contoso-core/nuget/v3/index.json" />
</packageSources>
```

Les **vues** publient des sous-ensembles d'un flux selon la qualité. Les packages sont toujours publiés dans le flux lui-même et apparaissent dans `@Local` (tout ce qui est publié plus tout ce qui est enregistré depuis les sources en amont). Un Feed Publisher **promeut** une version vers `@Prerelease` ou `@Release` ; la promotion est irréversible. Les consommateurs pointent vers une vue avec `feed@view`, par exemple `.../_packaging/contoso-core@Release/nuget/v3/index.json`. `@Prerelease` et `@Release` peuvent être renommées ou supprimées ; une vue peut être restreinte à des personnes précises.

| Rôle de flux | Peut |
| --- | --- |
| Feed Reader | Lister et télécharger les packages |
| Feed and Upstream Reader (Collaborator) | Aussi enregistrer des packages depuis les sources en amont |
| Feed Publisher (Contributor) | Aussi publier, promouvoir, déprécier, retirer de la liste (unlist), retirer (yank) |
| Feed Owner | Aussi supprimer, gérer les sources en amont, les autorisations et les paramètres |

Un pipeline publie avec l'identité de son job : donnez **Feed Publisher (Contributor)** à `<Project> Build Service (<organization>)` (autorisation de job limitée au projet) ou à `Project Collection Build Service (<organization>)`.

```yaml
steps:
  - task: NuGetAuthenticate@1
  - script: dotnet pack src/Contoso.Core -c Release -o $(Build.ArtifactStagingDirectory)
  - script: dotnet nuget push $(Build.ArtifactStagingDirectory)/*.nupkg --source https://pkgs.dev.azure.com/contoso/Platform/_packaging/contoso-core/nuget/v3/index.json --api-key az
```

Les versions de packages sont **immuables** : une fois `2.1.0` publié, ce numéro de version est réservé pour toujours, même après suppression (les packages supprimés restent 30 jours dans la Corbeille). On ne peut pas non plus publier une version qui existe déjà dans une source en amont activée. Les **stratégies de rétention** suppriment les anciennes versions quand le nombre maximal de versions par package est atteint et que la version n'a pas été téléchargée depuis le nombre de jours configuré.

> **Piège d'examen.** « Les développeurs ne doivent recevoir que les packages qui ont passé les tests d'intégration » correspond à une **vue** (promotion vers `@Release`, les consommateurs utilisent `feed@Release`), pas à un second flux où l'on copie les packages. « Un pipeline reçoit une erreur 403 en publiant » correspond au rôle **Feed Publisher (Contributor)** manquant pour l'identité Build Service.

<!-- section: dependency-versioning | objectives: 3.1.3 -->
## Versionner les dépendances : SemVer et CalVer

**Versionnement sémantique (SemVer 2.0.0)** : `MAJOR.MINOR.PATCH[-prerelease][+build]`.

| Changement | Incrément | Exemple |
| --- | --- | --- |
| Changement cassant de l'API publique | MAJOR (minor et patch remis à zéro) | `2.4.1` → `3.0.0` |
| Nouvelle fonctionnalité rétrocompatible | MINOR (patch remis à zéro) | `2.4.1` → `2.5.0` |
| Correctif rétrocompatible | PATCH | `2.4.1` → `2.4.2` |
| Pas encore stable | Étiquette de préversion | `3.0.0-beta.2` (inférieure à `3.0.0` ; `rc.10` se classe après `rc.2`) |
| Informations de build | Métadonnées, ignorées pour la précédence | `3.0.0+sha.5114f85` |

`0.y.z` correspond au développement initial : tout peut changer. Le **versionnement basé sur les dates (CalVer)** dérive la version de la date de publication (`2026.11.0`, `YY.0M.MICRO`) : il indique aux consommateurs l'ancienneté d'une version, pas si elle les casse, et convient aux applications, outils et services publiés selon un calendrier. Les bibliothèques consommées par d'autres codes utilisent en général SemVer, car les plages de versions reposent sur le sens de MAJOR.

Les consommateurs expriment ce qu'ils acceptent :

| Écosystème | Notation | Signification |
| --- | --- | --- |
| NuGet | `6.1` | 6.1 ou plus (minimum, inclus) |
| NuGet | `[6.1.0]` | Exactement 6.1.0 |
| NuGet | `[1,3)` | 1.x ou 2.x |
| NuGet | `6.*` | Flottante : la 6.x la plus élevée |
| npm | `^2.4.1` | De 2.4.1 jusqu'à 3.0.0 exclu |
| npm | `~2.4.1` | De 2.4.1 jusqu'à 2.5.0 exclu |

Rendez les builds reproductibles avec des **fichiers de verrouillage** (`package-lock.json` avec `npm ci`, `packages.lock.json` avec `RestorePackagesWithLockFile` et le mode verrouillé pour NuGet) et centralisez les versions (gestion centralisée des packages NuGet, `Directory.Packages.props`). Laissez Dependabot proposer les mises à jour sous forme de pull requests. Marquez les packages inachevés comme préversions, et ne republiez jamais un package modifié sous une version existante.

> **Piège d'examen.** SemVer communique la compatibilité, CalVer communique le temps. Si l'exigence est « les consommateurs doivent recevoir automatiquement les correctifs mais jamais de changement cassant », publiez en SemVer et consommez une plage bornée sous la majeure suivante (`^2.4.1`, `[2.4.1,3.0.0)`).

<!-- section: pipeline-artifact-versioning | objectives: 3.1.4 -->
## Versionner les artefacts de pipeline

Chaque artefact doit remonter à un build d'un commit, et c'est le **même artefact** qui doit être promu d'une phase à l'autre (construire une fois, déployer plusieurs fois), sans être reconstruit.

Dans Azure Pipelines, le **numéro d'exécution** (`Build.BuildNumber`) vaut par défaut `$(Date:yyyyMMdd).$(Rev:r)` et se définit avec `name:` au niveau du pipeline (jusqu'à 255 caractères). `$(Rev:r)` s'incrémente tant que le reste du numéro est inchangé et revient à 1 quand il change. Une expression **counter** produit un numéro de patch qui repart à zéro pour chaque préfixe major.minor :

```yaml
name: $(majorMinor).$(patch)
variables:
  majorMinor: '2.5'
  patch: $[counter(variables['majorMinor'], 0)]
steps:
  - script: dotnet pack src/Contoso.Core -c Release -o $(Build.ArtifactStagingDirectory) -p:PackageVersion=$(Build.BuildNumber)
  - publish: $(Build.ArtifactStagingDirectory)
    artifact: packages-$(Build.BuildNumber)
```

Autres sources de version : une balise Git (`v2.5.0`), un fichier de version dans le dépôt, ou un outil qui calcule la version SemVer à partir de l'historique Git (GitVersion). La commande pack de `DotNetCoreCLI@2` propose `versioningScheme: byBuildNumber`, `byEnvVar` (`versionEnvVar`) ou `byPrereleaseNumber` (`X.Y.Z-ci-datetime`).

| Artefact | Azure Pipelines | GitHub Actions |
| --- | --- | --- |
| Fichiers transmis entre jobs et phases | **Artefacts de pipeline** : mots clés `publish` / `download`, `PublishPipelineArtifact@1`, `DownloadPipelineArtifact@2` (recommandés plutôt que les anciens artefacts de build) | `actions/upload-artifact@v7`, `actions/download-artifact@v8` ; les artefacts sont immuables, `overwrite: true` en remplace un avec un nouvel ID |
| Rétention | Suit la rétention des exécutions ; supprimer une exécution supprime ses artefacts ; les baux de rétention conservent des exécutions | 90 jours par défaut ; `retention-days` jusqu'à la limite du dépôt (1 à 90 en public, jusqu'à 400 en privé) |
| Binaires réutilisables au-delà d'une exécution | Universal Packages (SemVer, minuscules, sans métadonnées `+`) ou un flux NuGet/npm | GitHub Packages |
| Images de conteneur | Étiqueter avec le numéro de build ou le SHA du commit, déployer par digest ; ne pas dépendre de `latest` | Idem, dans le Container registry ou Azure Container Registry |

> **Conseil d'examen.** « Déployer exactement ce qui a été testé » signifie un seul artefact produit par la phase de build et téléchargé par chaque phase de déploiement, avec une version unique (numéro de build, SemVer ou digest). Reconstruire à chaque phase, ou déployer l'étiquette `latest`, casse cette traçabilité.

<!-- section: key-points -->
## Points clés

- GitHub Packages : lié aux dépôts, `GITHUB_TOKEN` dans les workflows, `ghcr.io` pour les images. Azure Artifacts : flux, sources en amont, vues, Universal Packages, 2 Gio gratuits.
- Les sources en amont enregistrent les packages publics dans le flux ; un seul flux doté de sources en amont par configuration client.
- Les vues (`@Local`, `@Prerelease`, `@Release`) exposent la qualité validée ; la promotion est à sens unique ; consommation avec `feed@view`.
- Rôles de flux : Reader, Collaborator (enregistrer depuis l'amont), Contributor (publier, promouvoir), Owner. Les pipelines ont besoin de Contributor pour l'identité Build Service.
- Les versions sont immuables. SemVer = compatibilité, CalVer = date ; consommer des plages et des fichiers de verrouillage.
- Versionner les artefacts avec le numéro d'exécution ou un counter, construire une fois et promouvoir le même artefact.
