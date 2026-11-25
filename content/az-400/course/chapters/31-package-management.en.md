A package management strategy answers three questions: where packages live (GitHub Packages or Azure Artifacts, which feeds, which upstream sources), who sees which quality of package (views and permissions), and how versions are numbered so that consumers get predictable updates and every pipeline output can be traced to a build. Exam questions name a constraint ("one source for public and internal packages", "only validated packages", "a version can never be reused") and ask for the feature or the YAML.

<!-- section: package-tools | objectives: 3.1.1 -->
## Choosing between GitHub Packages and Azure Artifacts

| Criterion | GitHub Packages | Azure Artifacts |
| --- | --- | --- |
| Package types | npm, NuGet, Maven, Gradle, RubyGems, containers (Container registry `ghcr.io`, Docker and OCI images) | NuGet (and .NET), npm, Maven, Gradle, Python, Cargo, Universal Packages (any files, up to 4 TiB) |
| Permissions | Inherited from a linked repository, or granular per package (Container registry, npm, NuGet, RubyGems); Maven and Gradle are repository-scoped only | Feed roles: Feed Reader, Feed and Upstream Reader (Collaborator), Feed Publisher (Contributor), Feed Owner; view-level visibility |
| Proxy of public registries | No upstream sources | **Upstream sources** (nuget.org, npmjs.com, PyPI, Maven Central, Google Maven, Gradle Plugins, JitPack, crates.io, PowerShell Gallery, other feeds) |
| Release quality channels | No | **Views** (`@Local`, `@Prerelease`, `@Release`) |
| Cost | Free for public packages; private storage and transfer included per plan (500 MB / 1 GB on Free, 2 GB / 10 GB on Pro and Team, 50 GB / 100 GB on Enterprise Cloud), storage shared with Actions artifacts | 2 GiB free per organization, then billed storage |
| Authentication in CI | `GITHUB_TOKEN` in a workflow (with `packages: write` to publish); a personal access token (classic) elsewhere | Pipeline job identity (Build Service) with a feed role; `NuGetAuthenticate@1`, `npmAuthenticate@0`, `PipAuthenticate@1`; personal access token for developers |

| Requirement | Answer |
| --- | --- |
| Code and CI already in GitHub, publish an npm library or a container image | GitHub Packages (Container registry for images) |
| Cache public packages and keep builds working when nuget.org is down | Azure Artifacts feed with upstream sources |
| Publish a folder of binaries (tools, ML model) with a version, not a NuGet or npm package | Azure Artifacts **Universal Packages** |
| Consumers must see only tested versions | Azure Artifacts views (promote to `@Release`) |
| Store container images for deployment to Azure | Azure Container Registry, or the GitHub Container registry |

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

> **Exam trap.** A workflow publishing to GitHub Packages for its own repository uses `GITHUB_TOKEN` with `packages: write`, not a stored personal access token. A personal access token (classic) with `read:packages` is needed only to read packages of another private repository that hasn't granted the workflow access.

<!-- section: feeds-views-upstream | objectives: 3.1.2 -->
## Feeds, views and upstream sources in Azure Artifacts

A **feed** holds packages of several types. A **project-scoped** feed is visible only within its project (the default and recommended scope); an **organization-scoped** feed is visible from every project and can't be converted to project scope. Public feeds exist only in existing public projects, which convert to private in 2027.

**Upstream sources** let one feed serve both internal and public packages. When a user with the Collaborator role or higher (or a pipeline) installs a package through the feed, the package and its dependencies are **saved** into the feed and stay there even if the upstream is removed or unavailable. Search order: packages published to the feed, then packages saved from upstreams, then the upstream sources in their configured order. An upstream can be another feed in the organization (choosing its view) or a feed of another organization in the same Microsoft Entra tenant (`azure-feed://contoso/Platform/core@Release`), shared with "All feeds and people in organizations associated with my Microsoft Entra tenant".

