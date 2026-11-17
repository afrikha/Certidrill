Privileged access is the shortest path to total compromise: one stolen Global Administrator session or one Domain Admin hash is enough to deploy ransomware everywhere. The SC-100 exam asks you to design who gets privileges, how, for how long and from which device, in Microsoft Entra ID, in on-premises Active Directory, in other clouds and in SaaS apps, and to evaluate whether an existing setup resists the attacks that target it.

<!-- section: enterprise-access-model | objectives: 2.3.1 -->
## The enterprise access model

The **enterprise access model** replaces the Active Directory tier model with a model that covers on-premises, multiple clouds and internal and external access.

| Plane or pathway | Contains | Replaces |
| --- | --- | --- |
| Control plane | Centralized identity and access control (Microsoft Entra ID, AD DS, PIM, Conditional Access), plus network access control where it is the only option (legacy OT) | Tier 0 |
| Management plane | IT management of workloads and their infrastructure, on-premises, in Azure or another cloud | Tier 1 |
| Data/workload plane | Business processes in applications and workloads, intellectual property in data | Tier 1 |
| User access | Employees, partners (B2B) and customers (B2C) reaching resources | Tier 2 |
| App access | Programmatic access through APIs | Tier 2 |
| Privileged access | Pathways used by IT staff, developers and others to manage systems | Cross-cutting |

Rules:

- **Lower planes must never control higher planes**: control plane, then management plane, then data/workload plane. A server administrator must not be able to change a domain controller or a Conditional Access policy.
- Apply Zero Trust to every access: verify explicitly, least privilege, assume breach.
- Continuously audit for configurations that allow unintended escalation (a help desk group that can reset administrator passwords, an app with `RoleManagement.ReadWrite.Directory`).

Delegation design with Microsoft Entra ID:

| Need | Design |
| --- | --- |
| Help desk resets passwords of one country's users | Helpdesk Administrator scoped to an **administrative unit** |
| Protect privileged accounts from lower administrators | **Restricted management administrative units** or role-assignable groups |
| A team manages one application | Application-scoped role assignment (Application Administrator on that app) or a custom role |
| Azure operators manage virtual machines of one landing zone | Azure RBAC role at the subscription or resource group, eligible through PIM |
| Delegate role assignment safely | Role Based Access Control Administrator with a condition limiting which roles can be assigned |

> **Exam trap.** Granting Global Administrator "because a narrower role is unknown" violates least privilege; so does assigning a role at the tenant level when an administrative unit or app scope meets the requirement.

<!-- section: entra-governance | objectives: 2.3.2 -->
## Microsoft Entra security and governance: PIM, entitlement management, access reviews

The three features answer different questions:

| | Privileged Identity Management (PIM) | Entitlement management | Access reviews |
| --- | --- | --- | --- |
| Question | When are privileged roles active? | How is access requested and granted? | Should existing access continue? |
| Model | Eligible versus active assignments, just-in-time activation | Access packages (groups, Teams, apps, SharePoint sites) with request policies, approvals and expiration | Recurring recertification by reviewers, with automatic removal |
| Scope | Microsoft Entra roles, Azure resource roles, PIM for Groups | Employees and external users (connected organizations) | Groups, Teams, apps, guests, access packages, privileged roles |

**PIM** design: eligible assignments for every privileged role; activation requires MFA or a Conditional Access **authentication context** (for example phishing-resistant authentication), a justification and, for the most sensitive roles, an approval; short maximum activation (1 to 24 hours); time-bound eligibility; alerts on roles assigned outside PIM; PIM for Groups to make group membership just in time.

**Entitlement management** design: catalogs owned by the business, access packages with expiration, separation of duties checks (incompatible packages), connected organizations so partners request access themselves and are removed when it expires.

**Licensing**: Microsoft Entra ID P2 includes PIM and basic access reviews; Microsoft Entra ID Governance (or Microsoft Entra Suite) is the license for the full set of governance capabilities, including lifecycle workflows.

| Requirement | Feature |
| --- | --- |
| Administrators must request the Exchange Administrator role and get it for 4 hours | PIM, eligible assignment |
| Contractors request access to a project's resources, approved by the project lead, removed after 90 days | Entitlement management access package |
| Every quarter, managers confirm their team members still need an app | Access review |
| Partner users get access without an administrator creating guests | Entitlement management with a connected organization |

> **Exam trap.** PIM limits **when** a privilege is usable; it doesn't decide whether someone should still hold it. That is the access review. And an access package governs requests, not privileged role activation.

<!-- section: ad-ds-resilience | objectives: 2.3.3 -->
## Evaluating AD DS security and resilience

