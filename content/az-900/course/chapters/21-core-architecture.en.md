Azure has a physical side (datacenters, zones, regions) and a management side (resources, resource groups, subscriptions, management groups). This chapter covers both, because questions mix them.

<!-- section: datacenters-regions | objectives: 2.1.1, 2.1.3 -->
## Datacenters, regions, region pairs and sovereign regions

A **datacenter** is a facility full of servers with its own power, cooling and networking. You never choose a datacenter directly: datacenters are grouped into regions.

A **region** is a geographical area that contains one or more datacenters, close to each other and linked by a low-latency network. When you create a resource you usually choose its region. This choice matters for latency (close to users), for data residency (legal requirements), for price and for the services available: not every service exists in every region. A few services are **global** and have no region, such as Microsoft Entra ID, Azure DNS and Azure Traffic Manager.

Many regions are **paired** with another region of the same geography, at least 300 miles (about 480 km) away where possible, for example West Europe with North Europe.

- If a large outage affects several regions, one region of each pair is restored first.
- Planned Azure updates are rolled out to one region of a pair at a time.
- Data stays within the same geography (except Brazil South), for tax and legal reasons.
- Geo-redundant storage replicates data to the paired region.
- Most pairs work in both directions; a few are one-directional. Many regions, especially newer ones, have no pair and rely on availability zones.
- A pair doesn't make resources resilient by itself: it provides no automatic high availability, disaster recovery or failover. You plan and configure them yourself; Microsoft-managed failover of geo-redundant storage happens only in catastrophic situations.

**Sovereign regions** are instances of Azure isolated from the main instance, for compliance or legal reasons:

| Sovereign region | Particularity |
| --- | --- |
| Azure Government (US DoD Central, US Gov Virginia, US Gov Arizona...) | Physically and logically isolated; operated by screened US personnel; for US government agencies and their partners |
| Azure in China (China East, China North...) | Operated by 21Vianet, not by Microsoft, under a partnership |

<!-- section: availability-zones | objectives: 2.1.2 -->
## Availability zones

**Availability zones** are physically separate datacenters within one region, each with independent power, cooling and networking, linked by private high-speed fiber. A region that supports zones has **at least three**. If one zone fails, the others keep working.

| Service category | Behavior |
| --- | --- |
| **Zonal** services | You pin the resource to a zone you choose: virtual machines, managed disks, IP addresses |
| **Zone-redundant** services | The platform replicates across zones automatically: zone-redundant storage, SQL Database |
| **Non-regional** services | Always available from Azure geographies; resilient to zone and region outages |

Zones protect against the loss of a **datacenter**; region pairs protect against the loss of a **region**. Not every region has availability zones.

<!-- section: resources-resource-groups | objectives: 2.1.4 -->
## Resources and resource groups

A **resource** is anything you create in Azure: a virtual machine, a virtual network, a database, a storage account.

A **resource group** is a logical container for resources. Rules:

- Every resource is in **exactly one** resource group at a time. Some resources can be moved to another group; not every resource type supports moving.
- A resource group **can't be renamed** after it is created.
- Resource groups **can't be nested**.
- An action applied to a resource group applies to everything in it: **deleting the group deletes all its resources**; granting access to the group grants access to all its resources.
- A resource group has a location (where its metadata is stored), but it can contain resources from **different regions**.

Group together resources that share the same life cycle or the same access rules: for example all the resources of a test environment, removed in one operation.

<!-- section: subscriptions | objectives: 2.1.5 -->
## Subscriptions

A **subscription** is a unit of management, billing and scale. It links an account (an identity in Microsoft Entra ID) to the resources it may create.

| Boundary | Meaning |
| --- | --- |
| **Billing boundary** | Each subscription has its own invoice and billing report |
| **Access control boundary** | Access policies are applied per subscription, so different teams can have different rules |

Reasons to create several subscriptions: separate **environments** (development, test, production), reflect the **organizational structure** (for example restrict one team to cheaper resources), isolate **billing** (production costs apart from development costs), and work around per-subscription limits.

An account can have many subscriptions; a subscription trusts a single Microsoft Entra tenant.

<!-- section: management-groups-hierarchy | objectives: 2.1.6, 2.1.7 -->
## Management groups and the hierarchy

**Management groups** are containers above subscriptions. Governance conditions (Azure Policy, Azure RBAC) applied to a management group are **inherited** by all the subscriptions, resource groups and resources below it.

- Management groups can be nested, up to **six levels** of depth (root and subscription levels not counted).
- A directory supports up to 10,000 management groups.
- Each management group and each subscription has only **one parent**.
- A single root management group sits at the top of each directory.

The four levels, from the widest to the narrowest:

```text
Management groups
└── Subscriptions
    └── Resource groups
        └── Resources
```

Examples: a policy that limits virtual machine locations to one region, assigned to a "Production" management group, applies to every subscription in it. A role given to a user on a management group gives access to all the subscriptions underneath, without assigning it subscription by subscription.

> **Exam trap.** Resource groups can't contain other resource groups, and a resource can't be in two resource groups. Management groups, on the contrary, can be nested.

<!-- section: key-points -->
## Key points

- Region = datacenters in one area. Region pair = recovery and sequential updates within a geography. Sovereign regions = isolated instances (US Government, China operated by 21Vianet).
- Availability zones = at least three separate datacenters in a region; zonal, zone-redundant and non-regional services.
- Resource group: one per resource, not nestable, can't be renamed, deleting it deletes its content, may hold resources from several regions.
- Subscription: billing boundary and access control boundary.
- Management groups: nestable containers of subscriptions, six levels, inheritance of policies and roles.
- Hierarchy: management groups > subscriptions > resource groups > resources.
