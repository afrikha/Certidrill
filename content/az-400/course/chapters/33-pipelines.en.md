Pipelines are half of the AZ-400 exam. Questions show a YAML pipeline or a workflow with a blank, describe a team and a constraint (cost, no stored secret, on-premises target, least effort) and ask which agent, trigger, template or check to use. Every topic below exists in both toolchains: Azure Pipelines and GitHub Actions.

<!-- section: automation-solution | objectives: 3.3.1 -->
## Choosing GitHub Actions or Azure Pipelines

Both run YAML pipelines on hosted or self-hosted machines and deploy to any cloud. The choice usually follows where the code, the work tracking and the governance already are.

| Requirement | Better fit |
| --- | --- |
| Code is on GitHub, team wants one platform with Dependabot and GitHub Advanced Security | GitHub Actions |
| Large catalog of community actions, workflows stored next to the code | GitHub Actions |
| Azure Boards, Azure Repos and Azure Artifacts already in use, traceability from work item to release | Azure Pipelines |
| Approvals and checks on shared resources (service connections, agent pools, variable groups) | Azure Pipelines |
| Existing classic build or release pipelines to modernize | Azure Pipelines (migrate to YAML) |
| On-premises Azure DevOps Server | Azure Pipelines with self-hosted agents |
| Code on GitHub but the organization standardizes on Azure DevOps | Azure Pipelines with the Azure Pipelines GitHub App |

Only classic build pipelines have **Export to YAML**: classic release pipelines have no YAML export, so their tasks are exported one by one. After a migration, review cron schedules: YAML schedules use UTC, classic schedules the organization's time zone.

Vocabulary maps one to one:

| Azure Pipelines | GitHub Actions |
| --- | --- |
| Pipeline (`azure-pipelines.yml`, any path) | Workflow (`.github/workflows/*.yml`) |
| Stage / job / step / task | (no stage) job / step / action |
| Agent, agent pool | Runner, runner group, labels |
| `dependsOn` | `needs` |
| Variable group, secret variable | Variables and secrets (repository, environment, organization) |
| Template, extends template | Reusable workflow, composite action |
| Environment with approvals and checks | Environment with deployment protection rules |
| Service connection | `azure/login` with OpenID Connect, or secrets |

> **Exam tip.** Azure DevOps public projects are retired: new public projects can't be created, and existing ones convert to private in 2027. For an open-source project that needs free public CI, the answer is a public GitHub repository with GitHub Actions.

<!-- section: agents-runners | objectives: 3.3.2 -->
## Agent and runner infrastructure

| Option | Who manages the machine | Fresh machine per job | Reaches private networks | Typical reason |
| --- | --- | --- | --- | --- |
| Microsoft-hosted agent | Microsoft | Yes | No (public network only, no VPN or ExpressRoute) | Least administration |
| Self-hosted agent | You | No: tools and caches persist | Yes | Custom software, on-premises targets, long jobs |
| Azure Virtual Machine Scale Set agents | You (scale set in your subscription), Azure Pipelines scales it | Optional (tear down after every use) | Yes | Autoscaled self-hosted pool |
| Managed DevOps Pools | Microsoft service, VMs in a Microsoft subscription | Configurable; state kept up to seven days | Yes (your company network) | Recommended evolution of scale set agents |
| GitHub-hosted runner | GitHub | Yes | Only with Azure private networking | Least administration on GitHub |
| Self-hosted runner | You | No, unless ephemeral | Yes | Custom hardware, on-premises access |

Microsoft-hosted agents run on Standard_DS2_v2 (2 cores, 7 GB RAM) for Windows and Linux, with at least 10 GB free disk; you can't get bigger machines, sign in remotely or preload software. Select them by image: `vmImage: ubuntu-latest`, `windows-latest` (Windows Server 2025), `windows-2025-vs2026`, `macOS-latest`. The Windows Server 2019 image was retired on December 31, 2025. They can't be identified by a service tag: a firewall must allow the weekly published IP ranges of every region of the organization's geography.

**Parallel jobs** are the licensing unit of Azure Pipelines, bought per organization and shared by all projects:

| Item | Value |
| --- | --- |
| Free Microsoft-hosted grant (private projects) | 1 parallel job, 60 minutes per run, 1,800 minutes per month |
| Paid Microsoft-hosted parallel job | No monthly limit, 360 minutes per job; the first purchase only removes the free job's time limits, so two concurrent jobs need two purchases |
| Free self-hosted grant | 1 parallel job, unlimited minutes; purchased self-hosted jobs add to it (5 concurrent jobs = 4 purchases) |
| Default cap for new organizations | 25 Microsoft-hosted parallel jobs (support request to raise) |
| Who buys | Project Collection Administrators, Organization settings > Parallel jobs, billing set up through an Azure subscription |
| Not consuming a parallel job | Runs waiting for an approval or a manual intervention, server (agentless) jobs, releases that deploy to a deployment group; a run consumes one only while it actively runs on an agent |

