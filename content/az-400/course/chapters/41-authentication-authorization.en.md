Pipelines and workflows reach Azure, GitHub and Azure DevOps with an identity, and people reach the repositories and boards with a role and an access level. Exam questions give a constraint ("no stored secret", "minimize administrative effort", "least privilege", "free access") and ask which identity, token, role, group or access level fits.

<!-- section: azure-identities | objectives: 4.1.1 -->
## Service principals and managed identities

Every workload identity in Microsoft Entra ID is a service principal; a managed identity is a special service principal whose credentials Azure manages.

| Identity | Created as | Life cycle | Shared | Credential |
| --- | --- | --- | --- | --- |
| Service principal of an app registration | App registration in Microsoft Entra ID | Independent, deleted explicitly | Usable anywhere, any tenant if multitenant | Client secret, certificate or federated credential |
| System-assigned managed identity | Part of one Azure resource (VM, App Service, function, AKS...) | Deleted with the resource | No, one resource only | Managed by Azure, nothing to store |
| User-assigned managed identity | Standalone Azure resource | Independent, deleted explicitly | Yes, attached to many resources | Managed by Azure, or federated credential |

| Requirement | Choose |
| --- | --- |
| Code running on one Azure VM or App Service accesses Key Vault, no secret | System-assigned managed identity |
| Ten VMs or a scale set that is recreated often need the same permissions | User-assigned managed identity (role assigned once, survives redeployment) |
| Grant access before the resource exists (pre-authorization in an IaC deployment) | User-assigned managed identity |
| A GitHub-hosted runner or Microsoft-hosted agent deploys to Azure | Workload identity federation on an app registration or a user-assigned managed identity |
| A tool outside Azure that supports only a client secret or certificate | Service principal with a certificate (shortest practical lifetime, stored in Key Vault) |
| You can't create app registrations in the tenant | User-assigned managed identity with a federated credential |

**Workload identity federation** lets an app registration or a **user-assigned** managed identity trust tokens from an external identity provider (GitHub Actions, Azure Pipelines, Kubernetes, Google Cloud, AWS) and exchange them for Microsoft Entra access tokens. A federated identity credential matches `issuer`, `subject` and `audience` case-sensitively; the recommended audience is `api://AzureADTokenExchange`. A maximum of **20** federated identity credentials can be added to one application or user-assigned managed identity.

> **Exam trap.** A system-assigned managed identity can't carry a federated credential and only works for code running on its own Azure resource. A GitHub-hosted runner or a Microsoft-hosted agent isn't your Azure resource: it needs workload identity federation, not "enable the managed identity".

<!-- section: github-authentication | objectives: 4.1.2 -->
## GitHub authentication: GITHUB_TOKEN, GitHub Apps and personal access tokens

**GITHUB_TOKEN** is created at the start of every job and expires when the job finishes (at most 24 hours on a self-hosted runner, whose job can run longer). It is limited to the repository that contains the workflow. Its default permissions come from the repository or organization setting **Workflow permissions**: permissive (read and write on all scopes) or restricted (read on `contents` and `packages`). Set least privilege in the workflow:

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

As soon as one permission is listed, every unlisted permission becomes `none`. `read-all`, `write-all` and `permissions: {}` apply one level to all scopes. `id-token` accepts only `write` or `none`.

Events created with GITHUB_TOKEN don't start new workflow runs (protection against recursion), except `workflow_dispatch` and `repository_dispatch`. A pull request opened with GITHUB_TOKEN creates runs that wait for approval. To push a commit or open a pull request that must trigger CI, use a GitHub App token or a PAT. The setting **Allow GitHub Actions to create and approve pull requests** controls whether GITHUB_TOKEN may do it at all.

A **GitHub App** is installed on an organization or on selected repositories, has fine-grained permissions, isn't tied to a user account, doesn't consume a seat, and has rate limits that scale. Its **installation access token expires after 1 hour** and can be narrowed to some repositories and permissions. In a workflow:

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

**Personal access tokens** act as a user. GitHub recommends fine-grained PATs over classic PATs:

| | Fine-grained PAT | Classic PAT |
| --- | --- | --- |
| Scope | One resource owner (user or organization), selected repositories | Every repository the user can reach |
| Permissions | Specific permissions per resource | Broad scopes such as `repo` |
| Organization control | Owners can require approval and set a maximum lifetime | Owners can block classic PATs |
| Not supported | Packages, Checks API, several organizations at once, outside collaborator access | |

| Requirement | Choose |
| --- | --- |
| Workflow comments on its own pull request | GITHUB_TOKEN with `pull-requests: write` |
| Workflow pushes to another repository of the organization, not tied to a person | GitHub App installation token |
| Commit created by automation must trigger other workflows | GitHub App token (or PAT) |
| A developer scripts the API against two repositories | Fine-grained PAT with an expiration |
| Deploy to Azure | OIDC (`id-token: write`), no GitHub token involved |

