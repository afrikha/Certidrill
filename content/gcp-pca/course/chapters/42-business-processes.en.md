The Professional Cloud Architect is expected to move an organization, not only a workload. Questions in this area describe people and money: a skeptical security team, a CFO who wants predictable costs, developers who have never used containers, an executive who asks whether the migration succeeded, a business that must keep operating through a regional outage. The right answer is almost always the one that ties the decision to a measurable business outcome, involves the people who own the concern, reduces risk step by step and uses Google Cloud's managed services and pricing models deliberately.

<!-- section: stakeholder-management | objectives: 4.2.1 -->
## Stakeholder management: influencing and facilitation

Start by listing who is affected and what each group needs to hear:

| Stakeholder | Typical concern | What convinces them |
| --- | --- | --- |
| Executive sponsor | Business outcome, risk, timeline | A business case: revenue, time to market, TCO, risk reduction |
| Finance (CFO, FinOps) | Predictability, CapEx versus OpEx, chargeback | Cost model, committed use discounts, budgets, labels for allocation |
| Security and compliance | Data protection, audit, regulation | Controls mapped to requirements: IAM, organization policies, VPC Service Controls, CMEK, Assured Workloads, audit logs |
| Operations | On-call load, tooling, skills | Managed services, SLOs, runbooks, training plan |
| Developers | Velocity, autonomy | Self-service platform, CI/CD, sandboxes |
| Business owners and end users | No disruption | Phased rollout, pilot, rollback plan, communication |

**Influencing** means aligning a proposal with the stakeholder's own goals and backing it with evidence rather than authority: a proof of concept, a benchmark, a cost comparison, a reference architecture from the Architecture Center, a Well-Architected Framework review. **Facilitation** means running the conversations that produce decisions: discovery workshops, design reviews, trade-off sessions where each option's cost and risk are made explicit, and a clear record of what was decided.

Practical rules:

- Involve the teams that can block a project (security, legal, network) at design time, not at go-live.
- Make responsibilities explicit with a RACI matrix (responsible, accountable, consulted, informed): one accountable owner per decision.
- Communicate in the stakeholder's terms: availability as an SLO and an error budget for operations, dollars per month and per transaction for finance, controls and evidence for auditors.
- When two stakeholders disagree, return to the business requirement and the measurable criteria both accepted.

> **Exam trap.** Answers that "escalate to the CEO", "proceed without the security team's approval" or "let each team choose its own tools" are almost never correct. The exam prefers involving the stakeholder, quantifying the trade-off and agreeing on criteria.

<!-- section: change-management | objectives: 4.2.2 -->
## Change management

Two kinds of change are tested.

**Organizational change** (adopting cloud, new ways of working). The Google Cloud Adoption Framework says adoption effectiveness comes from "both sponsors' top-down mandates and bottom-up momentum" (Lead theme). A change program therefore has:

1. An executive sponsor and a clear reason for the change, communicated early.
2. A pilot with a motivated team and a low-risk, visible workload, to produce a quick win and reusable patterns.
3. Training before people need the skills, and internal champions.
4. A cloud center of excellence (CCoE) or platform team that turns the pilot into standards, landing zones and self-service.
5. Waves: migrate or modernize in planned groups, measure, adjust.

**IT change management** (changes to production). The operational excellence pillar asks you to "automate and manage change": clear policies with approval processes and communication plans, risk assessment, testing, infrastructure as code in version control, CI/CD and controlled rollouts with rollback.

DORA research found that heavyweight external approval, such as a change advisory board reviewing every release, has a negative impact on software delivery performance and no measurable effect on failure rates. The recommended model:

| Change type | Process |
| --- | --- |
| Standard, low risk, repeatable (application release through the pipeline) | Pre-approved: peer review in the pull request, automated tests, progressive rollout, automatic rollback |
| Normal, higher risk (network topology, IAM model, database engine) | Design review and documented approval by the owners; planned window; rollback plan |
| Emergency | The same pipeline, fast enough to be used for emergencies too; retrospective review afterwards |

Peer review captured in the development platform satisfies segregation of duties: the author cannot approve their own change.

> **Exam tip.** "Reduce failed changes without slowing releases" points to automation (tests, canary, verification, automatic rollback) and peer review, not to an extra manual approval board.

<!-- section: team-readiness | objectives: 4.2.3 -->
## Team assessment and skills readiness

Before choosing a design, assess the team that will build and run it: current skills (Linux, networking, containers, Terraform, SQL), operating model (who is on call), capacity, and the gap to the target design. The Adoption Framework's **Learn** theme states that the ability to learn depends on upskilling IT staff and on knowledge from partners; its **Scale** theme ties scale to how much infrastructure you abstract away with managed and serverless services.

