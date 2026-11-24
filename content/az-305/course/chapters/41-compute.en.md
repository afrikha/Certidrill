A compute design question describes a workload (existing or new, web or background, steady or bursty, in containers or not) and a few constraints, then asks which service, tier or option to recommend. The right answer is the most managed and cheapest service that still gives the control the requirements ask for.

<!-- section: choose-compute | objectives: 4.1.1 -->
## Choosing the compute service from the workload

Start from what the team must control. The more Azure manages, the less you patch and the less you can customize.

| Requirement in the question | Recommend |
| --- | --- |
| Move a server as is, control the operating system, install custom or legacy software | Azure Virtual Machines, in a scale set when several identical instances are needed |
| Keep a VMware estate and its tooling without converting the machines | Azure VMware Solution |
| Web application or API on a managed platform, with autoscale and deployment slots | Azure App Service |
| Short event-driven code, billed per execution, scale to zero | Azure Functions |
| Workflow that connects SaaS and enterprise systems with little or no code | Azure Logic Apps |
| Run one container or a short task quickly, without an orchestrator | Azure Container Instances |
| Containerized microservices or jobs, scale to zero, no cluster to manage | Azure Container Apps |
| Full Kubernetes API, custom operators, control of nodes and networking | Azure Kubernetes Service (AKS) |
| Thousands of parallel or tightly coupled compute tasks | Azure Batch |

Then specify the components that the requirements imply:

- **Scaling.** Scale up changes the size of an instance; scale out adds instances and needs a load balancer and stateless instances. Autoscale follows a metric or a schedule; scale to zero exists only in serverless plans.
- **Networking.** Reaching a database through a private endpoint, or being reachable only from a virtual network, rules out the plans that have no virtual network support.
- **State.** Keep session and data outside the instances (cache, database, storage) so that any instance can be replaced.
- **Cost model.** Steady load favors reserved capacity; unpredictable or rare load favors consumption billing; interruptible load favors Spot capacity.

App Service plans show how a tier unlocks features:

| Tier | Compute | Scale out | Features that arrive at this tier |
| --- | --- | --- | --- |
| Free, Shared | Shared with other customers | No | Development and test only |
| Basic | Dedicated | 3 instances, manual | Virtual network integration, private endpoints, 99.95 % SLA |
| Standard | Dedicated | 10 instances | Autoscale, 5 deployment slots |
| Premium v2 to v4 | Dedicated | 30 instances | 20 deployment slots, zone redundancy |
| Isolated v2 | Dedicated, in an App Service Environment in your virtual network | 100 instances | Network isolation, single-tenant environment |

> **Exam trap.** "Minimize administrative effort" eliminates virtual machines and AKS whenever a PaaS or serverless option meets the other requirements. "Requires access to the operating system" or "runs a Windows service that can't be modified" brings virtual machines back.

<!-- section: virtual-machines | objectives: 4.1.2 -->
## Recommending a virtual machine solution

The size family follows the bottleneck of the workload:

| Family | Profile | Typical workloads |
| --- | --- | --- |
| B | Burstable | Low average CPU with occasional peaks: small web servers, development and test |
| D | General purpose | Enterprise applications, relational databases, application servers |
| F | Compute optimized | Batch processing, web servers under load, network appliances |
| E, M | Memory optimized | Large relational databases, in-memory analytics; M for the largest (SAP HANA) |
| L | Storage optimized | High local disk throughput: NoSQL databases, data warehousing |
| N | GPU | Model training and inference, rendering, virtual desktops |
| HB, HX | High performance compute | Fluid dynamics, weather modeling, electronic design automation |
| DC, EC | Confidential computing | Data that must stay encrypted while in use |

Disks follow the same logic:

| Disk type | Maximum IOPS | Use | Notes |
| --- | --- | --- | --- |
| Ultra Disk | 400,000 | SAP HANA, top-tier databases, transaction-heavy workloads | Data disk only; performance changed without downtime |
| Premium SSD v2 | 80,000 | Production workloads that need consistently low latency | Data disk only; IOPS and throughput set independently of the size |
| Premium SSD | 20,000 | Production workloads | Can be an OS disk |
| Standard SSD | 6,000 | Web servers, lightly used applications, development and test | |
| Standard HDD | 2,000 | Backup, infrequent access | |

Cost options are a frequent deciding requirement:

