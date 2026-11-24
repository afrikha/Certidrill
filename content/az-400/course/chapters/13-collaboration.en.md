Collaboration questions test the plumbing around the code: documentation, release notes, webhooks, and the connections between Azure Boards, GitHub and Microsoft Teams. Expect configuration details: file names, YAML keys, permissions and chat commands.

<!-- section: wikis | objectives: 1.3.1 -->
## Wikis, Markdown and Mermaid diagrams

Azure DevOps offers two kinds of wiki, both stored in Git:

| Feature | Project wiki (provisioned) | Code published as wiki |
| --- | --- | --- |
| Number | One per project | Several, each from a folder of a Git repository |
| Storage | Hidden repository `<ProjectName>.wiki`, branch `wikiMain` | Your repository, the branch you choose |
| Editing | **Wiki > Pages** in the portal | Markdown files edited in Repos, ideally through pull requests |
| Page order | Managed for you | Maintained manually in `.order` files |
| Versions | No | One wiki version per branch (for example per release branch) |
| Revert | **Revert** menu | A pull request from a local branch |

> **Exam tip.** "Documentation versioned with the code and reviewed through pull requests" means **publish code as wiki**. "Non-technical contributors edit pages in the browser" means the **project wiki**.

In the Git repository of a wiki, each page is a Markdown file, a page with subpages has a folder of the same name, a `.order` file in each folder sets the page sequence (alphabetical by default) and attachments go to `.attachments`. A hyphen in the file name stands for a space in the title (`How-to-contribute.md`), so a real hyphen is encoded `%2D`; other special characters are encoded too (`:` becomes `%3A`). Limits: 235 characters for the full path, 18 MB per page, 19 MB per attachment.

Azure DevOps wikis add their own syntax to Markdown:

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

| Syntax | Renders |
| --- | --- |
| `[[_TOC_]]` | Table of contents of the page's headings (case sensitive, first instance only) |
| `[[_TOSP_]]` | Table of the page's subpages |
| `query-table <query id>` between `:::` lines | Live results of a work item query |
| `#1423` | Link to a work item |
| `@` mention | Notifies a user or group |
| `::: mermaid` or a fenced block tagged `mermaid` | A Mermaid diagram |
| `$...$` and `$$...$$` | Math (KaTeX) |

Mermaid in Azure DevOps supports sequence, Gantt, flowchart (`graph`), class, state, user journey, pie, requirement, Gitgraph, entity relationship and timeline diagrams, with limited syntax: no Font Awesome, most HTML tags unsupported.

> **Exam trap.** Azure DevOps wikis don't support the `flowchart` keyword or links to and from a `subgraph`: write `graph LR` or `graph TD`. On GitHub, both keywords work.

On **GitHub**, a repository can have a wiki, but documentation kept as Markdown files in the repository (`README.md`, a `docs/` folder) is reviewed with the code. Mermaid diagrams render in Markdown files, issues, pull requests, discussions and wikis from a fenced code block tagged `mermaid`.

<!-- section: release-docs | objectives: 1.3.2 -->
## Release notes and API documentation

**GitHub releases** are built on Git tags. When you create a release, **Generate release notes** lists the pull requests merged since the previous release (you can choose the previous tag), the contributors and a link to the full changelog. Configure the categories in `.github/release.yml`:

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

Each category needs a `title` and `labels`; `"*"` catches every pull request that matched no earlier category, and `exclude` removes pull requests by label or author, globally or per category.

> **Exam trap.** Generated release notes are built from **merged pull requests and their labels**. If the notes must be grouped by type of change, the fix is to label pull requests consistently (for example with a required label check) and configure `release.yml`, not to edit the notes by hand.

Azure DevOps has no built-in release notes generator: a pipeline step builds the notes from the work items and commits of the run (through the REST API or the Git history) and publishes them as a pipeline artifact, a wiki page or a GitHub release.

**API documentation** is generated from the code, not written by hand: the build produces an OpenAPI description of the API, which is versioned with the release and published to a documentation site or imported into the Azure API Management developer portal. In ASP.NET Core, the `Microsoft.AspNetCore.OpenApi` package generates the document at run time (`AddOpenApi`, `MapOpenApi`), and `Microsoft.Extensions.ApiDescription.Server` generates it at build time as soon as the package is installed (output folder set with the `OpenApiDocumentsDirectory` property), which suits a pipeline. An interactive UI such as Swagger UI or Scalar isn't included and must be added separately.

<!-- section: docs-from-git | objectives: 1.3.3 -->
## Automating documentation from Git history

