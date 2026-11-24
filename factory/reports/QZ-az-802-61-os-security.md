# QZ-az-802-61-os-security — report

File: `content/az-802/quizzes/61-os-security.yaml` (10 questions, `az802-qz-61-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 61-os-security` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 6.1.3 | single | 1 | Credential Guard isolates NTLM hashes / TGTs, not the SAM or the AD database |
| 2 | 6.1.8 | single | 1 | File integrity monitoring → Plan 2 |
| 3 | 6.1.4 | single | 2 | No Microsoft Edge node → copy msedge.admx/adml to the Central Store |
| 4 | 6.1.5 | single | 2 | Password policy in an OU-linked GPO affects only local accounts → fine-grained password policy |
| 5 | 6.1.1 | single | 2 | Program setting overrides system setting → enable DEP for the program |
| 6 | 6.1.6 | single | 3 | Workgroup server → WorkgroupMember scenario; customize with `-Setting -Value` so drift control keeps it |
| 7 | 6.1.9 | ordering | 3 | Domain isolation: request/request → verify SAs → require inbound / request outbound |
| 8 | 6.1.2 | multi | 3 | App Control base policy (device, drivers) + AppLocker for group rules |
| 9 | 6.1.7 | yesno | 3 | Automatic account management: AdministratorAccountName ignored, randomized name, account disabled by default |
| 10 | 6.1.8 | single | 3 | Plan 1 / Plan 2 per subscription; Plan 2 can be disabled but not enabled per resource |

All mock-exam questions of 6.1.1–6.1.9 (az802-6a-*, az802-6b-fw-*, az802-cs1c-claims-credguard, az802-cs2b-laps-operations, az802-cs3a-laps-helpdesk) were read first; no decision is reused with the same answer.

## Chapter issues against current Learn (chapter not edited)

- **Defender for Servers table:** Learn lists "OS system updates" (Arc needed on-premises) and network map as Plan 2 only; file integrity monitoring on AWS/GCP needs Arc. The chapter table omits them.
- **Windows LAPS automatic account management:** Learn says `AdministratorAccountName` is ignored when it's enabled, `AutomaticAccountManagementEnableAccount` defaults to 0 (managed account **disabled**), `Target` defaults to 1 (new custom account), prefix default `WLapsAdmin`, random six-digit suffix at each rotation. The chapter only names the feature; question 9 uses these Learn facts (in the study-guide scope). Suggest adding them to the chapter. Learn's own default-values table shows "Yes" for Target and NameOrPrefix (inconsistent with its prose).
- **Exploit protection restart:** the chapter says system-level changes need a restart and program-level don't; Learn only says "changing some settings may require restarting" and notifies per change. Not used.
- **OSConfig:** customizing a setting "might" need a restart depending on the feature (applying/removing always does). Consistent with the chapter, not used.
- **Account policies scope:** only archived Windows 10 pages ("Account Policies", "Password Policy", 2017) state the OU-level behavior; no current page found.

## Unverified (relied on the chapter)

- `Get-NetIPsecMainModeSA` (verification step in question 7) and the "require inbound / request outbound" label; the request-first rule comes from the archived "Create an Authentication Request Rule" page (title copied as is).
- CredSSP can't use Credential Guard-protected credentials (question 1, distractor d explanation).
- Code integrity guard described from its cmdlet value `MicrosoftSignedOnly` (question 8, distractor c explanation).
- "Override system settings" / "On by default" labels of the Windows Security exploit protection UI (question 5).
