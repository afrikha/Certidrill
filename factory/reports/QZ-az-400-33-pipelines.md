# QZ-az-400-33-pipelines — notes

`content/az-400/quizzes/33-pipelines.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.3.1 (q5), 3.3.2 (q1, q10), 3.3.3 (q6), 3.3.4 (q3), 3.3.5 (q4), 3.3.6 (q8), 3.3.7 (q9), 3.3.8 (q2), 3.3.9 (q7). Positions 6–10: single, yesno, single, dropdown, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Free Microsoft-hosted grant isn't additive** ("Configure and pay for parallel jobs"): the first purchased Microsoft-hosted parallel job only removes the time limits of the free one, so N concurrent jobs need N purchases. The chapter's table doesn't say this. q10 relies on it (within the study guide's "cost, licenses").
- The same page says releases that deploy to **deployment groups** don't consume parallel jobs either, and that a run consumes one only while it actively runs on an agent. The chapter lists only approvals and server jobs.
- Self-hosted grant: Learn now says "at least one free self-hosted parallel job" and doesn't say on the fetched content whether purchased self-hosted jobs add to it. The mock question `az400-3b-agent-mdp-jobs` (free + 7 purchased = 8) assumes they do. Not verified.
- **Container jobs "on any agent"** (complex-scenarios table): Learn's service containers page says the hosted macOS pool doesn't support containers. The chapter should qualify it.
- `timeoutInMinutes: 0` means forever on self-hosted agents, 360 minutes on Microsoft-hosted agents for public projects, and **60 minutes on Microsoft-hosted agents for private projects unless capacity is paid for**. The chapter's "0 = maximum allowed" is right but could be more precise.
- Environment security roles: Learn says the **Creator, Administrator and User roles (not Reader) can manage approvals and checks**, and that only the creator of an environment gets the Administrator role. Also, a CI- or manually-triggered pipeline that references a non-existent environment now **fails** (no more auto-creation outside the web editor or wizard). Not in the chapter. I didn't test it because the role rule is counterintuitive and may change.
- Classic release pipelines can't be exported to YAML. Only classic build pipelines have **Export to YAML** ("Migrate your Classic pipeline to YAML"). Also, YAML schedules are in UTC while classic schedules use the organization's time zone. Worth a line in 3.3.1.
- Build GitHub repositories: the comment command is documented as `/AzurePipelines run [<pipeline-name>]` or `/azp run [<pipeline-name>]`. Draft PRs trigger by default (`drafts: false` to disable). The chapter matches.

## Not verified on a fetched page

- q9: I took "the Microsoft-hosted Windows image includes the Visual Studio build tools that VSBuild needs" and "VSBuild can't run on Ubuntu" from general knowledge and the chapter ("Visual Studio (Windows images)"). I didn't fetch the VSBuild@1 or image pages.
- q5: that classic release pipelines can be exported as JSON (the distractor) is general knowledge. The migration page only mentions "Export to YAML or JSON" for build pipelines.
- q6: Learn doesn't document the GitHub UI for adding repositories to an existing app installation (it points to the GitHub settings). The answer only says an organization owner adds the repository to the selected repositories.

## Design notes

- Decisions not in the mock bank: what doesn't consume a parallel job, last variable group wins, the YAML `pr` keyword ignored for Azure Repos, publish/download shortcuts and `$(Pipeline.Workspace)`, migrating classic releases to multi-stage YAML, a repository missing from the GitHub App's selected repositories, checks on a variable group applying stage-wide, environment checks escaped by a regular job, static checks before approvals, a custom condition overwriting `succeeded()`, a hybrid build/deploy with `demands` and job `dependsOn`, and the non-additive free grant.
- No preview feature is an answer. References use the H1 titles, as the bank does.