Configure clients with **one** upstream-enabled feed only, so every request goes through it:

```text
<packageSources>
  <clear />
  <add key="contoso-core" value="https://pkgs.dev.azure.com/contoso/Platform/_packaging/contoso-core/nuget/v3/index.json" />
</packageSources>
```

**Views** publish subsets of a feed by quality. Packages are always published to the feed itself and appear in `@Local` (everything published plus everything saved from upstreams). A Feed Publisher **promotes** a version to `@Prerelease` or `@Release`; promotion can't be undone. Consumers point at a view with `feed@view`, for example `.../_packaging/contoso-core@Release/nuget/v3/index.json`. `@Prerelease` and `@Release` can be renamed or deleted; a view can be restricted to specific people.

| Feed role | Can |
| --- | --- |
| Feed Reader | List and download packages |
| Feed and Upstream Reader (Collaborator) | Also save packages from upstream sources |
| Feed Publisher (Contributor) | Also publish, promote, deprecate, unlist, yank |
| Feed Owner | Also delete, manage upstream sources, permissions and settings |

A pipeline publishes with its job identity: give **Feed Publisher (Contributor)** to `<Project> Build Service (<organization>)` (project-scoped job authorization) or `Project Collection Build Service (<organization>)`; the feed permissions page advises giving the role to both. A project-level Build Service identity that uses a feed in another project also needs at least **Edit project-level information** in that project.

```yaml
steps:
  - task: NuGetAuthenticate@1
  - script: dotnet pack src/Contoso.Core -c Release -o $(Build.ArtifactStagingDirectory)
  - script: dotnet nuget push $(Build.ArtifactStagingDirectory)/*.nupkg --source https://pkgs.dev.azure.com/contoso/Platform/_packaging/contoso-core/nuget/v3/index.json --api-key az
```

Package versions are **immutable**: once `2.1.0` has been published, that version number is reserved forever, even after deletion (deleted packages stay 30 days in the Recycle Bin). You also can't publish a version that already exists in an enabled upstream. **Retention policies** delete old versions when both the maximum number of versions per package is reached and the version hasn't been downloaded for the configured days. Versions promoted to a view are exempt from retention policies: promoting a version is the way to keep it indefinitely.

> **Exam trap.** "Developers must get only packages that passed integration tests" is a **view** (promote to `@Release`, consumers use `feed@Release`), not a second feed with copied packages. "A pipeline gets 403 when pushing" is a missing **Feed Publisher (Contributor)** role for the Build Service identity.

<!-- section: dependency-versioning | objectives: 3.1.3 -->
## Versioning dependencies: SemVer and CalVer

**Semantic versioning (SemVer 2.0.0)**: `MAJOR.MINOR.PATCH[-prerelease][+build]`.

| Change | Increment | Example |
| --- | --- | --- |
| Breaking change to the public API | MAJOR (reset minor and patch) | `2.4.1` → `3.0.0` |
| New backward-compatible feature | MINOR (reset patch) | `2.4.1` → `2.5.0` |
| Backward-compatible fix | PATCH | `2.4.1` → `2.4.2` |
| Not yet stable | Prerelease label | `3.0.0-beta.2` (lower than `3.0.0`; `rc.10` sorts after `rc.2`) |
| Build information | Metadata, ignored for precedence | `3.0.0+sha.5114f85` |

`0.y.z` is initial development: anything may change. **Calendar versioning (CalVer)** derives the version from the release date (`2026.11.0`, `YY.0M.MICRO`): it tells consumers how recent a release is, not whether it breaks them, and fits applications, tools and services released on a schedule. Libraries consumed by other code usually use SemVer, because ranges rely on the meaning of MAJOR.

Consumers express what they accept:

