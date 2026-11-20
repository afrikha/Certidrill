Moving to AWS is a business transformation as much as a technical project. The exam asks you to recognize the AWS Cloud Adoption Framework (AWS CAF), its business outcomes and perspectives, the resources AWS offers to support a migration, and the migration strategy that fits an application.

<!-- section: adoption-strategies | objectives: 1.3.1 -->
## Cloud adoption strategies

The AWS CAF describes cloud adoption as an iterative **cloud transformation journey** in four phases:

| Phase | What happens |
| --- | --- |
| **Envision** | Show how the cloud will accelerate business outcomes: identify and prioritize transformation opportunities, linked to stakeholders and measurable outcomes |
| **Align** | Identify capability gaps across the six perspectives and cross-organizational dependencies, and create strategies to improve cloud readiness |
| **Launch** | Deliver pilot initiatives in production and demonstrate incremental business value; use the lessons learned before scaling |
| **Scale** | Expand the pilots to the desired scale and make sure the benefits of the cloud investment are realized and sustained |

The transformation happens in four **transformation domains**: **Technology** (migrate and modernize infrastructure, applications and data), **Process** (digitize and automate business operations), **Organization** (reorganize teams around products and value streams) and **Product** (new value propositions and revenue models). A company usually starts with technology and gets the largest benefits when the other domains follow.

For a large migration, the **AWS Migration Acceleration Program (MAP)** uses a three-phase approach: **assess** (readiness gaps and a total cost of ownership model), **mobilize** (close the gaps, build the foundations, choose migration strategies) and **migrate and modernize**, with AWS Professional Services or AWS Partners and financial investments that offset part of the migration costs.

<!-- section: caf-components | objectives: 1.3.3 -->
## Components of the AWS CAF

The AWS CAF uses AWS experience and best practices to help organizations **identify and prioritize transformation opportunities, evaluate and improve their cloud readiness, and evolve their transformation roadmap**. It names four **business outcomes**:

| Business outcome | What it means |
| --- | --- |
| **Reduced business risk** | A lower risk profile through improved reliability, increased performance and enhanced security |
| **Improved environmental, social, and governance (ESG) performance** | Insights that improve sustainability and corporate transparency |
| **Increased revenue** | New products and services, new customers, new market segments |
| **Increased operational efficiency** | Lower operating costs, higher productivity, better employee and customer experience |

It groups the **foundational capabilities** an organization needs into six **perspectives**, each with its typical stakeholders:

| Perspective | Focus | Common stakeholders |
| --- | --- | --- |
| **Business** | Make sure cloud investments accelerate digital transformation and business outcomes | CEO, CFO, COO, CIO, CTO |
| **People** | Bridge technology and business: culture, organizational structure, leadership, workforce skills and change | CIO, COO, CTO, cloud director, cross-functional leaders |
| **Governance** | Orchestrate cloud initiatives, maximize the benefits and minimize transformation-related risks | Chief transformation officer, CIO, CTO, CFO, chief data officer, chief risk officer |
| **Platform** | Build an enterprise-grade, scalable, hybrid cloud platform, modernize workloads and implement cloud-native solutions | CTO, technology leaders, architects, engineers |
| **Security** | Achieve the confidentiality, integrity and availability of data and cloud workloads | CISO, chief compliance officer, internal audit leaders, security architects and engineers |
| **Operations** | Deliver cloud services at a level that meets business needs | Infrastructure and operations leaders, site reliability engineers, IT service managers |

The first three perspectives are **business capabilities**; platform, security and operations are **technical capabilities**.

> **Exam trap.** Training staff and managing organizational change is the **People** perspective, not Governance. Managing the cloud budget, benefits and risks of the program is **Governance**. Building the cloud platform and its architecture is **Platform**, while monitoring and running workloads day to day is **Operations**.

<!-- section: migration-resources | objectives: 1.3.2 -->
## Resources for the migration journey

