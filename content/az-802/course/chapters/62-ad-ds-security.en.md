Active Directory Domain Services (AD DS) is the Tier 0 of a Windows network: whoever controls a domain controller or a privileged group controls everything. This chapter covers password rules, account protections, domain controller hardening, privileged groups, delegation and the authentication protocols that the exam asks you to restrict.

<!-- section: password-policies | objectives: 6.2.1 -->
## Password policies

A domain has **one** default password and lockout policy for domain accounts: the one set in a GPO **linked to the domain** (the Default Domain Policy by default). Defaults: history 24, maximum age 42 days, minimum age 1 day, minimum length 7, complexity enabled.

**Fine-grained password policies** (password settings objects, PSOs) give different rules to different users in the same domain:

- Stored in **System > Password Settings Container**; created in Active Directory Administrative Center (ADAC) or PowerShell, by Domain Admins by default.
- Apply to **users and global security groups** only, never to OUs. To target an OU, use a shadow group.
- When several PSOs apply, the **lowest precedence value wins**; a PSO linked directly to the user beats PSOs received through groups.
- Contain password settings and lockout settings (threshold, duration, observation window).

```powershell
New-ADFineGrainedPasswordPolicy -Name "PSO-Admins" -Precedence 10 -MinPasswordLength 16 `
  -ComplexityEnabled $true -PasswordHistoryCount 24 -MaxPasswordAge "60.00:00:00" `
  -LockoutThreshold 5 -LockoutDuration "00:30:00" -LockoutObservationWindow "00:30:00"
Add-ADFineGrainedPasswordPolicySubject -Identity "PSO-Admins" -Subjects "Tier0-Admins"
Get-ADUserResultantPasswordPolicy -Identity anna
```

In ADAC, **View Resultant Password Settings** on a user shows the effective PSO.

> **Exam trap.** "Stricter passwords for the users of the Finance OU" isn't solved by a GPO linked to the Finance OU: that GPO changes only the local accounts of the computers in the OU. Create a PSO and apply it to a global group containing those users.

<!-- section: entra-password-protection | objectives: 6.2.2 -->
## Microsoft Entra Password Protection for AD DS

Microsoft Entra Password Protection rejects weak passwords (Microsoft's global banned list plus your tenant's **custom banned list**) when an on-premises password is **changed or reset**. Existing passwords aren't checked.

| Component | Where | Role |
| --- | --- | --- |
| Proxy service | Any domain-joined server (at least two per forest) | Downloads the policy from Microsoft Entra ID; needs outbound HTTPS; stateless |
| DC agent (service and password filter DLL) | **Every** writable domain controller | Validates passwords against the cached policy; never talks to the internet |

The policy is cached in SYSVOL and replicated to the other DCs, so the domain must use **DFSR** for SYSVOL. No schema change, no new port on DCs, no dependency on password hash synchronization. Installing the DC agent requires a **restart**. RODCs don't need the agent (they forward password changes to writable DCs), and the proxy isn't supported on an RODC.

Deployment order:

1. Install the proxy service, then `Import-Module AzureADPasswordProtection`.
2. `Register-AzureADPasswordProtectionProxy` (first registration: Global Administrator).
3. `Register-AzureADPasswordProtectionForest` (Global Administrator or Security Administrator in Entra ID, plus Enterprise Admins on-premises).
4. Install the DC agent on every DC and restart.
5. In the Microsoft Entra admin center (**Authentication methods > Password protection**), keep **Audit** mode first, then switch to **Enforced**.

> **Exam trap.** Installing the agent on only some DCs is a test configuration: a user who changes his password against a DC without the agent isn't checked. Deploy the agent on all writable DCs.

<!-- section: protected-users | objectives: 6.2.3 -->
## Protected Users

**Protected Users** is a global group (RID 525) whose members receive non-configurable protections. Domain controller side protections need the **Windows Server 2012 R2** domain functional level.

| Where | Protection |
| --- | --- |
| Device | No caching of plaintext credentials by CredSSP or WDigest, no NTLM NTOWF cached, no DES or RC4 Kerberos keys, **no offline cached logon** |
| Domain controller | **No NTLM** authentication, no DES or RC4 in Kerberos preauthentication, **no constrained or unconstrained delegation**, TGT lifetime **4 hours**, not renewable |

Rules:

- Never add **service accounts or computer accounts**: no benefit, and they break.
- Test before adding Domain Admins: a member who can't use Kerberos (for example, an IP address or an application that only does NTLM) is locked out.
- Accounts need AES keys: an account whose password was last changed long ago may need a password reset.
- Failures appear in **Applications and Services Logs\Microsoft\Windows\Authentication\ProtectedUserFailures-DomainController** (disabled by default).

```powershell
Add-ADGroupMember -Identity "Protected Users" -Members "adm-anna"
```

> **Exam trap.** After adding an admin to Protected Users, his remote connection by IP address fails: connecting by IP uses NTLM, which is blocked. Connect by name (Kerberos).

<!-- section: harden-dcs | objectives: 6.2.4 -->
## Harden domain controllers

