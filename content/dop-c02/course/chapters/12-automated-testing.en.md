Testing questions ask where a given test belongs in a pipeline, how to start it on the right event, how a pass or a failure is detected and reported, and which AWS service runs it with the least effort. The scenarios add constraints such as "block the merge until tests pass", "fail the build below 80 percent coverage", "simulate 50,000 users from three Regions" or "stop the release if the new version is unhealthy". This chapter covers test types, their place in the pipeline, pull request builds, load and performance testing, exit codes as health signals, unit tests with code coverage, and the AWS services a pipeline invokes to test.

<!-- section: test-types | objectives: 1.2.1 -->
## Types of tests

| Test type | What it checks | Typical tool on AWS |
| --- | --- | --- |
| Unit | One function or class in isolation, dependencies mocked; seconds | Framework (pytest, JUnit, Jest) run in CodeBuild with a test report |
| Static analysis and linting | Code style, bugs and insecure patterns without running the code (SAST) | Linters and scanners in CodeBuild; Amazon Inspector code security |
| Software composition analysis | Known vulnerabilities in third-party dependencies | Amazon Inspector (SBOM scan, CodePipeline `InspectorScan` action) |
| Infrastructure as code checks | Template syntax and policy rules before deployment | `cfn-lint`, CloudFormation Guard, `cdk diff`, change sets |
| Container image scan | OS and language package vulnerabilities in an image | Amazon ECR scanning (enhanced scanning uses Amazon Inspector) |
| Integration | Components working together with real dependencies (database, queue, API) | CodeBuild in the VPC against a test stack |
| Acceptance (UAT) | The release meets business requirements; often the gate to production | Automated acceptance suites, then a manual approval action |
| User interface (end to end) | User journeys through a browser or a device | Headless browsers in CodeBuild, CloudWatch Synthetics canaries, AWS Device Farm |
| Smoke | A deployed version starts and answers basic requests | CodeDeploy `ValidateService` or `AfterAllowTraffic` hooks, a canary |
| Load, stress, performance | Behavior and latency under expected, peak and breaking load | Distributed Load Testing on AWS, tools such as JMeter, k6 or Locust |
| Dynamic security (DAST) | A running application probed for vulnerabilities | Scanners run against the staging endpoint from CodeBuild |
| Resilience (chaos) | Recovery when instances, AZs or dependencies fail | AWS Fault Injection Service with CloudWatch alarm stop conditions |

> **Exam trap.** Amazon Inspector Classic assessment templates and Amazon CodeGuru Security are no longer available, and CodeGuru Reviewer accepts no new repository associations. A current design scans code and dependencies with Amazon Inspector or with a scanner run in CodeBuild, and scans images with ECR enhanced scanning.

<!-- section: tests-by-stage | objectives: 1.2.2 -->
## Placing tests at the right pipeline stage

The rule is **fail fast and cheap**: the fastest, most numerous tests run first, the slow and expensive ones run later on fewer builds (the test pyramid). Each stage gates the next one.

```text
Pull request / commit  ->  lint, unit tests, SAST, dependency scan, cfn-lint      (minutes, every change)
Build stage            ->  compile, package, image build, image scan, SBOM          (once per artifact)
Test environment       ->  integration, API contract, DAST, UI tests                 (ephemeral or shared test stack)
Staging (prod-like)    ->  acceptance, load and performance, resilience experiments  (release candidates only)
Production             ->  smoke tests, canary traffic, synthetic monitoring         (with alarm-based rollback)
```

| Requirement | Placement |
| --- | --- |
| Developers must learn about broken code before merging | Unit tests and static analysis on pull request events |
| Integration tests must not touch production data | A dedicated test account or an ephemeral stack created by CloudFormation, deleted after the run |
| Performance must be compared with the previous release | Load tests in a production-like staging environment, results compared with a stored baseline |
| A release must be validated with real users before full rollout | Canary or linear deployment with CloudWatch alarms and automatic rollback |
| Production must be checked continuously after the release | CloudWatch Synthetics canaries and alarms |

Professional scenarios add multi-account placement: tests run in the test and staging accounts through cross-account roles, never with production credentials. The same artifact moves from stage to stage; only its configuration changes.

> **Exam trap.** Running a 2-hour load test or a full UI suite on every commit slows feedback and costs money; running only unit tests before production misses integration defects. The correct option distributes the tests: fast tests on every change, expensive tests on release candidates.

