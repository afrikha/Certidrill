Microsoft Entra ID decides who gets a token, under which conditions and with which privileges. SC-500 questions put you in front of the admin center: make a role eligible instead of permanent, write a Conditional Access policy that does what the requirement says (and no more), choose the authentication method or strength, give an application or an Azure resource an identity without a secret, and control what users may consent to.

<!-- section: pim | objectives: 1.1.1 -->
## Privileged Identity Management

**Privileged Identity Management (PIM)** gives just-in-time, time-bound and approval-based access to three kinds of privileges: **Microsoft Entra roles**, **Azure resource roles** and **PIM for Groups** (membership or ownership of a security group or Microsoft 365 group).

| Assignment type | Meaning | Duration options |
| --- | --- | --- |
| Eligible | The user must **activate** the role (MFA, justification, approval...) before using it | Permanent eligible or time-bound eligible (start and end dates) |
| Active | The user holds the privileges without any action | Permanent active or time-bound active |

**Role settings** are defined per role and shared by every assignment of that role (Entra admin center: **ID Governance > Privileged Identity Management > Microsoft Entra roles > Roles >** role **> Role settings > Edit**):

| Setting | Detail |
| --- | --- |
| Activation maximum duration | 1 to 24 hours; the user chooses a duration up to this value |
| On activation, require multifactor authentication | Or, instead, **require Microsoft Entra Conditional Access authentication context** (for example a phishing-resistant strength or a compliant device). If no enabled policy targets the context, MFA is required as a fallback |
| Require justification / ticket information on activation | The ticket number is informational, not validated |
| Require approval to activate | Choose approvers (two recommended). With none selected, active Privileged Role Administrators and Global Administrators approve |
| Allow permanent eligible assignment / Expire eligible assignment after | Forces end dates on eligible assignments |
| Allow permanent active assignment / Expire active assignment after | Forces end dates on active assignments |
| Require multifactor authentication / justification on active assignment | Applies to the administrator who creates the active assignment |
| Notifications | Per email type; at most 1,000 recipients per event |

- **Licenses**: Microsoft Entra ID P2 or Microsoft Entra ID Governance, for users with eligible or time-bound assignments, approvers and reviewers.
- **Who manages**: for Microsoft Entra roles, Privileged Role Administrator or Global Administrator. For Azure resource roles, Owner or User Access Administrator of the resource; Privileged Role Administrators can't see them by default.
- Users can request to **extend** an assignment that is about to expire, or **renew** an expired one; an administrator approves.
- **PIM for Groups** has two policies per group (membership, ownership). It doesn't support dynamic membership groups or groups synchronized from on-premises. A group must be **role-assignable** to receive a Microsoft Entra role; role-assignable groups can be managed only by Global Administrators, Privileged Role Administrators and their owners.

> **Exam trap.** "Users must request the role and an approver must accept" is an **eligible** assignment with **Require approval to activate**. A time-bound **active** assignment expires on a date but never asks for activation, MFA or approval.

<!-- section: conditional-access | objectives: 1.1.2 -->
## Conditional Access policies

A Conditional Access policy is an if-then statement evaluated after the first authentication factor. It needs **Microsoft Entra ID P1**; policies using **sign-in risk** or **user risk** need Microsoft Entra ID Protection (**P2**).

| Part | Options |
| --- | --- |
| Users | Users, groups, directory roles, guests; workload identities with Workload ID licenses (not in the same policy as users) |
| Target resources | Resources (formerly cloud apps), **user actions** (Register security information, Register or join devices), **authentication contexts** (c1 to c99) |
| Network | IP ranges, countries, trusted named locations, Global Secure Access compliant network |
| Conditions | Sign-in risk, user risk, device platforms, client apps, filter for devices |
| Grant | **Block access**, or grant with: require MFA, require **authentication strength**, compliant device, Microsoft Entra hybrid joined device, approved client app, app protection policy, password change, terms of use. Several controls: **Require all the selected controls** (default) or **Require one of the selected controls** |
| Session | App enforced restrictions, Conditional Access App Control, sign-in frequency, persistent browser session, continuous access evaluation, disable resilience defaults |

Target resources that SC-500 scenarios use:

| Requirement | Target resource |
| --- | --- |
| Protect Azure management (portal, Azure Resource Manager, Azure CLI, Azure PowerShell) | **Windows Azure Service Management API** |
| MFA for administrators on Microsoft admin portals | **Microsoft Admin Portals** |
| Baseline policy for everyone | **All resources**, no resource exclusions |
| Step-up for a PIM activation or a sensitive SharePoint site | An **authentication context**, published to apps |
| Control where users register MFA methods | User action **Register security information** |

Windows Azure Service Management API also covers the Microsoft Entra admin center (through the Azure portal), but no longer covers Azure DevOps. Since July 6, 2026, policies that target **Register security information** also apply when users register Windows Hello for Business and macOS Platform SSO credentials.