| Option | Commitment | Use |
| --- | --- | --- |
| Azure Spot Virtual Machines | None; evicted with a 30-second notice when Azure needs the capacity or the price exceeds your maximum; no SLA | Interruptible work: batch, development and test, stateless scale-out |
| Reserved VM instances | One or three years for a size family in a region | Steady, predictable workloads |
| Azure savings plan for compute | Hourly spend for one or three years, across compute services and regions | Steady spend whose sizes or regions change |
| Azure Hybrid Benefit | Existing Windows Server and SQL Server licenses with Software Assurance | Removes the license part of the price; combines with reservations |

A Spot VM is deallocated by default at eviction (the disks are kept and billed) or deleted. A maximum price of -1 means it is never evicted for price, only for capacity.

**Azure Dedicated Host** provides a physical server reserved for one subscription: you are charged per host whatever the number of VMs, you control when platform maintenance is applied, and it answers compliance requirements of hardware isolation and bring-your-own-license scenarios. **Virtual Machine Scale Sets** create and scale identical or mixed instances from an image; store images in **Azure Compute Gallery** to version and replicate them across regions.

> **Exam trap.** Spot VMs don't fit a workload that must stay available or that can't be interrupted, however low the cost requirement. For "lowest cost for a workload that runs continuously for three years", the answer is a reservation, with Azure Hybrid Benefit if licenses exist.

<!-- section: containers | objectives: 4.1.3 -->
## Recommending a container solution

| Service | Choose it when | What it doesn't do |
| --- | --- | --- |
| Azure Container Instances | A container or a container group must start in seconds, billed per second, with no infrastructure: build agents, short tasks, bursts | No autoscale, no load balancing, no orchestration: five instances are five deployments |
| Azure Container Apps | Microservices, APIs and background jobs need autoscale driven by HTTP traffic or events (KEDA), scale to zero, revisions with traffic splitting and Dapr | No direct access to the Kubernetes API |
| Azure Kubernetes Service | The team needs the Kubernetes API, its ecosystem and control over nodes, networking and upgrades | You operate the cluster; AKS Automatic preconfigures node provisioning, scaling, upgrades and security defaults |
| App Service (Web App for Containers) | A containerized web application wants the App Service features: slots, built-in authentication, autoscale | Not designed for many microservices or event-driven scale |
| Azure Red Hat OpenShift | The organization already standardizes on OpenShift | |

Container Apps has two plans: Consumption (serverless, pay only while apps run) and Dedicated (workload profiles with dedicated hardware, including GPU, billed per profile instance). AKS can burst into Container Instances through virtual nodes, without waiting for new nodes.

Images are stored in **Azure Container Registry**:

| Tier | Included storage | Features |
| --- | --- | --- |
| Basic | 10 GiB | Development; same core features, lower throughput |
| Standard | 100 GiB | Most production workloads |
| Premium | 500 GiB | Geo-replication, private endpoints, customer-managed keys, connected registries |

> **Exam trap.** "A registry reachable only through a private endpoint" or "the same image pulled from the nearest region" requires the Premium tier. Zone redundancy doesn't: every tier has it.

> **Exam tip.** "Containers" plus "minimize operational overhead" plus "scale to zero" is Container Apps. AKS is the answer only when the question requires Kubernetes itself: the API, custom resource definitions, a specific ingress or service mesh.

<!-- section: serverless | objectives: 4.1.4 -->
## Recommending a serverless solution

Serverless means no server to size, scaling driven by events and billing that follows usage. Azure Functions runs code in response to triggers (HTTP, timer, queue, Service Bus, Event Grid, Event Hubs, Cosmos DB); the hosting plan carries the design decision:

| Plan | Scale | Virtual network | Execution timeout | Use |
| --- | --- | --- | --- | --- |
| Flex Consumption | Event driven, to zero, up to 1,000 instances; optional always-ready instances | Yes | 30 minutes by default, unbounded | Default choice for new serverless applications; Linux only; no deployment slots, one app per plan |
| Premium | Event driven, at least one instance always warm | Yes | 30 minutes by default, unbounded | No cold start, Windows or Linux, custom containers |
| Dedicated (App Service plan) | Manual or autoscale of the plan | Yes | 30 minutes by default, unbounded with Always On | Reuse spare capacity of an existing plan; predictable cost |
| Container Apps | Event driven (KEDA), to zero | Yes | 30 minutes by default, unbounded; with a minimum of zero replicas, the default depends on the triggers | Functions packaged as containers next to other microservices |
| Consumption (legacy) | Event driven, to zero | No | 5 minutes by default, 10 at most | Existing applications; new ones use Flex Consumption; Linux hosting retires on September 30, 2028 |

