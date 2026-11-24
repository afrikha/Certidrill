Five ideas run through the whole exam: who secures what in the cloud, how layers of protection stack up, why nothing is trusted by default, how encryption differs from hashing, and what governance, risk and compliance mean. Expect definitions and "which principle is this?" questions.

<!-- section: shared-responsibility | objectives: 1.1.1 -->
## The shared responsibility model

In your own datacenter you secure the whole stack. In the cloud, security is **shared** between you and the cloud provider, and the split depends on the service type: the further you move from IaaS to SaaS, the more the provider takes on.

| Model | The cloud provider secures | You secure |
| --- | --- | --- |
| On-premises | Nothing | Everything, from the building to the data |
| IaaS | The physical datacenter, the network hardware and the host machines | The operating system, the applications, the network controls you configure, your data |
| PaaS | The same, plus the operating system and the runtime environment | Your application code and its configuration, access controls, your data |
| SaaS | The entire application stack and its infrastructure | Access management, your data, your tenant-level settings |

Whatever the model, these responsibilities **always stay with you**:

- your **data**: classifying it, protecting it, deciding how it is encrypted;
- your **identities and access**: user accounts, authentication methods, permissions;
- your **endpoints**: the laptops, phones and tablets that connect to the service;
- your **configuration choices** inside the service.

The model extends to AI services: the provider secures the infrastructure, the AI model hosting environment and platform safety controls such as content filtering; you remain responsible for the data the AI can reach, who may use it, how it is configured, AI-specific risks such as prompt injection, and user training.

> **Exam trap.** Moving to SaaS never transfers responsibility for your data or your accounts. The physical datacenter, physical network and physical hosts are always the provider's in the cloud.

<!-- section: defense-in-depth | objectives: 1.1.2 -->
## Defense in depth

**Defense in depth** stacks several layers of protection instead of relying on one: if an attacker gets through a layer, the next one slows the attack down.

| Layer | Examples |
| --- | --- |
| Physical security | Locked facilities, guards, badge readers |
| Identity and access | Multifactor authentication, role-based access control, Conditional Access |
| Perimeter | DDoS protection, perimeter firewalls |
| Network | Segmentation, network security groups |
| Compute | Patching, closing unused ports, restricting administrative access, monitoring for unusual behavior |
| Application | Secure development, input validation against SQL injection and cross-site scripting, application-level authentication and authorization |
| Data | Access control, encryption, classification; the innermost layer |

Security controls serve three goals, the **CIA** triad:

| Goal | Meaning | Typical control |
| --- | --- | --- |
| **Confidentiality** | Only authorized people can read the information | Encryption, access control |
| **Integrity** | Data stays accurate and unmodified, except by authorized changes | Hashing, digital signatures, audit logs |
| **Availability** | Data and systems are accessible when authorized users need them | Redundancy, DDoS protection |

<!-- section: zero-trust | objectives: 1.1.3 -->
## The Zero Trust model

The traditional model trusted whatever sat inside the corporate network. **Zero Trust** is a security strategy, not a product, that treats every access request as untrusted wherever it comes from: "never trust, always verify".

| Principle | Meaning |
| --- | --- |
| **Verify explicitly** | Authenticate and authorize every request using all available signals: identity, location, device compliance, application, data classification, anomalies |
| **Use least privilege access** | Give only the access needed, for only as long as needed: just-in-time and just-enough access |
| **Assume breach** | Design as if an attacker will get in: segment access, encrypt end to end, monitor to detect and limit the damage |

Zero Trust is applied across six pillars, tied together by a seventh:

| Pillar | What Zero Trust asks |
| --- | --- |
| Identities | Verify users, services and devices with strong authentication, then apply least privilege |
| Devices | Monitor health and compliance; block or restrict devices that fail |
| Applications | Know every application in use, including shadow IT, and control their permissions |
| Data | Classify, label and encrypt it so that protection follows the data |
| Infrastructure | Assess versions and configuration continuously; just-in-time administrative access |
| Networks | Segment, including micro-segmentation; encrypt and monitor traffic |
| Visibility, automation and orchestration | Correlate the signals of all the others and automate the response |

