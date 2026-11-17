# K-sc-200-cs4 — report

Files: 2 case studies (`sc200-cs4a-munsons`, `sc200-cs4b-best-for-you-organics`) + 11 questions (6 + 5), all `status: draft`.
Validator: `CERT=sc-200 npx tsx factory/validate.ts --prefix sc200-cs4` -> 13 files, 0 problem(s).

## Coverage
- cs4a (food manufacturer, hybrid with isolated plant networks): 1.3.3 yesno (WEF collector -> WindowsEvent), 1.3.5 single (Azure Policy connector + remediation task), 1.1.3 multi (live response for servers + unsigned scripts), 1.2.2 dropdown (analytics 90 d / total 3 y / KQL job), 2.2.2 single (Contain device for unmanaged panel), 3.1.3 dropdown KQL (DeviceInfo arg_max + inner join).
- cs4b (cloud-only online retailer): 1.1.11 multi (Logic App Contributor + Automation Contributor on cross-subscription playbook RG), 1.2.1 dragdrop (Responder / Contributor / Reader), 3.2.2 yesno (KQL job: managed identity role, _KQL_CL, concurrency rejection), 3.1.2 dropdown KQL (UrlClickEvents join EmailEvents, dcount), 2.1.5 single (Confirm sign-in compromised).
- Difficulty: 3 easy, 6 medium, 2 hard.

## Doubts / not fully verified
- Learn says Contain device is enforced by onboarded "Windows 10 and Windows Server 2019+" devices; the explanation also names Windows 11 (inference).
- "Confirm user safe" (distractor in sc200-cs4b-risky-signin) was only mentioned in passing on the risk-feedback page; Reset password was removed as a distractor because its dialog can also require a user-driven reset.
- The Azure Key Vault Sentinel connector being Azure Policy-managed was not confirmed on its own connector page (the diagnostic-settings page describes the policy wizard generically).
- Overlap check: cs1a (Lamna) already tests Responder + Playbook Operator for tier 1 and an identity-table dcount/bin hunt; cs2a tests CEF/Syslog facilities. cs4 avoided those decisions, but sc200-cs4b-workspace-roles also maps a tier-1 group to Responder.
- WebSearch budget was exhausted and WebFetch was rate-limited during the run; every fact used was taken from a fetched page except the items above.
