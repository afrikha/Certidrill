Security scanning moves left when it runs on every pull request and pipeline, and stays useful when its findings reach the people who can fix them. The exam asks which scanner finds which problem, how to switch on GitHub Advanced Security on both platforms, what Microsoft Defender for Cloud adds, and how to scan containers and open-source dependencies.

<!-- section: scanning-strategy | objectives: 4.3.1 -->
## A strategy for security and compliance scanning

| Scan | Finds | GitHub | Azure DevOps |
| --- | --- | --- | --- |
| Dependency (software composition analysis) | Known vulnerabilities in open-source packages | Dependency graph, Dependabot alerts, dependency review | GHAS for Azure DevOps dependency scanning |
| Code (static analysis, SAST) | Vulnerable patterns in your own code: injection, path traversal | Code scanning with CodeQL or a third-party SARIF tool | GHAS for Azure DevOps code scanning (CodeQL) |
| Secret | Keys, tokens, connection strings in commits | Secret scanning and push protection | GHAS for Azure DevOps secret scanning and push protection |
| License | Dependencies whose license breaks company policy | Dependency review action (`allow-licenses` / `deny-licenses`) | A license-compliance tool in the pipeline |
| Infrastructure as code | Misconfigured Bicep, ARM, Terraform | Microsoft Security DevOps action (Checkov, Template Analyzer, Terrascan) | Microsoft Security DevOps task |
| Container image | Vulnerable OS and language packages in images | Trivy, Defender for Cloud CLI in the workflow | Same in the pipeline; Defender for Containers in the registry |

Where each runs:

| Stage | Purpose | Example |
| --- | --- | --- |
| Push | Stop the secret before it lands | Push protection |
| Pull request | Block new problems before merge | Dependency review, code scanning on PR, PR annotations |
| CI on the main branch and on a schedule | Find problems in existing code and newly published advisories | CodeQL weekly, Dependabot alerts |
| Registry and runtime | Re-assess images already built, prioritize what runs | Defender for Containers, Defender CSPM |

Design rules: fail the build only on high-confidence, high-severity findings (`fail-on-severity`, `break: true`) and report the rest; make the scan a **required status check** or **build validation** policy so it can't be skipped; send everything to one place (security overview, Defender for Cloud).

> **Exam trap.** Secret scanning finds secrets already in the repository, including history; push protection blocks new ones at push time. A leaked secret is compromised the moment it's pushed: revoke and rotate it, rewriting history doesn't make it safe.

<!-- section: defender-devops | objectives: 4.3.2 -->
## Microsoft Defender for Cloud DevOps security

DevOps security connects Azure DevOps organizations, GitHub organizations and GitLab groups to Defender for Cloud (**Environment settings > Add environment**) and shows their inventory, posture and scan findings next to cloud resources.

| To connect or use | Permission |
| --- | --- |
| Create the connector on the Azure side | Contributor or Security Admin on the subscription |
| Azure DevOps organization | Project Collection Administrator |
| GitHub organization | Organization owner |
| GitLab group | Group owner |
| Read findings | Security Reader (on the connector or resource group) |
| Configure pull request annotations | Contributor or Owner on the subscription |

| Capability | Foundational CSPM | Defender CSPM |
| --- | --- | --- |
| Inventory, DevOps misconfiguration recommendations | Yes | Yes |
| Code, IaC, secret and dependency findings (from GHAS, MSDO or agentless scanning) | Yes | Yes |
| Pull request annotations (Azure DevOps) | No | Yes |
| Code-to-cloud mapping, attack path analysis, Cloud Security Explorer, SBOM queries | No | Yes |

**Microsoft Security DevOps (MSDO)** runs open-source analyzers in the pipeline: Bandit (Python), BinSkim (binaries), Checkov, Terrascan and Template Analyzer (IaC), ESLint (JavaScript), Trivy (containers, IaC). Install the extension (Project Collection Administrator) and add the task; for Defender for Cloud to ingest the SARIF results, the artifact must be named `CodeAnalysisLogs`.

```yaml
steps:
  - task: MicrosoftSecurityDevOps@1
    displayName: Microsoft Security DevOps
    inputs:
      categories: 'IaC,containers'
      break: true
```

On GitHub the equivalent is the Microsoft Security DevOps action. MSDO's own credential scanner is deprecated: secrets come from GitHub Advanced Security. The **Defender for Cloud CLI** (Defender CSPM) adds container image scanning to any CI system and sends results to Cloud Security Explorer.

