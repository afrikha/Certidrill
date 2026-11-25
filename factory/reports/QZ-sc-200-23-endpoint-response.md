# QZ-sc-200-23-endpoint-response — notes

`content/sc-200/quizzes/23-endpoint-response.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q1), 2.2.2 (q3, q5, q6, q7, q9), 2.2.3 (q2, q8), 2.2.4 (q4, q10). Positions 6–10: single ×2, yesno, dragdrop, dropdown (KQL).

## Chapter vs current Learn (fix in the chapter, not done here)

- **Policy status and Activities-tab tracking are preview.** Both "Details and results of an automatic attack disruption action" and "Automatic attack disruption in Microsoft Defender" label them "(Preview)". Step 2 of the chapter's remediation workflow relies on them without saying so. The mock questions `sc200-2c-disruption-policy-status` (correct answers) and `sc200-2c-disruption-release-order` (a required step) make a preview feature the answer.
- **DisruptionAndResponseEvents is inconsistent on Learn.** Its table page lists no `AccountUpn`, `AttackDisruptionCategory` or `IncidentId` column, yet the queries on the autoad-results page project or filter on them. The table page also says that the table contains block and policy-application events (for example `ContainedUserLogonBlocked`), not the execution of actions such as contain user or disable user. The chapter says that the first query "lists the automatic actions". The mock `sc200-2c-disruption-kql-actions` relies on `IncidentId`. Check this before publishing.
- **Live response platforms**: `isolate`/`release` are **macOS only**, not "macOS or Linux" as the chapter says. `putfile` is 300 MB on Windows and 10 MB on other platforms.
- **Isolation**: the respond-machine-alerts page now says that "Device isolation is automatically lifted after seven days", and that isolation is retried for up to three days when the device is offline. Neither point is in the chapter. The chapter's Linux `iptables` rule (changing a rule removes isolation) isn't on that page; it only lists `iptables` prerequisites. Unverified.
- **Attack disruption actions** now also include Isolate device, Suspend user in Entra and predictive shielding (Safeboot/GPO hardening, proactive user containment). Okta and AWS are preview. The automatic-attack-disruption page doesn't state the duration of contain user. The chapter's "lifted automatically" isn't contradicted, but I didn't verify the five days in the mock `sc200-2c-disruption-contain-user`.
- Library upload: Learn adds that uploading files from the **Library management page** doesn't need Manage security settings; only the console upload does.
- Timeline data is kept for 90 days by default (not in the chapter).

## Not verified / doubts

- q1: option d assumes an "Additional information" column in the timeline. Learn says that the ATT&CK tags appear "under Additional information".
- q9: Alerts investigation for investigation packages comes from "Create and manage roles…", not from the chapter. Active remediation actions ("take response actions") could be read as covering package collection too. With `reuse: false` and isolation requiring Active remediation actions, the key is still unique.
- q10: the exact `ActionType` values are unknown (Learn uses `contains "ContainedDevice"`), so `contains` is fixed in the template and not a slot. `DeviceName` is assumed to be the onboarded device that reported the block. DisruptionAndResponseEvents isn't offered as an option, because it may hold device block events too.
- q8: "1,000 devices" and "at least passive mode" come from "Take response actions on a file".

## Design notes

- I avoided the mock decisions. The new decisions are: the Techniques data type filter, Collect file, AV scan in passive mode, Enable user, Microsoft-only signing for restrict app execution, containment enforced by other devices, device group access for isolation, isolating a VM versus its Hyper-V host, Stop and quarantine limits (signed files, passive mode, 1,000 devices), the permission per task, and a `ContainedDevice` hunt.
- No preview feature is a correct answer.