Evaluate AD DS against the attacks used in ransomware and domain compromise:

| Attack | What the attacker does | Mitigation to look for |
| --- | --- | --- |
| Pass-the-hash, pass-the-ticket | Reuses credentials stolen from a machine's memory | Tiering (admins never sign in to lower-tier machines), Credential Guard, Windows LAPS, Protected Users |
| Kerberoasting | Requests service tickets and cracks service account passwords offline | gMSA or long random passwords, AES only, few SPNs on privileged accounts |
| Password spray, brute force | Tries common passwords on many accounts | Banned passwords (Microsoft Entra Password Protection on-premises), smart lockout, MFA on exposed services |
| DCSync, DCShadow | Abuses replication rights to read hashes or push changes | Audit and restrict replication permissions; Defender for Identity detection |
| Golden Ticket | Forges tickets with the `krbtgt` key | Protect domain controllers; reset the `krbtgt` password twice after a compromise |
| Certificate abuse (AD CS) | Requests certificates that impersonate administrators | Treat AD CS as tier 0, review vulnerable templates |
| Group Policy or ACL abuse | Uses delegated rights to escalate | Review delegations, AdminSDHolder, lateral movement paths |

**Governance and resilience** checks:

- A documented **forest recovery** plan, with domain controller backups that are offline or immutable and tested restores: ransomware targets domain controllers.
- Admin accounts in AD DS aren't synchronized to Microsoft Entra privileged roles: cloud administrators are **cloud-only** accounts.
- **Microsoft Defender for Identity** sensors on domain controllers (and AD FS, AD CS, Microsoft Entra Connect servers); its posture assessments in **Microsoft Secure Score** and its **lateral movement paths** show exposed sensitive accounts.

> **Exam tip.** "An on-premises compromise must not give control of the Microsoft 365 tenant" means cloud-only privileged accounts, no synchronization of AD admin accounts to privileged roles, and PHS so cloud sign-in doesn't depend on on-premises infrastructure.

<!-- section: cloud-tenant-admin | objectives: 2.3.4 -->
## Securing the administration of cloud tenants

**Microsoft Entra and Microsoft 365 tenants**:

| Control | Design |
| --- | --- |
| Emergency access | At least two cloud-only emergency access accounts with phishing-resistant credentials, excluded from Conditional Access policies that could lock them out, sign-ins monitored and alerted |
| Global Administrators | Fewer than five, eligible through PIM, never used for daily work |
| Authentication | Phishing-resistant authentication strength (passkeys, Windows Hello for Business, certificate-based) for every admin role |
| Devices | Admin portals accessible only from compliant privileged access devices (Conditional Access) |
| Sensitive changes | Protected actions on Conditional Access, cross-tenant settings and hard deletion |
| Detection | Alerts on PIM role activations outside expected hours, new credentials on privileged apps, consent grants |

**Azure**: privileged roles (Owner, User Access Administrator, Role Based Access Control Administrator) eligible through PIM at management group or subscription scope; avoid permanent assignments at the root management group; a Global Administrator who uses **elevate access** to the root scope removes it right after use, and the change is logged.

**AWS and GCP**: federate their consoles with Microsoft Entra ID (SSO, provisioning) so Microsoft Entra MFA, Conditional Access, PIM for Groups (for group-based role mapping) and access reviews apply; lock away AWS root users and GCP super administrators with strong MFA and use them only for break-glass; monitor their activity with Defender for Cloud Apps app connectors and Sentinel.

**SaaS apps**: administer them through SSO with dedicated admin accounts, review admin role holders, and use the **SaaS security posture management** of Defender for Cloud Apps to find risky configurations.

> **Exam trap.** Synchronizing an on-premises Domain Admin account and assigning it Global Administrator joins the two control planes: a compromise of either becomes a compromise of both.

<!-- section: ciem | objectives: 2.3.5 -->
## Cloud infrastructure entitlement management

**Cloud infrastructure entitlement management (CIEM)** finds the gap between the permissions identities have and the permissions they use, across clouds.

**Microsoft Entra Permissions Management** was retired: no longer sold since April 1, 2025 and retired on November 1, 2025. CIEM is now part of the **Defender Cloud Security Posture Management (Defender CSPM)** plan of Microsoft Defender for Cloud:

| Cloud | Identities analyzed |
| --- | --- |
| Azure | Microsoft Entra users, groups and service principals |
| AWS | IAM users, roles and groups |
| GCP | IAM users, groups and service accounts |

Capabilities: recommendations to remove inactive, guest or blocked accounts that still have access, to limit administrative privileges, to right-size overprovisioned permissions based on actual use and to enforce MFA for IAM users; **cloud security explorer** queries on effective permissions ("who can reach this internet-exposed storage?"); **attack path analysis** that correlates overprivileged identities with lateral movement; a CIEM workbook.