<!-- section: pull-request-builds | objectives: 1.2.3 -->
## Running builds and tests on pull requests and merges

**CodeBuild webhooks** start a build directly from GitHub, GitHub Enterprise Server, GitLab or Bitbucket events, without a pipeline. Event types: `PUSH`, `PULL_REQUEST_CREATED`, `PULL_REQUEST_UPDATED`, `PULL_REQUEST_REOPENED` (GitHub and GitHub Enterprise Server only), `PULL_REQUEST_MERGED`, `PULL_REQUEST_CLOSED`, `RELEASED`, `PRERELEASED` and `WORKFLOW_JOB_QUEUED`. Filters (regular expressions) include `HEAD_REF`, `BASE_REF` (pull request events only), `FILE_PATH`, `COMMIT_MESSAGE` and `ACTOR_ACCOUNT_ID`. All filters of a group must match (AND); the build starts if any group matches (OR).

```bash
aws codebuild create-webhook --project-name orders-pr-checks \
  --filter-groups '[[{"type":"EVENT","pattern":"PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED"},{"type":"BASE_REF","pattern":"^refs/heads/main$"}],[{"type":"EVENT","pattern":"PUSH"},{"type":"HEAD_REF","pattern":"^refs/heads/main$"}]]'
```

The first group builds pull requests that target `main`; the second builds merges (pushes) to `main`. For a pull request build from GitHub, `CODEBUILD_SOURCE_VERSION` is `pr/` followed by the pull request number. CodeBuild can report the build status back to the provider, so a branch protection rule can block the merge until the check passes.

The **pull request build policy** protects public repositories: by default, pull requests from contributors without an approver role (for example `GITHUB_WRITE` or above) are not built until a trusted member comments `/codebuild_run(<latest-commit-SHA>)` on the pull request. The setting `requiresCommentApproval` takes `DISABLED`, `FORK_PULL_REQUESTS` or `ALL_PULL_REQUESTS`.

Other ways to test pull requests:

| Source | Mechanism |
| --- | --- |
| Connection source in CodePipeline V2 | A pull request trigger (`OPEN`, `UPDATED`, `CLOSED`) on a pipeline that runs build and test stages; the execution uses the source branch commit. Use PARALLEL execution mode so that pull requests don't supersede each other |
| AWS CodeCommit | An EventBridge rule on `CodeCommit Pull Request State Change` with the events `pullRequestCreated` and `pullRequestSourceBranchUpdated` starts a CodeBuild build; a Lambda function (or the build itself) posts the result as a pull request comment or approval |

> **Exam tip.** "Validate every pull request before it can be merged, with the least operational overhead" on GitHub points to a CodeBuild webhook with pull request events and status reporting, not to a pipeline per branch or a polling script. On CodeCommit, the answer is the EventBridge rule on pull request events.

<!-- section: load-testing | objectives: 1.2.4 -->
## Load, stress and performance testing at scale

| Goal | Test | What to measure |
| --- | --- | --- |
| Confirm the application meets its latency and throughput targets at expected load | Load test | p95 and p99 latency, error rate, throughput |
| Find the breaking point and the failure mode | Stress test | The load at which errors or latency exceed the target, recovery afterwards |
| Detect regressions between releases | Performance benchmark | The same scenario compared with the previous release's baseline |
| Validate scaling | Load ramp | Auto Scaling activities, time to scale, warm pools, database connections |
| Validate recovery | Resilience experiment | Alarms, failover time, customer impact during the fault |

**Distributed Load Testing on AWS** is an AWS Solution deployed in your account with CloudFormation. It runs JMeter, k6 or Locust scripts (or a single HTTP endpoint test) in containers on AWS Fargate, from several Regions at once, can schedule recurring tests with EventBridge Scheduler, stores results in S3 and DynamoDB, and offers a console and a CLI usable from a pipeline. It avoids building and maintaining a fleet of load generators on EC2.

**AWS Fault Injection Service** runs experiments from a template of actions (for example stop instances, inject CPU stress, throttle API calls), targets selected by ID, tag or state, and **stop conditions** defined as CloudWatch alarms that halt the experiment. Run experiments in pre-production first; FIS acts on real resources.