Policy states are **Report-only**, **On** and **Off**. Report-only evaluates without enforcing; the sign-in logs show *Report-only: Success*, *Failure*, *User action required* or *Not applied*, and the Conditional Access insights and reporting workbook needs a Log Analytics workspace that receives sign-in logs. When several policies apply, all of them must be satisfied, and a block wins.

Since October 2024 (portals) and October 1, 2025 (Azure CLI, Azure PowerShell, IaC tools, REST API; read operations excluded), Azure enforces **mandatory MFA** for user accounts. Workload identities aren't affected: move automation to managed identities or service principals.

> **Exam trap.** Always exclude at least one **emergency access account** from blocking policies, and test new policies in report-only. Emergency accounts still need MFA for Azure: Microsoft recommends a passkey (FIDO2) or certificate-based authentication for them.

<!-- section: authentication-methods | objectives: 1.1.3 -->
## Authentication methods, MFA and passwordless

Methods are enabled in the **Authentication methods policy** (**Entra ID > Authentication methods > Policies**), targeted at groups, by an **Authentication Policy Administrator**. Since **September 30, 2025** the legacy MFA and SSPR policies can no longer manage methods; the migration states are *Pre-migration*, *Migration in Progress* and *Migration Complete* (legacy settings ignored).

| Method | Notes |
| --- | --- |
| Passkey (FIDO2) | Security keys, Microsoft Authenticator passkeys (device-bound), synced passkeys (iCloud Keychain, Google Password Manager). **Passkey profiles** (up to 3): passkey types, **Enforce attestation**, **Enforce key restrictions** (AAGUID allow or block list). Guests can't register passkeys |
| Windows Hello for Business, platform credential | Phishing-resistant, authentication only |
| Certificate-based authentication | Single-factor or multifactor, depending on configuration |
| Microsoft Authenticator | Push notifications or passwordless phone sign-in |
| Temporary Access Pass (TAP) | Time-limited passcode to onboard passwordless methods or recover: lifetime 10 minutes to 30 days (default lifetime 1 hour, default maximum 8 hours), one-time use off by default, one TAP per user. Created by Authentication Administrators (members) or Privileged Authentication Administrators (admins too) |
| SMS, voice, OATH tokens | MFA second factors; SMS sign-in is single-factor |

**Authentication strengths** are the Conditional Access way to demand specific methods:

| Built-in strength | Contains |
| --- | --- |
| Multifactor authentication strength | Everything that satisfies "Require MFA", including password + SMS or push, and TAP |
| Passwordless MFA strength | FIDO2, Windows Hello for Business or platform credential, multifactor CBA, Authenticator phone sign-in |
| Phishing-resistant MFA strength | FIDO2 security key or passkey, Windows Hello for Business or platform credential, multifactor CBA |

Built-in strengths can't be modified; a Conditional Access Administrator creates custom strengths. "Require multifactor authentication" and "Require authentication strength" can't be combined in one policy.

> **Exam tip.** "Administrators must use phishing-resistant methods" is a Conditional Access policy targeting their directory roles with **Require authentication strength: Phishing-resistant MFA**. "New employees must enroll a passkey without ever having a password" is a **Temporary Access Pass**.

<!-- section: app-identity | objectives: 1.1.4 -->
## Identity for applications

| Object | Where | Role |
| --- | --- | --- |
| Application object | **App registrations**, home tenant only | Blueprint: redirect URIs, credentials, API permissions, app roles, exposed scopes |
| Service principal | **Enterprise applications**, one per tenant that uses the app | Local instance: who can sign in, assignments, granted permissions, SSO settings |

Registering an app creates both objects in the home tenant; a multitenant app gets a service principal in each tenant that consents. Managed identities are service principals without an application object. Deleting the application object deletes its home service principal, and restoring the registration doesn't restore it.

**Credentials of an app registration**, from weakest to strongest: client secret, certificate (recommended over secrets, kept in Key Vault), **federated credential** (workload identity federation: the app trusts tokens from GitHub Actions, Kubernetes, another cloud or any OpenID Connect provider, so no secret exists). Issuer, subject and audience must match the external token exactly.

Enterprise application properties:

| Property | Effect |
| --- | --- |
| Enabled for users to sign-in? = No | No token is issued, not even to assigned users or to service principals with application permissions |
| Assignment required = Yes | Only assigned users, groups and services get tokens |
| Assignment required = No | Every user in the tenant can sign in |
| Visible to users = No | Hidden from My Apps; access unchanged |

Roles: **Application Administrator** and **Cloud Application Administrator** manage registrations and enterprise applications (Cloud Application Administrator excludes application proxy). An app **owner** can manage that app only.

