# FIX-az-400-1 — chapters 11, 12, 13, 21, 22 and 31 corrected from the quiz reports

Checked on learn.microsoft.com (and on docs.github.com / github.com for GitHub-only facts) on 2026-11-24. Results: `check-cert az-400 11-flow-of-work 12-metrics-queries 13-collaboration 21-branching 22-repositories 31-package-management` 0 problems; `content:validate --cert az-400` 0 problems, 16 warnings, all docs.github.com references in other agents' files (`az400-5a-*`, `az400-3c-*`), none in mine; `check-quiz` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. Section markers didn't change. The only code change is `actions/checkout@v4` → `@v7` in chapter 13, made identically in both files.

## 11-flow-of-work

| Finding | Learn | Change |
| --- | --- | --- |
| Trap: macros "don't work in notification filters, Excel exports or the REST API" | Partly wrong. query-operators-variables: `@CurrentIteration`, `@Follows`, `@MyRecentActivity`, `@RecentMentions`, `@RecentProjectActivity`, `@TeamAreas` are web portal only, and queries that use them don't work in Visual Studio/Team Explorer, Excel or Project. `@CurrentIteration` doesn't work in REST APIs. No notifications page (about-notifications, manage-team-group-global-organization-notifications) mentions macros | Trap rewritten from Learn's list; "notification filters" removed |
| Agile User Story and `Fixes AB#` | workflow-and-state-categories: in the Agile table, the Resolved category holds only "Resolved (Bug)", and User Story goes New → Active → Closed. link-to-from-github: a valid state name (`Closed AB#123`) moves the item to that exact state | New sentence: to move a user story to Resolved, write `Resolved AB#1423`. FR wording « font aussi changer les éléments d'état » fixed to « l'état des éléments de travail » |
| Branch link removed when the branch is deleted | Confirmed (link-to-from-github, "Automatic link updates") | New sentence in tracking-integration |
| Global notifications row | Learn disagrees with itself: about-notifications lists Global subscriptions (Project Collection Administrators), while manage-team-group-global-organization-notifications says "Azure DevOps doesn't support organization-wide notifications" | None. Needs a human decision |

## 12-metrics-queries