| Area | Recommendation |
| --- | --- |
| Physical | Dedicated secured racks; TPM and **BitLocker** on all DC volumes; **RODC** where the DC can't be locked up |
| Virtual DCs | Separate hosts from other VMs; storage that storage administrators can't read; shielded VMs if hosts are shared |
| Operating system | Newest supported Windows Server; **Server Core**; only the AD DS and DNS roles |
| Configuration | Baseline enforced by GPO on the Domain Controllers OU (OSConfig `DomainController` scenario on Windows Server 2025) |
| Software | Minimum installed software, no general management agents; patch DCs separately and first |
| Internet | **No web browsing** from DCs; block outbound internet at the perimeter |
| Monitoring | Microsoft Defender for Identity sensors on DCs |

Windows Server 2025 domain controllers also: require **LDAP signing** by default on new deployments, support LDAP over TLS 1.3, no longer issue RC4 TGTs, refuse the default machine account password (**Domain controller: Refuse setting default machine account password**) and require an encrypted connection for confidential attributes.

To audit clients before enforcing **LDAP channel binding**, enable events 3074 and 3075.

<!-- section: restrict-dc-access | objectives: 6.2.5 -->
## Restrict access to domain controllers

Three tools, from the simplest:

1. **User rights** in a GPO linked to the Domain Controllers OU: limit *Allow log on locally* and *Allow log on through Remote Desktop Services* to Tier 0 admins; allow RDP only from jump servers or **privileged access workstations (PAW)**, enforced with Windows Firewall rules too.
2. **Deny rights** for Tier 0 accounts on lower tiers (member servers and workstations): *Deny access to this computer from the network*, *Deny log on as a batch job*, *Deny log on as a service*, *Deny log on locally*, *Deny log on through Remote Desktop Services*.
3. **Authentication policies and authentication policy silos**: Kerberos-enforced restrictions on where an account can authenticate from and on its TGT lifetime.

| Item | Detail |
| --- | --- |
| Requirement | Domain functional level **Windows Server 2012 R2**; **KDC support for claims, compound authentication and Kerberos armoring** in the Default Domain Controllers Policy (and the Kerberos client setting on devices) |
| Authentication policy | TGT lifetime (minutes) and access control conditions such as "member of the silo"; **enforced** by default, or *Only audit policy restrictions* |
| Silo | Groups users, computers and service accounts; an account belongs to one silo; **audit-only** by default unless `-Enforce` |
| Exception | The built-in Administrator (RID 500) is always exempt |

```powershell
New-ADAuthenticationPolicy -Name "Tier0-Policy" -UserTGTLifetimeMins 240 -Enforce
New-ADAuthenticationPolicySilo -Name "Tier0-Silo" -UserAuthenticationPolicy "Tier0-Policy" `
  -ComputerAuthenticationPolicy "Tier0-Policy" -Enforce
