# QZ-az-140-14-implement-host-pools — end-of-chapter quiz, AZ-140, chapter 14

File: `content/az-140/quizzes/14-implement-host-pools.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts az-140 14-implement-host-pools` → 0 problem(s), 0 warning(s). `npm run content:validate -- --cert az-140` → 0 problem(s).

Objectives: 1.4.1 (q1, q7, q8), 1.4.2 (q3, q10), 1.4.3 (q2, q5, q6), 1.4.4 (q4, q9).
Types: single 3, dropdown 3, multi 2, yesno_statements 2; positions 6–10 use multi, dropdown and yesno_statements.

The mock bank covers the portal flow, CLI/PowerShell/Bicep basics, drain mode, licensing and personal reassignment (`az140-3b-personal-reassign`), so the quiz avoids these and tests: Key Vault Secrets User, the 999999 default, the role assignment cmdlet on the application group, Per Device CALs for shift workers, the rules of scheduled agent updates, drain mode plus signing out disconnected sessions, the VM tab (zones, Trusted launch, no NIC NSG), the roles to add session hosts to an existing pool (Host Pool Contributor + VM Contributor), the scope of the license benefit, and in Bicep `utcNow()` only as a parameter default and `scope: dag`.

## Verified on learn.microsoft.com (2026-11-24)

Deploy Azure Virtual Desktop (prerequisite roles, Key Vault Secrets User, roleAssignments/write, domain join permissions, VM tab: NSG None, public inbound ports No, hibernate); Add session hosts to a host pool (Desktop Virtualization Host Pool Contributor + Virtual Machine Contributor, 400 VMs, 11-character prefix, 27-day token, 90-day machine token, RDSH role); Built-in Azure RBAC roles for AVD (Session Host Operator can't add hosts in the portal); Configure host pool load balancing (999999); Scheduled Agent Updates (existing pools only, 2-hour windows, critical updates forced); Drain session hosts; RDS CALs page (per device for shifts, version rules); Apply Windows license (file servers and DCs excluded, empty LicenseType = not applied, license server on-premises or in Azure); Bicep date functions (`utcNow` only in a parameter default); Key Vault RBAC guide; Trusted Launch; hostPools template reference (latest non-preview API `2025-10-10`, `managementType` values `Automated` / `Standard`).

## Chapter out of date or to check against current Learn

- **Prerequisite roles, section portal-deployment.** To **add** session hosts to an existing pool, Learn ("Add session hosts") asks for **Desktop Virtualization Host Pool Contributor** + Virtual Machine Contributor. The chapter table only lists Desktop Virtualization Contributor (needed to create the host pool, workspace and application group). A row for "add session hosts" would help.
- **"Security type: … Trusted launch (default)".** The Deploy page lists Standard, Trusted launch and Confidential on the standard-management VM tab without naming a default, and says Trusted launch is the default only on the session host configuration path. The Trusted Launch page says the portal, CLI and PowerShell default to Trusted launch for Gen2 VMs. "(default)" is probably right in practice, but the AVD page doesn't confirm it for this tab.
- **Name prefix.** The Deploy page gives **10 characters** for the prefix on the session host configuration path, and 11 for standard management. The chapter gives 11 without making the distinction.
- **Validation environment change "requires at least Desktop Virtualization Host Pool Contributor"**: not stated on the pages I fetched. It's consistent with the role's `hostpools/*` permissions.
- **Bicep API version.** The chapter uses `2024-04-03`, which is still valid; the latest non-preview version is `2025-10-10`. `hostPoolType` also accepts `BYODesktop` and `loadBalancerType` accepts `MultiplePersistent` (not in the chapter's value table; not exam-relevant).
- **Multiple personal desktops.** Learn says the PowerShell way requires Az.DesktopVirtualization **5.3.0-preview** or later, and that once enabled the option can't be disabled. That concerns chapter 14 / 3.2 content if PowerShell is shown for it.

## Doubts

- q3: I couldn't read the PowerShell tab of the Deploy page in full. The `New-AzRoleAssignment -ResourceName -ResourceGroupName -ResourceType 'Microsoft.DesktopVirtualization/applicationGroups'` syntax comes from the chapter and from Az knowledge; the role and scope come from the RBAC page.
- q6: the portal action is "Log off" on the user sessions of a session host (wording from product knowledge). Learn's drain page only says an administrator can "end the session".
- q7: the portal labels "No infrastructure redundancy required", "Basic" and "Advanced" (NIC NSG) are from product knowledge. "Confidential VMs need DC/EC confidential sizes, not D8s_v5" is general Azure knowledge, not re-fetched.
- q8: I assume Virtual Machine Contributor on the resource group also covers the network interface and subnet join permissions that the portal deployment needs. Learn names this role as the second prerequisite without listing its actions.
- q10: `utcNow('u')` is used as the parameter default (format of the Bicep docs example); the chapter uses `utcNow()`. I didn't check whether the host pool API accepts both formats for `expirationTime`.
