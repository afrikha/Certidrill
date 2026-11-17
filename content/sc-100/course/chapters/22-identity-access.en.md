Identity is the control plane of Zero Trust: every access starts with a token that Microsoft Entra ID issues, or refuses. The exam asks you to design it for users, partners, customers, workloads and AI agents, across Microsoft 365, Azure, other clouds and on-premises Active Directory, and to check that Conditional Access enforces the strategy.

<!-- section: agent-identities | objectives: 2.2.1 -->
## Agent identities with Microsoft Entra Agent ID

**Microsoft Entra Agent ID** is the part of Microsoft Entra that creates and manages identities for AI agents. It is available to all Microsoft Entra customers; extending Microsoft Entra security features (Conditional Access, protection, governance) to agents requires **Microsoft Agent 365**, included in Microsoft 365 E7 or available as an add-on.

| Object | Purpose |
| --- | --- |
| Agent identity | The identity account that uniquely identifies and authenticates an AI agent; it gets tokens to call Microsoft Graph, Azure, internal or third-party services |
| Agent identity blueprint | The template from which agent identities are created; a policy that targets a blueprint applies to all its agent identities, present and future |
| Agent user | A special user account paired one-to-one with an agent identity, for systems that only accept a user (a mailbox, a Teams presence) |
| Sponsor | The human accountable for the agent, for example the user who created it in Copilot Studio |

Agents don't use passwords, MFA or passkeys. They access resources in three ways:

| Access pattern | Permissions used | Conditional Access evaluates |
| --- | --- | --- |
| Autonomous (app-only) | Rights granted to the agent identity: Graph permissions, Azure RBAC roles, directory roles, app roles | The **agent identity** (or its blueprint) |
| Delegated (on-behalf-of) | Rights of the signed-in user, limited to what the user delegates | The **user** |
| As an agent user | Rights of the agent's user account | The **agent user**, selected under *Agents*, not under *Users* |

**Conditional Access for agents** evaluates policy when Microsoft Entra issues or refreshes a token. Policies can block access, block agents identified as high risk, require a compliant device for agent users, or target every agent with a given custom security attribute. Policies are per token subject: an agent that uses two patterns needs two policies. Limits: policies targeting agent identities don't cover the agent user; agent users can't be included or excluded by group; and an agent that authenticates with an **API key** bypasses Microsoft Entra entirely.

Licensing for Conditional Access for agents: Microsoft 365 E7, or Microsoft Agent 365 plus at least Microsoft Entra ID P1 or Microsoft 365 E3.

> **Exam trap.** A managed identity or an application's service principal is a **workload identity**; an AI agent registered with Agent ID (for example from Copilot Studio) has an **agent identity**. A policy targeting the agent identity doesn't cover what the agent does on behalf of a user: that is evaluated on the user.

<!-- section: access-to-resources | objectives: 2.2.2 -->
## Access to SaaS, PaaS, IaaS, hybrid and multicloud resources

Zero Trust access combines three kinds of controls, whatever the resource:

| Control | Microsoft solution | Example |
| --- | --- | --- |
| Identity | Microsoft Entra ID single sign-on, Conditional Access, managed identities, Azure RBAC | One identity and one policy for Microsoft 365, Salesforce and the Azure portal |
| Network | Private endpoints, NSGs, Azure Firewall, Microsoft Entra Private Access, Microsoft Entra Internet Access | Reach a private app without a VPN; PaaS reachable only from the virtual network |
| Application | Defender for Cloud Apps (Conditional Access app control, session policies), app roles, API scopes | Block downloads from an unmanaged device in a SaaS session |

| Resource | Recommended access design |
| --- | --- |
| SaaS (gallery or custom app) | Microsoft Entra SSO (SAML or OpenID Connect), automatic provisioning (SCIM), Conditional Access, Defender for Cloud Apps |
| PaaS (Azure SQL, Storage, Key Vault) | Microsoft Entra authentication, managed identities instead of keys, private endpoints, public network access disabled |
| IaaS virtual machines | Sign-in with Microsoft Entra ID, Azure Bastion or just-in-time access, no public RDP or SSH |
| On-premises web apps | Microsoft Entra Private Access or application proxy, with Conditional Access |

> **Exam tip.** "Replace the VPN with per-app Zero Trust access to on-premises apps": Microsoft Entra Private Access. "Control what users do inside a SaaS session": Defender for Cloud Apps session control.

<!-- section: entra-hybrid-multicloud | objectives: 2.2.3 -->
## Microsoft Entra ID in hybrid and multicloud environments

Two engines synchronize AD DS users to Microsoft Entra ID:

| Capability | Microsoft Entra Connect Sync | Microsoft Entra Cloud Sync |
| --- | --- | --- |
| Architecture | On-premises sync server | Lightweight provisioning agents, configuration in the cloud, several active agents for high availability |
| Disconnected forests (mergers, acquisitions) | No | Yes |
| Password hash synchronization | Yes | Yes |
| Pass-through authentication, AD FS setup | Yes | No (configured separately) |
| Device writeback | Yes | No (replaced by Cloud Kerberos Trust) |
| Large groups | 250,000 members | 50,000 members |

