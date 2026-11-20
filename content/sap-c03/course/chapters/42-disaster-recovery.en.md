At professional level, a disaster recovery question rarely stops at naming a strategy. It sets different RTO and RPO targets per application tier, a budget, servers that still run on premises, containers in several clusters and an audit that wants proof the plan works. SAP-C03 tests how to match each tier to a strategy, replicate servers with AWS Elastic Disaster Recovery, orchestrate a Regional failover that does not depend on the impaired Region, and assess and test the result with AWS Resilience Hub.

<!-- section: dr-requirements | objectives: 4.2.1 -->
## Matching DR designs to RTO, RPO and cost

RPO is set by how data reaches the recovery site; RTO by how much of the stack is already running there and how much of the failover is automated.

| Strategy | Data in the recovery Region | Compute in the recovery Region | Typical AWS building blocks |
| --- | --- | --- | --- |
| Backup and restore | Periodic copies | None until failover | AWS Backup cross-Region and cross-account copies, IaC to rebuild |
| Pilot light | Continuous replication | Core services only, application tier off or at zero | Aurora Global Database, DynamoDB global tables, S3 replication, Auto Scaling groups at zero, Elastic Disaster Recovery |
| Warm standby | Continuous replication | Functional copy at reduced capacity | Same data services, small Auto Scaling groups or ECS services, scale-out runbook |
| Multi-site active/active | Continuous, writable in several Regions | Full capacity, serving traffic | DynamoDB global tables, Aurora Global Database with write forwarding, latency or geoproximity routing, Global Accelerator |

Design principles the exam rewards:

- **Tier the portfolio.** A payment API with an RPO of seconds and a reporting tool with an RPO of 24 hours don't need the same design; apply the cheapest strategy per tier rather than one strategy for everything.
- **Prefer data plane operations for failover.** Control plane actions (creating resources, editing DNS records, changing configurations) are the ones most likely to be impaired during a Regional event. Health check status, ARC routing control state and scaling pre-created resources are safer.
- **Static stability.** Capacity that already exists in the recovery Region does not depend on launching instances during the event; capacity that must be launched depends on quotas and on capacity being available.
- **Protect against logical failures too.** Replication copies corruption and deletions; keep point-in-time backups in a separate account (chapter on business continuity).

> **Exam trap.** "RPO of 15 minutes, RTO of 4 hours, MOST cost-effective" doesn't need warm standby: continuous replication with compute deployed at failover (pilot light, or Elastic Disaster Recovery for servers) meets it at a fraction of the cost.

<!-- section: elastic-disaster-recovery | objectives: 4.2.2 -->
## Continuous replication with AWS Elastic Disaster Recovery

**AWS Elastic Disaster Recovery (AWS DRS)** protects on-premises and cloud servers, and EC2 instances in another AZ or Region:

- An agent replicates each source server to a **staging area subnet** in the chosen Region and account, using low-cost storage and minimal compute: no full-size servers run before a recovery.
- AWS DRS facilitates **RPOs of seconds** and **RTOs of minutes**.
- **Point-in-time recovery**: launch from the latest state or from an earlier snapshot, for example the state before a ransomware infection.
- At launch, servers are converted to boot and run natively on EC2, according to their launch settings.
- **Drills** launch recovery instances in isolation; a recovery or failback drill doesn't stop replication (no RPO impact) and doesn't affect the source.
- **Failback**: once the primary site is repaired, replicate the recovered instances back and fail back when ready, or stay on AWS.

```bash
# Drill from a specific point in time; omit recoverySnapshotID to use the latest data
aws drs start-recovery --is-drill \
  --source-servers sourceServerID=s-1234567890abcdef0,recoverySnapshotID=pit-0123456789abcdef0
```

| Requirement | Service |
| --- | --- |
| Hundreds of on-premises servers, RPO of seconds, low standby cost | AWS Elastic Disaster Recovery |
| One-time move of servers to AWS | AWS Transform MGN (migration, not ongoing DR) |
| Point-in-time copies with retention rules, RPO of hours | AWS Backup |
| Managed database across Regions | The engine's replication: Aurora Global Database, DynamoDB global tables, RDS cross-Region read replicas |

