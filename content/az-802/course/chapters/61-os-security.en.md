Securing Windows Server stacks several layers: exploit mitigations, an allow list of code, credential isolation, reputation checks, a baseline that resists drift, rotated local administrator passwords, cloud threat protection and a host firewall. Questions name a server and a goal and ask which feature, setting or cmdlet reaches it.

<!-- section: exploit-protection | objectives: 6.1.1 -->
## Exploit protection

Exploit protection applies memory and process mitigations to the whole system or to individual programs. It is configured in **Windows Security > App & browser control > Exploit protection settings**, with two tabs: **System settings** and **Program settings**.

| Mitigation | Scope | Audit mode |
| --- | --- | --- |
| Control flow guard (CFG) | System and app | No |
| Data Execution Prevention (DEP) | System and app | No |
| Force randomization for images (Mandatory ASLR) | System and app | No |
| Randomize memory allocations (Bottom-up ASLR) | System and app | No |
| Validate exception chains (SEHOP) | System and app | No |
| Validate heap integrity | System and app | No |
| Arbitrary code guard (ACG), Code integrity guard, Don't allow child processes, Block untrusted fonts | App only | Yes |

Program settings override system settings for that executable; `NOTSET` means the system-level value applies.

```powershell
# System level
Get-ProcessMitigation -System
Set-ProcessMitigation -System -Enable DEP

# One program
Set-ProcessMitigation -Name C:\Apps\Lob\app.exe -Enable DEP,DisallowChildProcessCreation
Set-ProcessMitigation -Name C:\Apps\Lob\app.exe -Enable AuditDynamicCode
```

To deploy one configuration to many servers, **export it as an XML file** from a reference machine, then deploy that file:

- Group Policy: **Computer Configuration > Administrative Templates > Windows Components > Microsoft Defender Exploit Guard > Exploit Protection > Use a common set of exploit protection settings**, Enabled, with the local path, UNC path or URL of the XML file.
- System-level changes require a restart; program-level changes don't.

> **Exam trap.** System-level mitigations (DEP, ASLR, CFG, SEHOP, heap integrity) have no audit mode. If the requirement is "evaluate the impact before blocking", use an app-level mitigation that supports audit, such as ACG or Don't allow child processes.

<!-- section: app-control | objectives: 6.1.2 -->
## Application Control for Windows

Microsoft Learn titles the feature **Application Control for Windows** and calls it **App Control for Business** in the text (formerly Windows Defender Application Control). Supported on Windows Server 2016 to 2025, it decides which drivers and applications may run on the **whole device**, kernel mode included.

| Requirement | Answer |
| --- | --- |
| Allow-list all code on a server, kernel drivers included | App Control for Business |
| Different rules for different users or groups on the same server | AppLocker |
| Test a policy without blocking anything | Policy in **audit mode**: event 3076 |
| Blocked file in enforcement mode | Event 3077 |
| Allow one extra application without rewriting the main policy | **Supplemental** policy linked to the base policy |

Events are in **Applications and Services Logs\Microsoft\Windows\CodeIntegrity\Operational**.

On **Windows Server 2025**, OSConfig ships ready-made App Control policies:

```powershell
# Audit first, then enforce
Set-OSConfigDesiredConfiguration -Scenario AppControl\WS2025\DefaultPolicy\Audit -Default
Set-OSConfigDesiredConfiguration -Scenario AppControl\WS2025\DefaultPolicy\Enforce -Default
```

To allow an application seen in the audit events, convert the `.evtx` file to a policy in the **App Control Wizard** (Policy Editor > Convert Event Logs to a Policy) on a client, then apply it on the server as a supplemental policy:

```powershell
$policyPath = "C:\Policies\App1.xml"
Set-CIPolicyIdInfo -FilePath $policyPath -ResetPolicyID
Set-CIPolicyVersion -FilePath $policyPath -Version "1.0.0.1"
Set-CIPolicyIdInfo -FilePath $policyPath -SupplementsBasePolicyID "{9214D8EE-9B0F-4972-9073-A04E917D7989}"
Set-OSConfigDesiredConfiguration -Scenario AppControl -Name Policies -Value $policyPath
```

> **Exam trap.** Moving to enforcement without an audit period blocks legitimate line-of-business applications. The expected order is: deploy in audit mode, collect events 3076, create supplemental policies, then enforce.

