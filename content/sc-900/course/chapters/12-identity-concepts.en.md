When users, devices and applications are everywhere, the network boundary no longer protects much: identity does. This chapter defines the vocabulary the exam builds on: authentication, authorization, identity providers, directory services and federation.

<!-- section: identity-perimeter | objectives: 1.2.1 -->
## Identity as the primary security perimeter

Firewalls and VPN gateways protected a boundary that made sense when employees worked in one office, on managed devices, with local servers. Cloud and SaaS applications, remote work, personal devices (BYOD), partner and customer access and IoT devices have eroded it. The question is no longer "does this request come from inside our network?" but "who or what is making this request, and should it be trusted?".

An **identity** is the set of attributes that define a person, a device or a software component:

| Identity | Represents |
| --- | --- |
| Human | Employees, contractors, partners, customers |
| Device | Laptops, phones, tablets, IoT sensors |
| Workload | Applications, services and automated processes that run without a person |
| Agent | AI agents that act on behalf of users or processes |

An identity infrastructure rests on **four pillars**:

| Pillar | Meaning |
| --- | --- |
| **Administration** | Creating, managing and governing identities: provisioning, updating when roles change, deprovisioning |
| **Authentication** | Verifying that an identity is who or what it claims to be |
| **Authorization** | Determining what an authenticated identity is allowed to do |
| **Auditing** | Tracking who did what, when and from where: sign-in logs, reports, alerts |

<!-- section: authentication | objectives: 1.2.2 -->
## Authentication

**Authentication** (AuthN) is the process of proving that you are who you say you are. It answers "who are you?" and requires **credentials**. It succeeds or fails; it says nothing about what you may do afterward.

| Factor | Examples |
| --- | --- |
| Something you **know** | Password, PIN |
| Something you **have** | Phone, hardware security key, smart card |
| Something you **are** | Fingerprint, face scan |

- **Single-factor authentication** uses one factor, typically a password: if it is stolen, the attacker can impersonate the user.
- **Multifactor authentication** (MFA) requires two or more factors from **different** categories.

> **Exam trap.** A password and a PIN are two secrets of the same category: that isn't multifactor authentication. A password plus an approval on your phone is.

<!-- section: authorization | objectives: 1.2.3 -->
## Authorization

**Authorization** (AuthZ) is the process of determining what an authenticated identity is allowed to do. It answers "what are you allowed to do?" and relies on roles (administrator, manager), permissions (read, write, delete) and attributes (department, location).

| | Authentication | Authorization |
| --- | --- | --- |
| Question | Who are you? | What may you do? |
| Order | First, at sign-in | After a successful authentication |
| Based on | Credentials | Roles, permissions, attributes |
| Hotel analogy | Showing your ID at the front desk | The keycard that opens your room, not the others |

The **principle of least privilege** applies to authorization: give each identity only the access it needs to do its job.

<!-- section: identity-providers | objectives: 1.2.4 -->
## Identity providers

With **modern authentication**, applications no longer check credentials themselves: a central **identity provider** (IdP) creates, maintains and manages identity information and offers authentication, authorization and auditing services to applications. Microsoft Entra ID is an identity provider; so are Google, Amazon, LinkedIn and GitHub.

1. The user opens an application, which directs them to the identity provider.
2. The identity provider verifies the credentials and issues a **security token**.
3. The application, which trusts the identity provider, accepts the token as proof.

A token carries **claims** about the identity (identifier, name, roles, expiration time) and is time-limited.

| Notion | Meaning |
| --- | --- |
| ID token | Proves that the user signed in: authentication |
| Access token | Lets the application access a resource on the user's behalf: authorization |
| **Single sign-on** (SSO) | Sign in once to the identity provider, then access every application that trusts it without entering credentials again |

| Protocol | Role |
| --- | --- |
| OpenID Connect | Authentication; built on top of OAuth 2.0 |
| OAuth 2.0 | Authorization, through access tokens |
| SAML | Authentication and federation, common with enterprise and older applications |

Centralizing identity gives consistent policies (MFA in one place), one view of sign-ins to detect suspicious patterns, and one place to disable an account for every connected application.

<!-- section: directory-services | objectives: 1.2.5 -->
## Directory services and Active Directory

A **directory** is a structured repository of information about the objects of a network: users, devices, groups, applications. A **directory service** stores that data and makes it available to users, administrators, applications and services.

**Active Directory** (AD) is a set of directory services developed by Microsoft for on-premises, domain-based networks. Its best-known component, **Active Directory Domain Services** (AD DS), stores information about the members of the domain, verifies their credentials at sign-in and defines their access rights. A server that runs AD DS is a **domain controller**.

| | AD DS | Microsoft Entra ID |
| --- | --- | --- |
| Designed for | On-premises networks | The internet and the cloud; identity as a service |
| Authentication | Kerberos and NTLM | Modern protocols: OpenID Connect, OAuth 2.0, SAML |
| Device management | Group Policy on domain-joined Windows devices | Works across platforms and device types |
| Cloud and SaaS applications | Not natively: needs synchronization or federation | Native |

> **Exam trap.** Microsoft Entra ID isn't AD DS hosted in the cloud: it has no domain controllers, no Group Policy and no organizational units. Organizations that run AD DS connect it to Microsoft Entra ID: that is hybrid identity.

<!-- section: federation | objectives: 1.2.6 -->
## Federation

**Federation** gives access to services across organizational or domain boundaries by establishing a **trust relationship** between separate identity providers. Users authenticate with their own organization's identity provider and reach another organization's resources without a second account. It works like a passport: your country issues it, other countries accept it.

1. A user of organization B authenticates with B's identity provider.
2. The user requests a resource of organization A.
3. A's identity provider, which trusts B's, accepts that authentication, and A grants access.

- Trust **isn't automatically bidirectional**: if A trusts B, B doesn't trust A unless that is configured too.
- Examples: employees of a partner company who use their own credentials (B2B collaboration); "sign in with Google" on a consumer site; on-premises Active Directory users who reach cloud services through Active Directory Federation Services (AD FS).

> **Exam tip.** Single sign-on works inside one identity provider; federation is trust between two identity providers.

<!-- section: key-points -->
## Key points

- Identity is the primary security perimeter: cloud, remote work and BYOD have eroded the network boundary.
- Four pillars: administration, authentication, authorization, auditing.
- Authentication proves who you are (know, have, are); authorization decides what you may do, and always comes second.
- An identity provider authenticates centrally and issues tokens; SSO means signing in once for many applications.
- AD DS: on-premises directory, domain controllers, Kerberos, Group Policy. Microsoft Entra ID: cloud identity service with modern protocols.
- Federation: a trust relationship between identity providers, one-way unless configured both ways.
