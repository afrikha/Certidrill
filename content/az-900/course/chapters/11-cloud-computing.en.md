Cloud computing changes who owns the hardware, who is responsible for what and how you pay. These three ideas run through the whole exam.

<!-- section: define-cloud | objectives: 1.1.1 -->
## What cloud computing is

**Cloud computing** is the delivery of computing services over the internet: servers, storage, databases, networking, software, analytics and artificial intelligence. Instead of buying and running hardware, you rent capacity from a provider such as Microsoft and use it on demand.

What follows from this definition:

- You don't wait for a purchase and an installation: a resource is ready in minutes.
- You aren't limited by the physical capacity of a datacenter that you own: you can add resources when demand grows and release them afterwards.
- The provider maintains the buildings, the hardware and the physical network.

<!-- section: shared-responsibility | objectives: 1.1.2 -->
## The shared responsibility model

In your own datacenter you are responsible for everything. In the cloud, responsibilities are **shared** between the provider and you, and the split depends on the service type.

| Responsibility | On-premises | IaaS | PaaS | SaaS |
| --- | --- | --- | --- | --- |
| Information and data | You | You | You | You |
| Devices (phones, computers) | You | You | You | You |
| Accounts and identities | You | You | You | You |
| Identity and directory infrastructure | You | You | Shared | Shared |
| Applications | You | You | Shared | Provider |
| Network controls | You | You | Shared | Provider |
| Operating system | You | You | Provider | Provider |
| Physical hosts, physical network, physical datacenter | You | Provider | Provider | Provider |

Two lines to memorize:

- **You are always responsible** for your information and data, the devices that connect to the cloud, and the accounts and identities of your users.
- **The provider is always responsible** for the physical datacenter, the physical network and the physical hosts.

> **Exam trap.** "Who patches the operating system?" depends on the service. On a virtual machine (IaaS), you do. On Azure App Service or Azure SQL Database (PaaS), Microsoft does.

<!-- section: cloud-models | objectives: 1.1.3, 1.1.4 -->
## Cloud models and their use cases

| Model | Definition | Strengths | Typical use case |
| --- | --- | --- | --- |
| **Public cloud** | Built, controlled and maintained by a third-party provider; anyone can buy its services | No capital expenditure to scale up, quick provisioning, pay only for what you use | A new application, a startup, variable workloads |
| **Private cloud** | Used by a single organization, in its own datacenter or hosted by a third party | Complete control over resources and security | Strict regulatory or legal constraints, data that can't leave the premises |
| **Hybrid cloud** | Public and private clouds interconnected | Most flexibility: each workload runs where it fits best; the public cloud absorbs peaks | Keeping sensitive data on-premises while publishing a website from the public cloud; gradual migration |

Compared with the public cloud, a private cloud means hardware to buy at the start and to maintain: the organization is responsible for maintenance and updates.

**Multicloud** means using several public cloud providers at once. **Azure Arc** helps manage hybrid and multicloud environments from Azure, and **Azure VMware Solution** runs existing VMware workloads in Azure.

<!-- section: consumption-model | objectives: 1.1.5 -->
## The consumption-based model

IT spending falls into two categories:

| | Capital expenditure (CapEx) | Operational expenditure (OpEx) |
| --- | --- | --- |
| Nature | One-time, upfront purchase of tangible resources | Money spent on services over time |
| Examples | Building a datacenter, buying servers | Renting a meeting room, leasing a vehicle, cloud services |

Cloud computing is **operational expenditure**: it works on a consumption-based model.

- No upfront cost.
- No need to buy and manage infrastructure that might not be fully used.
- You pay for additional resources only when you need them.
- You stop paying for resources that you no longer need.

In a traditional datacenter you must guess future needs. Overestimate, and you pay for idle servers; underestimate, and performance suffers. The cloud removes the guess.

<!-- section: pricing-models | objectives: 1.1.6 -->
## Cloud pricing models

| Model | Principle | Fits |
| --- | --- | --- |
| **Pay-as-you-go** | Billed for what is used, by the second, hour or gigabyte; no commitment | Unpredictable or short-lived workloads |
| **Reserved capacity** (reservations, savings plans) | Commit for one or three years in exchange for a significant discount | Stable, predictable workloads that run continuously |
| **Spot** | Use Azure's unused capacity at a deep discount; Azure can take the capacity back at any time | Workloads that tolerate interruption: batch jobs, tests |
| **Free services** | Some services have a free tier or a free monthly amount | Learning, prototypes |

Other levers: the **Azure Hybrid Benefit** reuses existing Windows Server and SQL Server licenses, and prices vary by region.

<!-- section: serverless | objectives: 1.1.7 -->
## Serverless

Servers still exist in **serverless** computing, but you never see or manage them. You supply code or a workflow; the platform runs it.

| Characteristic | Meaning |
| --- | --- |
| No infrastructure management | No server to provision, patch or scale |
| Event-driven scaling | The platform adds instances when events arrive and removes them afterwards, down to zero |
| Pay per use | Billed for executions and consumed resources, not for idle time |

Azure examples: **Azure Functions** (code triggered by an event), **Azure Logic Apps** (workflows built without code), **Azure Container Apps** (serverless containers).

<!-- section: key-points -->
## Key points

- Cloud computing = computing services delivered over the internet, on demand.
- Always yours: data, devices, accounts and identities. Always the provider's: physical datacenter, network and hosts.
- Public (provider-owned, no CapEx), private (one organization, full control), hybrid (both, most flexible).
- The cloud is OpEx: no upfront cost, pay for what you use, stop paying when you stop using.
- Pay-as-you-go for variable needs, reservations for stable ones, spot for interruptible ones.
- Serverless: no server management, automatic scaling, pay per execution.