<!-- section: credential-guard | objectives: 6.1.3 -->
## Credential Guard

Credential Guard uses **virtualization-based security (VBS)** to isolate NTLM password hashes, Kerberos ticket-granting tickets (TGTs) and stored domain credentials in an isolated process (`LsaIso.exe`). It blocks pass-the-hash and pass-the-ticket attacks.

- **Default**: enabled on Windows Server 2025 when the server meets the requirements, is **domain-joined** and is **not a domain controller**. Default enablement is applied **without UEFI lock**, so it can be turned off remotely.
- **Requirements**: VBS and Secure Boot; TPM 1.2 or 2.0 and UEFI lock recommended. In a Hyper-V virtual machine: **Generation 2** VM and a host with an IOMMU.
- **Not recommended on domain controllers** (no added security, compatibility issues); not supported on Exchange Server.
- **Breaks**: Kerberos DES, Kerberos **unconstrained delegation**, NTLMv1; Digest, MS-CHAPv2 and CredSSP can't use the protected credentials.
- **Doesn't protect** the AD DS database or the SAM, nor a VM against an attack from its host.

Configuration: Group Policy **Computer Configuration > Administrative Templates > System > Device Guard > Turn On Virtualization Based Security**, option **Credential Guard Configuration**: **Enabled with UEFI lock**, **Enabled without lock** or **Disabled**. Restart after the policy applies.

```powershell
# 1 = Credential Guard running
(Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard).SecurityServicesRunning
```

> **Exam trap.** With **Enabled with UEFI lock**, setting the policy to Disabled isn't enough: the setting lives in firmware variables, and removal needs a boot-time procedure with physical confirmation. Choose **Enabled without lock** when remote disabling must stay possible.

<!-- section: smartscreen | objectives: 6.1.4 -->
## Microsoft Defender SmartScreen

SmartScreen checks the reputation of downloads, applications and websites. Group Policy settings:

| Setting | Path | Effect |
| --- | --- | --- |
| Configure Windows Defender SmartScreen | Windows Components > Windows Defender SmartScreen > Explorer | Checks applications and files run from File Explorer; option to warn or **Warn and prevent bypass** |
| Configure Microsoft Defender SmartScreen | Microsoft Edge > SmartScreen settings | Turns SmartScreen on in Edge |
| Prevent bypassing Windows Defender SmartScreen prompts for sites | Microsoft Edge > SmartScreen settings | Users can't continue to a flagged site |
| Prevent bypassing of Microsoft Defender SmartScreen warnings about downloads | Microsoft Edge > SmartScreen settings | Users can't keep an unverified download |

All paths start under **Computer Configuration > Administrative Templates**; the Edge settings need the Edge administrative templates.

> **Exam tip.** "Users must not be able to ignore the warning" is never solved by turning SmartScreen on alone: add **Warn and prevent bypass** (Explorer) or the **Prevent bypassing** settings (Edge).

<!-- section: security-gpo | objectives: 6.1.5 -->
## Operating system security with Group Policy

Security settings live under **Computer Configuration > Policies > Windows Settings > Security Settings**:

| Node | Typical use |
| --- | --- |
| Account Policies | Password, lockout and Kerberos policy (domain accounts: only from a GPO linked to the **domain**) |
| Local Policies > User Rights Assignment | Allow or deny log on locally, through Remote Desktop Services, as a service, from the network |
| Local Policies > Security Options | Interactive logon messages, rename Administrator, LAN Manager authentication level, SMB signing, NTLM restrictions |
| Restricted Groups | Enforce the membership of local groups such as Administrators |
| Windows Firewall with Advanced Security | Firewall profiles, rules and connection security rules |
| Advanced Audit Policy Configuration | Subcategory auditing (preferred over the nine legacy audit categories) |

Tools: **security templates** (`.inf`) imported into a GPO or compared with `secedit`; the **Security Compliance Toolkit** (Microsoft baselines as GPO backups, Policy Analyzer, LGPO for non-domain servers); `gpresult /h report.html` to check what applied.

> **Exam trap.** A password policy in a GPO linked to an OU doesn't change the password policy of domain users in that OU: it applies only to the **local** accounts of the computers in the OU. Use a fine-grained password policy for groups of domain users.

