Troubleshooting questions give a symptom (a pipeline stage that fails, a stack stuck in a rollback state, tasks that keep stopping, instances that never become healthy) and ask for the fastest way to find the cause or the right fix. Know which tool holds which evidence, where each deployment service writes its errors, and the handful of failure modes that recur in every exam.

<!-- section: metrics-logs-tools | objectives: 5.3.1 -->
## Metrics, logs and traces for troubleshooting

| Question you need answered | Tool |
| --- | --- |
| When did latency or errors start, and on which resource? | CloudWatch metrics and dashboards, metric math, anomaly detection bands |
| Which log lines explain the errors? | CloudWatch Logs Insights queries across one or more log groups |
| Which callers, URLs or IP addresses generate most errors? | CloudWatch Contributor Insights rules on log groups |
| Which downstream call in a distributed request is slow or failing? | AWS X-Ray traces and trace map; CloudWatch Application Signals service map and SLOs |
| Container or cluster resource pressure? | CloudWatch Container Insights (ECS, EKS) |
| Lambda cold starts and memory use? | Lambda Insights, function logs and the `REPORT` line |
| Is traffic reaching the instance or being rejected? | VPC Flow Logs (`ACCEPT` / `REJECT`), load balancer access logs |
| Who changed what? | CloudTrail event history and trails |
| What did the resource look like before? | AWS Config configuration timeline |

A Logs Insights query to find the noisiest errors in the last hour:

```text
fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) as errors by bin(5m), @logStream
| sort errors desc
| limit 20
```

Tracing: X-Ray stores and displays traces; to **instrument** new code, use AWS Distro for OpenTelemetry (ADOT) or the CloudWatch agent with Application Signals. The X-Ray SDKs and daemon are in maintenance mode, so they are not the answer for a new instrumentation design. Lambda, API Gateway and CloudWatch Synthetics can send traces with active tracing turned on.

> **Exam trap.** Metrics tell you that something is wrong and when; logs tell you what; traces tell you where in a call chain. A question about "which microservice adds the latency" wants traces, not more metrics.

<!-- section: service-health | objectives: 5.3.2 -->
## Service health: AWS Health, CloudWatch and OpsCenter

Before debugging your own code, rule out an AWS-side event.

| Source | What it gives |
| --- | --- |
| AWS Health Dashboard, service health | Public events about AWS services in a Region |
| AWS Health Dashboard, your account health | Account-specific events: issues affecting your resources, scheduled changes (instance retirement, maintenance), notifications |
| AWS Health organizational view | Events of every account in the organization, from the management account or a delegated administrator; kept for 90 days |
| EventBridge (`aws.health` source) | Health events as triggers for notifications or runbooks |

```json
{
  "source": ["aws.health"],
  "detail-type": ["AWS Health Event"],
  "detail": {
    "service": ["EC2"],
    "eventTypeCategory": ["scheduledChange"]
  }
}
```

**Systems Manager OpsCenter** gives operators one place to investigate and resolve operational issues as **OpsItems**. OpsItems are created from CloudWatch alarms entering `ALARM`, from EventBridge events (Auto Scaling launch failures, Automation failures, AWS Health scheduled events, Security Hub CSPM findings), from CloudWatch Application Insights, or manually. An OpsItem shows the related resources with their configuration and CloudTrail context, and offers **Automation runbooks** to remediate from the OpsItem itself. Systems Manager **Explorer** summarizes OpsItems, patch and compliance data across accounts and Regions.

> **Exam tip.** AWS Systems Manager Incident Manager is closed to new customers. For a new design that tracks and remediates operational issues, use CloudWatch alarms and EventBridge feeding OpsCenter OpsItems with Automation runbooks, and notifications through SNS.

<!-- section: root-cause-analysis | objectives: 5.3.3 -->
## Root cause analysis

Work from the symptom to the change that caused it:

1. **Scope**: which resources, Regions and accounts are affected, since when (metrics, alarms, AWS Health).
2. **Correlate with changes**: deployments (CodePipeline and CodeDeploy history), configuration changes (Config timeline), API calls (CloudTrail), scaling activities.
3. **Locate**: traces for the failing hop, logs for the error message, Flow Logs for network rejects.
4. **Fix and prevent**: roll back or roll forward, then add the guardrail (alarm, Config rule, test in the pipeline) so it cannot recur silently.

| Evidence | Where | Retention to remember |
| --- | --- | --- |
| Management API calls | CloudTrail event history | 90 days in the console, per Region, without a trail; a trail to S3 for longer |
| Resource configuration history | AWS Config | As long as the configured retention period |
| Scaling decisions and failed launches | Auto Scaling activity history (`describe-scaling-activities`) | |
| Stopped ECS tasks | ECS console | Stopped tasks appear in the console for one hour |
| Organization Health events | Health organizational view | 90 days |

