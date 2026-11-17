Microsoft Entra ID authenticates people, applications and workloads; Azure RBAC and a few neighbouring controls authorize what they do. The questions state constraints (an existing Active Directory, partners, customers, legacy applications, secrets in code) and ask for the design that meets them with the least infrastructure.

<!-- section: hybrid-authentication | objectives: 1.2.1 -->
## Authentication for hybrid identities

Users of an on-premises Active Directory Domain Services (AD DS) are synchronized to Microsoft Entra ID, and you choose where their password is validated:

| | Password hash synchronization (PHS) | Pass-through authentication (PTA) | Federation with AD FS |
| --- | --- | --- | --- |
| Password validated | In the cloud, against a synchronized hash | On-premises, by agents that reach the domain controllers | On-premises, by the federation service |
| On-premises infrastructure | Nothing beyond the synchronization tool | Lightweight agents (three recommended), outbound connections only | AD FS and Web Application Proxy servers, a perimeter network, load balancing, certificates |
| Disabled or locked account, expired password, sign-in hours | Not enforced immediately (a disabled account can take up to 30 minutes) | Enforced at each sign-in | Enforced at each sign-in |
| Sign-in when the datacenter is unreachable | Works | Fails | Fails |
| Leaked credential detection | Yes | Only if PHS is also enabled | Only if PHS is also enabled |
| Choose it when | Nothing else is required: least effort, highest availability | On-premises account states and sign-in hours must apply immediately, without federation servers | A requirement Microsoft Entra ID doesn't support natively: third-party multifactor provider, sign-in with `sAMAccountName` |

- **Seamless single sign-on** works with PHS and PTA: on domain-joined devices inside the corporate network, users aren't asked for their password again.
- Enable PHS even when PTA or federation is the sign-in method: it is the backup if the on-premises servers fail, and the prerequisite for leaked credential detection.

> **Exam trap.** PTA doesn't fail over to PHS by itself: switching the sign-in method is a manual change. "Users must still sign in to Microsoft 365 if the datacenter is offline" points to PHS as the primary method.

<!-- section: strong-authentication | objectives: 1.2.1 -->
## Strong authentication and Conditional Access

| Method | What to remember |
| --- | --- |
| Windows Hello for Business | Credential bound to a Windows device, unlocked by a PIN or biometrics |
| Passkey (FIDO2) on a security key or in Microsoft Authenticator | Device-bound and phishing-resistant; recommended for administrators and regulated users |
| Synced passkey | Stored by a passkey provider and available on all the user's devices |
| Certificate-based authentication | Certificates and smart cards validated by Microsoft Entra ID itself, without federation servers |
| Password plus multifactor authentication | Stronger than a password, but not phishing-resistant |

**Conditional Access** is the policy engine: if a set of signals is present (user or group, application, location, device platform and state, risk), then block, or grant access under controls (multifactor authentication, an authentication strength, a compliant device, a Microsoft Entra hybrid joined device, terms of use, a password change). Policies are evaluated after the first authentication factor.

| Requirement | Recommend |
| --- | --- |
| Baseline multifactor authentication for every user, with no additional licence | Security defaults |
| Multifactor authentication only outside trusted locations, or only for some applications | Conditional Access (Microsoft Entra ID P1) |
| Administrators must use phishing-resistant methods | Conditional Access with an authentication strength |
| Only devices managed by the company may reach an application | Conditional Access requiring a compliant or hybrid joined device |
| React automatically to risky sign-ins and to users whose credentials leaked | Risk-based Conditional Access with Microsoft Entra ID Protection (Microsoft Entra ID P2) |
| Measure the impact of a policy before enforcing it | Report-only mode and the What If tool |

> **Exam tip.** Read the licence in the stem. Conditional Access needs Microsoft Entra ID P1; anything based on sign-in risk or user risk needs P2. If the company "has Microsoft Entra ID Free and must minimize costs", the answer is security defaults.

<!-- section: identity-management | objectives: 1.2.2 -->
## Directories, synchronization and external users

Two tools synchronize AD DS to Microsoft Entra ID:

| | Microsoft Entra Cloud Sync | Microsoft Entra Connect Sync |
| --- | --- | --- |
| Architecture | Lightweight agents on-premises, configuration held in the cloud | A synchronization server on-premises |
| High availability | Several active agents with automatic failover | One active server, plus a second one in staging mode |
| Disconnected forests (mergers and acquisitions) | Supported | Not supported |
| Limits | 150,000 objects per domain; groups up to 50,000 members | No object limit; groups up to 250,000 members |
| PTA and AD FS configuration | Managed separately | Included in the tool |
| Recommend | By default: it is Microsoft's strategic direction | When a limit or a missing capability rules out Cloud Sync |

Which directory service does a workload need?

