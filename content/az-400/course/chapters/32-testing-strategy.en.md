A testing strategy decides which tests run where in the delivery flow and what stops a change: failing tests block the pull request, coverage below target blocks the merge, an approval or a health check stops a deployment. The exam asks which test type answers a requirement, which task or setting runs and reports it in Azure Pipelines or GitHub Actions, and which gate (check, protection rule, release gate) enforces quality, security or governance at the right point.

<!-- section: quality-release-gates | objectives: 3.2.1 -->
## Quality and release gates

Gates exist at two points: **before merge** (branch policies, branch protection rules, rulesets: see the branching chapter) and **before deployment**.

In YAML Azure Pipelines, deployment gates are **checks** configured on a protected resource, mostly an **environment** (also service connections, agent pools, repositories, variable groups, secure files). They are not written in the YAML file, so a pipeline author can't remove them.

| Check | Use |
| --- | --- |
| Approvals | Manual approval by users or groups (one member of a group is enough), with a timeout; option to forbid approving your own run |
| Branch control | Only runs from allowed branches (`refs/heads/main`, `refs/heads/release/*`), optionally requiring branch protection |
| Business hours | Deploy only in a time window |
| Required template | The pipeline must extend an approved YAML template: governance and security controls that teams can't skip |
| Evaluate artifact | Evaluate container image artifacts against a custom policy |
| Invoke Azure Function / Invoke REST API | Ask an external system (change management, test results, health) to decide |
| Query Azure Monitor alerts | Proceed only if no Azure Monitor alert is active |
| Exclusive lock | One run at a time on the resource (`lockBehavior: sequential` or `runLatest`) |

Evaluation order: static checks (branch control, required template, evaluate artifact), pre-check approvals, dynamic checks, post-check approvals, then exclusive lock. When an approval times out, the stage is skipped; when an Invoke Azure Function or Invoke REST API check times out, the stage and the stages that depend on it are skipped; when business hours or Azure Monitor alerts time out, the stage fails.

**Classic release pipelines** use **pre-deployment and post-deployment gates**: Invoke Azure Function, Query Azure Monitor alerts, Invoke REST API, **Query work items** (no more than n open bugs), **Check Azure Policy compliance**. Gates are re-evaluated at an interval (after a delay before evaluation) until all succeed in the same sampling interval or the timeout fails the deployment. Post-deployment gates on Azure Monitor alerts are the classic "stop the release if the new version raises errors" control.

**GitHub environments** use **deployment protection rules**:

| Rule | Detail |
| --- | --- |
| Required reviewers | Up to six users or teams, one approval is enough; **Prevent self-review** stops the person who triggered the run from approving |
| Wait timer | 1 to 43,200 minutes (30 days) |
| Deployment branches and tags | No restriction, protected branches only, or selected name patterns |
| Custom deployment protection rules | A GitHub App (for example, an observability or change management system) approves or rejects |
| Allow administrators to bypass | On by default; can be disabled |

For private repositories, required reviewers, wait timers and custom rules require GitHub Enterprise; on Free, Pro and Team plans they apply to public repositories.

```yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production   # protection rules of the environment apply before the job starts
    steps:
      - run: echo "Deploying build ${{ github.run_number }}"
```

Security and governance gates: code scanning results, secret scanning alerts and license compliance as **ruleset** rules in GitHub; Required template and Branch control checks, and Azure Policy compliance, in Azure DevOps; failing the pipeline on high-severity findings from dependency or container scanning.

> **Exam trap.** In YAML pipelines, approvals and gates are **checks on the environment**, not a keyword in the stage. "Prevent teams from deploying with a pipeline that skips the security scan" is the **Required template** check on the service connection that the deployment uses.

<!-- section: testing-strategy | objectives: 3.2.2 -->
## Designing a comprehensive testing strategy

Shift testing left: run most tests early, fast and in isolation, and keep fewer, slower tests later (the test pyramid).

| Test type | Scope and dependencies | When it runs | Typical tools |
| --- | --- | --- | --- |
| Local tests | Unit and fast tests on the developer machine, linters, pre-commit hooks | Before commit or push | IDE test runner, `dotnet test`, `npm test` |
| Unit tests | One class or function, no external dependency (mocks), milliseconds | Every build and pull request | MSTest, xUnit, NUnit, Jest, JUnit |
| Integration tests | Components with real dependencies (database, queue, API) | CI after unit tests, or in a test environment | Containers as service dependencies, test databases |
| Functional and UI tests | The deployed application end to end | After deployment to a test or staging environment | Playwright, Selenium |
| Load tests | Behavior under expected and peak traffic: response time, errors, throughput | Before production, on a production-like environment, often scheduled | **Azure Load Testing** (JMeter, Locust or URL-based tests) |
| Smoke tests | A few critical paths after each deployment | Right after deployment, before traffic shift | Script or REST calls |

