Compute services run your code; networking services connect it. At this level you must know what each service is for and when to choose it, not how to configure it.

<!-- section: compute-types | objectives: 2.2.1 -->
## Comparing compute types

| Compute type | What it is | You manage | Choose it when |
| --- | --- | --- | --- |
| **Virtual machine** | A virtualized server with its own operating system (IaaS) | The operating system and everything installed on it | You need full control, custom software, or a lift-and-shift migration |
| **Container** | A lightweight package of an application and its dependencies; several containers share the operating system of one host | The application packaged in the container | You want fast start, portability and many instances per host; microservices |
| **Function** | A piece of code run in response to an event (serverless) | Only the code | The work is short, event-driven, and you want to pay only when it runs |

A virtual machine virtualizes hardware and carries a full operating system; a container virtualizes the operating system, so it is smaller and starts in seconds. Functions go further: no infrastructure at all, automatic scaling, billing per execution. Functions are stateless by default; *Durable Functions* keep state between calls.

<!-- section: vm-options | objectives: 2.2.2 -->
## Virtual machine options

| Option | Purpose |
| --- | --- |
| **Azure Virtual Machines** | Individual servers, Windows or Linux, of the size you choose. Created from an image, which can be your own |
| **Virtual Machine Scale Sets** | A group of **identical, load-balanced** virtual machines whose number increases or decreases automatically with demand or on a schedule |
| **Availability sets** | Spread virtual machines of one application across **update domains** (groups restarted one at a time during maintenance) and **fault domains** (groups that share power and a network switch). At least one machine stays up. No extra charge: you only pay for the machines |
| **Azure Virtual Desktop** | Desktop and application virtualization: a cloud-hosted Windows desktop reachable from almost any device. Centralized security with Microsoft Entra ID and multifactor authentication; **multi-session** Windows lets several users share one virtual machine, which lowers cost |

Scale sets answer "handle variable load"; availability sets answer "survive hardware failure and maintenance inside a datacenter". For protection against the loss of a datacenter, use availability zones.

<!-- section: vm-resources | objectives: 2.2.3 -->
## Resources required for a virtual machine

When you create a virtual machine you choose or create:

- its **size**: number of processor cores and amount of memory, by purpose (general purpose, compute optimized, memory optimized...);
- **storage disks**: an operating system disk, and data disks if needed;
- **networking**: a virtual network and subnet, a network interface, optionally a public IP address and the ports to open;
- the **resource group**, the region and the image (operating system).

You pay for the compute time of the machine and separately for its disks and public IP address. A machine that is stopped and deallocated no longer costs compute, but its disks still cost storage.

<!-- section: app-hosting | objectives: 2.2.4 -->
## Application hosting options

| Option | Service | Characteristics |
| --- | --- | --- |
| **Web apps** | Azure App Service | PaaS for web applications, REST APIs, background jobs and mobile back ends, on Windows or Linux, in .NET, Java, Node.js, Python or PHP. Built-in load balancing, autoscaling and high availability; deployment from GitHub or Azure DevOps |
| **Containers** | Azure Container Instances | The fastest and simplest way to run a container, without managing virtual machines |
| | Azure Container Apps | Serverless containers with built-in scaling and load balancing |
| | Azure Kubernetes Service | Orchestration of many containers with Kubernetes |
| **Virtual machines** | Azure Virtual Machines | Full control over the hosting environment; you manage the server |

Choose App Service when the team wants to deploy web code without managing servers, containers when the application is packaged as containers or made of microservices, and virtual machines when the application needs control of the operating system.

<!-- section: virtual-networking | objectives: 2.2.5 -->
## Virtual networking

An **Azure virtual network** lets Azure resources communicate with each other, with users on the internet and with on-premises networks. What it provides:

| Capability | Meaning |
| --- | --- |
| Isolation and segmentation | A private address space that you divide into **subnets** |
| Internet communication | Through a public IP address, a NAT gateway or a public load balancer |
| Communication between Azure resources | Inside the virtual network, or to services through service endpoints |
| Communication with on-premises resources | Point-to-site VPN, site-to-site VPN, ExpressRoute |
| Routing and filtering | Route tables; **network security groups** and network virtual appliances to allow or deny traffic |

A virtual network belongs to one region and one subscription.

**Peering** connects two virtual networks so that their resources communicate privately over the Microsoft backbone, never over the public internet. The networks can be in different regions (global peering).

**Azure DNS** hosts your DNS domains on Azure's infrastructure: you manage records with the same credentials, tools and billing as other Azure services. It supports private zones and alias records, and benefits from Azure's reliability. You **can't buy a domain name** from Azure DNS.

Two services connect an on-premises network to Azure:

| | **Azure VPN Gateway** | **Azure ExpressRoute** |
| --- | --- | --- |
| Path | **Encrypted** tunnel over the **public internet** | **Private** connection through a connectivity provider; doesn't use the public internet |
| Use | Site-to-site (a whole network), point-to-site (one computer), network-to-network | Large or sensitive workloads that need reliability, speed and consistent latency |
| Cost and setup | Lower cost, quick to set up | Higher cost, depends on a provider |
| Notes | One VPN gateway per virtual network; can serve as a failover path for ExpressRoute | Built-in redundancy; reaches all regions of a geography, or worldwide with Global Reach |

<!-- section: endpoints | objectives: 2.2.6 -->
## Public and private endpoints

A **public endpoint** is the public IP address through which a service is reachable from anywhere on the internet. Azure services such as storage accounts have one by default.

A **private endpoint** is a network interface that gives the service a **private IP address from your virtual network**. Traffic between your network and the service then travels over the Microsoft backbone and never crosses the public internet; the public endpoint can be closed.

<!-- section: key-points -->
## Key points

- Virtual machine: full control (IaaS). Container: lightweight, shares the host's operating system. Function: serverless code triggered by events.
- Scale sets: identical machines that scale automatically. Availability sets: update and fault domains. Azure Virtual Desktop: cloud-hosted desktops, multi-session.
- A virtual machine needs a size, disks, a virtual network with an interface, and optionally a public IP address.
- App Service hosts web apps and APIs without servers to manage.
- Virtual networks isolate and connect; peering links two networks privately; Azure DNS hosts domains but doesn't sell them.
- VPN Gateway: encrypted, over the internet. ExpressRoute: private, not over the internet.
- Private endpoint: a private IP address for a service inside your virtual network.