<!-- section: osconfig | objectives: 6.1.6 -->
## Security baselines with OSConfig

**OSConfig** is a security configuration stack for **Windows Server 2025 only**. It applies Microsoft's security baseline (more than 300 settings per role) and protects the settings from **drift**: if a setting is changed by another means, OSConfig puts it back.

```powershell
Install-Module -Name Microsoft.OSConfig -Scope AllUsers -Force

# One role-based baseline per server
Set-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Default

# Customize one value while drift control stays on
Set-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Setting AuditDetailedFileShare -Value 3
Get-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Setting AuditDetailedFileShare
```

| Server | Scenario |
| --- | --- |
| Domain controller | `SecurityBaseline/WindowsServer/2025/DomainController` |
| Domain member server | `SecurityBaseline/WindowsServer/2025/MemberServer` |
| Workgroup server | `SecurityBaseline/WindowsServer/2025/WorkgroupMember` |
| Windows LAPS (member servers) | `LAPS/WindowsServer/2025/MemberServer` |

Rules to remember: elevated PowerShell; **restart** after applying or removing a baseline; on member and workgroup servers, then change the local administrator password (14 characters minimum). The baseline requires SMB 3.0 and TLS 1.2 (older peers may break). At scale and for Azure Arc-enabled servers, use **Azure Policy machine configuration** to apply it and report compliance.

> **Exam trap.** If Group Policy and OSConfig set the same value differently, they fight. Manage each setting from one source only. And OSConfig doesn't apply to Windows Server 2022 or earlier.

<!-- section: windows-laps | objectives: 6.1.7 -->
## Windows Local Administrator Password Solution

**Windows LAPS** is built into Windows Server 2019 and 2022 (April 11, 2023 update or later) and Windows Server 2025. It rotates the password of a local administrator account and backs it up to **Active Directory** or **Microsoft Entra ID** (not both). On domain controllers it can back up the **DSRM** password.

Deployment for AD backup:

```powershell
Update-LapsADSchema
Set-LapsADComputerSelfPermission -Identity "OU=Servers,DC=contoso,DC=com"
Set-LapsADReadPasswordPermission -Identity "OU=Servers,DC=contoso,DC=com" -AllowedPrincipals "contoso\LAPS-Readers"
Set-LapsADResetPasswordPermission -Identity "OU=Servers,DC=contoso,DC=com" -AllowedPrincipals "contoso\LAPS-Rotators"
```

Then configure the GPO **Computer Configuration > Policies > Administrative Templates > System > LAPS** (copy `LAPS.admx` to the central store manually).

| Setting | Values | Default |
| --- | --- | --- |
| BackupDirectory | 0 Disabled, 1 Microsoft Entra ID, 2 Active Directory | 0: nothing happens until set |
| PasswordAgeDays | 1–365 (minimum 7 for Entra ID) | 30 |
| PasswordLength | 8–64 | 14 |
| PasswordComplexity | 1–4 character sets, 5 readability, 6–8 passphrases | 4 |
| ADPasswordEncryptionEnabled | Requires domain functional level 2016 or later | True |
| ADPasswordEncryptionPrincipal | Group allowed to decrypt | Domain Admins |
| ADBackupDSRMPassword | Domain controllers | False |
| PostAuthenticationActions | 1 reset, 3 reset and sign out, 5 reset and reboot, 11 also terminate processes | 3, after 24 hours |

Windows Server 2025 adds **passphrases**, **automatic account management** (LAPS creates its own account, optionally with a random name) and **image rollback detection** (needs the latest `Update-LapsADSchema`).

```powershell
Get-LapsADPassword -Identity SRV1 -AsPlainText
Set-LapsADPasswordExpirationTime -Identity SRV1   # rotate at next processing
Invoke-LapsPolicyProcessing                       # process now (default: hourly)
Reset-LapsPassword                                # rotate locally on the device
```

> **Exam trap.** The read permission isn't the decrypt permission: a user granted `Set-LapsADReadPasswordPermission` still can't see an encrypted password unless he belongs to the `ADPasswordEncryptionPrincipal` (Domain Admins by default).

<!-- section: defender-for-servers | objectives: 6.1.8 -->
## Microsoft Defender for Servers

