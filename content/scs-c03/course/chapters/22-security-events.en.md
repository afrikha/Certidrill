When a security event is under way, the questions are practical: which evidence must be captured before it disappears, where the logs that tell the story are and how to join them, whether the finding is real and how far it reaches, how to stop the attacker without destroying evidence or the business, and finally why it happened. The exam rewards the answer that preserves evidence, contains with the least collateral impact, and uses managed services for correlation rather than custom tooling.

<!-- section: forensic-artifacts | objectives: 2.2.1 -->
## Capturing and storing forensic artifacts

Collect in **order of volatility**: what disappears first is captured first.

| Artifact | How to capture it | Note |
| --- | --- | --- |
| Memory (processes, network connections, keys in RAM) | Memory acquisition tool run through Systems Manager Run Command, or the forensics orchestrator | Lost on stop, reboot or termination: capture before anything else changes the instance |
| Instance metadata and state | `describe-instances`, console output and screenshot, attached roles, security groups, ENIs, tags | Record before modifying anything |
| Disk | EBS snapshots of every volume (`CreateSnapshots` for all volumes of an instance at once), shared with or copied to the forensic account | Snapshots encrypted with the default AWS managed key cannot be shared: copy them with a customer managed key first |
| AWS API activity | CloudTrail organization trail (management events, plus data events for S3, Lambda or DynamoDB where enabled) | Enable log file integrity validation |
| Network | VPC Flow Logs, Route 53 Resolver query logs, ELB, CloudFront and WAF logs | Flow Logs record metadata, not packet contents |
| OS and application logs | CloudWatch agent to CloudWatch Logs, EKS control plane audit logs | Logs left only on the instance can be altered by the attacker |

```bash
aws ec2 create-snapshots \
  --instance-specification InstanceId=i-0abcd1234ef56789 \
  --description "IR-2026-117 evidence" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=case,Value=IR-2026-117}]' \
  --copy-tags-from-source volume
aws ec2 modify-snapshot-attribute --snapshot-id snap-0123456789abcdef0 \
  --attribute createVolumePermission --operation-type add --user-ids 444455556666
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail \
  --start-time 2026-11-20T00:00:00Z
```

**Integrity and chain of custody.** CloudTrail log file integrity validation hashes each log file with SHA-256 and delivers an hourly **digest file**, signed with SHA-256 with RSA and chained to the previous digest, in the same bucket; `validate-logs` proves that files were not modified or deleted. For other evidence, record a hash at acquisition, who collected it and when (tags, a case record), and store it in the forensic account.

**Evidence bucket**: versioning plus **S3 Object Lock** in **compliance mode** (no user, not even the root user, can delete or overwrite a locked version before its retention date) or **governance mode** (users with `s3:BypassGovernanceRetention` can override, sending `x-amz-bypass-governance-retention:true`); a **legal hold** has no expiry and stays until removed. Add SSE-KMS with a key restricted to responders, a bucket policy limited to the forensic roles, and S3 Glacier storage classes for long retention. Amazon Glacier vaults (and Vault Lock) no longer accept new customers: use S3 storage classes with Object Lock.

> **Exam trap.** Stopping or terminating a compromised instance "to be safe" destroys the memory evidence. The forensic order is isolate, capture memory, snapshot, then decide. Governance mode can be bypassed by privileged users; when the requirement says "no one can delete the evidence", the answer is compliance mode.

<!-- section: log-correlation | objectives: 2.2.2 -->
## Searching and correlating logs

| Need | Service |
| --- | --- |
| Interactive queries on logs already in CloudWatch Logs (application, VPC Flow Logs, Lambda) | CloudWatch Logs Insights |
| SQL over CloudTrail, VPC Flow Logs or ALB logs stored in S3, pay per data scanned | Amazon Athena (partition projection to limit the scan) |
| Normalized, multi-account security data lake | Amazon Security Lake (OCSF, Apache Parquet), queried by subscribers with Athena or OpenSearch |
| Dashboards, full-text search and alerting over large log volumes | Amazon OpenSearch Service |
| Visual investigation of entities and their interactions over time | Amazon Detective |
| Last 90 days of management events in one account and Region, no setup | CloudTrail event history |

**Amazon Security Lake** collects natively CloudTrail management and data events, EKS audit logs, Route 53 Resolver query logs, Security Hub CSPM findings, VPC Flow Logs and AWS WAF logs, converts them to the **Open Cybersecurity Schema Framework (OCSF)** and stores them as Parquet in S3, partitioned and managed with Lake Formation and Glue. A common schema is what makes correlation across sources possible: the same field names for IP addresses, principals and times.