> **Exam tip.** "Recover from ransomware to the state before the encryption started, with minimal data loss" for servers points to Elastic Disaster Recovery point-in-time recovery; for managed databases, point-in-time restore from backups.

<!-- section: assessment-runbooks | objectives: 4.2.3 -->
## Assessing DR posture with Resilience Hub and Systems Manager runbooks

**AWS Resilience Hub** compares an application with resilience goals:

1. **Describe the application** from resource collections: CloudFormation stacks, AWS Resource Groups, myApplications applications, Terraform state files in S3 (version 0.12 or later, 4 MB maximum) and Amazon EKS clusters with namespaces. Stacks, groups and clusters can come from other accounts and Regions.
2. **Attach a resiliency policy**: a tier (foundational IT core services, mission critical, critical, important, non critical) and RTO and RPO targets for each disruption type: customer application, infrastructure, Availability Zone, and optionally Region for multi-Region applications. Suggested policies (for example "Global Mission Critical Application") are provided; several applications can share one policy.
3. **Run an assessment**: Resilience Hub estimates the workload RTO and RPO per AppComponent (a group of resources that fail together, such as a primary database and its replica) and reports **policy met** or **policy breached**.
4. **Review recommendations**: resiliency changes (for example Multi-AZ, cross-Region replication), cost optimization, and operational items: CloudWatch **alarms**, **standard operating procedures (SOPs)** and **AWS FIS experiments** to verify both.
5. Track the **resiliency score** and **drift**: policy drift (an AppComponent that complied before and no longer does) and resource drift (resources added or removed in the input sources).

A policy with RTO and RPO of 0 always produces "Policy breached": set realistic targets.

SOPs run as **AWS Systems Manager Automation runbooks**: documents with ordered steps (call AWS APIs, run scripts, wait for approval) that execute the same way every time, across accounts and Regions, with rate control. A runbook that promotes an Aurora secondary, scales an Auto Scaling group and flips a routing control turns a wiki page into a tested procedure.

> **Exam tip.** "Continuously verify that each application still meets its RTO and RPO after every deployment, across 40 accounts" points to Resilience Hub assessments in the delivery pipeline with resiliency policies per tier, not a quarterly manual review.

<!-- section: multi-region-failover | objectives: 4.2.4 -->
## Multi-Region failover: Route 53, Global Accelerator and ARC

| Mechanism | What switches | Notes |
| --- | --- | --- |
| Route 53 failover records with health checks | DNS answers | Interval 30 s or 10 s (fast, extra charge); at least three health checker Regions; calculated checks combine up to 256 child checks; checks can follow a CloudWatch alarm (standard resolution only); string match in the first 5,120 bytes |
| AWS Global Accelerator | Endpoint group receiving new connections | Static anycast IPs, no DNS caching delay; traffic dials 0–100 % per Region (default 100), apply to new connections only; endpoint weights inside a group |
| ARC routing control | On/off switches read by Route 53 routing control health checks | Cluster = data plane of endpoints in five Regions; call the data plane API with retries across endpoints; safety rules (for example, only one replica active), bypassable in an emergency; TTL of 60–120 s is common |
| ARC Region switch | A whole recovery plan | Plans of workflows, steps and execution blocks run in parallel or in sequence; active/passive (failover, failback) or active/active (shift away, return); resources in several accounts; manual or CloudWatch alarm trigger; a data plane in each Region, so the plan doesn't depend on the Region being deactivated |
| ARC zonal shift and zonal autoshift | Traffic away from one AZ | ALB, NLB, EC2 Auto Scaling groups, EKS; zonal shift is manual with an extendable expiration of up to three days; autoshift is started by AWS on its telemetry |

Region switch **execution blocks** include: EC2 Auto Scaling group scaling, ECS service scaling, EKS resource scaling, Aurora Global Database recovery, Aurora provisioned and Serverless scaling, DocumentDB and Neptune global cluster recovery, RDS read replica promotion, ARC routing control, Route 53 health check, manual approval, custom Lambda action, Lambda event source mapping, Systems Manager Run Command and child plans.

Data must fail over with traffic: promote the Aurora secondary (switchover when planned, failover when the primary is lost), redirect writes for DynamoDB global tables, use S3 replication with Replication Time Control, Secrets Manager replica secrets and KMS multi-Region keys so that the recovery Region can decrypt.