Defender for Servers is a plan of **Microsoft Defender for Cloud**. It protects Azure VMs and, through **Azure Arc**, on-premises and other clouds' servers. Defender for Endpoint is installed automatically on supported machines.

| Feature | Plan 1 | Plan 2 |
| --- | --- | --- |
| Defender for Endpoint (EDR), alerts and incidents | Yes | Yes |
| Agent-based vulnerability scanning, software inventory | Yes | Yes |
| Agentless scanning (vulnerabilities, malware, secrets) | No | Yes |
| File integrity monitoring | No | Yes |
| Just-in-time VM access | No | Yes |
| 500 MB free daily data ingestion | No | Yes |
| Enable on one resource | Yes | No (subscription only) |

Enable it in **Defender for Cloud > Environment settings > subscription > Defender plans > Servers**, then choose the plan. Plan 2 can be disabled, but not enabled, per resource. A 30-day trial starts when a plan is enabled.

> **Exam trap.** Requirements such as "file integrity monitoring", "JIT access" or "agentless malware scanning" point to **Plan 2**. "Lowest cost with EDR only" points to Plan 1.

<!-- section: windows-firewall | objectives: 6.1.9 -->
## Windows Firewall and connection security rules

Windows Firewall has three **profiles**: Domain, Private and Public. Inbound traffic is blocked by default and needs an explicit allow rule; outbound is allowed by default. Rule evaluation:

1. Explicit allow rules beat the default block.
2. Explicit **block rules beat allow rules**.
3. More specific rules beat less specific ones (except rule 2). There is no manual rule ordering.

The only exception to rule 2 is an **authenticated bypass** rule (`-OverrideBlockRules`), which lets IPsec-authenticated computers or users through.

```powershell
New-NetFirewallRule -DisplayName "Allow SQL 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -RemoteAddress 10.0.1.0/24 -Profile Domain -Action Allow
```

**Connection security rules** use IPsec to authenticate (and optionally encrypt) traffic between computers:

| Type | Use |
| --- | --- |
| Isolation | Restrict connections to domain members (domain isolation) or a group of computers |
| Authentication exemption | Computers that must connect without authentication (DHCP, DNS, domain controllers) |
| Server-to-server | Authenticate between two specific computers or subnets |
| Tunnel | IPsec tunnel between two gateways |
| Custom | Any other combination |

Authentication modes: **request** inbound and outbound (monitoring, no blocking), **require inbound and request outbound** (the usual domain isolation setting), **require** inbound and outbound.

```powershell
$kerb = New-NetIPsecAuthProposal -Machine -Kerberos
$p1 = New-NetIPsecPhase1AuthSet -DisplayName "Kerberos" -Proposal $kerb -PolicyStore contoso.com\Isolation
New-NetIPsecRule -DisplayName "Domain isolation" -Profile Domain -Phase1AuthSet $p1.Name -InboundSecurity Require -OutboundSecurity Request -PolicyStore contoso.com\Isolation

# Firewall rule that admits only authenticated and encrypted traffic
New-NetFirewallRule -DisplayName "Secure 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -Authentication Required -Encryption Required -Action Allow
```

In a GPO: **Security Settings > Windows Firewall with Advanced Security**. Check active security associations with `Get-NetIPsecMainModeSA`.

> **Exam trap.** A connection security rule only authenticates the traffic; it doesn't open a port. The server still needs an inbound firewall rule, typically with **Allow the connection if it is secure** (`-Authentication Required`).

<!-- section: key-points -->
## Key points

- Exploit protection: no audit for system-level mitigations; deploy one XML file by Group Policy.
- App Control: device-wide allow list; audit (3076) before enforce (3077); supplemental policies extend a base policy.
- Credential Guard: VBS, default on domain-joined Windows Server 2025 members, not for DCs; UEFI lock blocks remote disabling.
- SmartScreen: preventing bypass is a separate setting. Domain password policy comes only from a domain-linked GPO.
- OSConfig: Windows Server 2025 only, one scenario per role, drift control, restart.
- Windows LAPS: set `BackupDirectory`; encryption needs DFL 2016; reading isn't decrypting.
- Defender for Servers: Plan 2 for FIM, JIT, agentless scanning; Arc for on-premises servers.
- Firewall: block beats allow; connection security rules don't open ports.
