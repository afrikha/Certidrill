Configuring a repository means keeping it fast as it grows, controlling access, labeling its history, and fixing that history: a deleted branch to bring back, a secret or a huge binary to purge. Questions are about choosing the right tool (Git LFS or a package feed, Scalar or a shallow clone, revert or reset, filter-repo or a plain new commit) and the exact command or permission.

<!-- section: large-files | objectives: 2.2.1 -->
## Managing large files with Git LFS and git-fat

Git keeps every version of every file in every clone, so large binaries that change often (images, videos, game assets, datasets) make clones and fetches slow forever. The options:

| Content | Recommended storage |
| --- | --- |
| Source, scripts, configuration in text formats | Git |
| Large binaries that change and don't diff well | **Git LFS** |
| Libraries, dependencies, reusable components | A package feed (Azure Artifacts, GitHub Packages), not the repository |
| Build outputs, logs, compiled code | Nowhere in Git: rebuild them or publish them as pipeline artifacts |
| Large files to distribute to users | GitHub releases, or a package |

**Git LFS** stores a small **pointer file** in the repository and the content on the LFS server. Both Azure Repos (free) and GitHub support it. Every client must install the Git LFS extension, or it gets the pointers instead of the files.

```bash
git lfs install                       # once per machine
git lfs track "*.psd" "*.mp4"         # writes the patterns to .gitattributes
git add .gitattributes design/hero.psd
git commit -m "Track design files with Git LFS"
git push

git lfs migrate import --include="*.psd" --everything   # move files already in history (rewrites it)
git lfs lock design/hero.psd                            # file locking for unmergeable files
```

Commit `.gitattributes` **before** the large files. In pipelines, LFS content is fetched only on request: `checkout: self` with `lfs: true` in Azure Pipelines, `lfs: true` on `actions/checkout` in GitHub Actions.

| Limit | Azure Repos | GitHub |
| --- | --- | --- |
| Single file in Git | Should stay below 100 MB | Warning above 50 MiB, **blocked above 100 MiB** (25 MiB through the browser) |
| Repository | Should stay below 250 GB, ideally 10 GB | Ideally below 1 GB, below 5 GB strongly recommended |
| Push | 5 GB per push (LFS objects not counted) | |
| LFS file | One-hour upload limit | 2 GB (Free, Pro), 4 GB (Team), 5 GB (Enterprise Cloud) |
| Notes | SSH not supported for repositories with LFS files; a file dropped in the web UI is committed as a normal file | LFS not usable with GitHub Pages sites or template repositories |

Azure Repos repository policies can also block a **Maximum file size** or forbidden paths (**File path validation**) at push time.

**git-fat** is an older open-source alternative (Python and rsync). Matching files are declared in `.gitattributes` with a `fat` filter, `git fat init` activates it, the content goes to an rsync remote declared in a committed `.gitfat` file, and `git fat push` / `git fat pull` move it.

```text
# .gitattributes
*.png filter=fat -crlf
*.gz  filter=fat -crlf

# .gitfat
[rsync]
remote = storage01.contoso.com:/share/fat-store
```

> **Exam trap.** Git LFS doesn't shrink a repository that already contains the binaries: their history is still there. Use `git lfs migrate import` (a history rewrite, with a force push) or start a new repository. And a shared DLL belongs in a package feed, not in LFS.

<!-- section: scaling-repositories | objectives: 2.2.2 -->
## Scaling a repository: Scalar and cross-repository sharing

A repository grows large through long history, many files, or large binaries. Client-side techniques:

| Technique | Command | Effect |
| --- | --- | --- |
| Shallow clone | `git clone --depth 1 <url>` | Only the latest commits; the default in Azure Pipelines (`fetchDepth`) and in `actions/checkout` |
| Partial clone | `git clone --filter=blob:none <url>` | Full history, file contents downloaded on demand |
| Sparse checkout | `git sparse-checkout set --cone src/payments` | Only the listed folders in the working tree |
| Scalar | `scalar clone <url>` or `scalar register` | Configures all of the above plus background maintenance |