The Git history already contains a changelog when commit messages are disciplined. A convention such as Conventional Commits (`feat:`, `fix:`, `docs:`, `BREAKING CHANGE:`) lets a script group changes and choose the next semantic version.

| Need | Command |
| --- | --- |
| Last tag before the current commit | `git describe --tags --abbrev=0` |
| Changes between two releases | `git log v2.3.0..v2.4.0 --no-merges --pretty=format:"- %s (%h)"` |
| Only the merged pull requests (squash or merge commits) | `git log v2.3.0..v2.4.0 --first-parent --pretty=format:"- %s"` |
| Contributors with their commit counts | `git shortlog -sn v2.3.0..v2.4.0` |

In a pipeline, the history must be complete. Many Azure Pipelines created since September 2022 use a shallow fetch of depth 1 and don't sync tags, and `actions/checkout` fetches one commit by default:

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
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - run: gh release create "$GITHUB_REF_NAME" --generate-notes --verify-tag
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`gh release create --generate-notes` uses the same generator as the web interface; `--notes-start-tag` sets the starting tag. To publish into a code wiki instead, the pipeline commits the generated page to the wiki's repository, which requires the Contribute permission for the pipeline's build service identity on that repository.

> **Exam trap.** A changelog step that returns one commit, or `git describe` that fails with "No names found", points to a **shallow clone without tags**: set `fetchDepth: 0` and `fetchTags: true` (Azure Pipelines) or `fetch-depth: 0` (GitHub Actions).

<!-- section: webhooks | objectives: 1.3.4 -->
## Integration by using webhooks

**GitHub webhooks** send an HTTP POST to a payload URL when chosen events occur. They are created on a repository (by admins, up to 20 per event), on an organization (by owners, up to 20 per event) or by a GitHub App (one webhook per app). Good practice, as GitHub documents it:

| Practice | Why |
| --- | --- |
| Set a high-entropy secret and validate `X-Hub-Signature-256` (HMAC SHA-256, constant-time comparison) | Proves the delivery came from GitHub and wasn't altered; `X-Hub-Signature` (SHA-1) is legacy |
| Subscribe only to the events you need | Less load and less exposed data |
| Answer with a 2XX status within 10 seconds and process in the background | Slower answers count as failed deliveries |
| Read `X-GitHub-Event` and the payload's `action` | Identify what happened before processing |
| Use `X-GitHub-Delivery` to detect duplicates, redeliver failed deliveries after an outage | Idempotent processing, no lost events |

**Azure DevOps service hooks** run an action in another service when an event happens in a project (code pushed, pull request updated, build completed, release deployment completed, work item created or updated). Configure them in **Project settings > Service hooks > Create subscription**: choose the service, the event and its filters, the action, then **Test**. Managing subscriptions requires the **Edit subscriptions** and **View subscriptions** permissions, which only Project Administrators have by default (the Web Hooks page also accepts Project Collection Administrators). A subscription set up for a resource that its creator isn't allowed to access is never triggered.

| Consumer | Action |
| --- | --- |
| Web Hooks | HTTP POST of the event to any URL |
| Microsoft Teams, Slack | Post a message to a channel |
| Azure Service Bus | Message to a queue, a topic or Notification Hubs |
| Azure Storage | Message in a Storage queue |
| Jenkins | Trigger a build |

For the Web Hooks consumer, use HTTPS only (required for basic authentication), and allow Azure DevOps IP ranges if the endpoint is behind a firewall; localhost and special address ranges can't be targets. **Resource details to send** can be All (default), Minimal (key fields such as the ID and URL) or None: Minimal and None are more secure because the receiver must call back into Azure DevOps with its own permissions to read the resource.