Microsoft's test taxonomy expresses the same idea: L0 and L1 are unit tests that depend only on the assembly under test, L2 are functional tests that may also need dependencies such as SQL or the file system, L3 are functional tests against a testable service deployment, and L4 are a restricted class of integration tests against production. Push tests down to the lowest level that can catch the defect, and make every test reliable: a flaky test that fails randomly gets ignored and blocks nothing.

Azure Load Testing describes a test in a YAML configuration with **fail criteria**, so that a pipeline run fails when the application gets slower:

```yaml
version: v0.1
testId: checkout-api-load
displayName: Checkout API load test
testPlan: checkout.jmx
testType: JMX
engineInstances: 2
failureCriteria:
  clientMetrics:
    - p90(response_time_ms) > 500
    - percentage(error) > 5
autoStop:
  errorPercentage: 80
  timeWindow: 60
```

| Requirement | Test |
| --- | --- |
| Find regressions in business logic in seconds on every pull request | Unit tests |
| Verify the API works with the real SQL database schema | Integration tests |
| Verify the release can handle 2,000 concurrent users with p90 under 500 ms | Load test with fail criteria |
| Catch problems before code leaves the developer machine | Local tests, pre-commit hooks |

> **Exam tip.** Load tests answer performance and capacity requirements (response time, throughput, errors under load), not functional correctness. In a pipeline, the **fail criteria** turn a load test into a gate.

<!-- section: tests-in-pipeline | objectives: 3.2.3 -->
## Implementing tests in a pipeline

Azure Pipelines test tasks:

| Task | Use |
| --- | --- |
| `DotNetCoreCLI@2` with `command: test` | .NET tests on any OS; publishes TRX results automatically (`publishTestResults: true`) |
| `VSTest@3` | Visual Studio Test on Windows: test assemblies, test filter, `.runsettings`, code coverage, rerun of failed tests, distribution across agents |
| `PublishTestResults@2` | Publishes results from other runners: `testResultsFormat` `JUnit` (default), `NUnit`, `VSTest` (TRX), `XUnit`, `CTest`; `failTaskOnFailedTests` |
| `AzureLoadTest@1` | Runs an Azure Load Testing test from its YAML configuration; the service connection's identity needs **Load Test Contributor** |

```yaml
steps:
  - script: npm ci && npm test -- --reporters=default --reporters=jest-junit
    displayName: Unit tests
  - task: PublishTestResults@2
    condition: succeededOrFailed()   # publish results even when tests fail
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: '**/junit*.xml'
      failTaskOnFailedTests: true
      testRunTitle: Web unit tests
```

**Test agents.** Microsoft-hosted agents already contain the common test frameworks and Visual Studio (Windows images). A self-hosted agent needs the tools installed: for `VSTest@3`, Visual Studio or the **Visual Studio Test Platform Installer** task (`VisualStudioTestPlatformInstaller@1`) with `vsTestVersion: toolsInstaller`. UI tests that open a browser window need an agent running **interactively** (with autologon), not as a service, or a headless browser. To shorten long test runs, run a multi-agent job (`strategy: parallel: 3`) and let `VSTest@3` distribute batches (`distributionBatchType: basedOnExecutionTime`); each parallel agent consumes a parallel job.

```yaml
jobs:
  - job: UITests
    pool:
      vmImage: windows-latest
    strategy:
      parallel: 3
    steps:
      - task: VSTest@3
        inputs:
          testSelector: testAssemblies
          testAssemblyVer2: |
            **\*UITests.dll
            !**\obj\**
          distributionBatchType: basedOnExecutionTime
          rerunFailedTests: true
          rerunMaxAttempts: '2'
```

**Integration of results.** Published results appear in the run's **Tests** tab (failures, duration, attachments, history) and in test analytics and reports; results link to the pipeline run, the commit and bugs that can be created from a failure. Azure DevOps Services (not Azure DevOps Server) also manages **flaky tests**: system detection marks a test flaky, for its branch, when it fails and then passes on a rerun (`VSTest@3` reruns or Rerun failed jobs); excluding flaky tests from the test summary keeps their failures from failing the run, for the Visual Studio Test and Publish Test Results tasks only. With build validation, failed tests block the pull request.