**Scalar** ships with Git (since version 2.38) and configures a repository for scale: partial clone, sparse checkout in cone mode, the file system monitor, commit-graph, multi-pack-index, and **background maintenance** (hourly prefetch of objects, incremental repack). `scalar clone` creates a new enlistment (the repository in a `src` folder); `scalar register` applies the settings to an existing clone.

```bash
scalar clone https://dev.azure.com/contoso/Platform/_git/monorepo
cd monorepo/src
git sparse-checkout set services/payments shared/contracts
```

Monorepo or several repositories? A monorepo simplifies atomic changes across components and shared tooling, at the cost of scale (hence Scalar). Several repositories give independent permissions, pipelines and release cycles, at the cost of sharing code between them:

| Need | Solution |
| --- | --- |
| Reuse a library with its own versions | Publish it as a **package** (Azure Artifacts, GitHub Packages) and reference a version |
| Include another repository's source at a pinned commit | **Git submodule** (`.gitmodules`, `git submodule update --init --recursive`) |
| Copy another repository's history into a folder, no extra step for consumers | **Git subtree** (`git subtree add --prefix=libs/shared <url> main --squash`) |
| Build from several repositories in one pipeline | Azure Pipelines **multi-repo checkout** (`resources.repositories` and several `checkout` steps) |
| Share pipeline logic | YAML templates in another repository, reusable workflows in GitHub |
| Start new repositories with the same structure | GitHub template repository |

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
## Configuring repository permissions

**Azure Repos** permissions are set on **All Repositories** (project), on one repository, or on a branch, for groups or users. A repository inherits from the project level unless **inheritance** is turned off; branches inherit a subset.

| Permission | Allows |
| --- | --- |
| Read | Clone, fetch, browse; create, comment on and vote in pull requests |
| Contribute | Push changes |
| Create branch / Create tag | Create branches / tags |
| Force push | Rewrite history, delete branches and tags |
| Edit policies | Configure branch policies |
| Manage permissions | Change permissions |
| Bypass policies when completing pull requests / when pushing | Override branch policies |
| Create, Delete, Rename repository | Manage repositories |

Readers have Read; Contributors add Contribute, Create branch, Create tag and Manage notes; Project Administrators can do everything. **Deny** overrides **Allow**; **Not set** grants nothing (implicit deny unless another group allows). The access level comes first: in a private project a **Stakeholder** has no access to Azure Repos, so give **Basic**.

**GitHub** repository roles for organization repositories, from least to most access:

| Role | For |
| --- | --- |
| Read | View and discuss, clone private repositories |
| Triage | Manage issues and pull requests without write access |
| Moderate | Moderate and edit issues and manage pull requests without write access |
| Write | Push, merge pull requests |
| Maintain | Manage the repository without sensitive or destructive actions |
| Admin | Everything, including security settings and deleting the repository |

Grant roles to **teams** rather than individuals; organization owners set a **base permission** for all members; **outside collaborators** are people outside the organization given access to specific repositories; **custom repository roles** require GitHub Enterprise Cloud.

> **Exam trap.** A user who must contribute code to an Azure DevOps private project needs the **Basic** access level and the Contribute permission; Stakeholder access is free but has no code access. On GitHub, a contractor who needs one repository is an **outside collaborator**, not an organization member.

<!-- section: tags | objectives: 2.2.4 -->
## Organizing the repository with tags

A tag names a commit, usually a release (`v2.3.0`). **Lightweight** tags are a simple pointer; **annotated** tags store the tagger, date and message (and can be signed): use them for releases. The Azure Repos web portal and Visual Studio create annotated tags; a lightweight tag requires the command line.

```bash
git tag -a v2.3.0 -m "Release 2.3.0" 9fceb02   # annotated tag on a commit
git push origin v2.3.0                          # tags aren't pushed by default
git push origin --tags                          # or push all tags
git tag -d v2.3.0-rc1                           # delete locally
git push origin --delete v2.3.0-rc1             # delete on the server
```

| Need | Azure DevOps | GitHub |
| --- | --- | --- |
| Run a pipeline when a release tag is pushed | `trigger: tags: include: [ 'v*' ]` | `on: push: tags: [ 'v*' ]` |
| Who can create / delete tags | **Create tag** (Contributors); delete requires **Force push** on the repository or **All tags** | Write access; restrict with a **tag ruleset** (restrict creations, updates, deletions) |
| Publish a release from a tag | Pipeline with the tag as source | **Releases** (tag, notes, binaries) |