| Situation | Response |
| --- | --- |
| Team has no Kubernetes experience and a short deadline | Prefer Cloud Run or GKE Autopilot over GKE Standard or self-managed Kubernetes |
| Team knows VMware well and the data center contract ends soon | Google Cloud VMware Engine or Migrate to Virtual Machines first, modernize later |
| Skills gap on a critical new platform | Training plan (Google Skills, formerly delivered through Google Cloud Skills Boost), certification paths, a Google Cloud partner for the first projects, pairing |
| Operations team is small | Managed databases (Cloud SQL, AlloyDB, Spanner), serverless, Google-managed patching and backups |
| Several teams repeat the same mistakes | CCoE publishing standards, templates and a self-service platform |

Readiness is measured, not assumed: a skills inventory, hands-on labs, a pilot that the internal team runs end to end, and an operational readiness review (runbooks, alerts, on-call rotation, DR drill) before go-live.

> **Exam trap.** The technically best design is wrong if the team cannot operate it. When the scenario stresses limited skills or a small team, choose the managed option with the lowest operational overhead.

<!-- section: decision-making | objectives: 4.2.4 -->
## Decision-making processes

Good architecture decisions are explicit, criteria-based and recorded.

1. **State the decision and its drivers**: functional and non-functional requirements, constraints (budget, regulation, skills, deadlines).
2. **List the options**, including "do nothing" when relevant.
3. **Evaluate against agreed, weighted criteria**: cost (TCO, not list price), operational overhead, availability, latency, security and compliance, lock-in, time to deliver.
4. **Reduce uncertainty** with a proof of concept, a benchmark or a cost estimate (Google Cloud Pricing Calculator, Migration Center TCO reports) when the options are close.
5. **Decide with the accountable owner** and record the result.

Google's Architecture Center recommends **architecture decision records (ADRs)**: a short document with the problem and context, the requirements, the options considered, the chosen option and the reasons. Write one when no existing standard covers the decision or when two or more options are on the table. Store ADRs in Markdown next to the code in version control; when a decision changes, keep the earlier decision and the reason for the change.

Separate one-way decisions (hard to reverse: database engine, region for regulated data, identity model) from two-way decisions (easy to reverse: machine type, autoscaling thresholds). Spend analysis time on the first kind; decide the second kind quickly and adjust with data.

> **Exam tip.** When a question asks how to choose between two valid designs and the requirements do not settle it, the expected answer is a time-boxed proof of concept measured against the stated criteria, not a decision by preference or by vendor marketing.

<!-- section: customer-success | objectives: 4.2.5 -->
## Customer success management

Customer success means the solution delivers the outcomes the business paid for, after go-live. The architect defines success before the project starts:

- **Business KPIs**: conversion rate, time to market, cost per transaction, data center exit date.
- **Service objectives**: SLIs and SLOs per critical user journey, with error budgets.
- **Adoption measures**: share of workloads migrated, teams using the platform, deployment frequency.

After go-live: review KPIs and SLOs with stakeholders on a regular cadence, collect user feedback, run post-incident reviews, act on recommendations (Active Assist: rightsizing, idle resources, IAM recommender) and plan the next improvements.

The support model is part of success. Google Cloud Customer Care offerings:

| Offering | Intended for | Response for the most critical cases |
| --- | --- | --- |
| Basic Support (included) | Documentation, community, billing support, Active Assist | No technical support cases |
| Standard Support | Workloads under development | Business-hours response for high-impact issues |
| Enhanced Support | Workloads in production | 24/7, P1 initial response 1 hour |
| Premium Support | Enterprise-critical workloads | 24/7, P1 initial response 15 minutes; Technical Account Manager; Customer Aware Support |

Since April 10, 2026, creating and running Gemini Cloud Assist investigations requires a Premium Support contract or account-team access: another reason to match the support tier to the criticality of the workloads.

> **Exam trap.** "A named technical contact who knows our environment" and "15-minute response for critical incidents" are Premium Support. Enhanced Support has 24/7 production support but no Technical Account Manager.

<!-- section: cost-optimization | objectives: 4.2.6 -->
## Cost and resource optimization: CapEx and OpEx

On-premises infrastructure mixes **capital expenditure** (CapEx: hardware bought up front and depreciated) and operational expenditure. In the cloud, resources are **operational expenditure** (OpEx), paid as consumed. The shift removes over-provisioning for peak, but costs become variable: they need governance. The Well-Architected cost optimization pillar has four principles: align cloud spending with business value, foster a culture of cost awareness, optimize resource usage, optimize continuously (aligned with FinOps).

Pricing levers:

