SC-100 is the exam of the cybersecurity architect. It never asks how to configure a product: it describes an organization, usually hybrid and multicloud, lists business and compliance requirements, and asks what you should recommend, which framework guides the decision and which Microsoft security capability fits. This chapter covers the format, a method for reading design questions, the map of the Microsoft frameworks that the first domain is built on, and the pairs of products the exam expects you to tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Cybersecurity Architect Expert |
| Prerequisite | At least one of these certifications: Identity and Access Administrator Associate (SC-300), Security Operations Analyst Associate (SC-200), Cloud and AI Security Engineer Associate (SC-500) |
| Duration | 100 minutes of exam time, 120 minutes in the seat (Microsoft's figures for associate and expert exams without labs) |
| Questions | Not published; about 40 to 60 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam; the timer keeps running |
| Languages | English, Japanese, Chinese (Simplified and Traditional), Korean, German, French, Spanish, Portuguese (Brazil), Italian. In another language, you can request 30 extra minutes |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |
| Practice | The exam sandbox (aka.ms/examdemo) shows the interface |

The study guide used by this course is the version of October 21, 2026. Its four domains:

| Domain | Weight |
| --- | --- |
| Design solutions that align with security best practices and priorities | 20 to 25 % |
| Design security operations, identity, and compliance capabilities | 25 to 30 % |
| Design security solutions for infrastructure | 25 to 30 % |
| Design security solutions for applications and data | 20 to 25 % |

The guide now includes AI topics in every domain: AI solutions aligned with the Microsoft cloud security benchmark, a secure AI adoption strategy, agent identities with Microsoft Entra Agent ID, Azure AI services security, data used in AI workloads and the controls of Microsoft 365 Copilot. Security Exposure Management also appears in posture management.

Question formats, from most to least frequent: one answer among four, "select two", series of Yes/No statements, drop-down lists that complete "to meet requirement X, recommend Y", and drag and drop that matches requirements to solutions. Ordering and hot area questions are rare, and there is no lab, no command and no code. Questions made of several elements give one point per correct element. Two sections have their own rules:

- **Case study.** A company described in tabs (overview, existing environment, requirements, constraints) followed by four to six questions. Once you leave it, you can't come back. If you take a break during a case study, you can't return to the questions you saw before the break.
- **Problem-solution series.** The same goal is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final, and you can't take a break inside the series.

> **Exam tip.** Microsoft Learn is there for one precise fact: the scenarios of the Zero Trust adoption framework, the domains of a benchmark, a product's coverage of AWS or GCP. Microsoft states that looking up every question won't fit in the time, and that is by design.

<!-- section: reading-questions -->
## Reading a design question

A typical stem has four to eight sentences: an organization (Contoso, Fabrikam, Litware...) with on-premises Active Directory Domain Services, Azure subscriptions, AWS accounts or GCP projects and Microsoft 365, a current problem, then requirements. It ends with "What should you recommend?", "What should you include in the recommendation?" or "Which two solutions meet the requirements?". One constraint usually decides between two valid answers. Work in this order:

1. Read the last sentence first: are you asked for a product, a framework, a priority or a process?
2. List every requirement, including those hidden in the context ("the security team has no Azure experience", "the company uses a third-party SIEM").
3. Eliminate every option that fails one requirement.
4. Apply the deciding constraint to what remains.

| Words in the stem | What they select |
| --- | --- |
| "minimize administrative effort" | The built-in, managed capability with native integration, rather than a custom script, connector or third-party tool |
| "minimize costs" | The capability already included in the existing licenses or the free tier, if it meets every requirement |
| "Zero Trust" | Verify explicitly, least privilege, assume breach: Conditional Access with device signals, just-in-time access, segmentation |
| "least privilege" | The narrowest role at the narrowest scope, eligible in Privileged Identity Management rather than permanent |
| "business-critical assets", "crown jewels" | Identify and classify them first, then protect them first (critical asset management in Security Exposure Management) |
| "recover without paying the ransom" | Immutable or offline backups, tested restores, protected recovery documentation |
| "AWS", "GCP", "multicloud" | Microsoft capabilities that cover other clouds natively (Defender for Cloud connectors, Azure Arc for servers) |
| "first", "prioritize" | The order Microsoft publishes: for ransomware, recovery, then privileged access, then entry points |
| "prevent", as opposed to "detect" or "report" | A blocking control, as opposed to an alert or an assessment |

> **Exam trap.** A technically correct product can still be the wrong answer. If the question asks which framework or which priority, an answer that names a product is a distractor, and the other way round.

In a Yes/No series, judge each solution against the stated goal only. Accept a solution that meets the goal even if you would have designed a better one.

<!-- section: frameworks -->
## The frameworks you must place

The first domain is about frameworks, and their names appear as answer options in every domain. Know what each one is for:

| Framework | What it is | Typical question |
| --- | --- | --- |
| Zero Trust adoption framework | Guidance organized by five business scenarios, with the lifecycle phases Define strategy, Plan, Ready, Adopt, Govern and Manage | How to plan and prioritize a Zero Trust program with business leaders |
| Microsoft Cybersecurity Reference Architectures (MCRA) | Diagrams of Microsoft security capabilities and how they integrate with each other and with third-party tools | A target-state security architecture, or which capability covers a function |
| Microsoft cloud security benchmark (MCSB) | A set of security controls, organized in domains and mapped to Azure Policy definitions, assessed by Defender for Cloud | Which control or baseline a design must meet |
| Cloud Adoption Framework (CAF) | Methodologies for the whole cloud estate (Strategy, Plan, Ready, Adopt, Govern, Manage), with a Secure methodology across them, and Azure landing zones | Organization-wide governance, landing zones, DevSecOps, AI adoption |
| Azure Well-Architected Framework (WAF) | Five pillars for one workload, with a security design review checklist | Reviewing or designing one workload |
| Ransomware protection plan | Three steps in priority order: prepare recovery, limit the scope of damage, make it hard to get in | What to do first against ransomware |

> **Exam tip.** CAF works at the scale of the organization and its estate; WAF works at the scale of one workload. MCRA shows capabilities; MCSB lists controls.

<!-- section: confusing-pairs -->
## Products that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Defender for Cloud posture management (CSPM) | Defender for Cloud workload protection | Assesses configurations and recommends fixes; detects and alerts on attacks against servers, containers, databases, storage and AI services |
| Defender for Cloud secure score | Microsoft Secure Score | Posture of Azure, AWS and GCP resources; posture of Microsoft 365, identities, devices and apps in the Defender portal |
| Privileged Identity Management (PIM) | Entitlement management / access reviews | Just-in-time activation of privileged roles; access packages with request, approval and expiration; periodic recertification of existing access |
| Microsoft Sentinel | Microsoft Defender XDR | SIEM and SOAR for any data source; correlated detection and response across the Microsoft Defender products |
| Microsoft Entra Internet Access | Microsoft Entra Private Access | Secure web gateway for internet and SaaS traffic; access to private applications without a VPN |
| Azure Policy | Defender for Cloud regulatory compliance / Microsoft Purview Compliance Manager | Enforces or audits resource configuration; assesses Azure, AWS and GCP against standards; assesses Microsoft 365 compliance with improvement actions |
| Microsoft Defender for IoT | Microsoft Defender External Attack Surface Management (EASM) | Discovers and monitors OT and IoT devices inside your networks; discovers your internet-facing assets from the outside |
| Workload identity | Agent identity | Identity of an application or service (service principal, managed identity); identity of an AI agent in Microsoft Entra Agent ID |
| Security Exposure Management | Defender for Cloud | Unified exposure across endpoints, identities, cloud and external surface, with attack paths and choke points; posture and protection of cloud workloads |
| Azure Backup | Azure Site Recovery | Restores data to a point in time; replicates machines to fail over quickly |
| Azure Web Application Firewall | Azure Well-Architected Framework | A layer 7 protection service; a design framework. Both are abbreviated WAF |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the frameworks of the first domain give the vocabulary of every later recommendation.
2. For each framework, write in one sentence what it is for and which question it answers, then compare with the table above.
3. For each product pair, write the requirement that would make you choose each option.
4. Train on case studies: read the questions first, then look in the tabs for the requirement each question depends on.
5. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
6. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