Tag names can't contain spaces, `~` or `:`; avoid 40-character hexadecimal names.

<!-- section: recover-data | objectives: 2.2.5 -->
## Recovering data with Git commands

Git rarely loses a commit: `git reflog` lists where `HEAD` and branches pointed, including commits no longer reachable from any branch.

| Situation | Command |
| --- | --- |
| Find the commit that was the tip before a bad reset or a deleted local branch | `git reflog`, then `git branch recovered 4e1d2c7` |
| Restore one file as it was in an earlier commit | `git restore --source=4e1d2c7 -- src/app.config` (or `git checkout 4e1d2c7 -- src/app.config`) |
| Discard uncommitted changes to a file | `git restore src/app.config` |
| Undo a pushed commit without rewriting shared history | `git revert 4e1d2c7` (a new commit that reverses it) |
| Undo local, unpushed commits | `git reset --soft HEAD~1` (keep changes staged), `--mixed` (unstaged), `--hard` (discard) |
| Apply one commit from another branch | `git cherry-pick 4e1d2c7` |
| Find dangling commits after the reflog expired | `git fsck --lost-found` |

Server side, Azure Repos restores a **deleted branch** from **Branches > search the exact name > Search for exact match in deleted branches > Restore branch** (no time limit; its policies and permissions aren't restored). A deleted Azure Repos **repository** stays in a recycle bin for **30 days** and is restored with the REST API. GitHub offers **Restore branch** on the closed pull request, and restores a deleted repository within **90 days** (not part of a non-empty fork network).

> **Exam trap.** On a shared branch, use `git revert`, never `git reset` followed by a force push: reset rewrites history that others have already pulled. `git reset --hard` also discards uncommitted work, which the reflog can't bring back.

<!-- section: remove-data | objectives: 2.2.6 -->
## Removing specific data from source control

| Situation | Action |
| --- | --- |
| A file was added in the last commit, not pushed | `git rm --cached secrets.json`, then `git commit --amend` |
| A file must no longer be tracked, history may keep it | `git rm --cached` plus `.gitignore` |
| A secret was pushed | **Revoke or rotate it first**, then rewrite history if required |
| A file or text must disappear from all history | **git filter-repo** (recommended) or **BFG Repo-Cleaner**; `git filter-branch` is slow and discouraged |

```bash
git clone https://github.com/contoso/webshop.git
cd webshop
git filter-repo --sensitive-data-removal --invert-paths --path config/secrets.json
git filter-repo --sensitive-data-removal --replace-text ../passwords.txt
git push --force --mirror origin
```

Consequences of rewriting history: every later commit hash changes, collaborators must re-clone or rebase (a merge reintroduces the data), protected branches must temporarily allow force push (the **Force push** permission in Azure Repos), and open pull requests break. The data can survive in forks, other clones and server caches: on GitHub, contact GitHub Support to remove cached views and pull request references. Azure Repos warns that a file removed from branch history can still be returned by clones of the repository.

Prevent rather than purge: `.gitignore`, secret scanning **push protection** in GitHub and in GitHub Advanced Security for Azure DevOps, and Azure Repos repository policies (maximum file size, file path validation).

> **Exam trap.** Deleting the file in a new commit doesn't remove it: it stays in history. And rewriting history doesn't make a leaked secret safe, because copies exist elsewhere: rotation is always the first step.

<!-- section: key-points -->
## Key points

- Git LFS for large, changing binaries (pointer files, `.gitattributes`, every client installs it); git-fat is the rsync-based alternative; packages for dependencies.
- Scalar = partial clone + sparse checkout + file system monitor + background maintenance; share code across repositories with packages, submodules, subtrees or multi-repo checkout.
- Azure Repos: Deny beats Allow, Basic access needed for code; GitHub roles Read to Admin, outside collaborators for non-members.
- Annotated tags for releases, pushed explicitly; deleting a tag in Azure Repos requires Force push.
- `git reflog` finds lost commits; `revert` for shared history, `reset` only for local commits.
- Remove history with git filter-repo or BFG, force push, coordinate clones, and rotate secrets first.
