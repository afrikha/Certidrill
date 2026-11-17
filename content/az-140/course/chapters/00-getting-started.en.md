AZ-140 checks that you can plan, deploy and run Azure Virtual Desktop: the network and storage behind it, host pools and their images, identity and security, the user environment and its apps, then monitoring, updates and recovery. It assumes AZ-104-level knowledge of Azure compute, networking, identity and storage and builds on it. This course follows the official study guide objective by objective; each section names the objectives it prepares.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Azure Virtual Desktop Specialty |
| Duration | 100 minutes of exam time |
| Questions | Not published; the formats aren't published either, and the exam "may have interactive components" |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft documents access to Microsoft Learn during associate and expert exams; it doesn't say so for specialty exams. Prepare as if the exam were closed book |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Plan and implement an Azure Virtual Desktop infrastructure | 40 to 45 % |
| Plan and implement identity and security | 15 to 20 % |
| Plan and implement user environments and apps | 20 to 25 % |
| Monitor and maintain an Azure Virtual Desktop infrastructure | 10 to 15 % |

The infrastructure domain alone weighs almost half of the score: networking, FSLogix storage, host pool design, deployment and images. The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop, ordered steps) give one point per correct element.

An exam is made of sections:

- **Case study.** A company description in tabs (existing environment, requirements, constraints) followed by several questions. Once you leave the case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final. Several solutions can be right, or none.
- **Main section.** Independent questions that you can flag and review until you submit: one answer among four, "select two", Yes/No statements, drop-down lists that complete a setting, a PowerShell command or a Bicep fragment, drag and drop, and deployment steps to put in order.

<!-- section: reading-questions -->
## Reading a question

A typical stem has three to six sentences: "You have an Azure Virtual Desktop host pool named Pool1 that contains...", often a table of session hosts or users with their join type, then one deciding constraint and the question "What should you configure?" or "What should you do first?".

Work in three steps:

1. Note the **host pool type** (pooled or personal), the **join type** of the session hosts (Microsoft Entra joined, Microsoft Entra hybrid joined, AD DS or Microsoft Entra Domain Services joined) and the **operating system** (Windows client multi-session or single-session, Windows Server).
2. Note where users connect from: corporate network over ExpressRoute or VPN, or the internet.
3. Find the constraint that separates the two plausible answers.

| Words in the stem | Think of |
| --- | --- |
| "minimize costs" | Pooled host pool with multi-session, autoscale, Start VM on Connect, the smallest storage tier that meets the IOPS need |
| "minimize administrative effort" | The managed option: Azure Files rather than a file server cluster, session host configuration rather than scripts, App attach rather than reinstalling the image |
| "users connect from the corporate network over ExpressRoute" | RDP Shortpath for managed networks, QoS on UDP 3390 |
| "users connect from home over the internet" | RDP Shortpath for public networks (STUN, then TURN) |
| "traffic must not traverse the internet" | Private Link: `connection`, `feed` and `global` private endpoints |
| "the same profile on every session host" | FSLogix profile container on an SMB share |
| "a profile that survives the loss of one storage location" | FSLogix Cloud Cache with several locations |
| "lowest latency", "thousands of users", "enterprise scale" | Azure NetApp Files |
| "external customers", "SaaS" | Per-user access pricing on the subscription |
| "a dedicated desktop that keeps the user's apps and data" | Personal host pool |
| "only one application, not the full desktop" | RemoteApp application group |

> **Exam tip.** The join type of the session hosts decides many answers: how the FSLogix share authenticates users, which single sign-on option works, which Azure role users need on the virtual machines. Write it down before you read the options.

<!-- section: building-blocks -->
## The building blocks

| Object | What it is | Rules that come back |
| --- | --- | --- |
| Host pool | A set of Azure virtual machines registered as session hosts | Pooled (several users per host, breadth-first or depth-first load balancing) or personal (one user per host). All hosts of a pool should come from the same image |
| Session host | A virtual machine running Windows with the Azure Virtual Desktop agent | Joined to Microsoft Entra ID, or to an AD DS or Microsoft Entra Domain Services domain. Makes only outbound connections to the service |
| Application group | Publishes a full desktop or a set of applications from one host pool | One desktop application group per host pool; several RemoteApp application groups are allowed. Users are assigned here |
| Workspace | Groups application groups into the feed users subscribe to | An application group belongs to one workspace only |
| Scaling plan | Autoscale schedules attached to host pools | Turns session hosts on and off, or creates and deletes them with session host configuration |

Users always authenticate with Microsoft Entra ID, and their accounts must exist in the tenant used for Azure Virtual Desktop. With AD DS or Microsoft Entra Domain Services, the accounts must be hybrid identities.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Pooled host pool | Personal host pool | Pooled: users land on any host chosen by the load balancer, profiles live in FSLogix, hosts are rebuilt from updated images. Personal: each user is assigned to one host, automatically or directly, and can keep data on its OS disk |
| Desktop application group | RemoteApp application group | Desktop publishes the full Windows desktop. RemoteApp publishes individual applications. If a user is assigned both on the same host pool, only the preferred application group type is shown |
| Microsoft Entra joined | Microsoft Entra hybrid joined or domain joined | Hybrid and domain joined hosts need line of sight to domain controllers. Entra joined hosts don't, and they use Microsoft Entra Kerberos to reach an Azure Files share |
| RDP Shortpath for managed networks | RDP Shortpath for public networks | Managed: direct UDP over ExpressRoute private peering or VPN, with a listener on UDP 3390 or with STUN. Public: UDP over the internet through STUN, or relayed through TURN |
| RDP Shortpath | RDP Multipath | Shortpath provides UDP transports. Multipath keeps several paths open and switches to a backup path when the active one degrades |
| Profile container | ODFC container | The profile container holds the whole user profile. The ODFC container holds only Microsoft 365 Apps data, for example when another profile solution manages the rest |
| VHDLocations | Cloud Cache | VHDLocations points to SMB locations where the container is attached directly. Cloud Cache writes to several providers from a local cache, for resiliency |
| Azure Files | Azure NetApp Files | Azure Files: platform service in all regions, from 1 GiB, joined to AD DS, Microsoft Entra Domain Services or Microsoft Entra Kerberos. Azure NetApp Files: select regions, capacity pool of 1 TiB minimum, lowest latency, AD DS or Microsoft Entra Domain Services only |
| Windows client licensing | Windows Server licensing | Windows 10 and 11 Enterprise: eligible per-user licenses (Microsoft 365 E3, E5, F3, Business Premium...). Windows Server: RDS CALs with Software Assurance and an RDS license server |
| Autoscale | Start VM on Connect | Autoscale follows schedules and usage for the whole pool. Start VM on Connect starts a deallocated host when a user connects |
| App attach | Installing in the image | App attach mounts application packages from a share at sign-in, per user or group, without rebuilding the image. Installing in the image needs a new image for every update |
| Azure RBAC roles | Rights inside the session host | Desktop Virtualization roles manage the service objects or grant access to application groups. Rights inside Windows come from local groups, Group Policy or Intune |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: identity, profiles and app delivery all depend on the network and storage choices of the first module.
2. Build a small lab in a pay-as-you-go subscription: one pooled host pool with two session hosts, an Azure Files share with FSLogix, one RemoteApp application group. Connect with Windows App, open **Connection Information** and check the transport. Deallocate or delete the session hosts at the end of each session: they are billed while running.
3. Repeat the lab with Microsoft Entra joined session hosts and Microsoft Entra Kerberos on the share: the differences with domain-joined hosts are tested again and again.
4. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