In the other direction, an external service can **start an Azure Pipelines run**. Create an **Incoming WebHook** service connection (with an optional secret and the HTTP header that carries the payload's hash), have the service POST JSON to `https://dev.azure.com/<org>/_apis/public/distributedtask/webhooks/<connection name>?api-version=6.0-preview`, and declare the webhook as a pipeline resource:

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

Reference leaf fields only: a whole JSON object produces invalid YAML.

<!-- section: boards-github | objectives: 1.3.5 -->
## Integration between Azure Boards and GitHub repositories

The integration is the **Azure Boards app for GitHub**. Prerequisites: in Azure DevOps, membership of **Project Collection Administrators** (or being the project's creator); on GitHub, administrator or owner of the repositories, or owner of the organization to install the app.

1. In Azure DevOps, open **Project settings > GitHub connections** and select **Connect your GitHub account** (or **New connection**). Alternatively, start from the Azure Boards app in GitHub Marketplace (free plan).
2. Approve, install and authorize the Azure Boards app on GitHub, with access to **All repositories** or **Only select repositories**.
3. Select the repositories to connect to the project and save.
4. Mention `AB#<ID>` in commit messages, pull request descriptions and issue descriptions; links appear in the work item's **Development** section.
5. To change the repositories later, use the connection's menu in **GitHub connections**, or **Configure** on the installed app in GitHub settings, under **Repository access**.

| Situation | What to choose or know |
| --- | --- |
| GitHub.com | Sign in with the GitHub account (recommended) or a personal access token |
| GitHub Enterprise Server | OAuth (preferred, needs a registered OAuth app), a personal access token or credentials; the server must be reachable from the internet; one GitHub organization per connection |
| Personal access token connection | No pull request status checks and no GitHub Copilot integration: both need the GitHub App connection |
| Repository already connected with another authentication type, such as OAuth | Remove it from that connection before reconnecting it through the GitHub App |
| `AB#` mentions don't link the work items of one area path | Set **View work items in this node** and **Edit work items in this node** to Allow for the Azure Boards identity on that area path |
| Repositories of another GitHub organization | Add another connection |
| Azure DevOps Server | Connects to GitHub Enterprise Server only |
| Hosted XML process | Update the work item types to show the Development section and GitHub link types |

> **Exam trap.** Adding a GitHub link manually from a work item fails validation when the repository isn't connected to the Azure Boards project. A repository missing from the list of the connection usually means the app was installed with **Only select repositories**: fix its **Repository access**.

Remember the limits from the traceability section: up to 2,000 repositories per connection, and each repository connected to projects of a single Azure DevOps organization.

<!-- section: teams | objectives: 1.3.6 -->
## Integration with Microsoft Teams

Each toolchain has Teams apps that post notifications to channels and act on them:

| App | Commands | Highlights |
| --- | --- | --- |
| GitHub | `@github signin`, `@github subscribe owner/repo [feature]`, `@github unsubscribe owner/repo [feature]` | Default features: issues, pulls, commits, comments, deployments, releases; reviews, workflows, branches and discussions are off by default |
| Azure Boards | `@azure boards signin`, `@azure boards link <project url>`, `@azure boards subscriptions`, `@azure boards addAreapath <area path>`, `@azure boards unlink` | Work item notifications filtered by area path, type and tags; create a work item from a message |
| Azure Pipelines | `@azure pipelines signin`, `@azure pipelines subscribe` | One pipeline or all pipelines of a project; approve or reject deployments from the channel |
| Azure Repos | `@azure repos signin`, `@azure repos subscribe`, `@azure repos subscriptions` | Pushes, pull request creation and updates |

GitHub filters:

```text
@github subscribe contoso/invoicing reviews workflows
@github subscribe contoso/invoicing commits:*
@github subscribe contoso/invoicing +label:"priority"
@github subscribe contoso/invoicing workflows:{event:"push" branch:"main"}
@github unsubscribe contoso/invoicing commits
```

Commits notify for the default branch unless you add a branch filter (`commits:main`, `commits:feature/*`, `commits:*`); only one required label filter is allowed per repository; workflow notifications without filters cover runs triggered by pull requests that target the default branch.

Azure DevOps apps work with Azure DevOps Services only and need **Third-party application access via OAuth** allowed in the organization policies. A channel links to one Azure Boards project at a time; creating work item subscriptions requires Project Administrators or Team Administrators, Team Administrators can't remove or modify the subscriptions that Project Administrators created, and when a channel has subscriptions only Project Administrators can unlink it. Notifications go to channels, not to chats.

> **Exam trap.** Office 365 connectors in Teams are retired. For new integrations, use the Azure Boards, Azure Pipelines or Azure Repos app, the Azure DevOps tab (a dashboard or board in a channel) or the **Workflows** app (Power Automate), not an incoming webhook connector.

<!-- section: key-points -->
## Key points

- Project wiki: one per project, `<ProjectName>.wiki`, edited in the portal. Code wiki: several, versioned by branch, `.order` maintained manually.
- Mermaid in Azure DevOps: `::: mermaid` or a `mermaid` fence, `graph` instead of `flowchart`.
- GitHub release notes come from merged pull requests and labels, configured in `.github/release.yml`.
- Documentation from Git history needs a full clone with tags.
- GitHub webhooks: secret plus `X-Hub-Signature-256`, answer within 10 seconds. Service hooks: Project Administrators by default, HTTPS, Minimal or None resource details for security.
- Azure Boards app: Project Collection Administrators plus GitHub repository admin; `AB#` mentions; one Azure DevOps organization per repository.
- Teams: GitHub, Azure Boards, Azure Pipelines and Azure Repos apps; Office 365 connectors are retired.