Authentication method:

| Method | Choose when |
| --- | --- |
| Password hash synchronization (PHS) | Default recommendation: simplest, resilient if on-premises is down, enables leaked credential detection in ID Protection |
| Pass-through authentication (PTA) | Passwords must be validated on-premises, for example to enforce on-premises account policies at sign-in |
| Federation (AD FS) | A requirement that Microsoft Entra ID can't meet natively; increases attack surface and is being migrated away from |

Multicloud: keep **Microsoft Entra ID as the single identity provider** and federate the AWS and GCP consoles to it (for example AWS IAM Identity Center), so that MFA, Conditional Access, PIM and access reviews also govern cloud consoles. Use one workforce tenant unless a hard requirement demands more.

> **Exam trap.** Cloud Sync is the answer for disconnected forests after an acquisition; Connect Sync is the answer when the design needs pass-through authentication configuration, device writeback or groups over 50,000 members.

<!-- section: external-identities | objectives: 2.2.4 -->
## External identities: B2B and decentralized identity

| Scenario | Solution | Notes |
| --- | --- | --- |
| Partners use apps and resources in your tenant | **B2B collaboration** | A guest user object is created; the guest signs in with its home credentials |
| Teams shared channels with another Microsoft Entra organization | **B2B direct connect** | Mutual trust required on both sides; no guest object in your directory |
| Consumer or business customer apps | **External tenant** (Microsoft Entra External ID) | Separate tenant, self-service sign-up, social or email sign-in, custom branding |
| Users of your own tenants must reach each other's resources without invitations | **Cross-tenant synchronization** | One-way sync in a multitenant organization |
| Prove a claim (employment, diploma) without calling the issuer | **Microsoft Entra Verified ID** | Verifiable credentials and decentralized identifiers |

**Cross-tenant access settings** define inbound and outbound rules for B2B collaboration and B2B direct connect, by default or per organization, and can **trust MFA and device claims** (compliant, Microsoft Entra hybrid joined) from the partner's tenant, so partners aren't asked to register MFA twice. Azure AD B2C is no longer sold to new customers since May 1, 2025: new customer-facing apps use an external tenant.

**Decentralized identity** (Verified ID) has three roles: the **issuer** signs a verifiable credential with its decentralized identifier (DID); the **holder** keeps it in a wallet (Microsoft Authenticator) and decides when to present it; the **verifier** checks the signature against issuers it trusts, without contacting the issuer. Microsoft supports the `did:web` trust method. Typical uses: onboarding with identity proofing, proof of employment to partners.

<!-- section: modern-authn-authz | objectives: 2.2.5 -->
## Modern authentication and authorization

**Conditional Access** is the Zero Trust policy engine: signals (user, group, role, agent or workload identity, app, device state, location, client app, risk) lead to a decision (block, grant with controls such as MFA, an **authentication strength**, a compliant device, terms of use) and session controls (sign-in frequency, app control). It requires Microsoft Entra ID P1.

**Risk scoring** comes from **Microsoft Entra ID Protection** (P2): **sign-in risk** (this authentication is probably not from the owner) and **user risk** (the account is probably compromised, for example leaked credentials), each low, medium or high. Typical policies: medium or high sign-in risk requires MFA; high user risk requires a secure password change. **Workload identity** risk policies need Workload ID Premium.

**Continuous access evaluation (CAE)** lets Exchange Online, SharePoint Online, Teams and Microsoft Graph reject a token before it expires:

| CAE trigger | Behavior |
| --- | --- |
| Account disabled or deleted, password changed or reset, MFA enabled, refresh tokens revoked, high user risk | Critical event, enforced in near real time (up to 15 minutes), with or without Conditional Access |
| Client IP leaves an allowed named location | IP policy enforced by the resource immediately |

CAE-aware sessions get tokens valid up to 28 hours, revoked by events. Limits: guests aren't covered; only IP-based named locations are enforced, not countries.

**Protected actions** attach a Conditional Access **authentication context** to sensitive Microsoft Entra permissions, so the policy is enforced when the action is performed, not at sign-in or role activation. Examples: create, update or delete Conditional Access policies, change cross-tenant access settings, hard-delete directory objects, change named locations. They require P1 and are set up by a Conditional Access Administrator or Security Administrator. Always exclude an emergency access account.

| Requirement | Recommendation |
| --- | --- |
| Revoke access to mailboxes within minutes after an account is disabled | CAE (enabled by default for supported services) |
| Administrators must use a phishing-resistant method only when they modify Conditional Access | Protected action with an authentication context requiring a phishing-resistant authentication strength |
| Require MFA only when sign-in looks risky | Sign-in risk policy (ID Protection, P2) |
| Step-up for one sensitive SharePoint site or app action | Authentication context |

> **Exam trap.** PIM activation settings protect the moment a role becomes active; protected actions protect the moment a specific permission is used, whichever role grants it.