> **Exam trap.** "The application started failing after Tuesday's change, find who made it" is answered by CloudTrail (who called which API) combined with the Config timeline (what changed on the resource), not by CloudWatch metrics.

<!-- section: failed-deployments | objectives: 5.3.4 -->
## Analyzing failed deployments

**AWS CodePipeline.** The execution view shows the failed stage and action, with a link to the provider's details (CodeBuild logs, CodeDeploy deployment, CloudFormation events). Recovery options:

- **Retry stage** (`ALL_ACTIONS`) or **Retry failed actions** (`FAILED_ACTIONS`) without rerunning the pipeline: `aws codepipeline retry-stage-execution --retry-mode FAILED_ACTIONS`. Not possible if the pipeline structure changed after the failure.
- **Automatic retry on stage failure**: one automatic retry attempt, configured per stage (`onFailure` result `RETRY`). It cannot be combined with `onFailure` conditions.
- **Stage rollback**, manual or automatic (`onFailure` result `ROLLBACK`), re-runs the stage with the artifacts and variables of an execution that succeeded in that stage. A source stage cannot be rolled back.
- **Stage conditions**: an `onSuccess` condition with a `CloudWatchAlarm` rule can roll back a deployment that succeeded technically but triggered an alarm; a `beforeEntry` condition can block a stage outside a `DeploymentWindow`.

**AWS CodeBuild.** Build logs go to CloudWatch Logs and optionally S3; the build detail shows which phase failed (`INSTALL`, `PRE_BUILD`, `BUILD`, `POST_BUILD`, `UPLOAD_ARTIFACTS`). A command with a non-zero exit code fails its phase. Common causes: the service role lacks permissions (ECR push, S3 artifact bucket, KMS key, Secrets Manager), a build in a VPC has no route to the internet or VPC endpoints, Docker builds need privileged mode. To debug interactively, enable the session connection and add `codebuild-breakpoint` in the buildspec, connect with Session Manager, then run `codebuild-resume` (not available in Windows environments).

**AWS CodeDeploy (EC2 and on-premises).**

| Log | Linux path |
| --- | --- |
| Agent log | `/var/log/aws/codedeploy-agent/codedeploy-agent.log` |
| Deployment log | `/opt/codedeploy-agent/deployment-root/deployment-logs/codedeploy-agent-deployments.log` |
| Hook scripts output | `/opt/codedeploy-agent/deployment-root/deployment-group-ID/deployment-ID/logs/scripts.log` |

| Symptom | Cause and fix |
| --- | --- |
| Every deployment fails at `ApplicationStop`, even with a fixed revision | `ApplicationStop`, `BeforeBlockTraffic` and `AfterBlockTraffic` run the scripts of the **last successful** revision. Redeploy with `--ignore-application-stop-failures` |
| `AllowTraffic` fails with nothing in the logs | Load balancer health check misconfigured (path, port, codes) |
| `Missing credentials` in the agent log | No instance profile, or it lacks permissions to the revision bucket |
| Lifecycle events skipped, `HEALTH_CONSTRAINTS` | Agent not running, no HTTPS path to CodeDeploy and S3, wrong clock, service role permissions |
| `Script ... failed to complete in 60 seconds` | Script exceeded its appspec `timeout`, or a background process kept stdout open: redirect its output |
| Instance not in the deployment | Tag or Auto Scaling group not matching the deployment group; new tags take a few minutes to be seen |
| Deployment hangs about one hour | An instance terminated or the agent stopped during a hook; each lifecycle event has a one-hour limit |

For ECS and Lambda deployments there is no agent log: look at the deployment's lifecycle hook Lambda functions, the CloudWatch alarms attached to the deployment group, and automatic rollback events.

**AWS CloudFormation.** Read the **stack events** and the status reason of the first `*_FAILED` event; the following failures are usually consequences.

| State or symptom | Action |
| --- | --- |
| `UPDATE_ROLLBACK_FAILED` | Fix the cause (out-of-band change, missing permission, quota), then `continue-update-rollback`; if a resource cannot roll back, add `--resources-to-skip` (skipped resources no longer match the template) |
| `DELETE_FAILED` | Empty or release the blocking resource (non-empty S3 bucket, security group in use), or delete again with `--retain-resources` |
| `CREATE_FAILED` on an instance with a creation policy or wait condition | `cfn-signal` never arrived: helper scripts missing, script error, no internet or endpoint path. Disable rollback on failure to keep the instance and read `/var/log/cfn-init.log` and `/var/log/cloud-init.log` |
| Change fails on a resource modified by hand | Drift: run drift detection, bring the resource back in line or update the template |

```bash
aws cloudformation describe-stack-events --stack-name app-prod \
  --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatusReason]" \
  --output table
aws cloudformation continue-update-rollback --stack-name app-prod \
  --resources-to-skip LegacyQueue
```