> **Exam tip.** "Show code vulnerabilities as comments on Azure DevOps pull requests" needs Defender CSPM plus PR annotations configured; "map a vulnerable image back to its repository" needs Defender CSPM code-to-cloud mapping. Inventory and recommendations alone are in foundational CSPM.

<!-- section: advanced-security | objectives: 4.3.3 -->
## GitHub Advanced Security for GitHub and for Azure DevOps

On GitHub, Advanced Security is sold as two products for GitHub Team and GitHub Enterprise Cloud; public repositories get code scanning and secret scanning free.

| GitHub Secret Protection | GitHub Code Security |
| --- | --- |
| Secret scanning alerts, push protection | Code scanning (CodeQL or third-party SARIF), Copilot Autofix |
| AI-detected generic secrets such as passwords | Dependency review in pull requests |
| Custom patterns for organization-specific secrets | Custom auto-triage rules for Dependabot |
| Delegated bypass for push protection, delegated alert dismissal | Security campaigns, security overview |

Code scanning has a **default setup** (GitHub picks languages and runs on push, pull request and a weekly schedule) and an **advanced setup** (a workflow you edit). Third-party tools upload SARIF with `github/codeql-action/upload-sarif`. Uploading results needs `security-events: write`.

```yaml
permissions:
  contents: read
  security-events: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with:
          languages: csharp
          queries: security-extended
      - uses: github/codeql-action/autobuild@v4
      - uses: github/codeql-action/analyze@v4
```

**GitHub Advanced Security for Azure DevOps** has the same split: **GitHub Secret Protection for Azure DevOps** and **GitHub Code Security for Azure DevOps**, billed per active committer and enabled per repository, per project or for the organization (with an optional switch for new repositories). Managing it needs Project Collection Administrators or **Advanced Security: manage settings**; Contributors view alerts; Project Administrators dismiss them.

- **Push protection** blocks high-confidence secrets in pushes from the command line and the web. Bypass with `skip-secret-scanning:true` in the commit message; an alert is still created. Enabling Secret Protection also scans the full history.
- **Code scanning default setup** runs weekly on supported languages; **advanced setup** adds tasks to a pipeline (Init, your build, Analyze).
- **Dependency scanning** runs in a pipeline, after the package restore.
- Results appear in **Repos > Advanced Security** and as pull request annotations. The scanning tasks are Marketplace tasks: **Disable Marketplace tasks** must be off.

```yaml
steps:
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'csharp'
      enableAutomaticCodeQLInstall: true
  - task: DotNetCoreCLI@2
    inputs:
      command: 'build'
  - task: AdvancedSecurity-Dependency-Scanning@1
  - task: AdvancedSecurity-Codeql-Analyze@1
```

`enableAutomaticCodeQLInstall` matters on self-hosted agents; `buildtype: 'none'` scans C#, Java and interpreted languages without compiling.

> **Exam trap.** CodeQL for compiled languages must observe the build: Init goes before the build step, Analyze after it, and incremental or cached builds hide code from the database.

<!-- section: ghas-defender | objectives: 4.3.4 -->
## Integrating GitHub Advanced Security with Defender for Cloud

Once a GitHub or Azure DevOps connector exists, Defender for Cloud ingests GHAS findings (exposed secrets and open-source vulnerabilities require GHAS; code findings come from GHAS code scanning, MSDO or agentless scanning) and shows them as recommendations, such as "Azure DevOps repositories should have code scanning findings resolved".

The **GitHub Advanced Security integration** goes further, from code to runtime and back:

- Defender for Cloud maps repositories to the container images and workloads they produce (for example an image in Azure Container Registry running on AKS).
- GHAS alerts receive **runtime risk factors** from Defender CSPM attack path analysis: Internet exposure, sensitive data, critical resources, lateral movement.
- In GitHub, **Security > Campaigns > Create campaign > From code scanning filters** with the **Runtime Risks** filter focuses developers on code that is deployed and exposed.
- From a Defender recommendation, **Take action > Generate GitHub issue** opens an issue in the originating repository; status syncs both ways.

Prerequisites: GitHub connector, GHAS license on the repositories, Defender CSPM on the subscription, agentless code scanning on the connector, GitHub organization owner and Security Admin; commercial clouds only. Results can take up to 24 hours.