**CloudTrail Lake** is no longer open to new customers since **May 31, 2026** (existing customers continue; trails, Insights and Aggregated Events are unaffected). AWS points to CloudWatch for new designs: pipelines with managed OCSF transformations, Logs Insights with OpenSearch-powered query languages, cross-account and cross-Region log centralization.

Correlation keys to follow from one log to the next: the **access key ID** (`userIdentity.accessKeyId`), the role session name and `sourceIdentity`, the source IP address, the instance ID and ENI, the request ID, and timestamps normalized to UTC. Example: from a GuardDuty finding on an access key, list everything that key did.

```text
SELECT eventtime, eventsource, eventname, awsregion, sourceipaddress, errorcode
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIAIOSFODNN7EXAMPLE'
  AND eventtime BETWEEN '2026-11-19T00:00:00Z' AND '2026-11-21T00:00:00Z'
ORDER BY eventtime
```

> **Exam tip.** "Correlate logs from many accounts and from third-party sources in a common format, with the least custom work" is Security Lake (OCSF). "Ad hoc SQL over existing CloudTrail files in S3" is Athena. Do not choose CloudTrail Lake for a new solution.

<!-- section: finding-validation | objectives: 2.2.3 -->
## Validating findings and assessing scope

Each service proves something different; validate the finding with evidence from another source before acting at scale.

| Service | Its finding means | Validate and scope with |
| --- | --- | --- |
| GuardDuty | Suspicious activity or threat (API calls, network, DNS, runtime, malware) | CloudTrail records of the principal, Flow Logs, Detective profile |
| GuardDuty Extended Threat Detection | A multi-stage **attack sequence** correlated over a 24-hour rolling window, always **Critical** | The signals listed in the finding, each resource it names |
| Security Hub (new) | Correlated **exposure findings** (OCSF) with an attack path graph | The underlying CSPM, Inspector, GuardDuty, Macie findings |
| Security Hub CSPM | A control check failed (posture, not an attack) | The resource configuration and AWS Config timeline |
| Inspector | A known vulnerability or network reachability; Inspector score adjusts CVSS to the environment | Whether the package is really loaded, whether a path from the internet exists |
| Macie | Sensitive data in an object, or a bucket policy issue | Sample of the object, CloudTrail data events for access |
| IAM Access Analyzer | A resource is shared outside the zone of trust | Resource policy, intended sharing |

GuardDuty finding types read as `ThreatPurpose:ResourceTypeAffected/ThreatFamilyName.DetectionMechanism!Artifact`, for example `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` (instance role credentials used from outside AWS). Severity: low, medium, high and critical. Check the resource, the actor (IP, ASN, location), the first and last seen times and the count.

**Validation questions**: Is the activity explained by a change request, a penetration test or a scanner? Did the API calls succeed or return `AccessDenied` (reconnaissance)? Which other accounts and Regions show the same key, IP or user agent? Which data could the principal reach (Macie classification, CloudTrail data events)? The answers define the scope: affected identities, resources, data and time window.

**Confirmed false positive**: create a GuardDuty **suppression rule** (administrator account only) scoped to the known-good behavior, for example finding type plus image ID of a vulnerability scanner. Suppressed findings are still generated but archived, are not sent to Security Hub CSPM, S3, Detective or EventBridge, and are no longer used as signals for Extended Threat Detection.

> **Exam trap.** A broad suppression rule is not "least operational overhead": it hides signals needed to detect multi-stage attacks. Suppress only repeatedly confirmed false positives, as narrowly as possible. And a Security Hub CSPM control failure is a misconfiguration, not proof of compromise.

<!-- section: contain-recover | objectives: 2.2.4 -->
## Containing, eradicating and recovering

The guide's containment categories: **source** containment (filter or route traffic from the attacker), **technique and access** containment (remove the attacker's access) and **destination** containment (filter traffic to the target).

| Resource | Containment actions |
| --- | --- |
| EC2 instance | Tag it, enable termination protection, detach it from its Auto Scaling group, deregister it from target groups, replace its security groups with an isolation group, revoke its role sessions, keep it running for memory capture |
| IAM user access key | Deactivate the key (keep it for the investigation), attach a deny-all policy, review what the key created |
| IAM role | Revoke active sessions: IAM adds the inline policy `AWSRevokeOlderSessions`, a deny on `aws:TokenIssueTime` before the revocation time |
| S3 bucket | Block Public Access, a restrictive bucket policy, review access points and presigned URL signers |
| Lambda function | Reserved concurrency 0 to stop invocations, remove the function URL or resource policy, rotate the secrets it held |
| Network source | Network ACL deny for the source address, WAF IP set, Network Firewall rule, Route 53 Resolver DNS Firewall block of the domain |