**CloudWatch Synthetics canaries** run scripted checks on a schedule against endpoints and user journeys; their metrics and alarms can gate a deployment or trigger a rollback.

Rules for testing at scale: test in a production-like environment (same instance types, Auto Scaling settings and database class), use realistic data and think times, ramp the load gradually, watch the backend (database, queues, downstream quotas) and not only the front end, and compare against a baseline with a pass or fail threshold so that the pipeline can decide automatically.

> **Exam trap.** A load test run from a single CodeBuild container measures the generator's limits, not the application's. For high concurrency from several Regions with the least operational overhead, the answer is Distributed Load Testing on AWS, not a self-built EC2 fleet.

<!-- section: exit-codes | objectives: 1.2.5 -->
## Measuring health with exit codes

Automation decides "healthy or not" from exit codes: `0` means success, any non-zero value means failure. Where the exam uses them:

| Where | How the exit code is used |
| --- | --- |
| CodeBuild commands | A non-zero exit code fails the phase and the build; the pipeline action fails |
| CodeDeploy EC2/On-premises hooks | A script that exits non-zero, or exceeds its timeout (3,600 seconds by default and at most), fails the lifecycle event and the deployment, which can roll back |
| ECS container health check | The `healthCheck` command returns `0` for healthy; if an essential container is unhealthy, the service replaces the task |
| CloudFormation helper scripts | `cfn-signal -e $?` sends the exit code of the bootstrap commands; a failure signal or no signal before the `CreationPolicy` timeout fails the resource |
| Systems Manager Run Command | A non-zero exit code marks the command invocation `Failed` |
| EC2 Image Builder test components | A failing step fails the test stage; the image is distributed only if all tests succeed |
| Kubernetes probes | An `exec` liveness or readiness probe that exits non-zero marks the container unhealthy |

Lambda validation functions have no exit code: a CodeDeploy hook function reports `Succeeded` or `Failed` with `PutLifecycleEventHookExecutionStatus` (within one hour), and a CodePipeline Lambda action calls `PutJobSuccessResult` or `PutJobFailureResult`.

```json
{
  "name": "api",
  "essential": true,
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

ECS defaults: interval 30 seconds (5 to 300), timeout 5 seconds (2 to 60), retries 3 (1 to 10), `startPeriod` off (0 to 300 seconds) to give a slow application time to start.

```yaml
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash
    /opt/aws/bin/cfn-init -v --stack ${AWS::StackName} --resource AppInstance --region ${AWS::Region}
    /opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AppInstance --region ${AWS::Region}
```

> **Exam trap.** A script whose last command always succeeds hides failures: `pytest | tee results.txt` returns the exit code of `tee`, so the build passes with failing tests. Use `set -o pipefail` or check the test command's own exit code. Likewise, a health check that only tests that the process exists returns `0` while the application is broken; check an endpoint that exercises dependencies.

<!-- section: unit-tests-coverage | objectives: 1.2.6 -->
## Automating unit tests and code coverage

CodeBuild **reports** turn test output files into report groups visible in the console, with pass and fail counts and history. Each report group can be exported to S3, and raw reports expire after 30 days. A project can send reports to at most five report groups.

| Report kind | `file-format` values |
| --- | --- |
| Test reports | `JUNITXML` (default), `NUNITXML`, `NUNIT3XML`, `TESTNGXML`, `CUCUMBERJSON`, `VISUALSTUDIOTRX` |
| Code coverage reports | `JACOCOXML`, `COBERTURAXML`, `CLOVERXML`, `SIMPLECOV`; LCOV INFO is also accepted |

Coverage reports show **line coverage** (lines covered divided by total lines) and **branch coverage** (branches covered divided by total branches).

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      python: 3.12
  build:
    commands:
      - pip install -r requirements.txt pytest pytest-cov
      - python -m pytest tests/unit --junitxml=reports/unit.xml --cov=src --cov-report=xml:reports/coverage.xml --cov-fail-under=80
reports:
  unit-tests:
    files:
      - unit.xml
    base-directory: reports
    file-format: JUNITXML
  coverage:
    files:
      - coverage.xml
    base-directory: reports
    file-format: COBERTURAXML
```

Facts the exam relies on:

