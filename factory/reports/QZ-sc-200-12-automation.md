# QZ-sc-200-12-automation — notes

`content/sc-200/quizzes/12-automation.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.7 (q4, q10), 1.1.8 (q2, q8), 1.1.9 (q3, q7), 1.1.10 (q1, q6), 1.1.11 (q5, q9). Positions 6–10: dropdown, single, multi, single, yesno.

## Chapter or mock exam vs current Learn

- **Mock question `sc200-1b-dg-folder-levels` may be wrong.** "Automation levels in automated investigation and remediation" lists `\program files\` and `\program files (x86)\*` among the *temporary* folders of the level "Semi - require approval for non-temp folders remediation". By that page, File2 (`C:\Program Files\KioskApp\update.dll` on DG-Kiosks) would be remediated automatically, not left pending. The Learn list looks odd and may be a doc error, but the question contradicts the page as written. Use another folder (for example `C:\ProgramData\...`). The chapter's non-temp row should also show the full list or avoid Program Files.
- **Unified RBAC scope.** The chapter says unified RBAC custom roles "are assigned with a scope of data sources and device groups". The Learn page "Create custom roles with Microsoft Defender unified RBAC" says an assignment selects users, data sources and Sentinel data collections. It also says Defender for Endpoint device groups keep governing per-device visibility, configured separately in the device groups.
- **Who can grant playbook permissions.** Learn (run-playbooks, automate-responses-with-playbooks) says Owner **or User Access Administrator**. The chapter says Owner only.
- **Learn inconsistency.** "Create and use Microsoft Sentinel automation rules" says the user "must have the Microsoft Sentinel Automation Contributor role on any resource group containing playbooks you want to run". The roles page says that role is "not used for user accounts". q9 doesn't depend on it: the answer is that an Owner grants Sentinel's permissions. Worth reporting to Learn or watching.
- **Alert trigger and Defender XDR alerts.** The automation rules page now says to use the **Enhanced Alert Trigger** for Defender XDR alerts. The chapter only says alert-trigger automation for Defender XDR alerts isn't available. I didn't check whether Enhanced Alert Trigger is GA, so I didn't use it. q6 only relies on "alert-triggered automation doesn't cover Defender XDR alerts", which is still on the page.
- **Attack disruption.** Learn marks automatic device isolation as preview, but the chapter lists "isolate device" without a preview flag. Learn also says the Semi automation level lets disruption trigger without manual approval. Microsoft Sentinel moves to the Defender portal only after March 31, 2027 (roles and automation pages).
- **Role to create automation rules.** The current automation rules and roles pages don't name one. The chapter says Microsoft Sentinel Contributor, which matches "attach a playbook to an analytics or automation rule". I didn't test this point.
- Confirmed as written: Allow indicators apply to AIR (false positives page); No automated response means AIR doesn't run and no actions are pending; the highest-ranked group wins; the Ungrouped devices level can be changed; Manage portal system settings (device groups) exists only in the Defender for Endpoint administrator (default) role, which can be assigned to other users after opting in to RBAC; new customers have unified RBAC only since February 16, 2025; the update trigger has Alerts Added; Disable user in AD is done by Defender for Identity, which needs a sensor on the DC; the Defender for Cloud Apps Microsoft 365 connector needs all its checkboxes, including Entra ID apps.

## Doubts

- In q3, Security Operator is wrong because a Microsoft Entra role spans every Defender workload. That's standard behavior, but no fetched page states it in those words.
- In q5, the right answer is the logic app run history. The run-playbooks page also lists a **Runs** tab in the Run playbook panel of an incident, which opens the Logic Apps run log. It isn't an option, so there is no second valid answer.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are: an entity condition with the Change severity action, the product behind Disable user, unified RBAC for a 2026 tenant, an Allow indicator to stop AIR remediating, playbook run history, the Alerts Added update condition with the incident trigger, the default administrator role for device groups, prerequisites for MDI sensors and the MDCA connector, an Owner granting playbook permissions, and rank combined with automation levels.
- No preview feature is an answer.