```bash
aws ec2 modify-instance-attribute --instance-id i-0abcd1234ef56789 --disable-api-termination
aws autoscaling detach-instances --instance-ids i-0abcd1234ef56789 \
  --auto-scaling-group-name web-asg --no-should-decrement-desired-capacity
aws elbv2 deregister-targets --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web/0123456789abcdef \
  --targets Id=i-0abcd1234ef56789
aws ec2 modify-instance-attribute --instance-id i-0abcd1234ef56789 --groups sg-0f1e2d3c4b5a69788
aws iam update-access-key --user-name build-bot --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive
aws lambda put-function-concurrency --function-name export-orders --reserved-concurrent-executions 0
```

**Security groups are stateful**: removing a rule does not interrupt **tracked** connections already open; they continue until they time out. Only untracked flows (rules open to 0.0.0.0/0 or ::/0 in both directions) stop immediately. To cut existing sessions at once, add a **network ACL** deny on the subnet: network ACLs are stateless and break existing connections, but affect every instance in the subnet.

The role session revocation does not affect requests signed with long-term IAM user keys (`aws:TokenIssueTime` is absent from them), and roles created by IAM Identity Center permission sets are revoked in Identity Center, not in IAM.

**Eradication**: rebuild from a known-good AMI or image rather than cleaning a compromised host; rotate every credential and secret the attacker could have read; remove persistence (new IAM users, roles, access keys, Lambda functions, EventBridge rules, modified trust policies); check every Region, including unused ones; fix the vulnerability that allowed entry.

**Recovery**: restore data from AWS Backup (cross-account copies in a backup account or a logically air-gapped vault, Backup Vault Lock against deletion), previous S3 object versions, RDS point-in-time restore; redeploy infrastructure from IaC; watch the restored resources closely for reinfection.

> **Exam trap.** Moving an instance to an empty security group is not enough when the requirement is "terminate the attacker's existing session immediately": tracked connections survive. Add a network ACL deny. And deleting a compromised access key destroys evidence of what it was: deactivate it first.

<!-- section: root-cause | objectives: 2.2.5 -->
## Root cause analysis

Root cause analysis answers how the attacker got in, what they did, and which control failed. Methods: rebuild a **timeline** from the first malicious event (often the first use of a credential from a new IP or ASN), follow the **attack path** across identities and resources, and ask why repeatedly until reaching a control that can be fixed (a key committed to a repository, IMDSv1 allowing credential theft through SSRF, a security group open to the internet, an unpatched CVE).

**Amazon Detective** is built for this step:

- Builds a **behavior graph** from CloudTrail, VPC Flow Logs and GuardDuty findings, with up to **one year** of history; through Security Lake it can also query raw CloudTrail management events and Flow Logs.
- **Profiles** of each entity (IAM role, user, IP address, EC2 instance) show baselines and unusual activity, such as API calls from a new geolocation.
- **Finding groups** gather related findings and entities of one probable event, to trace back to the earliest finding.
- **Detective Investigation** analyzes an IAM user or role for indicators of compromise (`StartInvestigation`).
- Multi-account: an administrator account (delegated through Organizations) owns the behavior graph of all member accounts.

Useful CloudTrail fields: `userIdentity` (type, ARN, `sessionContext.sessionIssuer`), `sourceIPAddress`, `userAgent`, `errorCode`, `requestParameters`, `sourceIdentity` across role chains.

Close the loop with post-incident activity: a blameless review, new detections (GuardDuty, Config rules, CloudWatch alarms), preventive controls (SCPs, IMDSv2 enforcement, secrets scanning), and updated playbooks.

> **Exam tip.** "Identify the root cause of a GuardDuty finding by visualizing related activity over time, with no log pipeline to build" is Amazon Detective. Detective investigates; it does not generate the detection findings or remediate.

<!-- section: key-points -->
## Key points

- Order of volatility: memory, then instance state, then disk snapshots, then logs; evidence in a forensic account bucket with Object Lock compliance mode; CloudTrail digest files and `validate-logs` prove integrity.
- Correlate with Logs Insights, Athena, Security Lake (OCSF, Parquet) or OpenSearch; follow access key IDs, sessions, IPs and instance IDs. CloudTrail Lake is closed to new customers.
- Validate before acting: GuardDuty threats, Extended Threat Detection attack sequences, Security Hub exposures, CSPM posture, Inspector vulnerabilities, Macie data; suppress only confirmed false positives, narrowly.
- Contain by source, access or destination; security groups keep tracked connections, network ACLs cut them; revoke role sessions with `aws:TokenIssueTime`; deactivate keys rather than delete.
- Eradicate by rebuilding and rotating, recover from Backup, versions and IaC; find the root cause with Detective behavior graphs, finding groups and investigations.
