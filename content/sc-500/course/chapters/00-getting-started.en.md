SC-500 is the exam of the cloud and AI security engineer: it tests how you implement security controls across identity, data, networks, compute and AI workloads, then how you measure and monitor posture with Microsoft Defender for Cloud, Microsoft Sentinel and Security Copilot. Questions are about doing, not designing: which setting, which role, which policy effect, which step comes first. This chapter covers the format, a method for reading the questions and the pairs of controls the exam expects you to tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Cloud and AI Security Engineer Associate. The former Azure Security Engineer Associate certification was retired on August 31, 2026 |
| Prerequisite | None. Microsoft expects hands-on Azure and hybrid administration, strong Microsoft Entra ID skills and familiarity with Microsoft 365 administration |
| Duration | 120 minutes of exam time (140 minutes in the seat), Microsoft's figure for associate exams that may contain labs |
| Questions | Not published; about 40 to 60 on most Microsoft exams |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock; other sites are blocked |
| Languages | English, French, German, Spanish, Italian, Japanese, Korean, Chinese (Simplified and Traditional), Portuguese (Brazil) |
| Interactive components | The exam is proctored and "may have interactive components" |
| Practice | The exam sandbox (aka.ms/examdemo) shows the interface; Microsoft's practice assessment usually arrives within 8 weeks after the beta |

The four domains of the study guide (last updated May 13, 2026) weigh about the same:

| Domain | Weight |
| --- | --- |
| Manage identity, access, and governance | 20 to 25 % |
| Secure storage, databases, and networking | 25 to 30 % |
| Secure compute | 20 to 25 % |
| Manage and monitor security posture | 20 to 25 % |

"Secure compute" includes the new AI objectives: Microsoft Purview DSPM for AI, Copilot Studio agent protection, Microsoft Entra Agent ID, AI Gateway in API Management, Defender for AI Services and Foundry guardrails. The exam can include preview features when they are commonly used.

Question formats: one answer among four, "select two", Yes/No statements, drop-down lists that complete a sentence, a command or a policy, drag and drop (matching or ordering steps), and hot areas. Two sections have their own rules:

- **Case study.** A company described in tabs (overview, existing environment, requirements) followed by several questions. Once you leave it, you can't come back.
- **Problem-solution series.** The same goal is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final.

> **Exam tip.** Microsoft Learn is available, but the timer keeps running. Use it to confirm one role name, one policy effect or one limit, never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a security question

A typical stem describes a company (Contoso, Fabrikam...), shows an exhibit (users and roles, VMs and subnets, NSG rules, a policy definition), states one or two constraints and asks "What should you do?". Work in this order:

1. Read the last sentence: what must you choose, configure or do **first**?
2. Underline the constraints. They eliminate the plausible distractors.
3. Check the scope: tenant, management group, subscription, resource group, resource.
4. In an exhibit or a code block, read every line: an effect, a scope or a missing property usually decides the answer.

| Words in the stem | What they select |
| --- | --- |
| "least privilege" | The most specific role at the narrowest scope, eligible in PIM rather than permanent |
| "minimize administrative effort" | The built-in, managed option: a built-in policy or initiative, a Defender plan, a managed identity |
| "without storing credentials" | A managed identity or workload identity federation |
| "just-in-time", "time-limited", "requires approval" | PIM eligible assignment, or JIT VM access for management ports |
| "prevent" | `deny` policy, lock, deny settings, firewall: a blocking control |
| "identify", "report", "assess" | `audit`, recommendations, regulatory compliance dashboard |
| "remediate existing resources" | `deployIfNotExists` or `modify` with a remediation task |
| "no public access", "private connectivity" | Private endpoint and public network access disabled |
| "be alerted when attacked" | A Defender for Cloud workload protection plan |
| "respond automatically to incidents" | Sentinel automation rule, which can run a playbook |

Code you must be able to read, not write from memory:

- **Azure Policy JSON**: the `if` condition, the aliases it tests and the `effect`.
- **Azure CLI and PowerShell**: role assignments, Key Vault settings, network rules, Defender plan settings.
- **Bicep and ARM**: secure properties such as `publicNetworkAccess`, `minimumTlsVersion` or `allowBlobPublicAccess`.
- **KQL**: short Sentinel and Defender XDR queries that filter, project and summarize events.

In a drop-down question on code, the other lines of the snippet are clues: a resource type, a scope or a parameter often points to the missing value.

> **Exam trap.** Read "should" and "must" literally. If the requirement is to **detect** suspicious access, a firewall that blocks it isn't the answer; if it is to **prevent** a configuration, an audit policy isn't either.

<!-- section: confusing-pairs -->
## Controls that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| PIM eligible assignment | PIM active assignment | Eligible needs activation (MFA, approval, justification); active is standing access, even if time-bound |
| Azure roles | Microsoft Entra roles | Azure resources through Resource Manager; Entra objects through Microsoft Graph |
| Key Vault Azure RBAC | Key Vault access policies | Roles at vault or object scope, recommended; legacy per-vault policies that any Contributor can edit |
| Soft delete | Purge protection | Recovery window, always on; prevents permanent deletion during that window, optional and irreversible |
| `deny` | `audit` / `deployIfNotExists` / `modify` | Blocks the request; reports; deploys a missing related resource; changes properties |
| Service endpoint | Private endpoint / Private Link service | Subnet identity toward a public endpoint; private IP for a PaaS resource in your network; your own service exposed to other networks |
| NSG | Security admin rules / Azure Firewall | Subnet or NIC filter; Virtual Network Manager rules evaluated before NSGs; central stateful firewall with FQDN and threat intelligence |
| Service SAS | Account SAS / user delegation SAS | One service, signed with the key; several services, signed with the key; signed with Entra credentials, Blob only |
| Azure Disk Encryption | Encryption at host | BitLocker or DM-Crypt inside the guest; encryption of temp disk and caches on the host, no guest agent |
| Foundational CSPM | Defender CSPM | Free recommendations and secure score; paid attack paths, explorer, agentless scanning, governance |
| Defender for Servers Plan 1 | Plan 2 | Defender for Endpoint integration; adds agentless scanning, JIT access, file integrity monitoring and more |
| Sentinel automation rule | Playbook | Central triage rule on incidents and alerts; Logic Apps workflow it can run |

<!-- section: scope -->
## What the exam doesn't test

The study guide leaves out incident investigation and threat hunting, identity life-cycle governance such as entitlement management and access reviews, Purview DLP and labeling policies, and security architecture design: other Microsoft security exams cover them. When a question mentions them, it is about the control you implement, not the investigation or the design.

Defender for Cloud, Entra and the AI services change every month. When a plan name, a role or a limit matters, the course gives the value as Microsoft Learn documents it in November 2026: trust that over older AZ-500 material.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order. Identity and governance come first because every later control relies on roles, policies and managed identities.
2. Use a free Azure subscription and a Microsoft Entra test tenant. Enable a PIM role, write a report-only Conditional Access policy, create a key vault with the RBAC model, assign a `deny` policy and switch on a Defender plan: most drop-down questions become easy once you have seen the settings.
3. For each pair in the table above, write one sentence that says when you would choose each option.
4. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