| Need | Resource |
| --- | --- |
| Build a business case: projected AWS costs from on-premises inventory and utilization, including licenses | **Migration Evaluator** |
| Discover servers, plan migration waves and automate migrations with AI agents (VMware, mainframe, .NET and Windows) | **AWS Transform** |
| Rehost physical, virtual or other-cloud servers to Amazon EC2 with continuous block-level replication and a short cutover | **AWS Transform MGN** (formerly AWS Application Migration Service) |
| Migrate a database to AWS, once or with ongoing replication | **AWS Database Migration Service (AWS DMS)** |
| Convert a database schema to a different engine | **DMS Schema Conversion** or the downloadable **AWS Schema Conversion Tool (AWS SCT)** |
| Copy files and objects to AWS over the network | **AWS DataSync** |
| Step-by-step migration guides, patterns and strategies written by AWS experts | **AWS Prescriptive Guidance** |
| Experts to help plan and run the migration | **AWS Professional Services**, **AWS Partners** with migration expertise |
| Methodology, training and funding for a large migration | **AWS Migration Acceleration Program (MAP)** |

> **Exam trap.** AWS Migration Hub (closed to new customers since November 7, 2025) and AWS Application Discovery Service (closed to new customers) were the classic answers for "track migrations" and "discover on-premises servers". For a new customer in 2026, the answer is AWS Transform. AWS Snowball Edge is no longer available to new customers either.

<!-- section: migration-strategies | objectives: 1.3.4 -->
## Choosing a migration strategy

AWS uses seven migration strategies, the **7 Rs**:

| Strategy | What you do | Example |
| --- | --- | --- |
| **Retire** | Decommission or archive an application that is no longer needed | An application nobody uses, found during discovery |
| **Retain** | Keep the application in the source environment, or postpone its migration | A mainframe application, a recent hardware investment, data residency constraints |
| **Rehost** ("lift and shift") | Move the application to AWS without any change | Servers replicated to EC2 instances with AWS Transform MGN |
| **Relocate** | Move servers or resources to a cloud version of the platform, or to another VPC, Region or account, without buying hardware or rewriting the application | An Amazon RDS DB instance moved to another VPC or AWS account |
| **Repurchase** ("drop and shop") | Replace the application with a different product, typically software as a service (SaaS) | An on-premises CRM replaced by a SaaS CRM |
| **Replatform** ("lift, tinker, and shift") | Move with a few optimizations, without changing the core architecture | A self-managed SQL Server database moved to Amazon RDS for SQL Server |
| **Refactor** (re-architect) | Change the architecture to use cloud-native features | A monolith rewritten as microservices on AWS Lambda |

Refactor is the most complex and costly strategy; for a large migration, AWS recommends rehosting, relocating or replatforming first and modernizing afterwards.

**Database replication** is the usual way to migrate a database with minimal downtime. AWS DMS copies the existing data, then **replicates ongoing changes** to keep the source and the target in sync while the application keeps using the source; the switch to the target happens when they match. A **homogeneous** migration keeps the same engine (MySQL to Amazon RDS for MySQL); a **heterogeneous** migration changes it (Oracle to Amazon Aurora PostgreSQL) and needs a schema conversion first.

> **Exam tip.** "Move as quickly as possible with no code change" is **rehost**. "Move to a managed database service without changing the application's code" is **replatform**. "Rewrite to use serverless services" is **refactor**. "Switch to a SaaS product" is **repurchase**.

<!-- section: key-points -->
## Key points

- AWS CAF journey: envision, align, launch, scale. Transformation domains: technology, process, organization, product.
- Business outcomes: reduced business risk, improved ESG performance, increased revenue, increased operational efficiency.
- Six perspectives: business, people, governance (business capabilities); platform, security, operations (technical capabilities).
- Business case: Migration Evaluator. Discovery and migration planning for new customers: AWS Transform. Rehost: AWS Transform MGN. Databases: AWS DMS with DMS Schema Conversion or AWS SCT.
- 7 Rs: retire, retain, rehost, relocate, repurchase, replatform, refactor.