Managed DevOps Pools costs Azure compute, storage and egress **plus** self-hosted parallel jobs: a pool with Maximum agents set to 5 and only the free parallel job runs one job at a time.

GitHub Actions limits: a job runs at most 6 hours on a GitHub-hosted runner and 5 days on a self-hosted runner; a workflow run at most 35 days; a matrix at most 256 jobs; a self-hosted job queued more than 24 hours fails. Self-hosted runners are free (you pay the machines). Larger runners (more cores, GPU, static IP, custom images) need GitHub Team or Enterprise Cloud.

Self-hosted machines only open **outbound** HTTPS (port 443 for GitHub runners): no inbound port is required. An Azure Pipelines agent is registered by a user with the **Agent pool administrator** role, with a PAT, the device code flow or a service principal; run it as a service in production. Jobs select a self-hosted agent with `demands` (capabilities) and a runner with `runs-on` labels, for example `runs-on: [self-hosted, linux, x64]`.

> **Exam trap.** Don't run untrusted code, such as pull requests from forks, on a self-hosted agent or runner inside your network: it persists state and can reach internal resources. Use Microsoft-hosted agents or GitHub-hosted runners for fork builds, and ephemeral runners (`--ephemeral`, one job then de-registered) for autoscaled self-hosted fleets.

<!-- section: github-integration | objectives: 3.3.3 -->
## Integrating GitHub repositories with Azure Pipelines

| Authentication | Runs as | GitHub Checks | Use |
| --- | --- | --- | --- |
| Azure Pipelines **GitHub App** | Azure Pipelines identity | Yes, per run and per job | Recommended |
| OAuth | Your personal GitHub identity | No (Status API) | Quick setup |
| PAT (`repo`, `admin:repo_hook`, `read:user`, `user:email`) | Your personal GitHub identity | No | When the app can't be installed |

Installing the app requires a GitHub organization owner or repository admin; select repositories explicitly rather than all repositories. To block merges until the pipeline passes, run the pipeline once, then add it as a required status check in the GitHub branch protection rule (the pipeline must use the GitHub App).

Pull requests from **forks** aren't built automatically. When enabled, secrets (service connections, secure files, secret variables) aren't available to fork builds by default, and **Require a team member's comment before building a pull request** lets a collaborator with Write permission start the build with `/azp run`.

> **Exam trap.** Branch protection rules (GitHub) and branch policies (Azure Repos) are different settings. With a GitHub repository, the required build is a status check in GitHub, not a build validation branch policy.

<!-- section: triggers | objectives: 3.3.4 -->
## Pipeline trigger rules

```yaml
trigger:                  # CI trigger
  batch: true             # one run for the commits pushed while a run is in progress
  branches:
    include: [ main, releases/* ]
    exclude: [ releases/old* ]
  paths:
    exclude: [ docs ]
pr:                       # PR trigger: GitHub and Bitbucket Cloud only
  branches:
    include: [ main ]
schedules:
- cron: '0 2 * * Mon-Fri'  # UTC, no daylight saving adjustment
  displayName: Nightly
  branches:
    include: [ main ]
  always: false            # default: run only if the code changed since the last successful scheduled run
resources:
  pipelines:
  - pipeline: lib          # alias
    source: security-lib-ci
    trigger:
      branches:
        include: [ main ]
```

| Requirement | Rule |
| --- | --- |
| No CI on push | `trigger: none` (without a `trigger` section, every branch triggers) |
| No PR validation | `pr: none` |
| PR validation for Azure Repos | Build validation **branch policy** (the `pr` keyword is ignored) |
| Ignore documentation changes | `paths: exclude` |
| Skip CI for one commit | `[skip ci]` or `***NO_CI***` in the commit message |
| Run after another pipeline completes | `resources.pipelines` with `trigger` |
| Nightly build even without changes | `always: true` |
| Schedules in YAML ignored | Remove the schedules defined in the UI: UI schedules take precedence |

Variables aren't allowed in triggers, and triggers can't be placed in templates. Scheduled triggers don't disable CI or PR triggers.

GitHub Actions uses `on:`:

