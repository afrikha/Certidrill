# QZ-az-140-33-user-settings — report

File: `content/az-140/quizzes/33-user-settings.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-140 33-user-settings` → 0 problem(s), 0 warning(s).

Objectives: 3.2.7 (q2, q5, q8), 3.2.8 (q4, q7), 3.2.9 (q3, q9), 3.2.10 (q1, q6), 3.2.11 (q10). Positions 6–10 formats: yesno_statements ×2, dropdown ×2, multi.

## Chapter out of date, imprecise or unverified against Learn (Nov. 2026)

- **Unassign/reassign by REST `PATCH` with `force=true` (`Invoke-AzRestMethod`)**: not verified. The Learn page says both operations work in the portal and Azure PowerShell and not in Azure CLI, but I couldn't read its PowerShell tab. The load balancer type `MultiplePersistent` is not verified either.
- **Multiple personal desktops with PowerShell**: this needs the *preview* Az.DesktopVirtualization module (5.3.0-preview or later), according to Learn. The chapter doesn't say so.
- **Device credentials for enrollment**: the "Enroll a Windows device automatically using Group Policy" page says Device Credential is supported only for co-management and Azure Virtual Desktop multi-session host pools, and that user credentials are supported for AVD **personal** host pools. The chapter states "user-credential enrollment isn't supported" without limiting it to multi-session.
- **"Intune user-scope policy filtered to the multi-session devices"** (chapter Exam trap): I couldn't verify how the filter is done, so I didn't test it.
- **Intune limits the chapter omits** (from the Intune multi-session page):
  - Update rings for Windows aren't supported.
  - Web apps don't apply to multi-session VMs.
  - A system-context app with a user-context dependency isn't installed.
  - Several remote actions are greyed out.
  - The page says Intune supports only VMs "in pooled host pools". The chapter doesn't mention this.
- **`screen mode id`**: the RDP properties page says it is overridden when `use multimon` is on. The chapter's table doesn't mention this. It conflicts with the mock question `az140-3b-rdp-sso-window`; see the chapter 32 report.
- **Default RDP properties**: the "Set custom RDP properties" page lists defaults (`redirectclipboard:i:1`, `redirectprinters:i:1`, ...) that contradict the redirection pages' "disabled for new host pools".

## Doubts on quiz questions

- **q9 s1**: the statement assumes that **Interactive logon: Machine inactivity limit** locks an idle remote session. The session lock page only says "locked by the user or by policy", and the chapter says "by an inactivity lock policy". After the lock, the session disconnects by default with Entra SSO and is signed out one hour later.
- **q10**: the answer assumes that removing Bob from the application group doesn't clear his session host assignment, so the explicit unassign is also needed. Learn treats the two as separate actions but doesn't say so explicitly.
- **q3**: the effect of "Set time limit for logoff of RemoteApp sessions" was verified on the Windows Server troubleshooting page "RemoteApp sessions are disconnected" and the AZ-140 training module. I couldn't read its Policy CSP description (the page was truncated).
- **q6 s1**: a host pool managed identity is accepted as the principal for Start VM on Connect on the Learn page. The statement is false because of the scope, not because of the principal.

## Mock bank note

`az140-3b-svmoc-commands` uses the unquoted option id `on`. The repository's `yaml` (YAML 1.2) parser reads it as a string, but a YAML 1.1 parser such as PyYAML reads it as `true`. Quoting it would be safer.