> **Exam trap.** "Only members of the Finance group may sign in to the app" isn't a Conditional Access policy: set **Assignment required** to Yes and assign the group. Conditional Access then adds conditions (MFA, device) for those who are allowed.

<!-- section: consent | objectives: 1.1.5 -->
## OAuth permission grants and consent

| Permission type | Acts as | Who can consent |
| --- | --- | --- |
| Delegated (scope) | The signed-in user, limited to what the user can do | The user, if the tenant allows it and the permission doesn't require admin consent; or an administrator for all users |
| Application (app role) | The app itself, no user | Administrator only |

**User consent settings** (**Enterprise apps > Consent and permissions > User consent settings**), set by a Privileged Role Administrator with Microsoft Graph or Microsoft Graph PowerShell; in the Microsoft Entra admin center, a Global Administrator is required:

| Setting | Effect |
| --- | --- |
| Do not allow user consent | Users can't grant any permission; they still use apps already consented |
| Allow user consent for apps from verified publishers, for selected permissions (Recommended) | Only apps from a verified publisher or registered in the tenant, and only permissions classified **low impact** (policy `microsoft-user-default-low`) |
| Allow user consent for apps | Any permission that doesn't need admin consent (legacy, `microsoft-user-default-legacy`) |

- **Permission classifications** (**Consent and permissions > Permission classifications**) mark delegated permissions that don't require admin consent as Low (Medium and High in preview). Set by a Cloud Application Administrator or Application Administrator.
- The **admin consent workflow** (**Admin consent settings**: *Users can request admin consent to apps they are unable to consent to* = Yes, reviewers, email notifications, expiration in days) lets blocked users send a request instead of a dead end. Turning it on requires a Global Administrator; reviewers act from **My Pending**. Through the workflow, only Global Administrators can approve requests for Microsoft Graph application permissions.

Who can grant tenant-wide admin consent (**Enterprise apps >** app **> Permissions > Grant admin consent**, or **App registrations > API permissions**):

| Role | Delegated permissions | Microsoft Graph application permissions |
| --- | --- | --- |
| Privileged Role Administrator | Yes | Yes |
| Cloud Application Administrator, Application Administrator, AI Administrator | Yes | No |

> **Exam trap.** Changing the consent settings doesn't revoke what was already granted: grants stay until you remove them. To cut off an app that obtained risky permissions, review and remove its permissions on the enterprise application, or set **Enabled for users to sign-in?** to No.

<!-- section: managed-identities | objectives: 1.1.6 -->
## Managed identities for Azure resources

| | System-assigned | User-assigned |
| --- | --- | --- |
| Created | With the resource (enable it on the VM, app, function...) | As a standalone resource (`Microsoft.ManagedIdentity/userAssignedIdentities`) |
| Life cycle | Deleted with the resource | Independent: delete it explicitly |
| Sharing | One resource only | Several resources |
| Typical use | One workload on one resource | Several resources needing the same access; permissions granted before the resource exists; resources recreated often |

Code gets tokens through the Azure Identity SDK or MSAL; there is no secret to store or rotate. Then grant the identity an Azure role (or a Key Vault, Storage or SQL data role) like any principal.

```bash
# System-assigned identity on an existing VM
az vm identity assign --resource-group rg-app --name vm-web

# User-assigned identity shared by several resources
az identity create --resource-group rg-app --name id-orders
az vm identity assign --resource-group rg-app --name vm-api --identities id-orders

# Grant it read access to secrets (vault using the Azure RBAC permission model)
az role assignment create --assignee-object-id <principal id> \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope <key vault resource ID>
```

| Role | Allows |
| --- | --- |
| Managed Identity Contributor | Create, read, update and delete user-assigned identities |
| Managed Identity Operator | Read and **assign** user-assigned identities to resources |

- Managed identities don't work across tenants. Moving a subscription to another directory means recreating them and their role assignments.
- Tokens are cached for about 24 hours: a permission change can take hours to apply.
- A user-assigned identity can also hold federated credentials (for example to trust GitHub Actions).

<!-- section: key-points -->
## Key points

- PIM: eligible means activation (MFA or authentication context, justification, approval); active means standing access. Settings are per role; P2 or ID Governance.
- Conditional Access needs P1 (risk conditions P2); use report-only first, exclude emergency accounts, target Windows Azure Service Management API to protect Azure management.
- Manage methods in the Authentication methods policy; demand specific methods with authentication strengths; TAP onboards passwordless users.
- App registration = application object; enterprise application = service principal. Prefer certificates, better federated credentials, best managed identities.
- Restrict user consent to verified publishers and low-impact permissions, and turn on the admin consent workflow. Privileged Role Administrator, not the application administrator roles, grants Microsoft Graph application permissions; through the admin consent workflow, only a Global Administrator approves them.
- System-assigned dies with its resource; user-assigned is shared. Managed Identity Operator assigns, Managed Identity Contributor creates.