| Finding | Learn | Change |
| --- | --- | --- |
| DORA metrics have no Learn page | Names confirmed: platform-engineering/plan lists "DORA: Change lead time, deployment frequency, change fail rate, time to restore service (MTTR)". Well-Architected tools-processes defines change failure rate as "the percentage of changes that result in a failure". No fetched page defines lead time for changes as commit to production (WAF's "lead time" runs from backlog to production) | None. "(from commit to production)" flagged |
| Coverage: a scan on any branch, recency ignored | Confirmed (github-advanced-security-security-overview) | Trap rewritten: Risk counts the default branch only, and a successful scan on any branch lights up coverage regardless of recency. Key point updated |
| Risk/Coverage rollup metrics in private preview | Confirmed: "Organization-level rollup metrics on the Risk tab / Coverage tab are currently in private preview" | New sentence after the export sentence |
| Flaky exclusion "no longer fails the run" | Confirmed: Learn says you can exclude them "to ensure flaky test failures don't fail your pipeline … and suppress the test failure" | None |
| OData versions | Not re-fetched (QZ report: chapter matches odata-api-version) | None |
| Product names Secret Protection / Code Security | Confirmed (configure-github-advanced-security-features: contents, active committers, repository/project/organization levels) | None |

## 13-collaboration

| Finding | Learn | Change |
| --- | --- | --- |
| `actions/checkout@v4` | The actions/checkout README uses `@v7` (What's new: v7, v6, v5) | Both code blocks now use `@v7` (identical EN/FR) |
| `OpenApiGenerateDocumentsOnBuild` | Not on aspnetcore-openapi (11.0 view). Installing `Microsoft.Extensions.ApiDescription.Server` generates the document during build, and `OpenApiDocumentsDirectory` sets the folder. Swagger UI or Scalar "must be added separately" | Property replaced by `OpenApiDocumentsDirectory`. UI sentence aligned with Learn |
| PAT connections | Confirmed (connect-to-github): no pull request status checks and no GitHub Copilot integration; both need the GitHub App | PAT row of the Boards table made specific |
| Repository already connected with another auth type | Confirmed (install-github-app, Important note; OAuth is its example) | New table row |
| `AB#` not linking for one area path | Confirmed (connect-to-github troubleshooting): Azure Boards user needs View/Edit work items in this node = Allow | New table row |
| Service hook for a resource the creator can't access | Confirmed (service-hooks/overview: "the subscription doesn't get triggered") | New sentence |
| Web Hooks prerequisites also list Project Collection Administrators | Confirmed (services/webhooks). The overview says only project administrators by default | Parenthesis added |
| Team Administrators can't modify Project Administrators' subscriptions | Confirmed (boards-teams note) | Added to the Teams paragraph |
| OAuth policy for the Azure DevOps Teams apps | Not on boards-teams. The fetched pipelines/integrations/microsoft-teams page is about connectors and doesn't mention it. No page contradicts it | None. Flagged |
| GitHub Teams app: one label filter, commits on default branch, workflows default | Confirmed on docs.github.com (integrations/how-tos/teams/customize-notifications). Not on Learn | None |
| Boards app GitHub prerequisites | Two pages differ: connect-to-github asks for repository admin or owner; install-github-app asks for organization admin or owner (to install) plus read on the repositories. The chapter already merges both | None |

## 21-branching

| Finding | Source | Change |
| --- | --- | --- |
| Required group reviewers | Confirmed (branch-policies): at least one member of every group must approve; "If only one group is required, the minimum number of members you specify approve" | Reviewer sentence rewritten |
| Force push deletes branches; creators get it | Confirmed (branch-permissions): Force push is "also required to delete a branch". Branch creators get Contribute, Force push, Manage permissions and Remove others' locks | Force push cell in the "Who can push" table |
| Restrict who can push: admins can always push | Confirmed (docs.github.com about-protected-branches) | Caveat added in the table |
| Rulesets Evaluate mode | Not in the Free/Pro/Team version of About rulesets / Creating rulesets. Present in the Enterprise Cloud version of "Creating rulesets for repositories in your organization" (Evaluate + Rule Insights). The chapter's "(report only, GitHub Enterprise)" stands | None |
| Organization rulesets plan | docs.github.com now says "customers on GitHub Team or GitHub Enterprise plans" (not Enterprise only, as the QZ report says) | "(GitHub Team and Enterprise plans)" added |
| Merge queue availability | Confirmed (managing-a-merge-queue): public repositories owned by an organization, private ones on GitHub Enterprise Cloud | Added to the merge queue row |
| Environment branches | Confirmed (git-branching-guidance): treat `deploy/...` like release branches, except with continuous deployment (Azure Pipelines promotes builds of main) | New sentence in branch-strategies. Trap unchanged |
| CODEOWNERS `*` last on a Learn training unit | Not a chapter issue | None |

## 22-repositories

| Finding | Source | Change |
| --- | --- | --- |
| GitHub Secret Protection for Azure DevOps | Confirmed (github-advanced-security-secret-scanning: Advanced Security bundle "or, if you're using the standalone experience, GitHub Secret Protection for Azure DevOps") | Added to "Prevent rather than purge" |
| Tag creator inherits Force push | Confirmed (git-tags) | Tags table cell |
| "Moderate" role | **Wrong finding**. docs.github.com repository-roles-for-an-organization lists six roles: Read, Triage, Moderate, Write, Maintain, Admin | None |
| Custom repository roles plan | docs.github.com: "If your organization uses GitHub Enterprise Cloud" (matches the chapter) | None |
| Scalar description, Azure Repos rewrite warning | Chapter already right (QZ report) | None |
| FR « dépôt » for Git repositories | The glossary gives « référentiel » (area compute, container registry, also_seen « dépôt »). Learn's Azure DevOps docs use « dépôt » for Git | None. See French terms |

## 31-package-management

| Finding | Learn | Change |
| --- | --- | --- |
| Packages in a view are exempt from retention | Confirmed (delete-and-recover-packages) | Sentence added after the retention rule |
| Feed Publisher "yank" | **Wrong finding**. feed-permissions has the row "Deprecate/unlist/yank packages" for Feed Publisher (Contributor) | None |
| Feed Publisher for both build identities | feed-permissions: assign it to **both** identities. The chapter (one or the other, by job authorization scope) follows access-tokens, which is the more specific page | Kept the rule and added that the feed permissions page advises both. Flagged |
| Cross-project publishing | Confirmed (feed-permissions): the project-level identity needs at least Edit project-level information in the other project | Sentence added |
| GitHub artifact retention | Confirmed: 90 days by default; 1–90 days for public repositories and up to 400 for private ones (docs.github.com repository Actions settings). The upload-artifact README says `retention-days` is 1–90 | None |
| `upload-artifact@v7`, `download-artifact@v8` | Confirmed (both READMEs) | None |
| `DotNetCoreCLI@2` `bySemVerBuildNumber` | Learn disagrees with itself: two syntax blocks and one Inputs entry list it, two others don't. It doesn't say that `byBuildNumber` needs a version in the build number format | None. Flagged |
| FR container image terms | Glossary « image conteneur »; questions guide « balise » for image tags | « image(s) conteneur », « Baliser avec le numéro de build », « la balise `latest` » |

## Mock-exam bank questions changed

- `questions/processes/az400-cs2c-boards-link.yaml` (1.3.5): options a and b now say `Resolved AB#{ID}` instead of `Fixes AB#{ID}`. The EN and FR explanation now says that a state name moves the item to that state, and that `Fixes` would target the Resolved category, which in Agile holds only the Bug's Resolved state. Reason: the case (Agile, Ordering) requires the user story to reach its Resolved state. Per the category table, `Fixes` on an Agile user story goes to Closed. Answer b is unchanged.
- `questions/processes/az400-cs3a-boards-keywords.yaml` (1.3.5): all four options use `Resolved` instead of `Fixes` (title, comment, single keyword, repeated keyword). The EN and FR explanation of the correct answer and of option b is updated. Same reason (case cs3a: Agile user stories must move to Resolved). Answer a is unchanged.

## Checked and left unchanged

- `az400-cs1c-boards-links`, `az400-1b-boards-fixes-multiple`, `az400-1a-mention-syntax`, `az400-1a-resolution-mentions`: all use bugs or generic items, so `Fixes` → Resolved stays right.
- `az400-1a-query-chart-dashboard`: uses `@CurrentIteration` in a web-portal query, which is fine.
- `az400-1a-secoverview-tabs`, `-default-branch` and `-alert-filters`: per-repository Risk counts, default branch and Alerts filters. None relies on the private-preview rollup metrics or on coverage recency.
- Branch protection and ruleset questions (`az400-2a-protection-hotarea`, `-rulesets-statements`, `az400-cs4b-codeowners-ruleset` on GitHub Enterprise Cloud, `az400-2b-tag-gh-ruleset`) agree with the plan facts above.
- `az400-cs3b-branch-policies`: the explanation says "until a member of the group approves". With one required group, Learn says the minimum number of members set in the policy must approve. This is imprecise but not contradicted for a minimum of 1, so I didn't change it (see below).
- 3.1 feed questions: none relies on the retention exemption, on yank or on the one-identity vs both-identities rule.

## Quiz files

None changed. All six quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 21 q2, which uses two groups with "at least one member of each group", matches the new reviewer sentence. Quiz 31 q6 matches the kept identity rule.

## For a human decision

- Global notification subscriptions: the two Learn notifications pages contradict each other (see 11).
- Agile User Story and the Resolved category: workflow-and-state-categories contradicts itself (intro vs table). The chapter now advises `Resolved AB#`, and the two case questions use state names. The case texts (cs2c requirement 1, cs3a requirement 6) weren't touched.
- DORA: the definition "lead time for changes (from commit to production)" in 12 has no Learn source. The names are confirmed (platform-engineering/plan).
- Feed Publisher: one identity per job authorization scope (access-tokens) vs both identities (feed-permissions). The chapter now gives both statements.
- `DotNetCoreCLI@2` `bySemVerBuildNumber`: Learn is inconsistent, so the chapter doesn't list it.
- Teams apps and the "Third-party application access via OAuth" policy: not found on a fetched Learn page (from a training unit according to the QZ report).
- `actions/checkout@v4` remains in two bank stems out of the scope of a Learn contradiction (`pipelines/az400-3a-gh-npm-publish.yaml`, `source-control/az400-2b-tag-gh-release-workflow.yaml`); the current major is v7. Not changed because v4 isn't stated as retired anywhere I fetched.
- `az400-cs3b-branch-policies` explanation (single required group, see above).

## French terms not settled (not in the glossary)

- « préversion privée », « métriques agrégées » (rollup metrics), « offre autonome » (standalone experience), « branches d'environnement », « nom d'état ».
- « user story » (chapters 11 and 12 prose) vs « récit utilisateur » (bank, cs2c/cs3a): the course and bank disagree. I kept each file's own usage.
- « dépôt » (Git repository, every AZ-400 chapter) vs glossary « référentiel » (recorded for container registries).
- « crochets de service (service hooks) » in 13: existing text, not in the glossary.
