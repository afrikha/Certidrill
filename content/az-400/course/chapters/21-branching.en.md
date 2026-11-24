A branching strategy decides where work happens, how it reaches the main branch and how releases are stabilized. On the exam it comes in two layers: choosing the strategy for a team (trunk-based, feature branches, release branches), then enforcing the pull request workflow and the merge rules with **branch policies** in Azure Repos or **branch protection rules and rulesets** in GitHub. Expect a requirement ("two approvals but not from the last pusher", "linear history") and the question: which setting, on which platform?

<!-- section: branch-strategies | objectives: 2.1.1 -->
## Choosing a branch strategy

| Strategy | How it works | Fits |
| --- | --- | --- |
| Trunk-based development | Everyone integrates into `main` (the trunk) at least daily, directly or through branches that live hours or a day or two. Incomplete work is hidden behind **feature flags**. Releases are built from the trunk | Continuous integration and continuous delivery, mature automated tests, small and frequent changes |
| Feature branch (topic branch) | Each feature or fix gets its own branch from `main` and comes back through a pull request. **GitHub Flow** is the lightweight form: branch, commit, open a pull request, review and test, merge, delete the branch; `main` stays deployable | Most teams; code review on every change; web apps deployed continuously |
| Release branch | A branch such as `release/20` is cut from `main` near a milestone, stabilized, and kept as long as that version is supported | Several versions supported in parallel, mobile or packaged software, scheduled releases |
| Git Flow (not named in the guide, frequent distractor) | Long-lived `develop` and `main`, plus feature, release and hotfix branches | Strictly versioned products; heavy for continuous delivery |

Microsoft's guidance for Azure Repos combines the first three: feature branches for **all** new features and bug fixes, merged into `main` only through pull requests, a `main` branch that always builds and passes tests, and release branches cut from `main` when a release approaches. A release branch is **never merged back** into `main` with a pull request. Fixes land in `main` first and are **cherry-picked** to the release branch (or the reverse), so that only the chosen commits move. Lock a release branch when that version is no longer supported. Environment branches (`deploy/performance-test`) are treated like release branches, except with continuous deployment, where Azure Pipelines promotes builds of `main` to the deployment targets.

Naming conventions keep branches organized and allow permissions per folder: `feature/<name>`, `bugfix/<description>`, `hotfix/<description>`, `users/<alias>/<description>`, `release/<version>`.

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

| Requirement in the question | Answer |
| --- | --- |
| Integrate several times a day, avoid merge conflicts from long-lived branches | Trunk-based development with feature flags |
| Every change reviewed, `main` always deployable, one production version | Feature branches with pull requests (GitHub Flow) |
| Support version 3 while version 4 is developed | Release branches; port fixes with cherry-pick |
| Ship unfinished code dark, turn it on later without a new deployment | Feature flags (for example, Azure App Configuration feature management) |
| Contributors outside the organization | Forks and pull requests |

> **Exam trap.** Long-lived feature branches contradict continuous integration: the longer a branch lives, the bigger the merge. When the stem says "integrate continuously" or "reduce merge debt", the answer is short-lived branches or trunk-based development with feature flags, not a branch per release or per environment.

<!-- section: pull-request-azure-repos | objectives: 2.1.2 -->
## Pull request workflow with Azure Repos branch policies

Branch policies are set per branch in **Repos > Branches > More options > Branch policies** (or **Project settings > Repositories > Policies**) by a Project Administrator or a user with the **Edit policies** permission. As soon as a branch has one **required** policy, it can't be pushed to directly or deleted: every change goes through a pull request. Branches with only optional policies still accept direct pushes. To protect many repositories at once, **cross-repo branch policies** (project settings, all repositories) apply to **the default branch of each repository** or to **current and future branches matching a pattern** (case sensitive; the branch doesn't need to exist yet).

