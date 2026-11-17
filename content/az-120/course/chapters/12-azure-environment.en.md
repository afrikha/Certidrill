An SAP landscape on Azure lives inside an enterprise Azure environment: a management group hierarchy, subscriptions per environment, Azure RBAC that separates the infrastructure team from the SAP Basis team, Azure Policy guardrails, and identities for administrators, end users and SAP SaaS applications. Exam questions here ask which role, which scope, which policy effect or which identity integration meets a requirement with the least privilege and the least effort.

<!-- section: access-control | objectives: 1.2.1 -->
## Authorization and access control

The first design decision is the **boundary between Azure administration and SAP Basis administration**. The infrastructure team owns networks, subscriptions and policies; the Basis team operates the SAP VMs.

| Environment | Basis team access |
| --- | --- |
| Non-production | Elevated: the built-in **Virtual Machine Contributor** role on the SAP resource groups |
| Production | Partially elevated: a custom role limited to the operations Basis needs, activated just in time with **Privileged Identity Management (PIM)** and MFA |

Operations to scope for the Basis team:

- VMs: start, stop, restart, deallocate, resize, extensions, availability sets, proximity placement groups.
- Disks: read and write.
- Storage accounts, for example for boot diagnostics.
- Azure NetApp Files: capacity pools, volumes, snapshots, cross-region replication.
- Networking: NICs and load balancers; **read-only** access to NSGs and firewalls.

```json
{
  "Name": "SAP Basis Operator (custom)",
  "IsCustom": true,
  "Description": "Operate SAP VMs without creating or deleting them.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/deallocate/action",
    "Microsoft.Network/networkSecurityGroups/read"
  ],
  "NotActions": [],
  "AssignableScopes": [ "/subscriptions/<sap-production-subscription-id>" ]
}
```

**Azure Center for SAP solutions** has its own built-in roles:

| Role | Allows |
| --- | --- |
| Azure Center for SAP solutions administrator | Deploy infrastructure, install SAP software, register existing systems as Virtual Instances for SAP solutions (VIS), start and stop, delete the VIS |
| Azure Center for SAP solutions reader | View all VIS resources |
| Azure Center for SAP solutions service role | Assigned to the **user-assigned managed identity** that the service uses to deploy and manage the system |

To deploy or register, the user also needs **Managed Identity Operator** to assign an existing user-assigned managed identity to the VIS (plus **Managed Identity Contributor** if the identity is created during the process). For the SAP software installation, the identity also needs **Reader and Data Access** on the storage account holding the media.

Backup data deserves its own boundary: SAP and server administrators get read-only access to the Recovery Services vault, and **multi-user authorization with a Resource Guard** protects critical backup operations against a rogue or compromised administrator.

> **Exam trap.** Contributor on the SAP resource group lets the Basis team delete VMs, disks and NSG rules. When the stem says "only start, stop and resize" or "without changing network security", the answer is a custom role (or Virtual Machine Contributor plus read-only network access), not Contributor.

<!-- section: azure-policy | objectives: 1.2.2 -->
## Governance and compliance with Azure Policy

Azure Policy evaluates resources against rules and acts according to the **effect** of each definition. Assign definitions, or initiatives that group them, at the management group of the SAP landing zones so that every present and future SAP subscription inherits them.

| Requirement | Policy approach | Effect |
| --- | --- | --- |
| Only SAP-certified VM sizes in SAP subscriptions | Allowed virtual machine size SKUs, with the certified sizes as parameter | `deny` |
| SAP resources only in approved regions | Allowed locations | `deny` |
| Every resource carries SID, environment and cost center | Require a tag; inherit a tag from the resource group | `deny`, `modify` |
| Install the monitoring agent or diagnostic settings on every SAP VM | Built-in deploy-if-not-exists definitions | `deployIfNotExists` |
| Report VMs and services that aren't zone-resilient | Built-in resilience policies (the SAP landing zone guidance assigns a zone resilience initiative to the SAP management group) | `audit` |
| Audit OS settings inside the VMs | Machine configuration (guest configuration) policies | `auditIfNotExists` |
| Keep every VM in the patching scope | Azure Update Manager settings enforced by policy | `deployIfNotExists`, `modify` |

