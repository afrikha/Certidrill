Four Microsoft references shape most SC-100 recommendations: the Microsoft Cybersecurity Reference Architectures (MCRA) show which capabilities exist and how they fit together, the Microsoft cloud security benchmark (MCSB) lists the controls a cloud design must meet, now including AI, and the Zero Trust adoption framework organizes the program around business scenarios. Exam questions ask which reference answers a need, which control or capability addresses insider, external or supply chain threats, and which MCSB control an AI design misses.

<!-- section: mcra | objectives: 1.2.1 -->
## The Microsoft Cybersecurity Reference Architectures

The **MCRA** are technical reference architectures for adopting end-to-end security with Zero Trust principles. The main artifact is a PowerPoint deck of diagrams (April 2025 version) that covers the "hybrid of everything": legacy IT, multicloud, IoT, operational technology (OT) and AI. Each capability in the diagrams has a ScreenTip and a documentation link.

| Use | What it gives the architect |
| --- | --- |
| Starting template | A target-state security architecture |
| Comparison reference | What Microsoft recommends, compared with what the organization already owns |
| Integration guidance | How Microsoft capabilities and existing third-party tools connect |
| Learning and education | A map of capabilities to present to teams and newcomers |

The deck contains guidance (antipatterns, best practices, threat trends, end-to-end security and ruthless prioritization, Zero Trust adoption), a mapping of Microsoft capabilities to Zero Trust standards (including draft content of The Open Group Zero Trust Reference Model) and to organizational roles, and diagrams: Microsoft cybersecurity capabilities, Zero Trust user access, security operations, OT, multicloud and cross-platform capabilities, attack chain coverage, infrastructure and development security, and security organizational functions. The MCRA are a component of the **Security Adoption Framework (SAF)**, Microsoft's guidance for modernizing security strategy, governance, architecture and operations.

The capabilities view is what the exam uses most. Know which product covers which function:

| Function | Microsoft capability |
| --- | --- |
| Identity and access, Conditional Access | Microsoft Entra ID |
| Network access without VPN, secure web gateway | Microsoft Entra Private Access, Microsoft Entra Internet Access |
| Endpoint detection and response, vulnerability management | Microsoft Defender for Endpoint, Microsoft Defender Vulnerability Management |
| Device management and compliance | Microsoft Intune |
| Email and collaboration protection | Microsoft Defender for Office 365 |
| SaaS discovery and control | Microsoft Defender for Cloud Apps |
| Identity threat detection for AD DS | Microsoft Defender for Identity |
| Cloud posture and workload protection, Azure, AWS, GCP | Microsoft Defender for Cloud |
| Correlated detection and response | Microsoft Defender XDR |
| SIEM and SOAR | Microsoft Sentinel |
| Exposure, attack paths, critical assets | Microsoft Security Exposure Management |
| Internet-facing asset discovery | Microsoft Defender External Attack Surface Management |
| OT and IoT devices | Microsoft Defender for IoT |
| Data classification, DLP, insider risk, compliance | Microsoft Purview |

> **Exam tip.** "The architect needs a reference that shows how Microsoft security capabilities integrate with the company's existing third-party tools" is the MCRA. "The architect needs a list of security controls to assess cloud workloads against" is the MCSB.

<!-- section: mcsb | objectives: 1.2.1 -->
## The Microsoft cloud security benchmark

The **MCSB** is a set of security controls and recommendations for cloud workloads. The current version is **MCSB v2 (preview)**, which supersedes v1, adds Azure-focused guidance and maps controls to more than 420 built-in Azure Policy definitions, so that Azure Policy and Defender for Cloud can measure and monitor compliance. It is organized in 12 control domains:

| Code | Domain | Code | Domain |
| --- | --- | --- | --- |
| NS | Network security | LT | Logging and threat detection |
| IM | Identity management | IR | Incident response |
| PA | Privileged access | PV | Posture and vulnerability management |
| DP | Data protection | ES | Endpoint security |
| AM | Asset management | BR | Backup and recovery |
| DS | DevOps security | AI | Artificial intelligence security |

Defender for Cloud assigns the MCSB by default as its security standard (with AWS Foundational Security Best Practices for AWS connectors and GCP Default for GCP): the recommendations you see come from it, and only built-in MCSB recommendations affect the secure score. The Defender for Cloud documentation doesn't name the version of this default. Regulatory standards (ISO 27001, PCI DSS, NIST SP 800-53...) are added separately in the regulatory compliance dashboard.