| Policy | Options that the exam uses |
| --- | --- |
| Require a minimum number of reviewers | Number of approvals; **Allow requestors to approve their own changes**; **Prohibit the most recent pusher from approving their own changes**; **Allow completion even if some reviewers vote to wait or reject**; when new changes are pushed: require one approval on the last iteration, reset all approval votes, or reset all code reviewer votes |
| Check for linked work items | Required or Optional: traceability to Azure Boards |
| Check for comment resolution | Required or Optional: all comments resolved before completion |
| Limit merge types | Allowed merge types (see the next sections) |
| Build validation | Pipeline to run; trigger Automatic or Manual; Required or Optional; build expiration (immediately when the target branch is updated, after n hours, never); path filter |
| Status checks | A status posted by an external service through the pull request Status API (`genre/name`), Required or Optional, optionally applied only after the first status is posted |
| Automatically included reviewers | Users or groups added to the pull request, Optional or Required, with a **path filter** (`/src/Payments/*;!/src/Payments/Tests/*`) |

Two reviewer details decide many questions: when groups are required reviewers, at least one member of each group must approve (if only one group is required, the minimum number of its members set in the policy must approve); and segregation of duties ("the developer who pushed last can't approve") is **Prohibit the most recent pusher**, not the requestor option. A user can set **auto-complete** so the pull request completes as soon as all policies pass.

```bash
az repos policy approver-count create --repository-id <repo-id> \
  --branch main --blocking true --enabled true \
  --minimum-approver-count 2 --creator-vote-counts false \
  --allow-downvotes false --reset-on-source-push true
```

Build validation runs the pipeline on the merge result of the pull request. For an Azure Repos Git repository, the `pr:` trigger of a YAML pipeline is **ignored**: pull request builds come only from the Build validation policy.

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

> **Exam trap.** For Azure Repos, "run the CI pipeline for every pull request to main" is a **Build validation** branch policy on `main`, not a `pr:` section in YAML. The `pr:` trigger works for GitHub and Bitbucket Cloud repositories only.

<!-- section: pull-request-github | objectives: 2.1.2 -->
## Pull request workflow with GitHub branch protection rules and rulesets

A **branch protection rule** targets a branch name pattern (`main`, `release/*`). By default it blocks force pushes and deletion of the matching branches. Protected branches are available for public repositories on every plan, and for private repositories on GitHub Pro, Team and Enterprise.

| Setting | Effect |
| --- | --- |
| Require a pull request before merging, with required approvals | Changes reach the branch only through a pull request approved by the number of reviewers with write access |
| Dismiss stale pull request approvals when new commits are pushed | An approval is dismissed when the diff changes |
| Require review from Code Owners | A pull request touching owned files needs an approval from one of their code owners |
| Require approval of the most recent reviewable push | Someone other than the last pusher must approve |
| Require status checks to pass before merging | Named checks (job names of workflows, or statuses from apps) must succeed. **Require branches to be up to date before merging** = strict mode |
| Require conversation resolution before merging | All review comments resolved |
| Require deployments to succeed before merging | A deployment to a chosen environment (for example, staging) must succeed first |
| Require merge queue | Pull requests are merged in order, each tested against the latest target branch plus the pull requests ahead of it. Public repositories owned by an organization, and private ones on GitHub Enterprise Cloud |

Code owners come from a `CODEOWNERS` file in `.github/`, the root or `docs/` (searched in that order) on the **base branch** of the pull request. Owners are requested automatically; the **last matching pattern wins**; users and teams need write access.

```text
# CODEOWNERS on main: the last matching pattern takes precedence
*            @contoso/app-team
/infra/      @contoso/platform-team
*.bicep      @contoso/platform-team
/docs/       @contoso/tech-writers
```

A workflow that provides required checks must run on `pull_request`, and also on `merge_group` when the branch uses a merge queue. Keep job names unique across workflows: the job name is the check name.

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

**Rulesets** are the newer mechanism. They carry the same rules plus others (restrict creations, updates and deletions, require code scanning results), and they differ from branch protection rules:

