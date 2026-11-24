The exam names eight benefits of the cloud, grouped in pairs. Questions give a short situation and ask which benefit it illustrates, so the definitions below must be precise in your mind.

<!-- section: availability-scalability | objectives: 1.2.1 -->
## High availability and scalability

**High availability** means that resources are available when needed, whatever the disruption. Azure expresses it in **service-level agreements** (SLAs): a guaranteed percentage of uptime, such as 99.9 % or 99.99 %. The higher the percentage, the more redundancy is needed and the more it costs.

**Scalability** is the ability to adjust resources to meet demand: more resources when traffic peaks, fewer when it drops, so that you don't pay for unused capacity.

| Direction | What changes | Example |
| --- | --- | --- |
| **Vertical** scaling: scale up or down | The **power** of a resource | Give a virtual machine more CPUs or memory |
| **Horizontal** scaling: scale out or in | The **number** of resources | Add virtual machines or containers behind a load balancer |

**Elasticity** is scalability made automatic: the platform adds and removes resources by itself as the load changes.

> **Exam trap.** "Add CPUs to the server" is vertical; "add servers" is horizontal. High availability is about staying up; scalability is about handling load. A question about a traffic peak points to scalability, a question about a failure points to availability.

<!-- section: reliability-predictability | objectives: 1.2.2 -->
## Reliability and predictability

**Reliability** is the ability of a system to recover from failures and continue to function; it is also one of the pillars of the Azure Well-Architected Framework. The cloud supports it by design: resources can be deployed in several regions around the world, so that if one region has a catastrophic event, another keeps running.

**Predictability** lets you move forward with confidence. It has two sides:

| Kind | Meaning | What provides it |
| --- | --- | --- |
| **Performance** predictability | Knowing the resources needed to give customers a good experience | Autoscaling, load balancing, high availability |
| **Cost** predictability | Knowing or forecasting what the cloud will cost | Tracking resource use in real time, cost analysis, the pricing calculator |

<!-- section: security-governance | objectives: 1.2.3 -->
## Security and governance

**Governance.** Whether you deploy infrastructure or software, cloud features help you comply with corporate standards and regulations:

- Templates make every deployed resource meet your standards.
- Policy-based auditing flags resources that are out of compliance and can correct them.
- Updating a standard updates what is deployed from it.

**Security.** You choose the level of control that fits your needs:

- With IaaS you manage operating systems and software yourself, including patches: maximum control.
- With PaaS and SaaS the provider handles patches and maintenance.
- The cloud is built to withstand attacks such as distributed denial of service (DDoS) and offers security tools you would otherwise have to build.

<!-- section: manageability | objectives: 1.2.4 -->
## Manageability

The exam distinguishes two kinds of manageability:

| Kind | About | Examples |
| --- | --- | --- |
| Management **of** the cloud | Managing your cloud resources | Automatically scale deployments according to need; deploy resources from a preconfigured template; monitor resource health and automatically replace failing resources; receive automatic alerts based on metrics |
| Management **in** the cloud | How you manage your cloud environment | A web portal; a command-line interface; APIs; PowerShell |

<!-- section: key-points -->
## Key points

- High availability = stays available, measured by SLAs. Scalability = adjusts to demand.
- Vertical: more power for one resource. Horizontal: more resources.
- Reliability = recovers from failures, helped by deployments in several regions.
- Predictability of performance (autoscaling, load balancing) and of cost (tracking, forecasting).
- Governance through templates and policies; security with a level of control that depends on the service type.
- Management of the cloud (automation of resources) versus management in the cloud (portal, CLI, APIs, PowerShell).