Whatever the plan, an HTTP-triggered function must answer within 230 seconds. A longer operation returns immediately and continues in the background: a queue message, or **Durable Functions**, which writes stateful orchestrations in code (function chaining, fan-out and fan-in, waiting for a human approval, timers).

**Azure Logic Apps** builds the same orchestrations in a designer, with more than 1,400 connectors:

| | Consumption | Standard |
| --- | --- | --- |
| Hosting | Multitenant | Single-tenant; also App Service Environment v3 or your own infrastructure (hybrid) |
| Workflows per resource | One | Several, stateful or stateless |
| Billing | Per execution | Hosting plan |
| Virtual network integration and private endpoints | No | Yes |

> **Exam trap.** "The function must reach a database through a private endpoint" or "must have no cold start" eliminates the legacy Consumption plan. Scale to zero plus private networking is Flex Consumption; no cold start at all is Premium or always-ready instances.

> **Exam tip.** Developers who want code and unit tests: Functions and Durable Functions. Integration with SaaS connectors and little code: Logic Apps. Business users automating their own tasks: Power Automate.

<!-- section: batch | objectives: 4.1.5 -->
## Recommending a compute solution for batch processing

Batch workloads run to completion without a user waiting: rendering, risk simulation, transcoding, nightly processing.

| Requirement | Recommend |
| --- | --- |
| Large-scale parallel or HPC jobs, with managed scheduling and no cluster software to install | Azure Batch |
| Keep an existing scheduler (Slurm, PBS Pro, LSF, Grid Engine, HTCondor) or burst an on-premises cluster to Azure | Azure CycleCloud |
| Containerized task that runs on demand, on a schedule or per event, then stops | Container Apps job |
| Short scheduled code | Azure Functions with a timer trigger |
| Batch work inside an existing Kubernetes platform | Kubernetes jobs on AKS |

**Azure Batch** creates and manages pools of compute nodes, installs the applications and schedules jobs and tasks on the nodes. Batch itself is free: you pay for the virtual machines, storage and networking. Pools can scale automatically with the workload, and input and output files live in Azure Storage. Two workload types exist:

- **Intrinsically parallel**: tasks don't talk to each other (Monte Carlo simulation, image rendering, transcoding). Any size works, and Spot nodes cut the cost: a preempted task is requeued automatically.
- **Tightly coupled**: tasks exchange messages through MPI (fluid dynamics, finite element analysis). Use HPC sizes (HB, HX) or GPU sizes (N) with a low-latency RDMA network, and a parallel file system such as Azure Managed Lustre or Azure NetApp Files for shared data.

> **Exam trap.** Spot nodes suit independent tasks that can be rerun. A long MPI job on Spot nodes restarts entirely when a single node is preempted: use dedicated nodes.

> **Exam tip.** Don't choose Batch only to avoid managing virtual machines: if the requirement is "keep our Slurm scripts and scheduler", moving to the Batch programming model is a redesign, and CycleCloud is the answer.

<!-- section: key-points -->
## Key points

- Choose the most managed service that meets the control requirements: virtual machines for the operating system, AKS for the Kubernetes API, otherwise PaaS or serverless.
- App Service: autoscale and slots from Standard, zone redundancy from Premium v2, network isolation in Isolated v2.
- VM family by bottleneck (B burst, D general, F compute, E and M memory, L storage, N GPU, HB and HX HPC); Ultra Disk and Premium SSD v2 are data disks.
- Spot for interruptible work, reservations or a savings plan for steady work, Azure Hybrid Benefit for existing licenses, Dedicated Host for hardware isolation.
- Container Instances: simple and fast, no scaling. Container Apps: serverless microservices with scale to zero. AKS: full Kubernetes. Container Registry Premium for geo-replication and private endpoints.
- Functions: Flex Consumption by default, Premium against cold start; the legacy Consumption plan has no virtual network and a 10-minute limit. Durable Functions for stateful code, Logic Apps for connectors.
- Batch for managed large-scale jobs, CycleCloud to keep a scheduler, Container Apps jobs for containerized finite tasks.
