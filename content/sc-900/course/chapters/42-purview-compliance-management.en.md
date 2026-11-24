Microsoft Purview is the family of solutions that governs, protects and manages an organization's data. This chapter covers its portal and Compliance Manager, the tool that turns a regulation into a list of actions and a score. The exam expects you to know what the compliance score measures, and what it does not.

<!-- section: purview-portal | objectives: 4.2.1 -->
## The Microsoft Purview portal

The **Microsoft Purview portal** (`https://purview.microsoft.com`) is the unified entry point to the Microsoft Purview solutions. One interface lets you discover the solutions, search, manage settings and manage roles and permissions.

| Family | Solutions seen in this course |
| --- | --- |
| **Data security** | Information Protection (classification, sensitivity labels), Data Loss Prevention, Insider Risk Management |
| **Data governance** | Data Map and Unified Catalog, to discover and govern data across the data estate |
| **Risk and compliance** | Compliance Manager, eDiscovery, Audit, Communication Compliance, Data Lifecycle Management, Records Management |

What the portal shows:

- A **home page** with **solution cards**: only the solutions that your permissions and your subscription let you access. **View all solutions** lists the rest.
- A summary of the **compliance posture**, taken from Compliance Manager.
- A global **search** and centralized **Settings**, including roles and scopes.
- A **Solutions** page with four sections: **Core** (to set up and configure experiences across Microsoft Purview), then **Risk & Compliance**, **Data Governance** and **Data Security**.

The portal replaces the retired Microsoft Purview compliance portal and the classic governance portal.

> **Exam trap.** Sensitivity labels, DLP, retention, eDiscovery, audit and Compliance Manager are in the **Microsoft Purview portal**. Incidents, alerts and hunting are in the **Microsoft Defender portal**. Users, groups and Conditional Access are in the **Microsoft Entra admin center**.

<!-- section: compliance-manager | objectives: 4.2.2 -->
## Compliance Manager

**Microsoft Purview Compliance Manager** helps you automatically assess and manage compliance across your multicloud environment. It accompanies the whole compliance journey: taking an inventory of data protection risks, managing the complexity of implementing controls, staying current with regulations and certifications, and reporting to auditors.

It translates regulations into plain language and provides prebuilt assessments, step-by-step guidance and a score.

| Element | Definition |
| --- | --- |
| **Control** | A requirement of a regulation, standard or policy. It defines how to assess and manage system configuration, organizational process and the people responsible for meeting the requirement |
| **Assessment** | A grouping of controls from a specific regulation, standard or policy, for example ISO 27001. It has its own assessment score |
| **Regulations** | The list of regulations and certifications for which Compliance Manager provides templates to create assessments: more than 360, and custom ones are possible |
| **Improvement action** | Recommended guidance that helps you meet a control. It can be assigned to a user, and it stores the implementation status, the notes and the evidence |

Controls come in three types, which reflect the shared responsibility model:

| Type of control | Who implements it |
| --- | --- |
| **Microsoft managed controls** | Microsoft, for its cloud services |
| **Your controls** (customer managed) | Your organization |
| **Shared controls** | Both: your organization and Microsoft share the responsibility |

Compliance Manager continuously collects signals from your Microsoft 365 environment and updates the status of technical actions automatically; a change appears on the dashboard within 24 hours.

<!-- section: compliance-score | objectives: 4.2.3 -->
## Uses and benefits of compliance score

The **compliance score** measures your progress in completing the recommended improvement actions. Compliance Manager awards points for each completed action and combines them into an overall score, shown on its dashboard.

- The points of an action depend on the **risk** it addresses: the bigger the risk, the more points.
- The score adds **your points** (actions your organization completes) and **Microsoft-managed points** (actions Microsoft has completed as the cloud provider).
- A new organization starts with an **initial score** based on the **Microsoft 365 data protection baseline**, a set of controls that covers key regulations and standards for data protection and general data governance, drawn mainly from NIST CSF and ISO, and also from FedRAMP and GDPR.

| Type of action | Mandatory | Discretionary |
| --- | --- | --- |
| **Preventative**: addresses a specific risk, for example encryption at rest | 27 points | 9 points |
| **Detective**: monitors to find irregularities or breaches, for example access auditing | 3 points | 1 point |
| **Corrective**: limits the damage of an incident, for example incident response | 3 points | 1 point |

A mandatory action cannot be bypassed (a centrally enforced password policy); a discretionary action relies on users following a policy (locking an unattended computer).

What the score is used for:

- **Understand** the compliance posture at a glance.
- **Prioritize**: do first the actions that reduce the most risk and bring the most points.
- **Track** progress over time.
- **Report** the status to leadership, auditors and other stakeholders.

> **Exam trap.** The compliance score is **not** an absolute measure of compliance and guarantees nothing: a high score means that many recommended actions are done, not that the organization is certified compliant.

> **Exam trap.** **Compliance score** (Compliance Manager, Purview portal): progress toward regulations and standards. **Microsoft Secure Score** (Defender portal): security posture. A question about "reducing risks around data protection and regulatory standards" is about the compliance score.

<!-- section: key-points -->
## Key points

- The Microsoft Purview portal is the single entry point to the data security, data governance and risk and compliance solutions.
- Compliance Manager assesses and manages compliance across a multicloud environment, with assessments, controls, regulation templates and improvement actions.
- Three types of controls: Microsoft managed, yours, shared.
- The compliance score measures the progress on improvement actions; points depend on risk; it combines your points and Microsoft-managed points.
- The initial score comes from the Microsoft 365 data protection baseline.
- The score helps to understand, prioritize, track and report; it is not a guarantee of compliance.
- Compliance score is in Purview; Microsoft Secure Score is in Defender.