| Branch protection rules | Rulesets |
| --- | --- |
| Only one rule applies to a branch | Several rulesets apply together and **aggregate**: the most restrictive version of each rule wins; they also layer with branch protection rules |
| Delete to disable | Enforcement status **Active** or **Disabled**, plus **Evaluate** (report only, GitHub Enterprise) |
| Visible to admins | Anyone with read access sees the active rulesets |
| Per repository | Also at organization level (GitHub Team and Enterprise plans), targeting many repositories; up to 75 rulesets per repository |
| Bypass by admins unless blocked | Explicit **bypass list** (roles, teams, GitHub Apps) |

> **Exam tip.** "Apply the same protection to all repositories of the organization" or "see which pushes would violate a rule before enforcing it" points to rulesets (organization ruleset, Evaluate mode), not to branch protection rules copied in each repository.

<!-- section: merge-restrictions | objectives: 2.1.3 -->
## Merge restrictions and bypass

The merge type decides the shape of the history:

| Azure Repos (Limit merge types) | GitHub (repository merge button settings) | History |
| --- | --- | --- |
| Basic merge (no fast-forward) | Allow merge commits | All commits kept, plus a merge commit |
| Squash merge | Allow squash merging | One commit on the target branch per pull request: linear, easy to revert |
| Rebase and fast-forward | Allow rebase merging | Commits replayed on the target, no merge commit: linear |
| Rebase with merge commit | (no equivalent) | Commits replayed, then a merge commit: semi-linear |

In GitHub, **Require linear history** blocks merge commits on the branch, so squash or rebase merging must be enabled in the repository. A ruleset's pull request rule can also impose the allowed merge method.

Who can push or merge:

| Requirement | Azure Repos | GitHub |
| --- | --- | --- |
| Nobody pushes directly to `main` | Any required branch policy | Require a pull request before merging |
| Only the release team can update `release/*` | Branch security: deny **Contribute** to others on the branch folder | **Restrict who can push to matching branches** (organization repositories; admins can still push unless bypassing is blocked), or a ruleset **Restrict updates** with a bypass list |
| Make a branch read-only | **Lock** the branch | **Lock branch** |
| Allow history rewriting | **Force push** permission (also required to delete branches and tags; a branch creator gets it on that branch) | **Allow force pushes** (everyone with write access, or specific people) |
| Emergency merge without satisfying the rules | **Bypass policies when completing pull requests** | Admins bypass by default; enable **Do not allow bypassing the above settings** to include them, or use the ruleset bypass list |
| Push past the rules | **Bypass policies when pushing** | Bypass list, or allow force pushes |
| Only signed commits | (not a branch policy) | **Require signed commits** |

Bypass permissions in Azure Repos can be granted at project, repository or branch level; grant them to a small group, at the narrowest level. The old **Exempt from policy enforcement** permission was split into the two bypass permissions.

> **Exam trap.** In GitHub, a branch protection rule doesn't apply to repository administrators until **Do not allow bypassing the above settings** is enabled. In Azure Repos, Project Administrators don't bypass policies unless they hold a **Bypass policies** permission.

<!-- section: key-points -->
## Key points

- Trunk-based development = short-lived branches and feature flags; GitHub Flow = feature branch, pull request, merge, delete; release branches support older versions and receive fixes by cherry-pick, never merged back.
- Azure Repos: a required branch policy blocks direct pushes and deletion. Reviewers, linked work items, comment resolution, merge types, build validation, status checks and automatic reviewers are the policy set.
- Segregation of duties: **Prohibit the most recent pusher** (Azure Repos), **Require approval of the most recent reviewable push** (GitHub).
- Azure Repos PR builds come from the Build validation policy; YAML `pr:` is for GitHub and Bitbucket Cloud.
- GitHub: one branch protection rule per branch; rulesets aggregate, have enforcement statuses, a bypass list and organization scope.