| Requirement | Recommendation |
| --- | --- |
| Find unused permissions of AWS roles and GCP service accounts with one tool | Defender CSPM CIEM in Defender for Cloud (enable the plan on the AWS and GCP connectors) |
| Make Azure Owner assignments just in time | PIM for Azure resources |
| Detect that an overprivileged identity opens a path to a sensitive database | Attack path analysis (Defender CSPM) |

> **Exam trap.** A design that proposes Microsoft Entra Permissions Management in November 2026 proposes a retired product: use Defender CSPM.

<!-- section: access-reviews | objectives: 2.3.6 -->
## Evaluating an access review solution

Evaluate an access review design against these criteria:

| Criterion | Good design |
| --- | --- |
| Scope | All privileged roles (Microsoft Entra and Azure, through PIM), guests in all groups and Teams, access packages, high-value apps |
| Reviewers | Resource owners or managers for business access; a second reviewer stage for privileged roles; self-review only for low-risk access |
| Frequency | Quarterly or more for privileged roles and guests; at least yearly for standard app access |
| Decision helpers | Recommendations based on sign-in activity (inactive users), so reviewers don't approve blindly |
| No response | *If reviewers don't respond*: remove access or take recommendations, not approve |
| Enforcement | **Auto apply results** to remove access automatically; guests removed from the tenant after denial |
| Evidence | Review history kept and exportable for auditors |

Weak designs: reviews without auto-apply (decisions never enforced), reviewers who don't know the resource, a default of "approve" when nobody answers, and privileged roles left out of the scope.

> **Exam tip.** "Remove guests who no longer use the team, with the least administrative effort" means an access review of guests with recommendations, auto-apply and removal on denial, not a script.

<!-- section: privileged-workstations | objectives: 2.3.7 -->
## Secure workstations for privileged access, including remote access

The **clean source principle**: a session is never more secure than the device it starts from. An attacker who controls the device steals tokens and credentials, whatever MFA the account uses.

| Device profile | For | Key controls |
| --- | --- | --- |
| Enterprise | All users, general developers | Defender for Endpoint, Intune management, users can run most apps and browse |
| Specialized | Users who need a controlled environment | No local admin, only authorized apps (application control enforced), apps installed only through Intune |
| Privileged access workstation (PAW) | Roles whose compromise would materially affect the organization | No local admin, application control enforced, web browsing denied by default except approved destinations, no email, Credential Guard, BitLocker, no BYOD |

PAWs are deployed with **Windows Autopilot** on hardware with TPM 2.0, Secure Boot and virtualization-based security, managed by Intune, and their compliance is enforced by Conditional Access (admin portals only from compliant PAWs). Administrators therefore use separate accounts and separate devices for productivity and administration.

**Remote access through intermediaries**:

| Intermediary | Guidance |
| --- | --- |
| VPN | Microsoft Entra authentication and Conditional Access, rapid patching; move toward per-app access |
| Jump server, RDS, VDI | Never expose RDP directly to the internet; publish through Microsoft Entra application proxy or use Azure Bastion; dedicated instances for privileged roles |
| Azure Bastion | Browser-based RDP and SSH to Azure VMs without public IPs; the Azure portal session must meet the privileged security level |
| Microsoft Entra application proxy, Private Access | Per-app access to on-premises apps with Conditional Access; Defender for Cloud Apps session controls |
| PAM solutions | Store privileged credentials, so they are high-value targets; require a second person for business-critical workflows |

> **Exam trap.** A jump server doesn't fix a compromised administrator workstation: the attacker rides the session through it. The clean source starts at the PAW, and every intermediary inherits its trust from the device and account that connect to it.

<!-- section: key-points -->
## Key points

- Enterprise access model: control plane, management plane, data/workload plane, user and app access; lower planes never control higher ones.
- Delegate with administrative units, app scopes and conditions, not tenant-wide roles.
- PIM = when (just in time); entitlement management = how access is requested; access reviews = whether access continues.
- AD DS: tiering, LAPS, gMSA, Protected Users, Defender for Identity, tested forest recovery.
- Cloud administrators are cloud-only, phishing-resistant, eligible through PIM, on PAWs; two emergency access accounts; fewer than five Global Administrators.
- Permissions Management is retired; CIEM is in Defender CSPM for Azure, AWS and GCP.
- Access reviews: right scope and reviewers, recommendations, auto-apply, no default approval.
- PAW plus a hardened intermediary (Bastion, application proxy, Private Access); never direct RDP.