| Ecosystem | Notation | Meaning |
| --- | --- | --- |
| NuGet | `6.1` | 6.1 or higher (minimum, inclusive) |
| NuGet | `[6.1.0]` | Exactly 6.1.0 |
| NuGet | `[1,3)` | 1.x or 2.x |
| NuGet | `6.*` | Floating: highest 6.x |
| npm | `^2.4.1` | 2.4.1 up to, not including, 3.0.0 |
| npm | `~2.4.1` | 2.4.1 up to, not including, 2.5.0 |

Make builds repeatable with **lock files** (`package-lock.json` with `npm ci`, `packages.lock.json` with `RestorePackagesWithLockFile` and locked mode for NuGet) and centralize versions (NuGet Central Package Management, `Directory.Packages.props`). Let Dependabot propose updates as pull requests. Mark unfinished packages as prerelease, and never republish a changed package under an existing version.

> **Exam trap.** SemVer communicates compatibility, CalVer communicates time. If the requirement is "consumers must automatically get fixes but never breaking changes", publish with SemVer and consume a range bounded below the next major (`^2.4.1`, `[2.4.1,3.0.0)`).

<!-- section: pipeline-artifact-versioning | objectives: 3.1.4 -->
## Versioning pipeline artifacts

Every artifact must trace back to one build of one commit, and the **same artifact** must be promoted from stage to stage (build once, deploy many), not rebuilt.

In Azure Pipelines, the **run number** (`Build.BuildNumber`) defaults to `$(Date:yyyyMMdd).$(Rev:r)` and is set with `name:` at the pipeline level (up to 255 characters). `$(Rev:r)` increments while the rest of the number is unchanged and resets to 1 when it changes. A **counter** expression produces a patch number that restarts for each major.minor prefix:

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

Other sources of a version: a Git tag (`v2.5.0`), a version file in the repository, or a tool that computes SemVer from Git history (GitVersion). The `DotNetCoreCLI@2` pack command offers `versioningScheme: byBuildNumber`, `byEnvVar` (`versionEnvVar`) or `byPrereleaseNumber` (`X.Y.Z-ci-datetime`).

| Artifact | Azure Pipelines | GitHub Actions |
| --- | --- | --- |
| Files passed between jobs and stages | **Pipeline artifacts**: `publish` / `download` keywords, `PublishPipelineArtifact@1`, `DownloadPipelineArtifact@2` (recommended over the older build artifacts) | `actions/upload-artifact@v7`, `actions/download-artifact@v8`; artifacts are immutable, `overwrite: true` replaces one with a new ID |
| Retention | Follows run retention; deleting a run deletes its artifacts; retention leases keep runs | 90 days by default; `retention-days` up to the repository limit (1–90 public, up to 400 private) |
| Reusable binaries outside one run | Universal Packages (SemVer, lowercase, no `+` metadata) or a NuGet/npm feed | GitHub Packages |
| Container images | Tag with the build number or commit SHA, deploy by digest; avoid relying on `latest` | Same, in the Container registry or Azure Container Registry |

> **Exam tip.** "Deploy exactly what was tested" means one artifact produced by the build stage and downloaded by every deployment stage, with a unique version (build number, SemVer or digest). Rebuilding in each stage, or deploying the `latest` tag, breaks that traceability.

<!-- section: key-points -->
## Key points

- GitHub Packages: tied to repositories, `GITHUB_TOKEN` in workflows, `ghcr.io` for images. Azure Artifacts: feeds, upstream sources, views, Universal Packages, 2 GiB free.
- Upstream sources save public packages into the feed; one upstream-enabled feed per client configuration.
- Views (`@Local`, `@Prerelease`, `@Release`) expose validated quality; promotion is one-way; consume with `feed@view`.
- Feed roles: Reader, Collaborator (save from upstream), Contributor (publish, promote), Owner. Pipelines need Contributor for the Build Service identity.
- Versions are immutable. SemVer = compatibility, CalVer = date; consume ranges and lock files.
- Version artifacts with the run number or a counter, build once and promote the same artifact.
