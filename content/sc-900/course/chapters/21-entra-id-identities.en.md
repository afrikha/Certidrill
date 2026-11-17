Microsoft Entra ID is the identity service behind Microsoft 365, Azure and thousands of other applications. The exam expects you to say what it is, to recognize each type of identity it manages, and to explain how it works with an on-premises Active Directory.

<!-- section: entra-id | objectives: 2.1.1 -->
## Microsoft Entra ID

**Microsoft Entra** is a family of identity and network access products. Its foundation, **Microsoft Entra ID**, is Microsoft's cloud-based identity and access management service: it provides authentication, policy enforcement and protection for users, devices, applications and resources. It can be used on its own or synchronized with an on-premises Active Directory.

| Term | Meaning |
| --- | --- |
| **Tenant** | An instance of Microsoft Entra ID that holds one organization's users, groups, devices and application registrations; it has a unique tenant ID and a domain name such as `contoso.onmicrosoft.com` |
| **Directory** | The container of identity objects inside a tenant; the two words are often used interchangeably |

Every organization that subscribes to Microsoft 365, Azure or Dynamics 365 automatically has a Microsoft Entra tenant.

| Who | What Microsoft Entra ID gives them |
| --- | --- |
| IT administrators | Control of access to applications and resources, for example by requiring multifactor authentication |
| Developers | A standards-based way to add single sign-on to their applications |
| Users | One identity to sign in to Microsoft 365, the Azure portal, SaaS applications and internal applications |

Microsoft Entra ID exists in Free, P1 and P2 editions; premium features such as Conditional Access (P1) or Privileged Identity Management (P2) need the corresponding license. The **identity secure score**, a percentage that shows how well the tenant follows Microsoft's identity security recommendations, is available in every edition.

Other members of the family that the exam may name:

| Product | Role |
| --- | --- |
| Microsoft Entra ID Governance | Automates access requests, assignments and reviews |
| Microsoft Entra ID Protection | Detects and remediates identity-based risks |
| Microsoft Entra External ID | Access for partners, guests and customers |
| Microsoft Entra Workload ID | Identity and access management for applications, services and containers |
| Microsoft Entra Agent ID | Identity and security framework for AI agents |
| Microsoft Entra Domain Services | Managed domain services (Group Policy, LDAP, Kerberos and NTLM) for legacy applications |

<!-- section: user-device-identities | objectives: 2.1.2 -->
## User and device identities

Microsoft Entra ID manages identities for people (**user identities**), for hardware (**device identities**) and for software (**workload identities**, next section).

A user is described by where they authenticate and by their **user type**, Member or Guest; guests have limited privileges by default.

| User | Authenticates | User type | Typical case |
| --- | --- | --- | --- |
| Internal member | In your tenant | Member | Employees |
| External guest | With an external account or identity provider | Guest | Consultants, vendors, partners invited through B2B collaboration |
| External member | With an external account | Member | Users of another tenant of the same multi-tenant organization |
| Internal guest | In your tenant | Guest | Legacy: a local account created for an external person |

**Microsoft Entra External ID** covers people outside the organization: **B2B collaboration** invites partners as guests who sign in with their own credentials; an **external tenant** manages the customers of the applications you publish.

**Groups** grant the same access to several identities at once:

| Group | Use |
| --- | --- |
| **Security** group | Manage access to shared resources; members can be users, devices, other groups and service principals |
| **Microsoft 365** group | Collaboration: shared mailbox, calendar, files, SharePoint site; members are users only |

Membership is **assigned** (chosen manually) or **dynamic** (rules add and remove members automatically).

A **device identity** gives administrators information to make access decisions:

| Device state | Scenario |
| --- | --- |
| **Microsoft Entra registered** | Personal devices (BYOD) that access organizational resources |
| **Microsoft Entra joined** | Devices generally owned by the organization, signed in to with an organizational account |
| **Microsoft Entra hybrid joined** | Devices joined to the on-premises Active Directory and to Microsoft Entra ID |

<!-- section: workload-identities | objectives: 2.1.2 -->
## Workload and agent identities

A **workload identity** is an identity assigned to a software workload (an application, a service, a script, a container) so that it can authenticate and access other services and resources. Together with device identities, workload identities are the non-human or machine identities.

| Workload identity | What it is |
| --- | --- |
| **Application** | The global definition of an application, registered with Microsoft Entra ID |
| **Service principal** | The identity of that application in one tenant; it defines what the application can do and access there. Someone must manage and protect its credentials |
| **Managed identity** | A special type of service principal whose credentials are managed automatically by Microsoft Entra ID; no extra cost |

| Managed identity | Lifecycle |
| --- | --- |
| **System-assigned** | Enabled directly on one Azure resource, such as a virtual machine; deleted automatically with that resource |
| **User-assigned** | A standalone Azure resource that can be assigned to one or several resources; stays until you delete it |

> **Exam trap.** "Authenticate an Azure resource to another Azure service without storing any credential in code" is a managed identity. A service principal you create yourself has a secret or a certificate that you must store and renew.

**Agent identities**, provided by Microsoft Entra Agent ID, are purpose-built identities for AI agents, distinct from traditional workload identities. Each agent has a human **sponsor** accountable for it, and Conditional Access, identity protection and identity governance extend to agents.

<!-- section: hybrid-identity | objectives: 2.1.3 -->
## Hybrid identity

Most organizations run both on-premises and cloud applications. **Hybrid identity** gives each user **one identity** to authenticate and be authorized everywhere. It relies on provisioning (creating the Active Directory user in Microsoft Entra ID) and on **synchronization**, which keeps on-premises users and groups in line with the cloud.

| Tool | Description |
| --- | --- |
| **Microsoft Entra Cloud Sync** | The recommended tool: a lightweight provisioning agent on-premises, with the configuration stored and managed in Microsoft Entra ID; several agents give high availability |
| **Microsoft Entra Connect Sync** | The earlier tool, an on-premises synchronization server, being replaced by Cloud Sync |

Synchronizing accounts doesn't say where passwords are checked. Three sign-in methods exist:

| Method | Where the password is validated | On-premises infrastructure |
| --- | --- | --- |
| **Password hash synchronization** | In Microsoft Entra ID, against a synchronized hash of the password | None beyond synchronization; the simplest method |
| **Pass-through authentication** | By the on-premises Active Directory, through lightweight agents | Authentication agents on on-premises servers |
| **Federation** | By a separate trusted system such as Active Directory Federation Services (AD FS) | Federation servers and proxies |

> **Exam tip.** "Users must keep signing in to cloud applications even if the on-premises datacenter is unavailable": password hash synchronization, the only method that doesn't depend on on-premises servers at sign-in.

<!-- section: key-points -->
## Key points

- Microsoft Entra ID: cloud identity and access management; a tenant is one organization's instance.
- Users are members or guests, internal or external; B2B collaboration guests sign in with their own credentials.
- Devices: registered (personal), joined (organization-owned), hybrid joined (also in the on-premises Active Directory).
- Workload identities: applications, service principals, managed identities. Managed identity: no credential to manage; system-assigned follows its resource, user-assigned is standalone and shareable.
- Agent identities: for AI agents, with a human sponsor.
- Hybrid identity: one identity on-premises and in the cloud, synchronized by Cloud Sync (recommended) or Connect Sync; sign-in by password hash synchronization, pass-through authentication or federation.