```yaml
on:
  push:
    branches: [ main ]
    paths-ignore: [ 'docs/**' ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '30 1 * * *'   # UTC, runs on the default branch
  workflow_dispatch:        # manual run, optional inputs
  workflow_run:             # after another workflow
    workflows: [ Build ]
    types: [ completed ]
  repository_dispatch:      # external system through the REST API
    types: [ deploy-request ]
```

<!-- section: yaml-pipelines | objectives: 3.3.5 -->
## Developing pipelines in YAML

The hierarchy is pipeline > stages > jobs > steps. A pipeline with one stage can list `jobs` directly, and one job can list `steps` directly. Steps are `script`, `bash`, `pwsh`, `powershell`, `task` (`Name@MajorVersion`), `checkout`, `download` and `publish`.

| Syntax | Evaluated | Typical use |
| --- | --- | --- |
| `${{ variables.name }}` / `${{ parameters.name }}` | Compile time (template expansion) | Insert or remove steps, `${{ if }}`, `${{ each }}` |
| `$[ variables.name ]` | Runtime, before the job or stage | `condition`, variables computed from dependencies |
| `$(name)` | Runtime, before a task runs (macro) | Task inputs and scripts |

Secret variables aren't mapped to environment variables automatically: map them with `env:` on the step. Variables are scoped to pipeline, stage or job, the most specific wins. An output variable is set with `##vso[task.setvariable variable=ver;isOutput=true]1.4` and read in a later job through `dependencies.<job>.outputs['<step>.ver']`.

> **Exam trap.** Runtime parameters (`parameters:` at the top of the pipeline) are typed and chosen at queue time; they are resolved at compile time, so they can add or remove stages. Variables can't.

<!-- section: execution-order | objectives: 3.3.6 -->
## Job execution order, parallelism and multi-stage pipelines

| Element | Default | Change it with |
| --- | --- | --- |
| Stages | Run in sequence, each depends on the previous | `dependsOn: []` (parallel), `dependsOn: [A, B]` (fan-in) |
| Jobs in a stage | Run in parallel | `dependsOn` |
| Condition | Run if all dependencies succeeded | `condition: failed()`, `always()`, `and(succeeded(), eq(...))` |
| Job timeout | 60 minutes | `timeoutInMinutes` (0 = maximum allowed: forever on self-hosted agents, 360 minutes on Microsoft-hosted agents for a public project, 60 minutes for a private project unless extra capacity is paid for) |

```yaml
stages:
- stage: Build
  jobs:
  - job: Test
    strategy:
      matrix:
        linux:   { imageName: ubuntu-latest }
        windows: { imageName: windows-latest }
      maxParallel: 2
    pool:
      vmImage: $(imageName)
    steps:
    - script: dotnet test
- stage: DeployTest
  dependsOn: Build
- stage: DeployProd
  dependsOn: DeployTest
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

`strategy: parallel: 5` duplicates a job for test slicing (`System.JobPositionInPhase`, `System.TotalJobsInPhase`); `matrix` and `parallel` are mutually exclusive. A stage holds up to 256 jobs. A custom `condition` replaces the default success check, so wrap it in `and(succeeded(), ...)`. `trigger: manual` on a stage waits for someone to run it; `isSkippable: false` prevents skipping a mandatory stage.

GitHub Actions: jobs run in parallel unless `needs` is set; `strategy.matrix` with `max-parallel` and `fail-fast`; `concurrency` with a `group` key and `cancel-in-progress: false` serializes deployments to one target.

> **Exam trap.** Parallel jobs in YAML only run in parallel if the organization owns enough parallel jobs and agents. Five matrix legs with one parallel job still run one at a time.

<!-- section: complex-scenarios | objectives: 3.3.7 -->
## Complex pipeline scenarios

| Scenario | Design |
| --- | --- |
| Hybrid: build in the cloud, deploy to on-premises servers | Build job on a Microsoft-hosted agent, deployment job on a self-hosted agent (or VM resources of an environment) inside the network |
| Target servers registered once, deployed with rolling batches | Environment with virtual machine resources (agent installed on each VM) |
| Identical, versioned build machines | Build a VM image with Azure VM Image Builder (based on HashiCorp Packer) or Packer, publish it to an Azure Compute Gallery, use it in Managed DevOps Pools or a scale set |
| Scale set custom image | Generalize the VM (`sysprep` or `waagent -deprovision+user`), create the image, update the scale set; existing VMs keep the old image |
| Build tools without maintaining a machine image | Container job (`container:` on the job) on a Windows or Ubuntu agent (macOS agents don't support containers) |
| Job longer than 6 hours | Self-hosted agent or runner (Managed DevOps Pools: up to two days per job) |
| Agentless wait, REST call or manual validation | Server job (`pool: server`) with Delay, Invoke REST API or Manual Validation |

<!-- section: reusable-elements | objectives: 3.3.8 -->
## Reusable pipeline elements

| Element | Scope | Note |
| --- | --- | --- |
| Step, job, stage template (`template:`) | Any YAML pipeline | Include with typed `parameters` |
| Variable template | Any YAML pipeline | Only variables |
| Extends template | Pipeline must extend it | Enforce structure, with the **Required template** check |
| Task group | Classic pipelines only | Not supported in YAML: use templates |
| Variable group (Library) | Project | Authorize the pipeline; can link to Azure Key Vault |
| GitHub reusable workflow (`on: workflow_call`) | Called from a job | 10 nesting levels, 50 unique workflows per file; caller `env` not passed |
| GitHub composite action | Called from a step | Bundles steps in an `action.yml` |

```yaml
resources:
  repositories:
  - repository: templates
    type: git                       # Azure Repos; github for GitHub
    name: Platform/pipeline-templates
    ref: refs/tags/v2.1             # pin a tag or commit
