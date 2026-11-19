Not every need is met by AWS alone. AWS Partners build software and deliver projects on AWS, AWS Marketplace lets you buy their software through your AWS account, and AWS's own experts can help with design or delivery. Exam questions ask who to turn to (a partner, AWS Professional Services, a solutions architect) and what Marketplace offers.

<!-- section: partner-network | objectives: 4.3.3, 4.3.10 -->
## The AWS Partner Network and the role of AWS Partners

The **AWS Partner Network (APN)** is the global community of companies that use AWS to build solutions and services for customers. AWS validates partners' expertise in industries, use cases or workloads with **AWS Specializations**.

| Partner type | What it does for customers | Example |
| --- | --- | --- |
| **Independent software vendor (ISV)** | Builds and sells **software** that runs on or integrates with AWS, often listed in AWS Marketplace | A security vendor's firewall appliance, a SaaS monitoring product |
| **System integrator (SI)** and consulting partner | Delivers **services**: assessment, migration, implementation, modernization, ongoing management | A consulting firm that migrates a company's data center to AWS |
| **Managed service provider (MSP)** | Operates the customer's AWS environment over time | 24/7 monitoring and operations |
| **Reseller and distributor** | Resells AWS to customers (AWS Solution Provider Program, AWS Distributors) | A regional reseller |

- Customers find partners with the **AWS Partner Solutions Finder**, filtered by industry, use case, location or specialization.
- **AWS Marketplace** is where ISVs (and consulting partners) sell their products and professional services to AWS customers.

> **Exam tip.** Software product: an **ISV**, bought in AWS Marketplace. Hands-on project delivery by a third party: a **system integrator** or consulting partner.

<!-- section: partner-benefits | objectives: 4.3.11 -->
## Benefits of being an AWS Partner

Companies join the APN to grow their AWS business. Benefits depend on the programs the partner joins:

- **Training and certification**: partner-only courses and learning plans on AWS Skill Builder, certification readiness resources, webinars led by AWS experts.
- **Events**: partner matchmaking events, partner webinars and virtual training days.
- **Funding and go-to-market**: funding incentives (for example the AWS Migration Acceleration Program), marketing resources, co-selling with AWS and customer referrals.
- **Visibility**: listing in the AWS Partner Solutions Finder and in AWS Marketplace, AWS Specializations that prove expertise to customers.
- **Partner volume discounts**: the exam guide lists them among the benefits for partners.

<!-- section: marketplace | objectives: 4.3.12 -->
## AWS Marketplace

**AWS Marketplace** is a curated **digital catalog** where customers find, try, buy, deploy and manage third-party software, data and services that run on AWS.

| Capability | What it means for the customer |
| --- | --- |
| **Catalog** | Curated listings from ISVs: SaaS applications, Amazon Machine Images (AMIs), containers, AWS CloudFormation templates, AWS WAF rule sets, data products, professional services |
| **Flexible pricing** | Free products and free trials, hourly, monthly, annual and multi-year pricing, contracts, bring your own license (BYOL) |
| **Private offers** | Custom prices and a custom license agreement (EULA) negotiated with the seller, accepted in Marketplace |
| **Cost management** | AWS handles billing and payment: purchases appear **on the AWS bill** and AWS pays the seller, so Marketplace spending is followed with the AWS billing tools instead of separate vendor invoices |
| **Governance** | A **Private Marketplace** is a curated catalog of approved products: once enabled, users can subscribe only to the products approved in it, and can request others |
| **Entitlement and license management** | **AWS License Manager** governs the licenses bought in Marketplace and distributes their rights of use (entitlements) to chosen accounts of the organization |
| **Fast deployment** | Products run in your own account and VPC, on On-Demand, Reserved or Spot Instances |

> **Exam trap.** AWS Marketplace sells **third-party** products billed through AWS. It is not the **Reserved Instance Marketplace**, where customers resell unused Standard Reserved Instances.

<!-- section: technical-assistance | objectives: 4.3.13 -->
## Technical assistance options at AWS

| Option | Who | What they do |
| --- | --- | --- |
| **AWS Professional Services** | AWS's own consulting organization | Help you design, build, migrate and manage workloads (data and AI, migration, modernization, security, industry expertise), working with your team and with AWS Partners |
| **AWS solutions architects** | AWS technical experts in your account team | Advise on the design of your workloads on AWS, help apply the Well-Architected best practices, answer architecture questions |
| **Technical Account Manager (TAM)** | Designated AWS contact in Enterprise Support and Unified Operations | Proactive guidance, operational reviews, coordination of support for your environment |
| **AWS account manager** | AWS business contact | Commercial relationship, connects you to specialists and programs |
| **AWS Partners** | Consulting partners and system integrators | Hands-on implementation, migration and managed services |
| **AWS Support** | Cloud support engineers | Troubleshooting through support cases (chapter 43) |

Decision rules:

- "Advice on architecture best practices for a new workload": **AWS solutions architects** (or the Well-Architected Tool for a self-review).
- "AWS experts to help deliver a large migration with our team": **AWS Professional Services** or an **AWS Partner**.
- "A named AWS contact who reviews our operations proactively": a **TAM**, with Enterprise Support or Unified Operations.
- "Fix an error in a running service": **AWS Support** case.

> **Exam trap.** AWS Professional Services is a consulting team, not a Support plan, and not a managed service. Support plans give troubleshooting and guidance; Professional Services and partners deliver projects.

<!-- section: key-points -->
## Key points

- APN: ISVs sell software, system integrators and consulting partners deliver services, MSPs operate environments, resellers resell AWS; find them with the Partner Solutions Finder.
- Partner benefits: training and certification, events, funding and co-selling, visibility, volume discounts.
- AWS Marketplace: third-party software and services billed on the AWS bill; private offers, Private Marketplace for governance, entitlements managed with License Manager.
- Professional Services: AWS consultants for projects. Solutions architects: design guidance. TAM: Enterprise Support or Unified Operations.