> **Exam trap.** A PAT stored as a secret works but breaks when its owner leaves and consumes that user's identity. "Not tied to a user" and "least administrative effort for organization-wide automation" point to a GitHub App.

<!-- section: azure-devops-authentication | objectives: 4.1.3 -->
## Azure DevOps service connections and personal access tokens

A **service connection** stores how a pipeline authenticates to an external service (Azure Resource Manager, Docker registry, Kubernetes, GitHub, generic). For Azure Resource Manager:

| Option | When |
| --- | --- |
| App registration (automatic) with workload identity federation | Default for a new connection; needs the Owner role on the subscription; Azure DevOps creates the app and the federation |
| Managed identity (existing user-assigned) with workload identity federation | You can't create app registrations |
| App registration or managed identity (manual) | Automatic creation failed or the identity is managed by another team; federation or a secret |
| Secret, agent-assigned managed identity, publish profile | Backward compatibility only |

Scope levels: subscription (optionally narrowed to one resource group), management group, or Machine Learning workspace. An existing **automatic** service principal connection used by **one project** can be converted to workload identity federation with **Convert** (revert possible for seven days); a manually created or cross-project connection can't.

Securing a service connection:

- **Security** of the connection: User (use it in pipelines) and Administrator (manage its roles; given to its creator).
- **Pipeline permissions**: authorize specific pipelines instead of "Grant access permission to all pipelines".
- **Approvals and checks** on the connection (approval, branch control, business hours) run before any stage that uses it.

```yaml
steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'sc-contoso-prod-wif'
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: az group list --output table
```

**Azure DevOps PATs** authenticate tools that don't support Microsoft Entra ID (HTTP Basic authentication with an empty user name). A PAT can't grant more than its owner has; choose custom scopes (for example **Agent Pools (Read & manage)** to register a self-hosted agent) and the shortest lifetime. Azure DevOps notifies before expiry. **Global PATs** (valid in every organization) are being retired: use organization-scoped PATs. Administrators can restrict global and full-scoped PATs, set a maximum lifetime, restrict PAT creation and revoke users' PATs.

> **Exam tip.** For automation, Microsoft's order of preference is: service connection with workload identity federation, managed identity or service principal with Microsoft Entra tokens, and a PAT only when the tool supports nothing else.

<!-- section: github-permissions | objectives: 4.1.4 -->
## Permissions and roles in GitHub

Organization roles: **Owner** (full administration, keep at least two), **Member** (default), **Moderator**, **Billing manager**, **Security manager** (view security alerts and manage security settings on all repositories), **GitHub App manager**. Predefined organization roles exist in every organization; **custom organization roles** and **custom repository roles** need GitHub Enterprise Cloud.

Repository roles, from least to most access:

| Role | Adds |
| --- | --- |
| Read | Pull, fork, open issues, comment, review |
| Triage | Labels, close/reopen/assign issues and pull requests, request reviews; no push |
| Moderate | Moderate and edit issues and discussions, manage pull requests; no push |
| Write | Push, merge pull requests, approve required reviews, releases, run and cancel workflows, receive Dependabot alerts |
| Maintain | Repository description and topics, merge options, Pages; no sensitive or destructive settings |
| Admin | Branch protection rules and rulesets, webhooks, deploy keys, settings, visibility, team and collaborator access, delete or archive |

