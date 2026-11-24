Before a pipeline runs, work has to be planned, assigned and tracked, and every change has to be traceable from the requirement to the commit, the build, the test and the deployment. Exam questions ask which process or work item structure fits a team, how GitHub Flow works, how feedback reaches the right people, and which link or setting gives the traceability a scenario demands.

<!-- section: work-structure | objectives: 1.1.1 -->
## Structuring the flow of work

In Azure Boards, the **process** of a project fixes its work item types, their states and the backlog levels. Four system processes exist:

| Process | Backlog levels (portfolio, requirement, task) | Fits |
| --- | --- | --- |
| Basic | Epic, Issue, Task | Small teams that want the simplest model |
| Agile | Epic, Feature, User Story, Task (plus Bug) | Teams that use user stories and Kanban |
| Scrum | Epic, Feature, Product Backlog Item, Task (plus Bug, Impediment) | Teams that run sprints with a product backlog |
| CMMI | Epic, Feature, Requirement, Task (plus Bug, Change Request, Issue, Review, Risk) | Formal processes that need change requests, risks and audit trails |

A system process can't be modified. To add a field, a state, a work item type or a backlog level, create an **inherited process** from it and move the project to that process.

> **Exam trap.** "Add a custom field to the User Story work item type" never means editing the Agile process: you create an inherited process, customize it, then change the project's process.

Two classification trees organize the items:

| Field | Answers | Typical use |
| --- | --- | --- |
| Area path | Who owns the work | One area path per team or product component; each team selects its areas |
| Iteration path | When the work happens | Sprints with dates, selected per team |

Each team has a **board** whose columns map to workflow states. Configure **WIP limits** per column to expose bottlenecks, **split columns** (Doing and Done) to show work waiting for the next step, a **definition of done** per column and **swimlanes** for classes of service such as an expedite lane. Bugs are managed either with the requirements or with the tasks, or not on backlogs at all, through a team setting.

On GitHub, the equivalent structure is **issues** planned in **GitHub Projects**: a project can display the same items as a table, a board or a roadmap, and adds custom fields (text, number, date, single select, iteration) on top of labels, milestones and assignees.

<!-- section: github-flow | objectives: 1.1.1 -->
## GitHub Flow

GitHub Flow is a lightweight, branch-based workflow with a single long-lived branch, the default branch, which is always deployable:

| Step | What happens |
| --- | --- |
| Create a branch | A short-lived branch from the default branch, with a descriptive name |
| Make changes | Small, focused commits pushed to the branch |
| Create a pull request | Ask for feedback; a draft pull request asks for early input before the work is ready |
| Address review comments | Push more commits; the pull request updates itself and checks run again |
| Merge the pull request | After approval and passing checks; branch protection rules can require both |
| Delete the branch | The pull request and the commits stay in the history |

```bash
git switch -c feature/invoice-export
git add .
git commit -m "Add CSV export to invoices"
git push -u origin feature/invoice-export
gh pr create --base main --title "Add CSV export to invoices" --body "Fixes #214"
```

GitHub Flow relies on automation for safety: required status checks (CI build and tests) and required reviews on the default branch, so that nothing reaches it without passing both. It suits teams that deploy continuously. Teams that maintain several released versions in parallel add release branches; the branching chapter compares trunk-based development, feature branches and release branches.

> **Exam trap.** GitHub Flow has no `develop` branch and no long-lived release branches: those belong to Git Flow. If a stem says "one long-lived branch, short-lived feature branches, changes merged through pull requests", the answer is GitHub Flow.

<!-- section: feedback-cycles | objectives: 1.1.2 -->
## Feedback cycles: notifications and GitHub Issues

A feedback cycle is the time between an action and the information that tells you whether it was right: a failed check on a pull request, a review comment, a bug reported by a user, an alert from production. The design goal is to make each loop short and to send each signal only to the people who must act on it.

**GitHub notifications.** You automatically watch the repositories you have push access to (except forks). You are subscribed to a conversation when you open it, comment on it, are assigned to it, are mentioned (or your team is), or change its state. Notifications reach the web inbox, email or GitHub Mobile, and the inbox shows the reason (`mention`, `review requested`, `subscribed`) and filters on it. A `CODEOWNERS` file requests reviews automatically from the owners of the changed paths, so the right reviewers are notified without manual triage.

**GitHub Issues** collect bugs, feature requests and tasks. To get usable reports, add **issue forms** (YAML files in `.github/ISSUE_TEMPLATE/`) that require the fields you need, and a `config.yml` in the same folder to disable blank issues or redirect support questions:

```yaml
name: Bug report
description: Report a defect in the invoicing service
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: input
    id: version
    attributes:
      label: Version
      description: Version where the defect occurs
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: dropdown
    id: environment
    attributes:
      label: Environment
      options:
        - Production
        - Staging
```