| Requirement | Recommendation |
| --- | --- |
| A baseline of security controls for Azure workloads, measurable with built-in tools | The MCSB, assessed in Defender for Cloud |
| Enforce one control at scale (deny public network access, require encryption) | The Azure Policy definition mapped to the MCSB control |
| Prove compliance with a regulation | The regulatory standard in Defender for Cloud regulatory compliance, not the MCSB alone |
| Decide which Microsoft products to deploy and how they connect | The MCRA |

> **Exam trap.** The MCSB is a benchmark, not a regulation, and not an architecture. A question that asks to "align with best practices for capabilities and controls" can accept both MCRA (capabilities) and MCSB (controls): read whether the stem asks what to deploy or what to measure.

<!-- section: attack-types | objectives: 1.2.2 -->
## Protecting against insider, external and supply chain attacks

The three threat sources call for different controls:

| Threat | Typical scenario | Best practices | Microsoft solutions |
| --- | --- | --- | --- |
| Insider | A departing employee copies intellectual property; an employee leaks confidential data, misuses patient data or AI tools | Least privilege, time-bound access, recertification, data classification and loss prevention, risk-based detection with privacy | Microsoft Purview Insider Risk Management, Purview Data Loss Prevention, Communication Compliance, PIM, access reviews |
| External | Phishing, password spray, exploitation of internet-facing systems, ransomware | Zero Trust: strong authentication, device compliance, segmentation, XDR, patching, known external surface | Conditional Access, Defender XDR, Defender for Endpoint, Defender for Office 365, Defender EASM, Security Exposure Management |
| Supply chain | A trusted vendor's build or update process is compromised; a signed malicious app; compromised firmware; malware pre-installed on devices | Allow only authorized code, secure build and update pipelines, sign and verify everything, govern dependencies and partner access | Code integrity policies, EDR, GitHub Advanced Security, Defender for Cloud DevOps security, partner access governed in Microsoft Entra |

**Insider Risk Management** correlates Microsoft 365 and Microsoft Graph signals, and third-party indicators, with policies built from templates such as **Data theft by departing users** (requires the HR connector), **Data leaks**, **Data leaks by priority users**, **Security policy violations** (uses Microsoft Defender for Endpoint alerts), **Patient data misuse (preview)**, **Risky AI usage** and **Risky Agents (preview)**. It is built with privacy by design: users are **pseudonymized by default**, with role-based access and audit logs. Alerts are triaged into cases, which can be escalated to eDiscovery (Premium). A Communication Compliance policy can bring users into scope.

**Supply chain attacks** target software developers and suppliers to reach source code, build processes or update mechanisms; the malicious code then runs with the trust of the legitimate application. Microsoft's recommendations:

- For every organization: strong code integrity policies that allow only authorized apps, and EDR that detects and remediates suspicious activity automatically.
- For software producers: patch the build and update infrastructure immediately, allow only trusted build tools, require MFA for administrators; protect updaters with TLS and certificate pinning; sign everything, including configuration files and scripts, and verify signatures; have an incident process that discloses supply chain incidents to customers.
- For dependencies: dependency scanning and alerts (Dependabot, GitHub Advanced Security for Azure DevOps), secret scanning and code scanning in the pipeline, visible to the security team in Defender for Cloud DevOps security.
- For partners and vendors with access to your environment: guest accounts with B2B collaboration, access packages that expire, access reviews and Conditional Access that apply to external users.

> **Exam trap.** A user whose account behaves as if it were stolen is an identity risk (Microsoft Entra ID Protection). A legitimate user who misuses their own access is an insider risk (Purview Insider Risk Management). The stem's words "departing", "resignation", "HR" point to the second.

<!-- section: mcsb-ai | objectives: 1.2.3 -->
## Aligning AI solutions with the MCSB

The **Artificial intelligence security** domain of MCSB v2 has seven controls, which cover AI platform security, AI application security and AI security monitoring:

| Control | Requirement | Solutions named by the benchmark |
| --- | --- | --- |
| AI-1 Ensure use of approved models | Only models that passed a formal verification and approval process reach production | Azure Machine Learning registry and model catalog, Azure Policy that allows only approved registry models, Azure RBAC |
| AI-2 Implement multi-layered content filtering | Filter inputs, intermediate processing and outputs against malicious prompts and harmful content | Azure AI Content Safety (Prompt Shields, input and output filtering), Azure API Management |
| AI-3 Adopt safety meta-prompts | System instructions that guide behavior and resist prompt injection and jailbreaks | Safety system messages, Prompt Shields, spotlighting, version-controlled prompts, testing with PyRIT |
| AI-4 Apply least privilege for agent functions | Limit an agent's tools, identity and network access to its purpose | Microsoft Entra Agent ID, Azure RBAC and ABAC, Azure API Management, Azure Key Vault short-lived tokens, network segmentation |
| AI-5 Ensure human-in-the-loop | Human review and approval for critical actions, especially on external systems or sensitive data | Approval workflows (Azure Logic Apps, Power Automate), audit logging |
| AI-6 Establish monitoring and detection | Detect jailbreaks, prompt injection, anomalies and data exfiltration; classify data accessed by AI | Defender for Cloud threat protection for AI services, Microsoft Purview, Microsoft Sentinel, Azure Monitor |
| AI-7 Perform continuous AI red teaming | Test AI systems with adversarial techniques before attackers do | PyRIT, AI Red Teaming Agent, MITRE ATLAS, results integrated in CI/CD |

