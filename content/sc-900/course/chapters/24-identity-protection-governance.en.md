Giving access is easy; making sure it stays appropriate is the hard part. Microsoft Entra offers four capabilities that the exam loves to mix up: ID Governance, access reviews, Privileged Identity Management and ID Protection.

<!-- section: id-governance | objectives: 2.4.1 -->
## Microsoft Entra ID Governance

**Microsoft Entra ID Governance** helps make sure that the right people have the right access to the right resources, by automating identity and access processes. It helps answer four questions:

- Which identities should have access to which resources?
- What are those identities doing with that access?
- Are there organizational controls in place for managing access?
- Can auditors verify that the controls are working effectively?

It governs three lifecycles:

| Lifecycle | What it covers | Capabilities |
| --- | --- | --- |
| **Identity** lifecycle | People joining, moving and leaving | Provisioning from HR systems such as Workday or SuccessFactors; **lifecycle workflows** that automate tasks before a start date, on a change, or at departure |
| **Access** lifecycle | Getting, keeping and losing access as needs change | **Entitlement management**, dynamic groups, **access reviews** |
| **Privileged access** lifecycle | Administrator rights | **Privileged Identity Management** |

**Entitlement management** automates access requests, approvals, assignments and expiration. Its unit is the **access package**: a bundle of the resources a person needs for a project or a role (group and team memberships, applications, SharePoint sites) with policies that say who can request it, who approves, and when access expires. It also handles external users: a partner who is approved is invited as a guest, and the guest account can be removed when the access ends.

Using these features requires a Microsoft Entra ID Governance or Microsoft Entra Suite license; some capabilities, including Privileged Identity Management and basic access reviews, are also in Microsoft Entra ID P2.

<!-- section: access-reviews | objectives: 2.4.2 -->
## Access reviews

**Access reviews** let an organization check on a regular basis that only the right people still have access. People change teams or leave, guests stay in groups, and excessive access becomes a security risk and an audit finding.

| Element | Options |
| --- | --- |
| What is reviewed | Group memberships (including guests), access to applications, Microsoft Entra roles and Azure resource roles, access package assignments |
| Who reviews | The users themselves (self-review), group owners, the users' managers, or specified reviewers |
| How often | On a recurring schedule: weekly, monthly, quarterly or annually |
| Help for reviewers | Recommendations to approve or deny, based for example on sign-in activity |
| At the end | Results applied manually or automatically: access that wasn't approved is removed |

A review can have up to three stages, with different reviewers at each stage. Reviews of Microsoft Entra roles and Azure resource roles are created in Privileged Identity Management.

> **Exam tip.** "Every quarter, managers must confirm that the guests of a team still need access": access reviews. The keywords are "periodically", "recertify", "still need".

<!-- section: pim | objectives: 2.4.3 -->
## Microsoft Entra Privileged Identity Management

**Privileged Identity Management** (PIM) is a service in Microsoft Entra ID that lets you manage, control and monitor access to important resources. It reduces the number of people who hold privileged access permanently.

| PIM is | Meaning |
| --- | --- |
| **Just in time** | Privileged access only when it is needed |
| **Time-bound** | Start and end dates for an assignment |
| **Approval-based** | An approval can be required to activate a role |
| **Visible** | Notifications when privileged roles are activated |
| **Auditable** | A full access history can be downloaded |

| Assignment | Meaning |
| --- | --- |
| **Eligible** | The user must **activate** the role to use it, for a limited duration, possibly with multifactor authentication, a justification or an approval |
| **Active** | The user holds the role without any action |

PIM manages **Microsoft Entra roles**, **Azure roles** and, with PIM for Groups, just-in-time membership or ownership of a group. It can also run access reviews of those roles, and it prevents the removal of the last active Global Administrator and Privileged Role Administrator role assignments.

> **Exam trap.** PIM doesn't detect attacks and doesn't decide who should have a role: it limits when and for how long a privileged role is usable. "An administrator must request the role and gets it for two hours after approval" is PIM.

<!-- section: id-protection | objectives: 2.4.4 -->
## Microsoft Entra ID Protection

**Microsoft Entra ID Protection** helps organizations **detect, investigate and remediate** identity-based risks. It uses the signals Microsoft collects to calculate a risk:

| Risk | Meaning | Example detections |
| --- | --- | --- |
| **Sign-in risk** | The probability that a given authentication request isn't made by the identity's owner | Anonymous IP address, atypical travel, unfamiliar sign-in properties |
| **User risk** | The probability that an identity or account is compromised | Leaked credentials, suspicious activity reported by the user |

| Step | How |
| --- | --- |
| Detect | Risk detections calculated at sign-in or afterward; they also cover workload identities |
| Investigate | Three reports: **risk detections**, **risky sign-ins**, **risky users** |
| Remediate | **Risk-based Conditional Access** policies require multifactor authentication for a risky sign-in, and, for a risky user, a secure password change (**Require password change**) or the remediation that fits the user's authentication method (**Require risk remediation**); when the user completes it, the risk is remediated automatically. Otherwise an administrator dismisses the risk, confirms the sign-in safe or confirms the compromise |

Risk policies are created in Conditional Access: the legacy user risk and sign-in risk policies configured in ID Protection itself retire on October 1, 2026. Risk data can be exported to a security information and event management (SIEM) tool such as Microsoft Sentinel. Risk-based policies and the full reports require Microsoft Entra ID P2.

Choosing between the four:

| Requirement | Answer |
| --- | --- |
| Block or challenge a sign-in from an anonymous IP address | Microsoft Entra ID Protection, with a risk-based Conditional Access policy |
| Be told that a user's credentials were found in a leak | Microsoft Entra ID Protection (user risk) |
| Give an administrator role only for the duration of a task | Privileged Identity Management |
| Require approval before a privileged role is used | Privileged Identity Management |
| Confirm every six months that group members still need access | Access reviews |
| Let employees request a bundle of resources that expires automatically | Entitlement management (access package) |
| Automate tasks when an employee joins or leaves | Lifecycle workflows |

<!-- section: key-points -->
## Key points

- ID Governance: the right people, the right access, the right resources; identity, access and privileged access lifecycles.
- Entitlement management: access packages with request, approval and expiration, for internal and external users.
- Access reviews: periodic recertification of group memberships, application access and roles; results can be applied automatically.
- PIM: just-in-time, time-bound, approval-based, visible, auditable; eligible assignments are activated, active ones aren't.
- ID Protection: detect, investigate, remediate. Sign-in risk concerns one sign-in; user risk concerns the account.
- Risk-based Conditional Access automates remediation: MFA for a risky sign-in, password change for a risky user.