| Need | Recommend |
| --- | --- |
| Cloud identities, single sign-on to SaaS and custom applications with OpenID Connect, OAuth or SAML | Microsoft Entra ID |
| Legacy applications moved to Azure virtual machines that need domain join, Group Policy, LDAP, Kerberos or NTLM, without running domain controllers | Microsoft Entra Domain Services (managed domain) |
| The same, plus schema extensions, Domain Admin rights or full control of the domain | AD DS on Azure virtual machines, self-managed |

> **Exam trap.** Microsoft Entra Domain Services validates Kerberos and NTLM with password hashes. Users who authenticate only through AD FS federation have no usable hash in Microsoft Entra ID: enable password hash synchronization, or Domain Services can't sign them in.

External users don't all belong in the same place:

| Users | Recommend | Where the accounts live |
| --- | --- | --- |
| Partners and suppliers who work on your applications and resources | B2B collaboration | Guest users in your workforce tenant, signing in with their own identity provider |
| Partner users in Microsoft Teams shared channels | B2B direct connect | In their home tenant only; the two organizations enable a mutual trust |
| Employees of one organization spread over several tenants | Cross-tenant synchronization | In their home tenant; access to the other tenants without invitation or consent prompt |
| Consumers and business customers of an application you publish | Microsoft Entra External ID in an external tenant | In a tenant separate from the employees, with branded sign-up, social accounts and one-time passcodes |

Azure AD B2C is the legacy customer identity service: it has not been available to new customers since May 1, 2025. A new design uses an External ID external tenant.

<!-- section: workload-identities | objectives: 1.2.2, 1.2.3 -->
## Identities for applications and workloads

| Where the code runs | Recommend | Credential to manage |
| --- | --- | --- |
| On an Azure resource: virtual machine, App Service, Functions, Azure Kubernetes Service | Managed identity | None |
| On a server connected with Azure Arc | The managed identity of the Arc-enabled server | None |
| Outside Azure with its own identity provider: GitHub Actions, Kubernetes elsewhere, another cloud | Workload identity federation, configured on an app registration or on a user-assigned managed identity | None: Microsoft Entra ID trusts the external token |
| Anywhere else | App registration and its service principal | A certificate or a client secret, kept in Azure Key Vault and rotated |

| | System-assigned managed identity | User-assigned managed identity |
| --- | --- | --- |
| Life cycle | Created with the resource and deleted with it | A standalone resource, deleted explicitly |
| Sharing | One resource | Several resources |
| Recommend | One resource that needs its own, separately audited identity | Several resources with the same permissions, resources recreated often, or permissions that must exist before the resource does |

A managed identity only proves who the workload is. It still needs a role assignment on the target (for example Storage Blob Data Reader on a container, or Key Vault Secrets User on a vault).

<!-- section: authorize-azure | objectives: 1.2.3 -->
## Authorizing access to Azure resources

Two role systems coexist:

| | Azure roles (Azure RBAC) | Microsoft Entra roles |
| --- | --- | --- |
| Control | Azure resources | Directory objects: users, groups, applications, licences |
| Scopes | Management group, subscription, resource group, resource | Tenant, administrative unit, single object |
| Examples | Owner, Contributor, Reader, Storage Blob Data Reader | Global Administrator, User Administrator, Application Administrator |

A Global Administrator has no access to Azure resources by default, but can elevate access to obtain User Access Administrator over all the subscriptions of the tenant.

Design rules:

- Assign roles to **groups**, at the **narrowest scope** that covers the need; use a management group for "all current and future subscriptions". Prefer a built-in role; create a custom role only when none fits.
- Control plane roles (Owner, Contributor) don't grant data access: reading blobs or secrets with Microsoft Entra authentication needs a data role.
- **Attribute-based access control (ABAC)** adds a condition to a role assignment for blob and queue data: container name, blob path, blob index tags, custom security attributes of the principal, private link, date and time.

| Requirement | Control |
| --- | --- |
| Who may do what on which resources | Azure RBAC |
| What may be deployed: regions, SKUs, configuration, whoever the user is | Azure Policy |
| Nobody, Owners included, deletes or changes a critical resource by accident | Resource lock |
| Read only the blobs that carry a given tag | Role assignment with an ABAC condition |
| Privileged roles held only when needed, with approval | Eligible assignments in Privileged Identity Management |
| A provider, or a central team in another tenant, manages subscriptions without guest accounts | Azure Lighthouse (delegated subscriptions or resource groups, at no extra cost) |

<!-- section: authorize-on-premises | objectives: 1.2.4 -->
## Authorizing access to on-premises resources