AI workloads also inherit the other domains: application identities (IM), network controls for cloud-native services (NS), data protection (DP) and logging (LT).

| Requirement in the stem | Control |
| --- | --- |
| Developers deploy models downloaded from public hubs without review | AI-1 |
| Users try to make a chatbot ignore its instructions | AI-2 (Prompt Shields) and AI-3 |
| An agent can call every API of the company with a shared secret | AI-4 |
| An agent can issue refunds without review | AI-5 |
| The SOC must be alerted on jailbreak attempts against production models | AI-6 |
| Find weaknesses before release and after each model change | AI-7 |

> **Exam trap.** Content filtering (AI-2) inspects what enters and leaves the model; safety meta-prompts (AI-3) shape how the model behaves; least privilege for agents (AI-4) limits what the agent can do even when both of these fail. A design that relies only on prompts misses AI-4 and AI-5.

<!-- section: zero-trust-adoption | objectives: 1.2.4 -->
## The Zero Trust adoption framework

Zero Trust rests on three principles: **verify explicitly** (authenticate and authorize on every available data point), **use least privileged access** (just-in-time and just-enough access, risk-based adaptive policies, data protection), and **assume breach** (minimize blast radius, segment access, verify end-to-end encryption, use analytics for detection).

The adoption framework turns them into a program that business leaders can sponsor. It is organized by **business scenarios**, each broken into four implementation stages:

| Business scenario | Typical requirement | Main capabilities |
| --- | --- | --- |
| Rapidly modernize your security posture | Measure and raise posture across the estate, prioritize by risk | Microsoft Secure Score, Defender for Cloud, Security Exposure Management |
| Secure remote and hybrid work | Users work from anywhere on managed and personal devices | Microsoft Entra Conditional Access, Intune, Entra Private Access and Internet Access |
| Identify and protect sensitive business data | Know where sensitive data is and keep it protected wherever it goes | Microsoft Purview Information Protection and Data Loss Prevention |
| Prevent or reduce business damage from a breach | Contain an attacker and recover quickly | Ransomware recovery plan, privileged access, segmentation, Defender XDR, Sentinel |
| Meet regulatory and compliance requirements | Map regulations to controls and prove compliance | Purview Compliance Manager, Defender for Cloud regulatory compliance |

The framework follows the lifecycle phases of the Cloud Adoption Framework: **Define strategy, Plan, Ready, Adopt, Govern, Manage**. The difference is the scale motion: CAF repeats its process for each workload, whereas Zero Trust applies one piece of the architecture (for example data protection) across the whole estate, then repeats with the next piece. The technical functional areas are identities, endpoints, apps, infrastructure, data and network.

> **Exam trap.** "Which framework helps align the Zero Trust program with business outcomes and sponsors?" is the Zero Trust adoption framework with its business scenarios. The MCRA show the target architecture; they don't organize the program.

> **Exam tip.** When a scenario is about remote employees on personal devices, the business scenario is "Secure remote and hybrid work". When it is about ransomware or limiting damage, it is "Prevent or reduce business damage from a breach".

<!-- section: key-points -->
## Key points

- MCRA: diagrams of Microsoft capabilities and integrations, part of the Security Adoption Framework. Use them as a target-state template and to compare with existing tools.
- MCSB v2 (preview): 12 control domains, including DevOps security and AI security, mapped to more than 420 Azure Policy definitions. The MCSB is the default standard of Defender for Cloud.
- Insider risk: Purview Insider Risk Management, pseudonymized by default; departing users need the HR connector. Supply chain: code integrity, signed updates, dependency and secret scanning, governed partner access.
- MCSB AI controls: approved models, layered content filtering, safety meta-prompts, least privilege for agents, human in the loop, monitoring, continuous red teaming.
- Zero Trust adoption framework: three principles, five business scenarios, CAF lifecycle phases, scaled across the estate one piece at a time.