> **Exam tip.** "Segment the network to limit lateral movement" illustrates assume breach; "require multifactor authentication on every sign-in" illustrates verify explicitly; "just-in-time administrator access" illustrates least privilege.

<!-- section: encryption-hashing | objectives: 1.1.4 -->
## Encryption and hashing

**Encryption** makes data unreadable to anyone who doesn't hold the key. It is reversible: the right key decrypts the data.

| Type | Keys | Notes |
| --- | --- | --- |
| **Symmetric** | The same key encrypts and decrypts | Fast, suited to large volumes; the difficulty is sharing the key securely |
| **Asymmetric** | A key pair: a public key and a private key | What the public key encrypts, only the private key decrypts; what the private key signs, the public key verifies. Used by HTTPS and digital signatures |

| State of the data | Meaning | Protection |
| --- | --- | --- |
| **At rest** | Stored on a disk, in a database or in a storage account | Encryption of the stored data |
| **In transit** | Moving over a network | TLS, as in HTTPS; VPN |
| **In use** | Being processed in memory | Confidential computing, in secure enclaves |

Encryption is only as strong as the protection of its keys. **Key management** keeps keys separate from the data they protect, stores them in hardware security modules (HSMs) or a managed service such as Azure Key Vault, rotates them regularly and restricts who can use them.

**Hashing** converts any input into a fixed-length value, the hash. It is **one-way** (the input can't be recovered), **deterministic** (the same input always gives the same hash) and uses **no key**. It serves to verify, not to hide: comparing hashes shows whether a file was modified, and systems store the hash of a password instead of the password. A **salt**, a random value added to each password before hashing, makes two identical passwords produce different hashes and defeats precomputed tables (rainbow tables).

A **digital signature** combines both ideas: it proves who sent the data (authenticity) and that it wasn't modified (integrity).

> **Exam trap.** Hashing isn't encryption: a hash is never decrypted. "Reversible with a key" means encryption; "verify that data hasn't changed" or "store passwords" means hashing.

<!-- section: grc | objectives: 1.1.5 -->
## Governance, risk and compliance

| Term | Definition |
| --- | --- |
| **Governance** | The rules, practices and processes an organization uses to direct and control its activities |
| **Risk management** | Identifying, assessing and responding to threats or events that can affect the organization's objectives or its customers' trust |
| **Compliance** | Adhering to the laws, regulations, standards and policies that apply to the organization |

Risk management doesn't aim to eliminate every risk. It identifies risks, assesses each one by impact and likelihood, responds to it, then monitors it. The four responses: **accept** a low-impact risk, **mitigate** it with controls, **transfer** it (for example through insurance), or **avoid** it by changing the process that creates it. Frameworks such as ISO 27001, SOC 2 and HIPAA set the requirements to comply with.

Three notions about data come with compliance:

| Notion | Meaning |
| --- | --- |
| **Data residency** | Rules on the physical locations where data may be stored, and on how it may be transferred or accessed internationally |
| **Data sovereignty** | Data is subject to the laws of the country or region where it is collected, held or processed |
| **Data privacy** | The appropriate handling of personal data: transparency, consent, and the rights of individuals over their data |

Security and compliance aren't synonyms: security covers everything that protects data and systems from threats; compliance is meeting the rules that apply to you.

<!-- section: key-points -->
## Key points

- Shared responsibility: the provider's share grows from IaaS to SaaS; data, identities and access, endpoints and configuration are always yours.
- Defense in depth: physical, identity and access, perimeter, network, compute, application, data. CIA: confidentiality, integrity, availability.
- Zero Trust: verify explicitly, use least privilege access, assume breach.
- Symmetric encryption: one key. Asymmetric: public and private key. Data at rest, in transit, in use.
- Hashing: one-way, deterministic, no key; used for integrity and password storage, strengthened by a salt.
- Governance directs, risk management anticipates (identify, assess, respond, monitor; accept, mitigate, transfer or avoid), compliance follows the rules. Residency: where data is stored. Sovereignty: whose laws apply. Privacy: how personal data is handled.