| Lever | How it works | Fits |
| --- | --- | --- |
| Sustained use discounts | Automatic for the listed series only (N1, M1, M2, f1-micro and g1-small up to 30 %; N2, N2D and C2 up to 20 %; sole-tenant nodes of these series; GPUs attached to N1) when a resource runs more than 25 % of the month; not E2 or other unlisted series | Nothing to buy |
| Resource-based committed use discounts | Commit to vCPUs, memory, GPUs, Local SSD... in one region for 1 or 3 years; up to 55 % (70 % for memory-optimized); cannot be cancelled | Stable, predictable baseline |
| Compute flexible committed use discounts | Commit to an hourly spend on Compute Engine, GKE and Cloud Run, across projects and regions of the billing account, 1 or 3 years; not applicable to Spot VMs | Baseline that moves between regions or services |
| Service-specific spend-based commitments | Cloud SQL, AlloyDB, Spanner, BigQuery, Bigtable, Memorystore, VMware Engine and others | Steady database or analytics spend |
| Spot VMs | Up to 91 % off; can be preempted at any time; no SLA; best-effort shutdown of up to 30 seconds | Fault-tolerant batch, CI runners, rendering |
| Rightsizing and idle resource recommendations | Recommender (Active Assist) | Continuous optimization |
| Autoscaling and scale to zero | MIG autoscaler, GKE autoscaling, Cloud Run | Variable load |
| Storage classes and Autoclass | Move cold objects to Nearline, Coldline, Archive | Data with declining access |

Visibility and control:

- **Labels** on resources and **projects per team or product** to allocate costs (showback or chargeback).
- **Cloud Billing export to BigQuery** for detailed analysis and dashboards.
- **Budgets and alerts** on actual or forecasted cost, with Pub/Sub notifications to automate responses. An alerts-only budget does not cap spending.
- **Spend cap budgets** (GA since October 13, 2026, monthly period only) pause usage of one eligible service in one project when the monthly cap is reached (currently Gemini API, Gemini Enterprise Agent Platform, Cloud Run and Cloud Run functions); persistent resources keep running and billing.
- **Quotas** to limit how much of a resource a project can consume.

> **Exam trap.** Committed use discounts cannot be cancelled. Commit only to the steady baseline observed over time; cover peaks with on-demand or Spot capacity. And a budget alert does not stop spending: it notifies.

> **Exam tip.** "Finance wants predictable monthly costs for a stable workload" means committed use discounts. "Spend moves between regions and between Compute Engine and GKE" means compute flexible commitments rather than resource-based ones.

<!-- section: business-continuity | objectives: 4.2.7 -->
## Business continuity

**Business continuity** keeps the business operating during and after a disruption; **disaster recovery** is its IT part (restoring systems and data). A business continuity plan (BCP) covers what DR does not: people, roles, communication, suppliers, manual workarounds, regulatory notifications.

Steps of a BCP:

1. **Business impact analysis**: list business processes, their dependencies (applications, data, suppliers, people) and the impact of their unavailability over time; derive RTO and RPO per process.
2. **Tier the applications** by criticality and assign a DR pattern and budget to each tier.
3. **Remove single points of failure**, including non-technical ones: one person who knows the system, one region, one network link, one identity provider, one supplier.
4. **Document** roles, escalation, communication plans (customers, regulators, staff) and runbooks.
5. **Exercise** the plan regularly (tabletop exercises and real failover drills), and update it after every exercise and incident.

Cloud-specific considerations:

- Design for zone failure by default (regional services, MIGs across zones) and for region failure where the BIA requires it.
- Make sure the DR region has capacity (reservations) and quotas, and complies with data residency rules.
- Keep a break-glass access path (emergency accounts, documented procedure) in case the normal identity path fails.
- Keep backups out of reach of a compromised administrator (Backup and DR backup vaults with enforced retention, Cloud Storage bucket lock).
- Under Google's shared responsibility model, Google runs the infrastructure; the customer remains responsible for the architecture, data protection and the plan.

> **Exam trap.** A multi-region architecture does not, on its own, make a business continuity plan. If the question mentions staff, communication, suppliers or regulators, the answer is the broader BCP, with its business impact analysis and regular exercises.

<!-- section: key-points -->
## Key points

- Stakeholders: map concerns, involve blockers early, persuade with evidence (PoC, TCO, reference architectures), one accountable owner per decision.
- Change: sponsor plus pilot plus training plus CCoE for organizations; automated pipelines and peer review for production changes, not heavyweight change boards.
- Skills: match the design to the team; limited skills means managed services and training before go-live.
- Decisions: weighted criteria, PoC when close, ADRs stored with the code.
- Success: KPIs and SLOs defined up front; support tier matched to criticality (Premium for TAM and 15-minute P1).
- Cost: OpEx needs governance; CUDs for the baseline (no cancellation), Spot for fault-tolerant work, labels, billing export, budgets (alerts only) and spend caps.
- Continuity: BCP is broader than DR; BIA, tiers, no single points of failure, exercised regularly.