A pull request closes an issue automatically when its description or one of its commit messages contains a closing keyword (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`) followed by `#214`, or by `owner/repo#214` for another repository.

> **Exam trap.** Closing keywords are interpreted only when the pull request targets the default branch. A pull request merged into `release/2.1` with "Fixes #214" doesn't close issue 214.

**Azure DevOps notifications** are subscriptions at four levels:

| Level | Who manages it |
| --- | --- |
| Personal | The user |
| Team | Team administrators, Project Administrators, Project Collection Administrators |
| Project | Project Administrators, Project Collection Administrators |
| Global (all projects of the organization) | Project Collection Administrators |

Default subscriptions are predefined and enabled; administrators choose which ones are available, and each user can opt out of a default, team or project subscription. Notifications are delivered by email (to the user's preferred email address, the same for all organizations) or through a service hook to another service.

> **Exam trap.** The `@CurrentIteration`, `@Follows`, `@MyRecentActivity`, `@RecentMentions`, `@RecentProjectActivity` and `@TeamAreas` query macros work in the web portal only: a query that uses them doesn't work when opened in Visual Studio (Team Explorer), Excel or Project, and `@CurrentIteration` doesn't work in the REST API.

<!-- section: tracking-integration | objectives: 1.1.3 -->
## Integrating work tracking with repositories

Work is tracked where the team plans, and linked to where the code lives. Three combinations appear in questions:

| Scenario | Recommended tracking |
| --- | --- |
| Code and planning on GitHub | GitHub Issues planned in GitHub Projects |
| Code and planning in Azure DevOps | Azure Boards linked to Azure Repos |
| Code on GitHub, portfolio planning, reporting or Test Plans in Azure DevOps | Azure Boards connected to the GitHub repositories |

**GitHub Projects** span repositories: an organization project can hold issues and pull requests from several repositories. Built-in workflows automate the status field; two are enabled when a project is created (**Item closed** and **Pull request merged**, both set the status to Done), and others add items automatically from a repository that match a filter or archive items that meet criteria.

**Azure Boards with Azure Repos.** Mention a work item with `#1423` in a commit message or a pull request to link it. When completing a pull request, the **Complete associated work items after merging** option transitions the linked items. The branch policy **Check for linked work items** blocks pull requests without a work item.

**Azure Boards with GitHub.** Connect the project to the GitHub repositories (configuration steps in the collaboration chapter). Then `AB#1423` in a commit message, a pull request description or an issue description links the work item, and the links appear in the work item's **Development** section and in the pull request. You can also create a GitHub branch from a work item (**Work item actions > New GitHub branch**). When a linked branch is deleted, typically after its merge, its link is removed from the work item automatically.

| Fact | Value |
| --- | --- |
| Repositories per connection to a project | Up to 2,000 |
| Organizations per GitHub repository | Connect a repository to projects of one Azure DevOps organization only, otherwise `AB#` links behave unexpectedly |
| Azure DevOps Services | GitHub.com and GitHub Enterprise Server |
| Azure DevOps Server 2020 and later | GitHub Enterprise Server only |
| Other Git hosts | Not supported |

> **Exam trap.** `AB#1423` in a pull request **title** or in a **comment** creates no link. Only commit messages, pull request descriptions and issue descriptions are parsed.

<!-- section: traceability | objectives: 1.1.4 -->
## Source, bug and quality traceability

Traceability answers three questions: which code implements this requirement (source), where a defect was found and fixed (bug), and how well a requirement is tested (quality).

**Source traceability.** Azure Boards stores development and build links on the work item:

| Category | Link types |
| --- | --- |
| Code | Branch, Commit, Pull Request |
| GitHub | GitHub Branch, GitHub Commit, GitHub Pull Request, GitHub Issue |
| Build | Build, Found in build, Integrated in build |
| Deployment | Integrated in release environment |
| Wiki | Wiki |

For YAML pipelines, enable **Automatically link new work items in this build** in the pipeline settings: after the run, an **Integrated in build** link appears on each work item linked to the commits of the build. When a pull request is created from a branch linked to a work item, the pull request is linked too, and so is the merge commit.

`AB#` mentions also move work items. In a pull request description, `Fixes AB#1423` moves the item to the first state of the Resolved category (or of the Completed category if there is none) when the pull request is merged into the default branch; `Closed AB#1423` moves it to the Closed state. In the Agile process, Learn's state category table puts only the Bug's Resolved state in the Resolved category, so to move a user story to Resolved, write the state name: `Resolved AB#1423`.

> **Exam trap.** In `Fixes AB#123, AB#124, AB#125`, all three items are linked but only the first one changes state. To transition all three, repeat the keyword: `Fixes AB#123, Fixes AB#124, Fixes AB#125`.

**Bug traceability.** A Bug work item records repro steps and the **Found in build** link; the fix is linked through its commit or pull request. From the **Tests** tab of a pipeline run, select failed tests and choose **Bug**: the bug captures the error message, the stack trace and the context. Several failed results can map to one bug when they share a cause.

**Quality traceability.** In the same **Tests** tab, select an automated test and choose **Link** to associate it with a work item of the **Requirements** category. The **Requirements quality** dashboard widget then lists the requirements returned by a query with the pass rate and the number of failed tests of their linked tests, for a chosen pipeline stage, and shows requirements that have no test. Automated tests can also be associated with test cases in Azure Test Plans, where they count toward the quality of the requirements they cover.

On GitHub, the chain is issue, branch, pull request, commit and deployment: the **Development** sidebar of an issue lists its branches and pull requests, and up to ten issues can be linked manually to one pull request.

<!-- section: key-points -->
## Key points

- System processes (Basic, Agile, Scrum, CMMI) can't be changed: customize an inherited process.
- Area path = who, iteration path = when; WIP limits and split columns reveal bottlenecks.
- GitHub Flow: one deployable default branch, short-lived branches, pull requests with required checks and reviews.
- Closing keywords and `AB#` state transitions apply only to pull requests merged into the default branch.
- `AB#` links from commit messages, pull request descriptions and issue descriptions, not from titles or comments.
- Connect a GitHub repository to one Azure DevOps organization; up to 2,000 repositories per connection.
- Integrated in build links need the pipeline setting; Requirements quality needs tests linked to Requirements-category items.