<!-- section: ca-zero-trust | objectives: 2.2.6 -->
## Validating Conditional Access against Zero Trust

A Zero Trust design is a set of policies by **persona** (users, administrators, guests, workload and agent identities, emergency accounts) that leave no gap together:

| Zero Trust principle | Policies that must exist |
| --- | --- |
| Verify explicitly | MFA for all users and all resources; phishing-resistant authentication strength for administrators and the Microsoft admin portals; legacy authentication blocked; risk-based policies |
| Use least privilege | Session limits for unmanaged devices (app control, no download); stronger requirements through authentication context on sensitive actions |
| Assume breach | Compliant or hybrid-joined device for sensitive apps; sign-in frequency for privileged sessions; CAE strict enforcement where networks are stable |

Validation method:

1. Target **All resources** rather than app lists, so new apps are covered.
2. Inventory exclusions: only emergency access accounts and documented service exceptions; group exclusions are reviewed.
3. Deploy new policies in **report-only** mode, read the insights and reporting workbook, and use the **What If** tool for edge cases.
4. Check guests, workload identities and agents: they need their own policies.
5. Compare with the built-in Conditional Access templates, and use the Conditional Access optimization agent to detect users and apps not covered.

> **Exam trap.** A policy that targets a list of apps, or excludes a large group "temporarily", isn't Zero Trust: the gap is where the attack goes. And Conditional Access never applies while security defaults are enabled.

<!-- section: harden-ad-ds | objectives: 2.2.7 -->
## Requirements to harden AD DS

AD DS remains the root of trust of hybrid organizations: a compromised domain controller compromises everything synchronized from it.

| Area | Requirement |
| --- | --- |
| Administrative model | Tier the forest (enterprise access model): Domain Admins only on domain controllers, never on servers or workstations; separate admin accounts |
| Privileged accounts | Few members in Enterprise Admins, Domain Admins, Schema Admins; Protected Users group for admins; "account is sensitive and cannot be delegated" |
| Local administrator passwords | Windows LAPS on every member server and workstation |
| Service accounts | Group managed service accounts (gMSA) instead of user accounts with static passwords |
| Legacy protocols | Remove SMBv1, restrict NTLM, require LDAP signing and channel binding, AES for Kerberos |
| Domain controllers | Isolated, minimal roles, patched first, backed up offline |
| Hybrid servers | Microsoft Entra Connect and AD FS servers, AD CS certificate authorities are treated as tier 0 |
| Monitoring | Microsoft Defender for Identity sensors, identity security posture assessments in Microsoft Secure Score |

<!-- section: secrets-keys-certificates | objectives: 2.2.8 -->
## Managing secrets, keys and certificates

| Requirement | Solution | Tenancy, FIPS 140 level |
| --- | --- | --- |
| Secrets, keys and certificates of applications; customer-managed keys | Azure Key Vault Standard | Multitenant, FIPS 140-2 Level 1 |
| HSM-protected keys at a moderate cost | Azure Key Vault Premium | Multitenant, FIPS 140-3 Level 3 (HSM Platform 2) |
| Single-tenant HSM pool, full control of keys, customer-managed keys for Azure services | Azure Key Vault Managed HSM | Single tenant, FIPS 140-3 Level 3 |
| Lift and shift of an application using PKCS#11, TLS offload, TDE, code signing | Azure Cloud HSM | Single tenant, FIPS 140-3 Level 3 |
| Payment PIN processing | Azure Payment HSM | Single tenant, FIPS 140-2 Level 3 |

Design rules: one vault per application, environment and region to limit blast radius; the **Azure RBAC** permission model; **soft delete** and **purge protection**; private endpoints, public access disabled; applications authenticate with **managed identities**; key rotation policies and automatic certificate renewal; logs to the SIEM and **Defender for Key Vault** for anomalous access. Better still, remove secrets with managed identities and workload identity federation.

> **Exam trap.** "The key must be in a single-tenant HSM under the customer's sole control" rules out Key Vault Standard and Premium, which are multitenant. Choose Managed HSM for Azure service encryption, Cloud HSM for an application that needs a PKCS#11 interface.

<!-- section: key-points -->
## Key points

- Agent ID: agent identities, blueprints, agent users, sponsors. Conditional Access evaluates the token subject: agent identity (app-only), user (delegated), agent user (under *Agents*).
- Access = identity + network + application controls.
- Cloud Sync for disconnected forests; Connect Sync for PTA configuration, device writeback, large groups. PHS is the default authentication method.
- B2B collaboration creates guests; B2B direct connect doesn't; external tenants serve customers; Verified ID proves claims with verifiable credentials.
- CAE revokes tokens on critical events; protected actions enforce policy when a permission is used; risk policies need P2.
- Zero Trust Conditional Access: personas, All resources, minimal exclusions, report-only first.
- Harden AD DS as tier 0; monitor it with Defender for Identity.
- Key Vault for most needs; Managed HSM or Cloud HSM for single-tenant HSM requirements; managed identities instead of secrets.