- CodeBuild reports are informational; **CodeBuild has no built-in coverage threshold**. The quality gate is the test tool's own option (`--cov-fail-under`, a JaCoCo check rule) returning a non-zero exit code, which fails the build.
- Report files are uploaded even when the tests fail, so developers see which tests broke.
- Large suites run faster with a **batch build fanout**: `build-fanout` with `parallelism` splits the tests into shards that run in parallel builds.
- A report group name in the buildspec creates a group named after the project and the report name; an ARN reuses an existing group.

> **Exam trap.** "Fail the pipeline when coverage drops below 80 percent" is not a report group setting or a CloudWatch alarm on report metrics; it is the coverage tool's threshold in the build command. The report group then shows why the build failed.

<!-- section: aws-services-testing | objectives: 1.2.7 -->
## Invoking AWS services in a pipeline for testing

| CodePipeline action | Category | Use for testing |
| --- | --- | --- |
| AWS CodeBuild | Build or Test | Any test suite; reports; access to VPC resources |
| Commands | Compute | A few shell commands without a CodeBuild project; V2 pipelines only, CodePipeline managed CodeBuild compute, 55-minute timeout, single-line commands |
| AWS Lambda | Invoke | Custom checks (call an endpoint, verify a deployment, compare metrics); the function calls `PutJobSuccessResult` or `PutJobFailureResult` with the job ID; a continuation token lets long checks resume across invocations |
| AWS Step Functions | Invoke | A multi-step test workflow (create test data, run checks in parallel, clean up); the action follows the state machine execution |
| Amazon Inspector `InspectorScan` | Invoke | `SourceCodeScan` of the source artifact or `ECRImageScan` of an image; fails when findings exceed `CriticalThreshold`, `HighThreshold`, `MediumThreshold` or `LowThreshold`; outputs an SBOM |
| AWS Device Farm | Test | Mobile and web app tests on real devices |
| CloudFormation | Deploy | Create an ephemeral test stack before the tests and delete it afterwards (`DELETE_ONLY` action mode) |
| Manual approval | Approval | A human reviews test results (a review URL in the SNS notification); fails after 7 days without a response |

```yaml
- Name: ScanImage
  ActionTypeId:
    Category: Invoke
    Owner: AWS
    Provider: InspectorScan
    Version: '1'
  Configuration:
    InspectorRunMode: ECRImageScan
    ECRRepositoryName: orders-api
    ImageTag: '#{BuildVariables.IMAGE_TAG}'
    CriticalThreshold: '0'
    HighThreshold: '5'
  OutputArtifacts:
    - Name: ScanSbom
  RunOrder: 1
```

A CodeBuild test stage can also call AWS services itself through its service role: start an AWS FIS experiment (`aws fis start-experiment`), run an ECS task that executes integration tests, query CloudWatch metrics to compare latency with a baseline, or invoke a deployed Lambda function. Give the role only those permissions, in the test account.

> **Exam trap.** A Lambda function invoked by CodePipeline that ends without calling `PutJobSuccessResult` or `PutJobFailureResult` leaves the action running until it times out; returning from the handler is not enough. For a cross-Region Lambda action, the result is sent to the Region of the function, not of the pipeline.

<!-- section: key-points -->
## Key points

- Test types: unit, static analysis, dependency and image scans, IaC checks, integration, acceptance, UI, smoke, load and stress, DAST, resilience with AWS Fault Injection Service.
- Fail fast: cheap tests on every change, expensive tests on release candidates in a production-like environment, smoke tests and canaries in production with alarm rollback.
- CodeBuild webhooks: pull request and push events, filter groups (AND inside, OR between), status reporting, pull request build policy with `/codebuild_run(...)` approval. CodeCommit pull requests go through EventBridge.
- Load at scale: Distributed Load Testing on AWS (JMeter, k6, Locust on Fargate, multi-Region); FIS with alarm stop conditions; Synthetics canaries.
- Exit code `0` is healthy: CodeBuild commands, CodeDeploy hook scripts, ECS health checks, `cfn-signal -e $?`, Run Command; beware pipes that mask exit codes.
- CodeBuild reports: test and coverage formats, 30-day retention, export to S3; coverage thresholds belong to the test tool.
- Pipeline test actions: CodeBuild, Commands (V2), Lambda with `PutJobSuccessResult` or `PutJobFailureResult`, Step Functions, `InspectorScan` with severity thresholds, Device Farm, ephemeral CloudFormation stacks, manual approval.