| Requirement | Recommend | Why |
| --- | --- | --- |
| Remote users open an on-premises web application with Microsoft Entra sign-in and Conditional Access, without VPN | Microsoft Entra application proxy | A private network connector on-premises makes outbound connections only (ports 80 and 443); pre-authentication in the cloud; Kerberos constrained delegation gives single sign-on to applications using Integrated Windows Authentication |
| Replace the VPN for any private resource defined by FQDN or IP address: file shares, RDP, SSH | Microsoft Entra Private Access | Global Secure Access client on the devices, the same connectors on-premises, Conditional Access per application |
| Users who sign in with Windows Hello for Business or a security key on Microsoft Entra joined devices must reach on-premises file shares and Kerberos applications | Microsoft Entra Kerberos (cloud Kerberos trust) | Microsoft Entra ID issues a partial Kerberos ticket that an on-premises domain controller completes; authorization stays in AD DS |
| Manage on-premises servers with Azure roles, policies and monitoring | Azure Arc-enabled servers | Each server becomes an Azure resource; Linux servers accept SSH sign-in with Microsoft Entra ID through the Virtual Machine Administrator Login and Virtual Machine User Login roles, without public IP address |
| Govern from the cloud the access to on-premises applications that authorize with AD groups | Cloud security groups provisioned to AD DS by Cloud Sync (group writeback), assigned through access packages | Membership of the AD group follows the cloud assignment and its expiration |

> **Exam trap.** Application proxy publishes web applications; it doesn't give network access and needs no inbound firewall port or perimeter network. For a file share or an SSH session, the answer is Private Access or a VPN, not application proxy.

<!-- section: key-vault | objectives: 1.2.5 -->
## Secrets, keys and certificates

Azure Key Vault stores three kinds of objects: **secrets** (passwords, connection strings, API keys), **keys** (cryptographic keys, for example for customer-managed encryption) and **certificates** (TLS certificates with their life cycle).

| Option | Key protection | Tenancy | Stores | Recommend when |
| --- | --- | --- | --- | --- |
| Key Vault Standard | Software | Multitenant | Keys, secrets, certificates | Lowest cost and no HSM requirement |
| Key Vault Premium | HSM, FIPS 140-3 Level 3 | Multitenant | Keys, secrets, certificates | HSM-protected keys are required; recommended minimum for customer-managed keys |
| Azure Key Vault Managed HSM | HSM, FIPS 140-3 Level 3 | Single-tenant, controlled by the customer | Keys only | Key sovereignty or a dedicated HSM is required |
| Azure Cloud HSM | HSM, FIPS 140-3 Level 3 | Single-tenant | Keys, certificates | Migrated applications that call an HSM through PKCS#11; no integration with Azure platform services |
| Azure Payment HSM | HSM | Single-tenant | Keys | Payment PIN processing |

- **One vault per application, per environment and per region**: a breach stays contained, and access is granted vault by vault.
- **Azure RBAC** is the recommended permission model and the default for new vaults from API version 2026-02-01. With legacy **access policies**, anyone who can write to the vault resource (Contributor, for example) can grant themselves access to its content, and Privileged Identity Management isn't supported.
- Applications authenticate with a **managed identity**. App Service and Azure Functions accept **Key Vault references** in their settings: no code change, and a reference without version picks up a new secret version within 24 hours.
- **Soft delete** is always on and can't be disabled: deleted vaults and objects are recoverable for 7 to 90 days (90 by default). **Purge protection** is optional: it forbids permanent deletion until the retention period ends, and services that encrypt with customer-managed keys, such as Azure Storage, require it.
- **Rotation**: a rotation policy creates new key versions automatically; certificates renew automatically with the integrated certificate authorities (DigiCert, GlobalSign); a secret is rotated by a function triggered by the near-expiry event that Key Vault sends to Event Grid. Two alternating sets of credentials avoid downtime.
- **Network and audit**: private endpoint, public access disabled, resource logs sent by a diagnostic setting.

> **Exam trap.** Managed HSM stores keys only. A design that also needs secrets or certificates adds a Key Vault, Premium if its keys must be HSM-protected.

<!-- section: key-points -->
## Key points

- PHS by default and always as a backup; PTA to enforce on-premises account states immediately; federation only for what Microsoft Entra ID can't do.
- Conditional Access needs P1, risk-based policies need P2, security defaults need no licence.
- Cloud Sync by default; Domain Services for legacy protocols without domain controllers; External ID external tenant for customers, B2B collaboration for partners.
- Managed identity on Azure and Arc, workload identity federation outside Azure, service principal with a certificate or secret as a last resort.
- Azure roles act on resources, Microsoft Entra roles on the directory; data access needs data roles; ABAC refines blob and queue access.
- Application proxy for on-premises web applications, Private Access for any private resource, Microsoft Entra Kerberos for AD DS resources.
- Key Vault Premium for HSM-protected keys, Managed HSM for single-tenant keys; Azure RBAC, managed identities, purge protection, one vault per application and environment.
