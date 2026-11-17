SC-900 checks that you understand the vocabulary of security, compliance and identity, and that you can name the Microsoft product or feature that meets a need. It never asks you to configure anything: no command, no query, no licensing matrix.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 45 minutes of exam time |
| Questions | Not published; about 35 to 45 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Closed book: Microsoft Learn isn't available during fundamentals exams |
| Validity | Doesn't expire |
| Prerequisites | None; being familiar with Microsoft Azure and Microsoft 365 helps |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Describe the concepts of security, compliance, and identity | 10 to 15 % |
| Describe the capabilities of Microsoft Entra | 25 to 30 % |
| Describe the capabilities of Microsoft security solutions | 35 to 40 % |
| Describe the capabilities of Microsoft compliance solutions | 20 to 25 % |

Question formats: one answer among four, several answers ("select two"), series of three Yes/No statements, sentences to complete with a drop-down list, and matching by drag and drop. There is no case study and no lab. Questions with several elements give one point per correct element.

<!-- section: reading-questions -->
## Reading a question

Stems are short, one to three sentences: "Which Microsoft Entra feature...?", "What can you use to...?". Train yourself to turn the sentence into a keyword:

| Words in the question | Think of |
| --- | --- |
| "prove who you are" | Authentication |
| "what a signed-in user is allowed to do" | Authorization |
| "never trust, always verify", "assume the attacker is already inside" | Zero Trust |
| "one-way", "cannot be reversed", "verify that a file wasn't modified" | Hashing |
| "require MFA only when the sign-in comes from outside the office" | Conditional Access |
| "activate an administrator role for a few hours, with approval" | Privileged Identity Management |
| "confirm regularly that users still need their access" | Access reviews |
| "risky sign-in", "leaked credentials" | Microsoft Entra ID Protection |
| "connect to a virtual machine that has no public IP address" | Azure Bastion |
| "store secrets, keys and certificates" | Azure Key Vault |
| "secure score and recommendations for cloud resources" | Microsoft Defender for Cloud |
| "collect security data from everywhere, detect, then respond automatically" | Microsoft Sentinel |
| "stop users from sharing credit card numbers" | Data loss prevention |
| "Microsoft's audit reports and compliance documents" | Service Trust Portal |

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Authentication | Authorization | Authentication proves who you are; authorization decides what you may do |
| Encryption | Hashing | Encryption is reversible with a key; hashing is one-way and uses no key |
| Microsoft Entra roles | Azure roles | Entra roles manage Microsoft Entra resources (users, groups, applications); Azure roles manage Azure resources (virtual machines, storage) |
| Multifactor authentication | Conditional Access | MFA is a way to verify identity; Conditional Access is the policy that decides when to require it, or to block |
| Privileged Identity Management | Access reviews | PIM gives a privileged role just in time, for a limited time; an access review checks periodically that existing access is still needed |
| Microsoft Entra ID Protection | Privileged Identity Management | ID Protection detects risky sign-ins and compromised users; PIM limits standing administrator access |
| Network security group | Azure Firewall | An NSG filters traffic inside a virtual network, by IP address, port and protocol; Azure Firewall is a central firewall for several virtual networks, up to the application level |
| Azure Firewall | Web Application Firewall | Azure Firewall filters network traffic in general; WAF protects web applications from attacks such as SQL injection |
| Azure Bastion | Azure Key Vault | Bastion gives secure remote access to virtual machines; Key Vault stores secrets |
| Cloud security posture management | Cloud workload protection | Posture management assesses configuration and recommends hardening; workload protection detects threats against running resources |
| SIEM | SOAR | A SIEM collects and correlates security data to detect threats; SOAR automates the response |
| Microsoft Defender portal | Microsoft Purview portal | Defender is for threat protection; Purview is for compliance and data protection |
| Secure score | Compliance score | Secure score measures security posture; compliance score measures progress toward regulatory requirements |
| Sensitivity label | Retention label | A sensitivity label classifies and protects content; a retention label decides how long to keep it |
| Data loss prevention | Insider risk management | DLP blocks the sharing of sensitive data; insider risk management detects risky behavior of users |
| eDiscovery | Audit | eDiscovery finds content for a legal case; audit records who did what and when |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order; each one is short. The security solutions domain weighs the most: don't rush it.
2. For every product, learn one sentence: what it protects and what it is not. Most wrong answers are neighbouring products.
3. After each domain, take a mock exam and reread the sections linked to your mistakes.
4. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
