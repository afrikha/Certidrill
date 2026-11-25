# QZ-az-802-21-remote-management — end-of-chapter quiz, AZ-802, chapter 21

File: `content/az-802/quizzes/21-remote-management.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts az-802 21-remote-management` → 0 problem(s), 0 warning(s).

| # | Objective | Difficulty | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.1.2 | 1 | single | WinRM HTTPS listener port 5986 |
| 2 | 2.1.1 | 1 | single | WAC installer self-signed certificate valid 60 days |
| 3 | 2.1.4 | 2 | single | Restricted Admin needs Administrators membership on the target |
| 4 | 2.1.3 | 2 | single | ssh-agent disabled by default on the client, then ssh-add |
| 5 | 2.1.2 | 2 | dropdown | CredSSP client/server roles, DelegateComputer, -Authentication CredSSP |
| 6 | 2.1.1 | 3 | multi | WAC in Azure on a public-IP VM: inbound 6516 from admin range + outbound WindowsAdminCenter tag |
| 7 | 2.1.2 | 3 | dropdown | JEA .pssc: RestrictedRemoteServer, RunAsVirtualAccountGroups, RequiredGroups |
| 8 | 2.1.3 | 3 | yesno | sshd reads config at start; DenyGroups before AllowGroups; AllowGroups also restricts admins |
| 9 | 2.1.4 | 3 | single | "Restrict credential delegation" prefers RCG and ignores /restrictedAdmin → Require Restricted Admin |
| 10 | 2.1.2 | 3 | dragdrop | Second hop: RBCD cross-forest, JEA+gMSA, $Using: credentials, CredSSP for nested WinRM |

Mock-exam questions of 2.1.x (az802-2a-*, cs1c, sr1) read first; none of their decisions reused with the same answer.

## Learn pages fetched (2026-11-24)

Making the second hop in PowerShell Remoting; JEA Session Configurations; New-PSSessionConfigurationFile; Enable-WSManCredSSP; OpenSSH Server Configuration for Windows; Key-based authentication in OpenSSH for Windows; Manage a Windows VM using Windows Admin Center in Azure; Install Windows Admin Center; Remote Credential Guard; Installation and configuration for Windows Remote Management; RDS CALs page; Deny log on through Remote Desktop Services (archived page, not used as a reference).

## Not confirmed on a fetched page

- Q5: `Enter-PSSession -Authentication CredSSP` (standard parameter; the Enable-WSManCredSSP page doesn't show the connection command).
- Q4: the exact wording of the ssh-add error is paraphrased, not quoted.

## Chapter issues (chapter not edited)

- **Second hop table is incomplete against Learn**: Learn states that unconstrained, constrained and resource-based Kerberos constrained delegation all **don't support the second hop for WinRM** (they work for shares, WMI, etc., not for a nested `Enter-PSSession`). The chapter table doesn't say it, although mock question az802-2a-rbcd-winrm-hop tests it. Worth an `Exam trap.` line. The table also omits Learn's "PSSessionConfiguration using RunAs" option (RunAsCredential, password maintenance).
- **"Two simultaneous administrative sessions without the RDS role"** (Remote desktop table): not found on any Learn page fetched (the RDS CAL page doesn't mention it). Keep or source it.
- **WAC in the Azure portal "at no cost"** (section wac-azure-portal): for Arc-enabled servers, the "Windows Server Management enabled by Azure Arc" page lists *Windows Admin Center in Azure for Arc* among the benefits and says the services other than Update Manager, Change Tracking and Inventory and machine configuration "aren't available through Azure Arc for non-SA and non-pay-as-you-go customers". The chapter's "at no cost" should say that, for Arc, it requires Software Assurance attestation or pay-as-you-go.
- WinRM default state: the Win32 WinRM page says "By default, no WinRM listener is configured"; the chapter says remoting is enabled by default on Windows Server (true since Windows Server 2012 per the PowerShell docs, not fetched this session). Not used in the quiz.
- Useful additions seen on Learn: with *Restrict credential delegation*, the `/restrictedAdmin` switch is ignored and Remote Credential Guard is used; Learn recommends Restricted Admin (not RCG) for help desk connections to possibly compromised clients; `/remoteGuard` to a server running the RD Session Host role works only for administrators; Windows Admin Center and SSH aren't supported over an Azure Arc private link scope.
