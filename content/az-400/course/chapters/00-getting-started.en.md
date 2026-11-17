AZ-400 is the exam of the DevOps engineer: it tests how you plan work, organize source control, build and release software, secure the supply chain and instrument applications, always with **two toolchains**, GitHub and Azure DevOps. Many questions show a YAML pipeline, a GitHub Actions workflow, Git commands or a query to complete. This chapter covers the format, a method for reading the questions and the pairs of features the exam expects you to tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: DevOps Engineer Expert |
| Prerequisite | Azure Administrator Associate (AZ-104) or Azure Developer Associate (AZ-204) is required to earn the certification |
| Duration | 120 minutes of exam time (Microsoft's figure for associate and expert exams that may contain labs) |
| Questions | Not published; about 45 to 58 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Languages | English, French, German, Spanish, Japanese, Korean, Chinese, Portuguese (Brazil), Italian |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The five domains of the study guide (skills measured as of July 27, 2026) don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design and implement processes and communications | 10 to 15 % |
| Design and implement a source control strategy | 10 to 15 % |
| Design and implement build and release pipelines | 50 to 55 % |
| Develop a security and compliance plan | 10 to 15 % |
| Implement an instrumentation strategy | 5 to 10 % |

Pipelines are half of the exam: package management, testing strategy, agents and runners, deployment strategies, infrastructure as code and pipeline maintenance. Spend your time accordingly.

Question formats, from most to least frequent: one answer among four, drop-down lists that complete a YAML file, a workflow or a command, "select two", drag and drop (matching or ordering steps), Yes/No statements, and rarely a hot area. Questions made of several elements give one point per correct element. An exam also contains sections with their own rules:

- **Case study.** A company described in tabs (overview, existing environment, requirements) followed by several questions. Once you leave it, you can't come back.
- **Yes/No series.** The same goal is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final.
- **Main section.** Independent questions that you can flag and review until you submit.

> **Exam tip.** Microsoft Learn is available, but the timer keeps running. Use it to check one YAML key, one task name or one limit, never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a DevOps question

A typical stem names a team, its toolchain (GitHub, Azure DevOps or both), a goal and one deciding constraint. Work in this order:

1. Read the last sentence: what must you choose, configure or do first?
2. Note the platform. A GitHub answer (branch protection rule, `GITHUB_TOKEN`, runner) is wrong in an Azure DevOps scenario, and the reverse.
3. Find the constraint that eliminates the plausible distractors.
4. In a code question, read the whole file: indentation, the stage or job a key belongs to, and the trigger often decide the answer.

| Words in the stem | What they select |
| --- | --- |
| "minimize administrative effort" | The managed option: Microsoft-hosted agents or GitHub-hosted runners, a built-in integration, a policy rather than a script |
| "without storing secrets", "no stored credential" | Workload identity federation (OpenID Connect) or a managed identity |
| "the agent must reach a private network", "custom software on the agent" | A self-hosted agent or runner (or a Managed DevOps Pools agent in your virtual network) |
| "prevent merging until", "require a review" | Branch policies (Azure Repos) or branch protection rules and rulesets (GitHub) |
| "approval before deploying to production" | Approvals and checks on an environment (Azure Pipelines) or required reviewers on an environment (GitHub Actions) |
| "no downtime", "roll back quickly" | Blue-green deployment or a slot swap |
| "expose to a small percentage of users first" | Canary release, ring deployment, feature flags |
| "consume packages from nuget.org through one feed" | An Azure Artifacts feed with an upstream source |
| "trace a commit to the work item", "link the pull request" | `AB#` mentions and the Azure Boards app for GitHub |
| "first", "next", "before" | An ordering question in disguise: identify the prerequisite |

> **Exam trap.** "Minimize costs" never overrides a functional requirement. A Microsoft-hosted agent is cheaper to run, but if the build must reach a database in a private virtual network, it can't be the answer.

In a Yes/No series, judge each solution on its own and accept one that meets the goal even if you would have designed a better one.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

The exam builds its distractors from neighbouring features. Learn the one-line difference:

| Don't confuse | With | Difference |
| --- | --- | --- |
| Branch policies | Branch protection rules | Azure Repos sets policies on a branch; GitHub sets protection rules or rulesets on branch name patterns |
| Microsoft-hosted agent | Self-hosted agent | A fresh virtual machine managed by Microsoft for each job; your machine, your tools and your network, which you maintain |
| Parallel job | Agent | A parallel job is the licence to run one job at a time; the agent is the machine that runs it |
| Service principal | Managed identity | A service principal has a secret or a certificate unless it uses federation; a managed identity is tied to an Azure resource and has no secret to manage |
| System-assigned managed identity | User-assigned managed identity | Lifecycle of one resource; standalone resource shared by several resources |
| Workload identity federation | Stored secret | Short-lived tokens exchanged through OpenID Connect; a secret that expires, leaks and must be rotated |
| Personal access token | `GITHUB_TOKEN` and GitHub App | A user's long-lived token; a token created for one workflow run and scoped to its repository; an app identity with fine-grained permissions and short-lived installation tokens |
| Feed view | Upstream source | A view (`@Local`, `@Prerelease`, `@Release`) shares a promoted subset of a feed; an upstream source pulls packages from another feed or a public registry |
| Blue-green | Canary | Two complete environments and a switch; a small share of traffic first, then a gradual increase |
| Ring deployment | Feature flag | Deploys to successive groups of users; turns code already deployed on or off |
| Stakeholder access | Outside collaborator | Free Azure DevOps access level with limited Boards features; a person outside a GitHub organization given access to some repositories |
| `git revert` | `git reset` | A new commit that undoes a commit, safe on shared branches; moves the branch pointer and rewrites local history |
| Git LFS | Scalar | Stores large binary files outside the repository; speeds up Git on very large repositories |
| Lead time | Cycle time | From creation of the work item to completion; from the start of work to completion |

<!-- section: scope -->
## What the exam doesn't test

The study guide of July 2026 doesn't name Team Foundation Version Control (TFVC), third-party CI servers, Kubernetes administration or application coding. Classic release pipelines appear only through their migration to YAML: know what a YAML pipeline replaces them with (stages, environments, approvals and checks), not how to author them.

Both toolchains change every month. When a task name, a YAML key or a limit matters, the course gives the current value as Microsoft Learn documents it: trust that over older study material.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order. The processes and source control chapters are short; the pipeline chapters are long and deserve most of your time.
2. Create a free Azure DevOps organization and a GitHub account. Write a small YAML pipeline and a GitHub Actions workflow that build, test and deploy the same application: most drop-down questions become easy once you have written the keys yourself.
3. For each pair in the table above, write one sentence that says when you would choose each option.
4. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