A custom definition that allows only some sizes looks like this:

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Compute/virtualMachines" },
      { "not": { "field": "Microsoft.Compute/virtualMachines/sku.name", "in": "[parameters('allowedSkus')]" } }
    ]
  },
  "then": { "effect": "deny" }
}
```

- `deny` blocks new non-compliant requests; existing resources are only reported as non-compliant.
- `modify` and `deployIfNotExists` need a **managed identity** on the assignment and a **remediation task** to fix existing resources.
- An **exemption** removes a specific scope (for example a sandbox subscription) from an assignment without deleting it.
- Regulatory compliance dashboards in Microsoft Defender for Cloud show the state of compliance standards.

> **Exam trap.** Azure Policy controls what resources may be; Azure RBAC controls who may act. "Prevent anyone from creating a non-certified VM size" is a policy with `deny`, even for Owners; "prevent the Basis team from deleting VMs" is a role.

<!-- section: authentication | objectives: 1.2.3 -->
## Authentication for SAP workloads

Authentication happens at several layers, each with its own mechanism:

| Layer | Mechanism |
| --- | --- |
| Azure control plane (portal, CLI) | Microsoft Entra ID with MFA; privileged roles through PIM |
| Windows guest OS of SAP NetWeaver or S/4HANA | Domain join to **Active Directory Domain Services**; Microsoft Entra ID isn't supported as the domain for the SAP ABAP stack on Windows (Microsoft Entra Domain Services is documented as still being tested) |
| SAP GUI | **SNC with Kerberos/SPNEGO** against Active Directory (SAP's recommendation); X.509 certificates through SAP Secure Login Server |
| SAP Fiori, Web GUI, other NetWeaver web applications | **SAML 2.0** single sign-on with Microsoft Entra ID |
| Apps that call SAP OData services | **OAuth 2.0** with the SAML bearer grant, so the call runs as the end user |
| SAP HANA | Single sign-on with Microsoft Entra ID |
| Azure services that call SAP for a user | **Principal propagation**, for example through Azure API Management, so SAP authorizations apply to the Microsoft identity |
| Azure resources that call Azure (fence agent, backup, scripts) | Managed identities, never stored secrets |

Setting up SAML for SAP NetWeaver (7.20 or later) with Microsoft Entra ID:

1. Add the **SAP NetWeaver** application from the Microsoft Entra gallery.
2. In SAP, activate the HTTP security session and the SAML2 ICF services, then run transaction **SAML2** to create the local provider and download its metadata.
3. In Microsoft Entra ID, upload that metadata (it fills the Identifier and Reply URL) and set the NameID claim, for example `ExtractMailPrefix()` of the user principal name.
4. In transaction SAML2, add Microsoft Entra ID as a **trusted provider** from its federation metadata, with HTTP POST for single sign-on, and configure identity federation (for example map users by email).
5. Maintain the matching email address of every SAP user in transaction SU01.

For OAuth, the SAP side registers an OAuth 2.0 client in transaction **SOAUTH2**, tied to the Microsoft Entra SAML2 identity provider and to the OData service scopes.

SNC is also required for single sign-on from Azure Monitor for SAP solutions, the Azure Data Factory self-hosted integration runtime and the on-premises data gateway (Power BI, Power Apps, Power Automate, Logic Apps).

> **Exam tip.** Match the client to the protocol: SAP GUI → SNC with Kerberos; browser (Fiori, Web GUI) → SAML; an application calling OData on behalf of a user → OAuth with the SAML bearer grant or principal propagation.

<!-- section: saas-authentication | objectives: 1.2.4 -->
## Authentication for SAP SaaS applications

SAP SaaS applications (SAP SuccessFactors, SAP Analytics Cloud, SAP Business Technology Platform, SAP Business ByDesign, SAP Customer Experience such as C4C, Qualtrics) use **SAML single sign-on** with Microsoft Entra ID, configured from the Microsoft Entra application gallery.

When several SAP cloud services are involved, the recommended pattern places **SAP Cloud Identity Services (Identity Authentication, IAS)** in the middle:

```text
User ──► SAP BTP application ──► SAP Cloud Identity Services (proxy IdP) ──► Microsoft Entra ID (corporate IdP)
          authorization:            trust to Microsoft Entra ID                authentication, MFA,
          role collections                                                       Conditional Access
