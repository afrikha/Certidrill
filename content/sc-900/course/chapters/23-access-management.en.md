Once a user is authenticated, two mechanisms decide what happens next: Conditional Access decides whether the sign-in may go through and under which conditions, and roles decide what the user may administer. The exam tests the vocabulary of both, and the difference between Microsoft Entra roles and Azure roles.

<!-- section: conditional-access | objectives: 2.3.1 -->
## Microsoft Entra Conditional Access

**Conditional Access** is Microsoft's Zero Trust policy engine: it brings **signals** together, makes a **decision** and enforces it. A policy is an if-then statement: *if* a user wants to access a resource, *then* they must complete an action, for example "if a user accesses Microsoft 365, they must perform multifactor authentication".

A policy has two parts. **Assignments** say when it applies; all of them must be met:

| Assignment | Examples |
| --- | --- |
| Users | All users, specific users or groups, directory roles, guests, workload identities, agents |
| Target resources | Cloud applications such as Microsoft 365, or user actions such as registering security information |
| Network | Named locations, trusted IP address ranges, countries or regions |
| Conditions | Sign-in risk and user risk (from Microsoft Entra ID Protection), device platform, client apps, filters for devices |

**Access controls** say what happens:

| Control | Options |
| --- | --- |
| **Block** | Deny access; the most restrictive decision |
| **Grant** | Allow access, possibly on condition: require multifactor authentication, require an authentication strength, require a compliant device, require a Microsoft Entra hybrid joined device, require an app protection policy (the older "require approved client app" control retired in early March 2026), require a password change, require terms of use |
| **Session** | Limit the experience after access is granted: sign-in frequency, application-enforced restrictions, Conditional Access App Control with Microsoft Defender for Cloud Apps |

An **authentication strength** specifies which combinations of methods are accepted; three are built in: multifactor authentication, passwordless MFA and phishing-resistant MFA.

Commonly applied policies:

| Requirement | Policy |
| --- | --- |
| Protect administrators | Require MFA for users with administrative roles |
| Protect Azure management | Require MFA for Azure management tasks |
| Close an old attack path | Block sign-ins that use legacy authentication protocols |
| Restrict by location | Block or grant access from specific locations |
| Trust only managed devices | Require a compliant device for specific applications |
| React to risk | Block or challenge risky sign-ins |

- Conditional Access is enforced **after first-factor authentication**: it isn't a frontline defense against attacks such as denial of service.
- It requires **Microsoft Entra ID P1**; policies based on sign-in risk or user risk need Microsoft Entra ID Protection, a **P2** feature.
- **Report-only** mode lets you evaluate the impact of a policy before enforcing it.

> **Exam trap.** Conditional Access isn't an authentication method and doesn't replace MFA: it is the policy that decides *when* MFA, or another control, is required. "Require MFA only outside the corporate network" is Conditional Access.

<!-- section: entra-roles | objectives: 2.3.2 -->
## Microsoft Entra roles and role-based access control

**Role-based access control** (RBAC) grants permissions through roles rather than user by user. **Microsoft Entra roles** control permissions to manage Microsoft Entra resources: creating users, resetting passwords, managing applications, viewing billing information.

| Kind of role | Description |
| --- | --- |
| **Built-in** | Created by Microsoft, with a fixed set of permissions; free |
| **Custom** | A collection of permissions you choose from a preset list, then assign; requires Microsoft Entra ID P1 or P2 |

| Built-in role | Can |
| --- | --- |
| **Global Administrator** | Manage all administrative features of Microsoft Entra ID and assign roles to others; the person who signs up for the tenant gets this role |
| **User Administrator** | Create and manage all aspects of users and groups |
| **Billing Administrator** | Make purchases and manage subscriptions |

| Category | Examples |
| --- | --- |
| Microsoft Entra specific roles | User Administrator, Application Administrator, Groups Administrator |
| Service-specific roles | Exchange Administrator, Intune Administrator, SharePoint Administrator, Teams Administrator |
| Cross-service roles | Security Administrator, Compliance Administrator |

A **role assignment** attaches a role definition to a security principal (a user, a role-assignable group or a service principal) at a **scope**: the whole tenant, an administrative unit, or a single resource such as one application. A group can receive a Microsoft Entra role only if it was created as role-assignable, which requires P1 or P2 and assigned (not dynamic) membership.

Apply **least privilege**: someone who only manages users gets User Administrator, not Global Administrator, which limits the damage if the account is compromised.

Microsoft Entra roles and Azure roles are two separate systems:

| | Microsoft Entra roles | Azure roles (Azure RBAC) |
| --- | --- | --- |
| Control access to | Microsoft Entra resources: users, groups, applications | Azure resources: virtual machines, storage, databases |
| Scope | Tenant, administrative unit, single object | Management group, subscription, resource group, resource |
| Examples | Global Administrator, User Administrator | Owner, Contributor, Reader |

> **Exam trap.** By default a Global Administrator has no access to Azure resources, and an Owner of a subscription can't manage users in Microsoft Entra ID. A Global Administrator can, however, elevate their access to manage all the Azure subscriptions of the tenant.

<!-- section: key-points -->
## Key points

- Conditional Access: signals, then a decision (block, or grant with conditions), enforced after the first factor.
- Signals: user or group, application, location, device, risk. Grant controls: MFA, authentication strength, compliant device, password change, terms of use.
- Conditional Access needs Microsoft Entra ID P1; risk-based policies need P2.
- Microsoft Entra roles manage Microsoft Entra resources; built-in roles are fixed and free, custom roles need P1.
- Global Administrator: everything in Microsoft Entra ID; the person who creates the tenant. Prefer the least privileged role.
- Azure roles (Owner, Contributor, Reader) manage Azure resources; the two systems don't overlap by default.