> **Exam trap.** A Lambda function that edits Route 53 records during the outage relies on the Route 53 control plane, which isn't designed for that critical path. "Most reliable failover controlled by the operations team" points to ARC routing controls (or a Region switch plan), whose state changes go through the data plane.

<!-- section: dr-testing | objectives: 4.2.5 -->
## Testing and validating DR procedures

An untested plan has an unknown RTO. Validation combines:

- **Resilience Hub assessments** on a schedule and in the CI/CD pipeline, so a change that breaks the policy is caught before production; the recommended FIS experiments verify that alarms detect the outage and that SOPs recover within the target. SOP tests measure the estimated workload RTO and RPO against the policy.
- **Elastic Disaster Recovery drills** at a regular cadence, with no impact on replication.
- **Game days** that run the real runbook in the recovery Region, including **failback**, which is often forgotten and needs reverse replication.
- **Readiness of the recovery Region**: raised service quotas, AMIs and container images present, secrets and keys replicated, IaC deployable there. ARC readiness check is not intended for the critical failover path.

Record actual recovery times from each test and compare them with the policy; update the policy or the design when they differ.

> **Exam trap.** A DR test that only fails over DNS proves little. The exam expects a test that exercises data promotion, scaling of the standby, application health checks and failback, measured against the stated RTO and RPO.

<!-- section: multi-cluster-containers | objectives: 4.2.6 -->
## Multi-cluster container strategies

An EKS cluster or an ECS cluster belongs to one Region: multi-Region resilience means **several clusters**, built identically and fronted by a global traffic layer.

| Concern | Design |
| --- | --- |
| Identical clusters | Cluster and add-ons from IaC (CloudFormation, CDK); workloads from Git through GitOps, for example the EKS Capability for Argo CD, managed by AWS outside your worker nodes, which deploys to multiple clusters and Regions from one instance and reconciles drift |
| Images in every Region | Amazon ECR cross-Region and cross-account replication (registry-level rules, repository prefix filters, up to 25 destinations); only content pushed after configuration replicates, so backfill existing images |
| Traffic | Route 53 failover or latency records, or Global Accelerator, in front of each cluster's load balancer; ARC zonal shift for EKS and load balancers inside a Region |
| State | Externalized to multi-Region data services (Aurora Global Database, DynamoDB global tables, S3 replication); EBS-backed persistent volumes stay in one AZ |
| Standby capacity | Warm standby: services or deployments at minimum size, scaled by Region switch ECS service scaling or EKS resource scaling blocks during failover |

Inside a Region, multiple clusters also help: **blue/green cluster upgrades** (shift traffic to a new cluster running the next Kubernetes version) and **cells** (independent clusters that each serve a subset of tenants) limit the blast radius of a bad change.

> **Exam trap.** Stretching one Kubernetes cluster across Regions isn't an EKS option. For "the platform must survive a Regional outage with an RTO of minutes", run a second cluster in another Region with replicated images and data, kept in sync by GitOps, and shift traffic with Route 53, Global Accelerator or ARC.

<!-- section: key-points -->
## Key points

- RPO comes from the data path, RTO from what is pre-deployed and automated; tier applications and pick the cheapest strategy per tier.
- Fail over with data plane actions and pre-provisioned capacity (static stability); keep backups against logical corruption.
- Elastic Disaster Recovery: staging subnet, RPO of seconds, RTO of minutes, point-in-time recovery, drills without RPO impact, failback.
- Resilience Hub: resource collections (stacks, groups, myApplications, Terraform state, EKS), resiliency policy per disruption type, assessment, score, alarms, SOPs, FIS experiments, drift.
- Systems Manager Automation runbooks make SOPs repeatable across accounts and Regions.
- Route 53 health checks (30 s or 10 s, calculated, alarm-based), Global Accelerator traffic dials, ARC routing controls (five-Region cluster, safety rules), Region switch plans, zonal shift and autoshift.
- Test failover and failback, measure real recovery times, keep the recovery Region ready.
- Containers: one cluster per Region, GitOps, ECR replication, global traffic layer, state in multi-Region data services.
