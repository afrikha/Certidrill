# K-sc-200-cs2 — report

3 case studies, 18 questions (prefix `sc200-cs2`), all `status: draft`. Validator: 21 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| sc200-cs2a-fourth-coffee | Manufacturing, hybrid AD DS + Defender for Identity/Endpoint, on-premises Arc servers, CEF/Syslog forwarder | 1.3.4 dropdown, 1.1.9 yesno, 1.2.1 dragdrop, 1.3.2 single, 2.2.2 ordering, 3.1.2 dropdown (KQL) |
| sc200-cs2b-consolidated-messenger | Logistics, Azure-native (18 subscriptions, Defender for Cloud plans, Sentinel data lake) | 1.3.5 single, 1.2.2 dropdown, 1.1.11 multi, 1.4.3 single, 2.1.3 single, 3.2.2 single |
| sc200-cs2c-graphic-design-institute | Higher education, cloud-only Microsoft 365 (MDO P2, Entra ID P2, Purview Audit, Graph activity logs) | 2.1.1 single, 2.1.5 dragdrop, 2.3.3 dropdown (KQL), 2.3.1 single, 1.4.1 yesno, 3.1.1 single |

Difficulty: 5 easy, 9 medium, 4 hard.

## Facts not fully verified on Learn (WebFetch budget of the session ran out mid-task)

- **sc200-cs2b-activity-log-policy**: the Sentinel page fetched (diagnostic settings-based connections) documents the Azure Policy assignment wizard, the "Create a remediation task" checkbox and the Owner requirement, but its scope step mentions subscriptions only, and its prerequisites table suggests the Azure Activity connector uses the "standalone" procedure. Assigning the built-in Activity log policy at a management group scope relies on general Azure Policy behaviour (Azure Monitor built-in policy page: scope can be a management group). A reviewer should check the current Azure Activity connector page.
- **sc200-cs2b-owner-assignment-rule**: "5 minutes is the shortest scheduled-rule interval" comes from memory; the NRT page confirms the 5-minute built-in delay of scheduled rules, the one-minute NRT run and the 50-rule limit.
- **sc200-cs2b-playbook-automation**: the condition label "Severity equals High" is written from the automation rules page (severity is an incident property condition); exact UI wording not checked.
- **sc200-cs2a-device-groups**: the configure-attack-disruption page says No automated response excludes a group from automated containment; it also says Semi automation lets disruption act without approval, which is why no question asks which level enables disruption.
- **sc200-cs2a-sentinel-roles**: the roles page is internally inconsistent about Playbook Operator ("attach/run" vs "run"); the question only uses "run playbooks manually".
- Device group automation-level labels are quoted as in the device groups page ("Semi - Approval required for all folders", "No automated response") and the attack disruption page ("Full - remediate threats automatically").
- Syslog "facility" is kept in English in French texts (no confirmed Learn FR term).
