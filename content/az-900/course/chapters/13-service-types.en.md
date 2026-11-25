IaaS, PaaS and SaaS differ by how much the provider manages for you. Knowing where the line falls for each one answers both the "which service type" questions and the shared responsibility questions.

<!-- section: iaas | objectives: 1.3.1 -->
## Infrastructure as a service (IaaS)

IaaS is the most flexible category: the provider maintains the hardware, the network connectivity and the physical security, and **you manage everything else**: operating system installation, configuration and maintenance, network configuration, databases, storage and applications. You are essentially renting hardware in a cloud datacenter.

Azure examples: Azure Virtual Machines, Azure Virtual Network, Azure Disk Storage.

Typical scenarios:

- **Lift-and-shift migration**: you rebuild in the cloud the same servers as on-premises and move the workloads as they are.
- **Testing and development**: standard environments that you create, replicate and shut down quickly while keeping complete control.

<!-- section: paas | objectives: 1.3.2 -->
## Platform as a service (PaaS)

PaaS is the middle ground. The provider maintains the physical infrastructure **and** the operating systems, middleware, development tools and business intelligence services. **You supply the application and its data**, and you manage access controls, without worrying about licenses or patches for the platform. Depending on the service configuration, some networking and application security settings are shared.

Azure examples: Azure App Service, Azure SQL Database, Azure Functions, Azure Container Apps.

Typical scenarios:

- **Development framework**: developers build on ready-made components (scalability, high availability, multi-tenancy) and write less code.
- **Analytics and business intelligence**: tools provided with the platform analyze data and feed decisions.

<!-- section: saas | objectives: 1.3.3 -->
## Software as a service (SaaS)

SaaS is a complete, ready-to-use application that you rent. It is the least flexible model and the simplest to start with: the provider manages everything, from the datacenter to the application. **You remain responsible for the data you put in, the devices that connect and the user accounts.**

Examples: Microsoft 365, Dynamics 365, Outlook email.

Typical scenarios: email and messaging, business productivity applications, finance and expense tracking.

<!-- section: service-type-use-cases | objectives: 1.3.4 -->
## Choosing a service type

| | IaaS | PaaS | SaaS |
| --- | --- | --- | --- |
| You manage | Operating system, middleware, runtime, applications, data | Applications and data | Data, devices, accounts |
| Provider manages | Datacenter, hardware, network, virtualization | Also operating system, middleware, runtime | Also the application |
| Flexibility and control | Highest | Medium | Lowest |
| Effort to operate | Highest | Medium | Lowest |
| Choose it when | You need full control of the operating system, or you move existing servers as they are | You want to deploy your code without managing servers | A ready-made application covers the need |

Reading a scenario:

| Scenario | Answer |
| --- | --- |
| "Migrate a virtual machine to Azure without changing it" | IaaS |
| "Install custom software that requires access to the operating system" | IaaS |
| "Host a web application; the team doesn't want to patch servers" | PaaS |
| "A managed database where Microsoft handles backups and upgrades" | PaaS |
| "Give all employees email and a shared calendar this week" | SaaS |

Serverless offerings such as Azure Functions are usually classified as PaaS: even less to manage, and billing per execution.

> **Exam trap.** A virtual machine is IaaS even if it only runs a database. Azure SQL Database is PaaS; SQL Server installed on an Azure virtual machine is IaaS.

<!-- section: key-points -->
## Key points

- IaaS: you rent infrastructure and manage the operating system and everything above it. Most control, most work.
- PaaS: you bring code and data; the platform, including the operating system, is managed for you.
- SaaS: you use a finished application; you only manage data, devices and accounts.
- Lift-and-shift and test environments point to IaaS; development frameworks and managed databases to PaaS; email and productivity tools to SaaS.