Design rules: give access through **teams** (nested teams inherit their parent's access), set **base permissions** for all members (often Read or none), and use the narrowest role.

> **Exam trap.** Maintain can't edit branch protection rules or rulesets. A team lead who must change required reviewers needs Admin on that repository (or a custom repository role on GitHub Enterprise Cloud).

<!-- section: azure-devops-permissions | objectives: 4.1.5 -->
## Permissions and security groups in Azure DevOps

Permissions are set at three levels: organization (collection), project, and object (area and iteration paths, repositories and branches, pipelines, query folders, service connections, agent pools).

| Group | Level | Purpose |
| --- | --- | --- |
| Project Collection Administrators | Organization | Projects, policies, processes, retention, agent pools, extensions |
| Project Collection Valid Users | Organization | Everyone in the organization (automatic) |
| Project Administrators | Project | Teams, area and iteration paths, repositories, service hooks, service connections |
| Contributors | Project | Read and write on repositories, work tracking, pipelines |
| Readers | Project | Read only |
| Build Administrators / Release Administrators | Project | Manage pipelines and releases |
| Project Valid Users | Project | Every project member (automatic) |
| *TeamName* Team | Project | Created with each team; members inherit Contributors permissions |

Permission states: **Allow**, **Deny**, **Not set**, plus their inherited and system forms. Resolution:

1. At the same scope, **Deny wins over Allow**, also across groups.
2. **Not set** neither grants nor denies; with nothing else, access is denied.
3. A permission set explicitly on a child object overrides the value inherited from the parent (an explicit Allow on `Area1/Sub1` beats an explicit Deny inherited from `Area1`).

Add Microsoft Entra groups to Azure DevOps groups so that membership follows the directory (changes are picked up within an hour). Don't change the default permissions of the Valid Users groups.

> **Exam trap.** Removing a user from Contributors doesn't remove what another group grants, and a Deny in one group beats an Allow in another. To block one repository for a team, set Deny on that repository's object-level permissions for the team group.

<!-- section: access-levels | objectives: 4.1.6 -->
## Access levels: Stakeholder and outside collaborators

In Azure DevOps, the **access level** decides which features a user sees; security groups decide what the user may do with them.

| Access level | Gives |
| --- | --- |
| Stakeholder | Free, unlimited number of users: work items, boards (limited), dashboards, wiki pages, view builds and releases, **approve releases assigned to them**; no Azure Repos code, can't author pipelines |
| Basic | Most features, including Repos, Pipelines, Artifacts, Boards |
| Basic + Test Plans | Basic plus Azure Test Plans |
| Visual Studio subscriber | Detected automatically from the subscription (Professional gives Basic, Enterprise gives Basic + Test Plans) |
| GitHub Enterprise | Users with a GitHub Enterprise license get Basic |

```bash
az devops user add --email-id pm@contoso.com --license-type stakeholder \
  --org https://dev.azure.com/contoso
```

Public projects are retired: existing public projects convert to private in 2027.

In GitHub, an **outside collaborator** isn't an organization member and gets a repository role on specific repositories. On private repositories they use a paid license; they can't be added to teams; they must enable two-factor authentication if the organization requires it; forks need a separate grant.

| Requirement | Answer |
| --- | --- |
| Business owner reviews work items and approves production releases, no license cost | Azure DevOps Stakeholder |
| Product manager must read the code in Azure Repos | Basic |
| External consultant contributes to one GitHub repository for three months | Outside collaborator with Write on that repository |
| Many employees must reach many repositories | Organization member in a team |

> **Exam trap.** Stakeholder can approve a release and view pipelines, but can't see the repository code; and an outside collaborator can't be given access through a team.

<!-- section: projects-teams | objectives: 4.1.7 -->
## Projects and teams in Azure DevOps

A **project** holds repositories, pipelines, boards, artifacts and test plans with one process (Basic, Agile, Scrum or CMMI) and its own security. Creating one needs Project Collection Administrators membership or **Create new projects** at organization level; an organization holds up to **1,000** projects.

A **team** is a group of project members with its own backlog, boards, sprints and dashboards. Each project starts with a default team named after the project (can be renamed or replaced as default). Project Administrators create teams; **team administrators** add members and configure team settings. Creating a team creates a security group `[Project]\Team` (used in queries and @mentions), a default dashboard and, if selected, an area path with the team name.

Team configuration in **Project settings > Teams** and **Team configuration**: selected **area paths** (which work items appear on the team's backlog, up to 300, include or exclude sub-areas), **default area path** (required before the team tools work), **iteration paths** with a backlog iteration and a default iteration, backlog levels, bugs on backlogs, working days.

```bash
az devops project create --name Fabrikam-Mobile --process Agile \
  --source-control git --visibility private --org https://dev.azure.com/fabrikam
az devops team create --name "Mobile Payments" --project Fabrikam-Mobile \
  --org https://dev.azure.com/fabrikam
```

| Requirement | Design |
| --- | --- |
| Several teams share one product, code and release cadence | One project, several teams, one area path per team |
| A manager sees the work of all feature teams | Management team that selects the parent area path with sub-areas |
| A business unit needs a different process and separate administration | Separate project |
| Restrict who can edit work items of one component | Area path permissions (object level) |

> **Exam tip.** Area paths control which work items a team sees and who can edit them; iteration paths control sprints. Area path permissions don't control access to the project itself.

<!-- section: key-points -->
## Key points

- System-assigned identity: one resource, deleted with it. User-assigned: shared, independent, can be federated. External runners and agents: workload identity federation.
- GITHUB_TOKEN: per job, one repository, least privilege with `permissions`, doesn't trigger new runs. GitHub App: not tied to a user, 1-hour tokens. Fine-grained PAT over classic PAT.
- Azure Resource Manager service connections: workload identity federation by default; secure them with pipeline permissions, roles and checks. Global PATs are retiring; prefer Microsoft Entra tokens.
- GitHub roles: Read, Triage, Moderate, Write, Maintain, Admin; only Admin manages branch protection. Use teams and base permissions.
- Azure DevOps: Deny beats Allow at the same scope; explicit child permissions beat inherited ones; access levels add to group permissions.
- Stakeholder is free and can approve releases but can't read code; outside collaborators use a seat on private repositories and can't join teams.