**CloudWatch Synthetics.** Canaries are scripts (Node.js, Python or Java, with Playwright, Puppeteer or Selenium for browser checks) that run on a schedule as often as once a minute, and publish metrics in the `CloudWatchSynthetics` namespace. A failed run keeps its artifacts (logs, screenshots) for diagnosis. In a pipeline, an alarm on canary metrics after a deployment is the classic trigger for rollback.

> **Exam trap.** A stack in `UPDATE_ROLLBACK_FAILED` cannot be updated or deleted normally: the answer is `continue-update-rollback`, not deleting and recreating a production stack.

<!-- section: failed-processes | objectives: 5.3.5 -->
## Analyzing failed processes: Auto Scaling, ECS and EKS

**EC2 Auto Scaling.** Start with the activity history (`aws autoscaling describe-scaling-activities`): each failed launch has a status message.

| Message | Cause |
| --- | --- |
| `Client.InternalError: Client error on launch` | The Auto Scaling service-linked role cannot use the customer managed KMS key that encrypts the EBS volumes: add it to the key policy, or a grant for a cross-account key |
| `We currently do not have sufficient ... capacity` | Insufficient capacity in the AZ: add AZs or diversify instance types |
| `The security group ... does not exist` or `The key pair ... does not exist` | Launch template references a deleted resource |
| `The requested configuration is currently not supported` | Incompatible AMI and instance type (for example an x86 AMI on Graviton) |
| `... instance(s) are already running` | EC2 quota reached in the Region |

Instances that launch and are terminated in a loop usually fail ELB health checks before the application is ready: the **health check grace period** defaults to 300 seconds in the console but 0 seconds through the CLI or SDK. Instances stuck in `Pending:Wait` are waiting for a lifecycle hook that nobody completes.

**Amazon ECS.** Use `aws ecs describe-tasks` on stopped tasks and read `stopCode`, `stoppedReason` and `containers[].reason`, plus the **service events**.

| Stop reason | Usual cause |
| --- | --- |
| `CannotPullContainerError` | Wrong image URI or tag, no route to the registry (private subnet without NAT or ECR VPC endpoints), task execution role cannot pull |
| `ResourceInitializationError` | Cannot retrieve secrets or parameters, cannot reach the log configuration, missing task execution role permissions |
| `OutOfMemoryError` | Container exceeded its hard memory limit |
| Essential container exited | The application crashed: read its logs |
| Task failed ELB health checks | Wrong health check path or port, or the app starts slower than the service's health check grace period |
| `TaskFailedToStart` | No capacity, CPU or memory, or ENI and IP limits for `awsvpc` tasks |

The **deployment circuit breaker** stops a rolling deployment whose tasks keep failing and, with rollback enabled, returns the service to the last completed deployment.

> **Exam trap.** The *task execution role* is used by ECS to pull images, read secrets and send logs; the *task role* is used by the application code. A `CannotPullContainerError` or a secret retrieval failure points to the execution role, an `AccessDenied` from the application points to the task role.

**Amazon EKS.**

| Symptom | Check |
| --- | --- |
| Pod `Pending` | Insufficient node capacity, unsatisfiable node selectors or taints, no free IP addresses in the subnets (VPC CNI) |
| `ImagePullBackOff` | Image name, registry permissions of the node role, network path to the registry |
| `CrashLoopBackOff` | Application failure: `kubectl logs --previous`, probes, configuration |
| Nodes do not join | Missing access entry (or `aws-auth` mapping) for the node role, wrong cluster name in bootstrap, no route to the API endpoint or STS |
| `kubectl` returns `Unauthorized` | The IAM principal has no access entry or mapping |
| Cluster-level issue | Cluster health issues in `describe-cluster` (`IP_NOT_AVAILABLE`, `KMS_KEY_DISABLED`, `ASSUME_ROLE_ACCESS_DENIED`) |

The Systems Manager runbook `AWSSupport-TroubleshootEKSWorkerNode` diagnoses nodes that fail to join.

<!-- section: key-points -->
## Key points

- Metrics show when, logs show what, traces show where; CloudTrail and the Config timeline show who changed what.
- Check AWS Health (account and organizational views, `aws.health` events) before blaming the application.
- OpsCenter OpsItems plus Automation runbooks replace Incident Manager for new designs.
- CodeDeploy `ApplicationStop` runs the previous revision's scripts; fix with `--ignore-application-stop-failures`.
- CloudFormation: first failed event is the cause; `UPDATE_ROLLBACK_FAILED` needs `continue-update-rollback`; disable rollback to inspect a failed instance.
- Auto Scaling launch failures are in the activity history; an encrypted-EBS launch failure points to the KMS key policy for the service-linked role.
- ECS: execution role for pulling and secrets, task role for the code; circuit breaker rolls back failing deployments.
