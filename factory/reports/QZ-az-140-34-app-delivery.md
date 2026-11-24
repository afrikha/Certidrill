# QZ-az-140-34-app-delivery — report

Quiz: `content/az-140/quizzes/34-app-delivery.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).
Objectives: 3.3.1 (q6), 3.3.2 (q1), 3.3.3 (q10), 3.3.4 (q3, q5, q9), 3.3.9 (q4, q8), 3.3.10 (q2, q7).
Formats 6–10: single, yesno_statements, multi, dropdown, single.

## Doubts and unverified facts

- **q6** relies on "App attach doesn't support Microsoft Entra Domain Services". The overview page's identity table says so, but the same page's Azure NetApp Files section mentions Entra Domain Services (the page contradicts itself). I also assumed that FSLogix masking rule sets can be assigned to Entra Domain Services groups (they are domain groups); the masking tutorial only shows an AD group, so this isn't stated on Learn.
- **q9**: the `AppAlias` property of `Get-AzWvdStartMenuItem` output isn't listed on the cmdlet page (it gives only the output type). I used the chapter's code and the REST start menu item model. The meanings of `CommandLineSetting` values come from the REST page (Applications - Create Or Update): DoNotAllow / Allow (optional) / Require.
- `-HostPoolReference` replacing the list (chapter) wasn't verified: I didn't fetch `Update-AzWvdAppAttachPackage`, so no question uses it.

## Chapter vs current Learn (Nov 2026)

- **CimFS**: the chapter says "recommended with Windows 11 hosts". The App attach overview is stricter: use CimFS **only** if the session hosts run Windows 11.
- **Registration type label**: the setup page (portal) seems to label the second option "Register at log on". The overview and the chapter say "Log on blocking". Check the current portal label.
- **Missing from the chapter (from app-attach-setup)**: user accounts assigned directly to an App attach package must be **hybrid** accounts (groups don't need to be). With Entra joined hosts and Azure Files, the storage account must be in the **same subscription** as the session hosts. Assigning the ARM Provider principal gives access to all the data of the storage account, so store only App attach images there.
- **Missing from the chapter (terminology page)**: an application group can be registered to **one workspace only**.
- **Deployment scope (regional or geographical)** of host pools, workspaces, application groups and App attach packages now shows up on the deployment and App attach setup pages: the scopes must match and can't be changed later. The chapter doesn't cover it. Check whether it's GA before adding it.
- The publish page lists **Desktop Virtualization Application Group Contributor** as the minimum role to publish. That matches the chapter. It also shows a "Create desktop shortcut (Preview)" toggle, which isn't relevant to the exam.

No mock-exam question was found wrong.

## Note on q7

q7 uses a host pool of Windows 10 Enterprise multi-session session hosts, as in Learn's own CIM example. "Use the sync app on virtual desktops" now lists only Windows 11 and Windows Server 2025 as supported. If Windows 10 multi-session scenarios are removed from the bank, rewrite q7 with another older OS build (for example, Windows 11 22H2 hosts and a 24H2 packaging machine).