> **Exam tip.** "Prioritize the Dependabot and code scanning alerts of code that actually runs in production and is internet-exposed" is the GHAS integration with Defender CSPM, not a GitHub setting alone.

<!-- section: container-scanning | objectives: 4.3.5 -->
## Container scanning and CodeQL in a container

Scan images at three points:

| Point | Tool | Behavior |
| --- | --- | --- |
| Build, before push | Trivy (MSDO `containers` category), Defender for Cloud CLI (`defender scan image`, task `MicrosoftDefenderCLI@2`) | Fail the pipeline on critical findings, SARIF output |
| Registry | Defender for Containers (Microsoft Defender Vulnerability Management) | New or imported images scanned within hours; daily rescan of images pushed or pulled in the last 30 days |
| Runtime | Defender for Containers with Kubernetes API access or the Defender sensor | Running images assessed even when built long ago |

```yaml
- task: MicrosoftDefenderCLI@2
  inputs:
    command: 'run'
    scanType: 'image'
    imageName: $(ImageName)
    break: true
```

**CodeQL in a container.** When the build only works in a container image (custom toolchain), run the whole job in that container so CodeQL sees the build. Requirements: Git installed and on `PATH`, a glibc-based image (the CodeQL CLI doesn't support musl-based Alpine), and every step in the same container.

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
    container:
      image: ghcr.io/contoso/build-tools:2.4
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with:
          languages: java-kotlin
      - run: ./gradlew build --no-daemon
      - uses: github/codeql-action/analyze@v4
```

> **Exam trap.** CodeQL running on the runner host while the build runs in a `docker run` step sees nothing to analyze. The `container:` key at job level, with CodeQL steps inside the same job, is the fix.

<!-- section: dependabot | objectives: 4.3.6 -->
## Dependabot alerts for open-source components

| Feature | Does | Configured in |
| --- | --- | --- |
| Dependency graph | Lists manifests and lock files of the repository | Repository settings (on by default for public repositories) |
| Dependabot alerts | Alerts on dependencies affected by advisories reviewed by GitHub | Settings > Advanced Security, or organization security configurations |
| Dependabot security updates | Opens a pull request that upgrades to the minimum fixed version | Same settings; needs alerts |
| Dependabot version updates | Pull requests to stay current, vulnerable or not | `.github/dependabot.yml` |
| Auto-triage rules | Dismiss, snooze or trigger security updates for matching alerts | Repository or organization rules |

Alerts are raised on the **default branch** when a new advisory enters the GitHub Advisory Database or when the dependency graph changes. When alerts are first enabled, existing vulnerable dependencies get alerts but no notification. Notifications go to users with Write, Maintain or Admin who watch the repository. Repository admins and organization owners enable them. Actions pinned to a commit SHA don't get Dependabot alerts.

```yaml
version: 2
updates:
  - package-ecosystem: "nuget"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: "development"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Block new vulnerable dependencies at review time with the dependency review action:

```yaml
- uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high
    deny-licenses: GPL-3.0, AGPL-3.0
```

| Requirement | Answer |
| --- | --- |
| Be told when a package already in `main` gets a new CVE | Dependabot alerts |
| Get a fix pull request automatically for that CVE | Dependabot security updates |
| Keep NuGet and actions current every week | Version updates in `dependabot.yml` |
| Stop a pull request that adds a vulnerable or GPL package | Dependency review action as a required check |
| Ignore alerts on development-only dependencies automatically | Auto-triage rule |
| Same alerts in Azure Repos | GHAS for Azure DevOps dependency scanning |

> **Exam trap.** `dependabot.yml` configures version updates only; security updates are switched on in settings. Workflows triggered by Dependabot don't receive repository Actions secrets.

<!-- section: key-points -->
## Key points

- Cover dependencies, code, secrets, licenses, IaC and images; block at push and pull request, rescan on a schedule, centralize findings.
- Defender for Cloud DevOps security: connectors for Azure DevOps, GitHub and GitLab; PR annotations and code-to-cloud need Defender CSPM; MSDO artifact `CodeAnalysisLogs`.
- GHAS on both platforms = Secret Protection + Code Security; push protection bypass leaves an alert; CodeQL Init before the build, Analyze after.
- GHAS + Defender for Cloud adds runtime risk to GitHub alerts and campaigns.
- Scan images at build, in the registry and at runtime; run CodeQL in the build container with `container:`.
- Dependabot: alerts (advisories), security updates (fix PRs), version updates (`dependabot.yml`), auto-triage rules.