```

| Design point | Recommendation |
| --- | --- |
| Who authenticates | Microsoft Entra ID, as the corporate identity provider of IAS; risk-based controls (Conditional Access) in one central place |
| Who authorizes | SAP BTP and IAS: map BTP **role collections** to Microsoft Entra groups, sent in a claim named `Groups` with the group Object ID, limited to groups assigned to the application |
| BTP trust | Trust configuration from the BTP subaccount to IAS, with "Create Shadow Users During Logon" |
| IAS tenants | One production IAS tenant for all end users; other tenants only for testing configuration |
| BTP subaccounts | Group only applications with similar identity requirements: trust settings and role collections apply to the whole subaccount |
| Certificates | A process to roll over the SAML signing certificates of the BTP subaccount, the IAS tenant and the Microsoft Entra application; a group mailbox for expiry notices |

**User provisioning**:

| Direction | Mechanism |
| --- | --- |
| Microsoft Entra ID → SAP Cloud Identity Services | Microsoft Entra provisioning with the SCIM 2.0 connector: users and groups (group provisioning needs Microsoft Entra ID P1); authenticates with the client ID and secret of an IAS administrator of type **System**; incremental cycles about every 40 minutes; only users assigned the **User** role are in scope; `userName` and work email are required |
| SAP SuccessFactors → Microsoft Entra ID (or Active Directory) | HR-driven inbound provisioning from Employee Central, with optional **email write-back** to SuccessFactors |
| Microsoft Entra ID → SAP Analytics Cloud | Microsoft Entra automated provisioning |

SAP Identity Management (SAP IDM) is being retired; SAP and Microsoft recommend migrating its scenarios to **Microsoft Entra ID Governance**, which integrates with SAP Cloud Identity Services.

> **Exam trap.** SuccessFactors is the source of truth for employees: the provisioning flow goes from SuccessFactors into Microsoft Entra ID, not the other way. Toward SAP Cloud Identity Services, the flow goes from Microsoft Entra ID.

<!-- section: management-hierarchy | objectives: 1.2.5 -->
## Management groups, subscriptions and resource groups

| Level | Facts and limits | SAP use |
| --- | --- | --- |
| Management group | 10,000 per directory; up to six levels below the root; one parent; the root is the **Tenant root group**, whose ID is the tenant ID; new subscriptions land under the root by default | An SAP (or "SAP landing zones") management group under the landing zones group, where SAP policies and role assignments are inherited |
| Subscription | Unit of billing, quotas, policy and access; resource groups limited to 980 per subscription | Separate subscriptions for the hub (connectivity), SAP production (production and its DR systems) and SAP non-production, or one subscription per workload zone |
| Resource group | Resources that share a lifecycle and permissions; a resource has one resource group | Group by SAP system and layer (for example one resource group per SID), with SID and environment tags |

```text
Tenant root group
└── Contoso
    ├── Platform
    │   ├── Identity
    │   ├── Management
    │   └── Connectivity ── sub-hub (hub VNets, ExpressRoute, firewall, DNS)
    └── Landing zones
        └── SAP ── policies: allowed SKUs, tags, zone resilience
            ├── sub-sap-prd   (PRD + DR systems)
            └── sub-sap-nonprd (SBX, DEV, QAS)
```

- Assignments (roles and policies) at a management group apply to every subscription moved under it later.
- Production and non-production in separate subscriptions keep their quotas, budgets and permissions apart, and a mistake in non-production can't touch production.
- Use existing subscriptions effectively, plan growth early and start new environments with a small set of subscriptions.

> **Exam tip.** "Apply to all current and future SAP subscriptions" points to an assignment at the SAP management group. "Only to the PRD system" points to its resource group.

<!-- section: landing-zones | objectives: 1.2.6 -->
## Azure landing zones for SAP

The SAP scenario of the Cloud Adoption Framework builds on an existing enterprise-scale **Azure landing zone**: deploy the platform first, then the SAP workload landing zones.

| Component | Content |
| --- | --- |
| Platform landing zone | Identity, management (Log Analytics, monitoring) and connectivity subscriptions; the hub with ExpressRoute, a site-to-site VPN as ExpressRoute backup, firewall and DNS |
| SAP application landing zones | SAP production and non-production subscriptions; one spoke virtual network per workload zone (production, QA, development, sandbox) peered to the hub |
| Topology | Hub-spoke, or Azure Virtual WAN with the SAP virtual networks as spokes of the virtual hub |
| Deployment of SAP systems | SAP Deployment Automation Framework (Terraform for the infrastructure, Ansible for the OS and SAP configuration), or Azure Center for SAP solutions (guided S/4HANA deployment, registration of existing systems, start and stop) |

The SAP landing zone design covers five design areas: identity and access management; network topology and connectivity; business continuity and disaster recovery; security, governance and compliance; platform automation and DevOps.

Network rules that the landing zone must respect:

- All the VMs of one SAP system (application and database) in one spoke virtual network, in separate subnets.
- No firewall or other NVA between the application and database subnets; traffic from users and other systems is inspected in the hub.
- Private endpoints for the storage services used by SAP (for example Azure Files).
- DR systems of production in the production subscription, in a second region with its own spoke and hub.

> **Exam trap.** A landing zone that puts the SAP application servers and the database in two spokes, with the hub firewall between them, isn't supported: the whole SAP system stays in one virtual network.

<!-- section: key-points -->
## Key points

- Separate Azure administration from SAP Basis: Virtual Machine Contributor in non-production, a narrow custom role through PIM in production.
- Azure Center for SAP solutions needs its administrator role for users and its service role on a user-assigned managed identity.
- Policy with `deny` for allowed SKUs, regions and tags at the SAP management group; `deployIfNotExists` and `modify` need a managed identity and remediation.
- SAP on Windows joins Active Directory Domain Services; SAP GUI uses SNC with Kerberos, Fiori uses SAML with Microsoft Entra ID, OData callers use OAuth or principal propagation.
- SAP SaaS: Microsoft Entra ID authenticates, IAS proxies, BTP authorizes through role collections mapped to groups; provisioning into IAS from Microsoft Entra ID, from SuccessFactors into Microsoft Entra ID.
- Landing zones: platform first, then SAP production and non-production subscriptions with spokes peered to the hub; one SAP system per virtual network.