Grant-ADAuthenticationPolicySiloAccess -Identity "Tier0-Silo" -Account "adm-anna"
Set-ADAccountAuthenticationPolicySilo -Identity "adm-anna" -AuthenticationPolicySilo "Tier0-Silo"
```

> **Exam trap.** A silo created without `-Enforce` restricts nothing: it only logs what it would block. Check the **Authentication Policy Failures - Domain Controller** log during the audit phase.

<!-- section: user-account-options | objectives: 6.2.6 -->
## Security options for user accounts

Options on the **Account** tab of a user (ADUC or ADAC):

| Option | Use |
| --- | --- |
| Account is sensitive and cannot be delegated | Admin accounts: their credentials can't be delegated by a service |
| Smart card is required for interactive logon | Forces smart card sign-in; the password becomes a random value |
| This account supports Kerberos AES 128/256 bit encryption | Allows AES for the account |
| Use only Kerberos DES encryption types | Legacy; DES is removed in Windows Server 2025 |
| Do not require Kerberos preauthentication | Avoid: enables offline cracking of the AS-REP (AS-REP roasting) |
| Store password using reversible encryption | Avoid: equivalent to a stored plaintext password |
| Password never expires | Avoid for users; use gMSA for services |

Other controls: **Log On To** (allowed computers), **Logon Hours**, **Account expires**, and the lockout policy. Find risky flags with PowerShell:

```powershell
Get-ADUser -Filter 'DoesNotRequirePreAuth -eq $true' -Properties DoesNotRequirePreAuth
Set-ADAccountControl -Identity adm-anna -AccountNotDelegated $true
```

> **Exam tip.** "Prevent the credentials of an admin from being used through Kerberos delegation" has two right answers: **Account is sensitive and cannot be delegated**, or membership in **Protected Users** (which adds other restrictions).

<!-- section: admin-groups | objectives: 6.2.7 -->
## Built-in administrative groups

| Group | Recommended state |
| --- | --- |
| Enterprise Admins, Schema Admins | **Empty**; add an account only for the duration of a forest-wide or schema change |
| Domain Admins | Few members, used only on DCs and Tier 0 systems |
| Administrators (domain) | Keeps Enterprise Admins and Domain Admins as members (needed for forest recovery) |
| Account Operators, Server Operators, Print Operators, Backup Operators | **Empty**: they can sign in to DCs and act on them (Backup Operators can back up and restore every file) |
| Built-in Administrator (RID 500) | Build and disaster recovery only; **sensitive and cannot be delegated**, **smart card required**, deny rights on member servers and workstations |

Members of these groups are **protected accounts**: every 60 minutes, **SDProp** (on the PDC emulator) resets their permissions to those of **AdminSDHolder** (`CN=AdminSDHolder,CN=System,...`) and disables inheritance. The interval is set by `AdminSDProtectFrequency` (60–7200 seconds).

GPO deny rights for Enterprise Admins, Domain Admins and the built-in Administrator are linked to the OUs of **member servers and workstations**, never at the domain level. Jump servers that administer DCs stay outside those OUs. Audit and alert on any change to these groups.

> **Exam trap.** A helpdesk group delegated "reset password" on an OU can't reset the password of a Domain Admin in that OU: AdminSDHolder replaces the inherited permissions on protected accounts within the hour.

<!-- section: ad-delegation | objectives: 6.2.8 -->
## Manage AD delegation

Delegation grants specific permissions on an OU to a group instead of making people Domain Admins.

- **Delegation of Control Wizard** (right-click an OU in ADUC): choose a group, then common tasks (create, delete and manage user accounts; reset user passwords and force password change at next logon; modify the membership of a group; manage Group Policy links) or a custom task on specific object types and properties.
- Delegate to **groups**, at the **highest OU** that covers the need, and let permissions inherit.
- Review delegations: ADUC **View > Advanced Features**, then the object's **Security** tab > **Advanced** (the **Effective Access** tab tests a user), or `dsacls`.
- Avoid using the built-in operator groups for delegation: their rights reach the DCs.
- Group Policy delegation is separate: in the Group Policy Management Console, the **Delegation** tab of a GPO, OU or the Group Policy Objects container (creating GPOs: **Group Policy Creator Owners**).

```powershell
dsacls "OU=Paris,DC=contoso,DC=com"
dsacls "OU=Paris,DC=contoso,DC=com" /I:S /G "CONTOSO\HD-Paris:CA;Reset Password;user"
```

> **Exam trap.** The wizard only adds permissions: it can't remove a delegation. To revoke, edit the ACL (Advanced Security Settings) or use `dsacls /R`.

<!-- section: auth-protocols | objectives: 6.2.9 -->
## Authentication protocols and methods

**Kerberos** is the default in a domain; **NTLM** is the fallback (IP addresses, workgroup machines, applications that don't use Negotiate). On Windows Server 2025, **NTLMv1 is removed**, LANMAN and NTLMv2 are deprecated, **DES is removed** and RC4 is deprecated.

| Goal | Setting (Computer Configuration > Policies > Windows Settings > Security Settings > Local Policies > Security Options) |
| --- | --- |
| Refuse LM and NTLMv1 | **Network security: LAN Manager authentication level** = Send NTLMv2 response only. Refuse LM & NTLM |
| Find NTLM usage before blocking | **Network security: Restrict NTLM: Audit NTLM authentication in this domain** (on DCs) and **Audit incoming NTLM traffic** |
| Block NTLM | **Network security: Restrict NTLM: NTLM authentication in this domain** = Deny all, with **Add server exceptions in this domain** |
| Allowed Kerberos encryption | **Network security: Configure encryption types allowed for Kerberos** (AES only); the old registry value isn't honored on Windows Server 2025 |
| LDAP signing | **Domain controller: LDAP server signing requirements** = Require signing |
| LDAP channel binding | **Domain controller: LDAP server channel binding token requirements** = Always |

NTLM audit events go to **Applications and Services Logs\Microsoft\Windows\NTLM\Operational**. **Kerberos armoring (FAST)** protects preauthentication and is enabled by the KDC and client settings *support for claims, compound authentication and Kerberos armoring*.

Stronger methods: **smart cards** or Windows Hello for Business (PKINIT certificate-based Kerberos), Protected Users for admins, gMSA or dMSA for services (no human-managed password).

> **Exam trap.** Always **audit** NTLM before denying it. Going straight to *Deny all* breaks every application or device that still uses NTLM.

<!-- section: key-points -->
## Key points

- One domain password policy (GPO linked to the domain); PSOs for users and global groups, lowest precedence wins.
- Entra Password Protection: proxy plus DC agent on every writable DC, DFSR SYSVOL, restart, audit then enforce.
- Protected Users: no NTLM, no delegation, 4-hour TGT, no cached logon; never for service or computer accounts.
- Harden DCs: Server Core, BitLocker, no browsing, separate patching, RODC where physical security is weak.
- Restrict DC access with user rights, deny rights on lower tiers, and enforced authentication policy silos.
- Empty Enterprise Admins, Schema Admins and operator groups; AdminSDHolder overrides delegated permissions.
- Delegate to groups with the wizard; revoke by editing ACLs.
- Audit NTLM before blocking it; AES-only Kerberos; LDAP signing and channel binding.
