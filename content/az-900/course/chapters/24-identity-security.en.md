Identity is the first line of defense in the cloud: before any resource is reached, someone or something proves who it is. This chapter covers the identity services of Azure, then the security models and tools the exam names.

<!-- section: directory-services | objectives: 2.4.1 -->
## Directory services

**Microsoft Entra ID** is Microsoft's cloud identity and access management service. Users sign in to it to reach Microsoft cloud services (Azure, Microsoft 365) and the applications you develop.

| Service provided | Meaning |
| --- | --- |
| Authentication | Verifying identity, with self-service password reset, multifactor authentication and smart lockout |
| Single sign-on | One identity to access many applications |
| Application management | Managing cloud and on-premises applications and their access |
| Device management | Registering devices, so that access can depend on the device |

Active Directory on Windows Server is the on-premises directory; Microsoft Entra ID is a different, cloud-based service. **Microsoft Entra Connect** synchronizes on-premises identities to Microsoft Entra ID so that users keep a single identity for both.

**Microsoft Entra Domain Services** provides managed domain services: **domain join, Group Policy, LDAP and Kerberos or NTLM authentication**, without deploying, managing or patching domain controllers. It lets you run in Azure the legacy applications that can't use modern authentication. A managed domain takes its identities from Microsoft Entra ID through a one-way synchronization.

<!-- section: authentication-methods | objectives: 2.4.2 -->
## Authentication methods

**Authentication** establishes who a person, service or device is.

| Method | Principle | Benefit |
| --- | --- | --- |
| **Single sign-on** (SSO) | Sign in once, then access several applications, even from different providers | Fewer passwords to remember and to manage; access is granted and removed in one place. It is only as secure as the initial sign-in |
| **Multifactor authentication** (MFA) | An additional proof at sign-in, from at least two categories: something you **know** (password), something you **have** (phone, hardware key), something you **are** (fingerprint, face) | A stolen password is no longer enough |
| **Passwordless** | The password is replaced by something you have plus something you are or know | More convenient and more secure than a password |

Passwordless options in Microsoft Entra ID: **Windows Hello for Business** (biometrics or PIN tied to a device), the **Microsoft Authenticator app**, and **FIDO2 security keys** or passkeys.

<!-- section: external-identities | objectives: 2.4.3 -->
## External identities

An **external identity** is a person, device or service outside your organization. Microsoft Entra External ID covers the ways to work with them:

| Capability | Use |
| --- | --- |
| **Business-to-business (B2B) collaboration** | External users sign in with **their own identity** to your applications; they usually appear in your directory as guest users |
| **B2B direct connect** | A mutual trust with another Microsoft Entra organization, used for example by Teams shared channels; the users don't appear in your directory |
| **External tenants for customers** | Identity management for the customers of an application that you publish, who sign up with a local or social account |

External users bring their own credentials: you don't manage their passwords.

<!-- section: conditional-access | objectives: 2.4.4 -->
## Conditional Access

**Conditional Access** is the Microsoft Entra tool that allows or denies access to resources based on **signals**:

- who the user is and their group membership;
- where the user is (network location);
- which device is used and whether it is compliant;
- which application is requested;
- the risk level of the sign-in.

From these signals it takes a **decision**: allow, block, or allow with a requirement such as multifactor authentication or a compliant device. Typical uses: require MFA for administrators only, require MFA from unknown locations, block access from untrusted places, allow some applications only from managed devices.

<!-- section: rbac | objectives: 2.4.5 -->
## Azure role-based access control

**Azure RBAC** applies the principle of least privilege: give each identity only the access it needs. Access is granted by **assigning a role to an identity at a scope**.

| Element | Meaning |
| --- | --- |
| Role | A set of permissions. Built-in roles: **Owner** (everything, including access management), **Contributor** (everything except access management), **Reader** (view only); custom roles are possible |
| Scope | A management group, a subscription, a resource group or a single resource |

- Assignments are **inherited** by child scopes: a role on a subscription applies to all its resource groups and resources.
- RBAC is an **allow model**: permissions from several roles add up.
- It is enforced by Azure Resource Manager on every action that reaches a resource, whatever the tool used.

<!-- section: zero-trust-defense-in-depth | objectives: 2.4.6, 2.4.7 -->
## Zero Trust and defense in depth

**Zero Trust** is a security model that assumes the worst case and protects resources accordingly. The traditional model trusted everything inside the corporate network; Zero Trust trusts nothing by default and makes every request prove itself.

| Principle | Meaning |
| --- | --- |
| **Verify explicitly** | Always authenticate and authorize, using all available data points |
| **Use least privilege access** | Limit access with just-in-time and just-enough access |
| **Assume breach** | Minimize the impact of an intrusion: segment access, encrypt end to end, monitor |

**Defense in depth** protects information with **several layers**: if one is breached, the next one slows the attack.

| Layer | Examples |
| --- | --- |
| Physical security | Access control to datacenter buildings |
| Identity and access | Single sign-on, multifactor authentication, auditing of access |
| Perimeter | DDoS protection, perimeter firewalls |
| Network | Segmentation, deny by default, restricted inbound and outbound access |
| Compute | Secured access to virtual machines, endpoint protection, patching |
| Application | Applications free of vulnerabilities, secrets stored securely |
| Data | Controlled and encrypted access to data, the center of the model |

<!-- section: defender-for-cloud | objectives: 2.4.8 -->
## Microsoft Defender for Cloud

**Defender for Cloud** is a tool for security posture management and threat protection. It monitors your cloud, on-premises, hybrid and multicloud environments, and tells you how to harden them.

| It protects | How |
| --- | --- |
| Azure resources | Natively: many services are monitored without any deployment |
| Hybrid environments | On-premises servers connected through **Azure Arc** |
| Other clouds | Amazon Web Services and Google Cloud |

Its three functions:

| Function | Meaning |
| --- | --- |
| **Continuously assess** | Know your security posture; a **secure score** summarizes it, and vulnerabilities are identified |
| **Secure** | Harden resources with recommendations based on the Microsoft cloud security benchmark and on Azure Policy |
| **Defend** | Detect threats and raise **security alerts**; advanced protections for servers, containers, storage, databases |

<!-- section: key-points -->
## Key points

- Microsoft Entra ID: cloud identity (authentication, SSO, applications, devices). Entra Domain Services: managed domain join, Group Policy, LDAP, Kerberos for legacy applications.
- SSO: one sign-in for many applications. MFA: two or more of know, have, are. Passwordless: Windows Hello for Business, Authenticator app, FIDO2.
- External identities sign in with their own credentials (B2B guests).
- Conditional Access: signals, then allow, block or require MFA.
- RBAC: role + identity + scope, inherited, additive. Owner, Contributor, Reader.
- Zero Trust: verify explicitly, least privilege, assume breach. Defense in depth: seven layers from physical security to data.
- Defender for Cloud: assess (secure score), secure (recommendations), defend (alerts), across Azure, hybrid and multicloud.