**GitHub Actions** has no built-in test results tab: tests run as steps, a non-zero exit code fails the job (and the required status check), results files are kept with `actions/upload-artifact@v7`, and a summary can be written to `$GITHUB_STEP_SUMMARY`. The `azure/load-testing@v1` action runs Azure Load Testing tests after `azure/login`.

> **Exam trap.** `PublishTestResults@2` placed after a failing test step doesn't run with the default condition, so no results are published. Use `condition: succeededOrFailed()` (or `always()`).

<!-- section: code-coverage | objectives: 3.2.4 -->
## Implementing code coverage analysis

Code coverage measures the share of lines (or branches) executed by tests. Use it to find untested code and to stop coverage from dropping, not as a quality score on its own.

Collecting coverage:

| Stack | Command or setting | Output |
| --- | --- | --- |
| .NET with coverlet | `dotnet test --collect "XPlat Code Coverage"` | Cobertura XML |
| .NET with Microsoft code coverage | `dotnet test --collect "Code coverage"` (VSTest), `--coverage` (Microsoft.Testing.Platform), or `codeCoverageEnabled: true` in `VSTest@3` | `.coverage` |
| Java | JaCoCo (Maven or Gradle plugin) | JaCoCo XML |
| JavaScript | Jest or Istanbul (`--coverage`) | Cobertura or LCOV |

Publishing in Azure Pipelines: `PublishCodeCoverageResults@2` accepts the common formats (`.coverage`, Cobertura and JaCoCo XML, LCOV and others), merges several summary files, and produces the **Code Coverage** tab with an HTML report. Set `failIfCoverageEmpty: true` to catch a broken collection. Learn lists the Use .NET Core task (`UseDotNet@2`) as a prerequisite, earlier in the pipeline.

```yaml
steps:
  - task: DotNetCoreCLI@2
    inputs:
      command: test
      projects: '**/*Tests.csproj'
      arguments: '--configuration Release --collect "XPlat Code Coverage"'
  - task: PublishCodeCoverageResults@2
    inputs:
      summaryFileLocation: '$(Agent.TempDirectory)/**/coverage.cobertura.xml'
      failIfCoverageEmpty: true
```

**Coverage as a pull request gate in Azure Repos.** When the pipeline run by build validation publishes coverage, Azure DevOps posts a **diff coverage** status: the share of **changed lines** covered by tests, 70% by default. It works for Azure Repos only, and Learn's FAQ lists the Visual Studio `.coverage` format (from `VSTest@3` or `dotnet test --collect "Code coverage"`) as the supported input. Configure it in `azurepipelines-coverage.yml` at the repository root, and make it blocking with a branch policy **status check** on `<pipeline name>/codecoverage`. Without that policy, the status is advisory. The policy gets stuck with PublishCodeCoverageResults v1, with more than 100 files in the pull request or with several coverage policies, and in a multi-stage pipeline coverage results are available only after the whole run completes.

```yaml
# azurepipelines-coverage.yml
coverage:
  status:
    comments: on   # per-file coverage details as pull request comments
    diff:
      target: 80%
```

**GitHub.** Actions doesn't compute coverage itself: run the coverage tool in the workflow and fail the job below a threshold, or publish the report with a reporting action. GitHub Code Quality adds a **Restrict code coverage** ruleset rule (minimum line coverage, maximum drop compared with the default branch), in public preview.

> **Exam trap.** The pull request coverage status is **diff** coverage (changed lines), not the coverage of the whole code base, and it doesn't block anything until a branch policy requires it.

<!-- section: key-points -->
## Key points

- YAML deployment gates are checks on environments and other resources: approvals, branch control, business hours, required template, Azure Function, REST API, Azure Monitor alerts, exclusive lock.
- Classic release pipelines: pre- and post-deployment gates including Query work items and Check Azure Policy compliance. GitHub: environment protection rules (reviewers, wait timer, branches, custom GitHub App rules).
- Test pyramid: many unit tests, fewer integration tests, few UI and load tests; Azure Load Testing fail criteria make performance a gate.
- `DotNetCoreCLI@2` and `VSTest@3` publish results; other runners need `PublishTestResults@2` with `succeededOrFailed()`.
- Self-hosted test agents need the tools (Test Platform Installer); UI tests need an interactive agent; `strategy: parallel` distributes tests.
- `PublishCodeCoverageResults@2` for reports; diff coverage on pull requests (70% default) blocks only with a status check policy.
