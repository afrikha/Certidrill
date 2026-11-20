The AWS Well-Architected Framework describes how to build and evaluate workloads on AWS. The exam asks you to name its pillars, to recognize which pillar a practice or a design principle belongs to, and to tell two pillars apart when a stem could fit both.

<!-- section: framework | objectives: 1.2.1 -->
## The AWS Well-Architected Framework

The framework is a set of **pillars**, **design principles**, **best practices** and **questions** that help cloud architects build secure, high-performing, resilient and efficient infrastructure, and review an existing workload against those practices. It describes good architecture; it doesn't deploy anything.

| Element | What it is |
| --- | --- |
| **Pillars** | Six areas of focus: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability |
| **Design principles** | A short list of principles for each pillar, plus general design principles for the whole framework |
| **Lenses** | Extensions of the framework for a technology or an industry (for example, serverless applications) |
| **AWS Well-Architected Tool** | A service in the AWS Management Console where you answer the framework's questions for a workload, get a list of high and medium risks and track improvements over time |

The framework's **general design principles**:

1. **Stop guessing your capacity needs**: use as much or as little capacity as you need and scale automatically.
2. **Test systems at production scale**: create a production-scale test environment on demand, then decommission it; you pay only while it runs.
3. **Automate with architectural experimentation in mind**: automation creates and replicates workloads at low cost, and changes can be tracked and reverted.
4. **Consider evolutionary architectures**: with automation and on-demand testing, design changes carry less risk, so the architecture can evolve with the business.
5. **Drive architectures using data**: measure how architectural choices affect the workload and decide from facts.
6. **Improve through game days**: regularly simulate production events to find weaknesses and train the team.

> **Exam trap.** The Well-Architected Framework evaluates **a workload's architecture** (six pillars). The AWS Cloud Adoption Framework (AWS CAF, chapter 13) prepares **an organization** for the cloud (six perspectives). Both have a "Security" element: read whether the stem talks about a system or about the company's transformation.

<!-- section: pillars | objectives: 1.2.2 -->
## The six pillars

| Pillar | Focus | Design principles to recognize |
| --- | --- | --- |
| **Operational excellence** | Running and monitoring systems, and continually improving processes and procedures | Implement observability; safely automate where possible (operations as code); make frequent, small, reversible changes; refine operations procedures frequently; anticipate failure; learn from all operational events and metrics |
| **Security** | Protecting data, systems and assets | Implement a strong identity foundation (least privilege); maintain traceability (logs and audit); apply security at all layers; automate security best practices; protect data in transit and at rest; keep people away from data; prepare for security events |
| **Reliability** | Performing the intended function correctly and consistently, recovering from failures and meeting demand | Automatically recover from failure; test recovery procedures; scale horizontally to increase aggregate workload availability; stop guessing capacity; manage change through automation |
| **Performance efficiency** | Using computing resources efficiently to meet requirements, and keeping that efficiency as demand and technologies change | Democratize advanced technologies (consume them as managed services); go global in minutes; use serverless architectures; experiment more often; consider mechanical sympathy (use the technology that best fits the access pattern) |
| **Cost optimization** | Delivering business value at the lowest price point, avoiding unnecessary costs | Implement cloud financial management; adopt a consumption model (pay only for what you use); measure overall efficiency; stop spending money on undifferentiated heavy lifting; analyze and attribute expenditure |
| **Sustainability** | Minimizing the environmental impact of running cloud workloads | Understand your impact; establish sustainability goals; maximize utilization; anticipate and adopt new, more efficient hardware and software offerings; use managed services; reduce the downstream impact of your cloud workloads |

Sustainability is the newest pillar; there are **six** pillars, not five.

> **Exam tip.** The pillar names are often the options of the question. Keep the exact English names: "performance efficiency" (not "performance"), "cost optimization" (not "cost reduction"), "operational excellence" (not "operations").

<!-- section: pillar-differences | objectives: 1.2.3 -->
## Telling the pillars apart

Most questions describe one practice and ask for the pillar. The difficulty comes from pillars that share a theme:

| Practice in the stem | Pillar | Not this pillar, because |
| --- | --- | --- |
| Deploy infrastructure changes with AWS CloudFormation in small, reversible steps | Operational excellence | Reliability is about surviving failures, not about how changes are made |
| Run the application in several Availability Zones so that it survives a data center failure | Reliability | Performance efficiency is about speed and resource fit, not about failures |
| Back up data and regularly test restoring it | Reliability | Security protects data from unauthorized access; recovery from loss is reliability |
| Choose a purpose-built database or an instance family that matches the workload | Performance efficiency | Cost optimization would pick the cheapest option that still meets the need |
| Serve content from edge locations to reduce latency | Performance efficiency | Reliability isn't about latency |
| Grant least privilege, enable MFA, encrypt data, enable CloudTrail | Security | Operational excellence covers monitoring of operations, not access control |
| Use Savings Plans, right size instances, delete unused resources | Cost optimization | Sustainability also likes fewer resources, but the stated goal is money |
| Maximize utilization, choose energy-efficient Graviton-based instances, reduce the carbon footprint | Sustainability | Cost optimization is about spend; the stated goal here is environmental impact |
| Respond to incidents with runbooks and learn from post-incident reviews | Operational excellence | Security covers security incidents specifically ("prepare for security events") |

> **Exam trap.** "Stop guessing capacity" appears in the general design principles and in the reliability pillar, and "go global in minutes" in the performance efficiency pillar. Read the question: if it asks for a pillar, choose from the behavior described (failures, speed, cost, impact), not from a phrase you remember.

<!-- section: key-points -->
## Key points

- Well-Architected Framework: pillars, design principles, best practices and questions to build and review workloads; the AWS Well-Architected Tool runs the review.
- Six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability.
- Operations as code and small changes: operational excellence. Recover from failure, several Availability Zones: reliability. Right resource type, serverless, edge: performance efficiency. Pay only for what you use: cost optimization. Maximize utilization, reduce impact: sustainability.
- The Well-Architected Framework is for workloads; the AWS CAF is for organizations.