variables:
- group: shop-prod                  # variable group, authorized for this pipeline
- template: vars/common.yml@templates
- name: buildConfiguration
  value: Release
extends:
  template: secure-pipeline.yml@templates
  parameters:
    environment: prod
```

Template limits: 100 YAML files, 100 nesting levels, 20 MB of memory while parsing. If two variable groups define the same name, the last one referenced wins. A variable group linked to Azure Key Vault stores only secret names and fetches the latest values at runtime; its service connection needs **Get** and **List** secret permissions or the **Key Vault Secrets User** role, and new vault secrets must be added to the group explicitly.

<!-- section: environments-checks | objectives: 3.3.9 -->
## Checks and approvals with YAML environments

An environment is referenced by a **deployment job** (`environment: prod`); approvals and checks are configured in the web UI on the environment (Approvals and checks tab), never in YAML. The same checks exist on service connections, agent pools, repositories, variable groups and secure files.

| Check | Purpose |
| --- | --- |
| Approvals | Users or groups (one member of a group is enough); can forbid approving your own run; on timeout the stage is skipped |
| Branch control | Allow only resources built from `refs/heads/main` and similar, optionally with branch protection |
| Business hours | Start only in a time window |
| Invoke REST API / Invoke Azure Function | Gate on an external system's answer |
| Query Azure Monitor alerts | Continue only if no alert is active |
| Required template | The pipeline must extend a given template |
| Evaluate artifact | Policy on a container image |
| Exclusive lock | One run at a time on the resource (`lockBehavior: sequential` or `runLatest`) |

Order: static checks (branch control, required template, evaluate artifact), pre-check approvals, dynamic checks, post-check approvals, exclusive lock. Security roles on an environment: Creator, Reader, User, Administrator; Creator, User and Administrator (not Reader) can manage approvals and checks, and only the creator of an environment gets the Administrator role. A manual or CI run that references an environment that doesn't exist fails: the environment is created automatically only from the pipeline creation wizard or the web editor.

In GitHub, a job with `environment: production` waits for its **deployment protection rules**: up to six required reviewers (one approval is enough, optional prevent self-review), a wait timer of up to 43,200 minutes, and allowed deployment branches and tags. Environment secrets are only readable after the rules pass. On Free, Pro and Team plans, required reviewers and wait timers apply only to public repositories.

> **Exam trap.** A manual approval in the middle of a stage, without an environment, is the `ManualValidation` task in a server job. An approval before every deployment to production is an Approvals check on the production environment.

<!-- section: key-points -->
## Key points

- Microsoft-hosted: least effort, no private network; self-hosted, scale set or Managed DevOps Pools: network access and custom tools.
- One free Microsoft-hosted parallel job (60 minutes, 1,800 minutes a month) and one free self-hosted job; parallelism needs purchased parallel jobs (the first Microsoft-hosted purchase adds no concurrency).
- Use the Azure Pipelines GitHub App for GitHub repositories; fork builds get no secrets.
- `trigger: none`, `pr: none`, path filters, schedules in UTC, `resources.pipelines` for chaining; Azure Repos PR builds come from branch policies.
- `${{ }}` compile time, `$[ ]` runtime, `$( )` macro.
- Templates and variable groups for YAML; task groups are classic only.
- Approvals and checks are set on the environment in the UI, not in the YAML.
