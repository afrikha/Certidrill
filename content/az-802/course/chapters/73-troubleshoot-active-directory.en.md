When Active Directory Domain Services (AD DS) breaks, the exam asks which recovery method fits the damage (Recycle Bin, nonauthoritative or authoritative restore, SYSVOL synchronization) and which tool finds the cause of a symptom (replication errors, a domain controller that can't be located, Kerberos failures, a broken secure channel).

<!-- section: recycle-bin | objectives: 7.3.1 -->
## Restoring objects from the AD Recycle Bin

The Active Directory Recycle Bin restores a deleted object with **all its link-valued and non-link-valued attributes**: a restored user gets back its group memberships, without a backup and without restarting AD DS.

| Fact | Value |
| --- | --- |
| Prerequisite | Forest and domain functional level Windows Server 2008 R2 or higher; Domain Admins of the target domain |
| Default state | Disabled; enabling is **irreversible** |
| Scope | Only objects deleted **after** it was enabled |
| Run the enable against | The DC that holds the **domain naming master** role |
| Deleted object lifetime | `msDS-DeletedObjectLifetime`; when not set, the value of `tombstoneLifetime` (180 days when not set) |

A deleted object stays in the **Deleted Objects** container, restorable with all its attributes, for the deleted object lifetime. It then becomes a recycled object that the Recycle Bin can't restore, and garbage collection (every 12 hours) removes it later.

Enable it in Active Directory Administrative Center (**Enable Recycle Bin** in the **Tasks** pane) or with PowerShell. Restore from the **Deleted Objects** node (**Restore** to the original container, **Restore To** elsewhere) or with `Restore-ADObject`:

```powershell
Enable-ADOptionalFeature -Identity 'Recycle Bin Feature' `
  -Scope ForestOrConfigurationSet -Target 'contoso.com' -Server DC1

Get-ADObject -Filter 'samAccountName -eq "ana"' -IncludeDeletedObjects | Restore-ADObject
```

When an OU was deleted with its content, restore the **parent first**, then its children.

> **Exam trap.** Objects deleted **before** the Recycle Bin was enabled can't be recovered from it. The only way back is an authoritative restore from a backup taken before it was enabled.

<!-- section: dsrm-restore | objectives: 7.3.2 -->
## Recovering the AD DS database with DSRM

The database is `Ntds.dit` in `%SystemRoot%\NTDS`, with its `Edb*.log` transaction logs. To restore it, the DC starts in **Directory Services Restore Mode (DSRM)**: AD DS is offline and you sign in as Administrator with the **DSRM password**.

| Situation | Restore type |
| --- | --- |
| One DC's database is corrupted, the other DCs are healthy | **Nonauthoritative**: restore the system state; replication brings every newer change |
| Objects deleted or changed, and the change replicated everywhere | **Authoritative** for those objects, so that they win over the replicated deletion |
| Deleted objects, Recycle Bin enabled, within the deleted object lifetime | No restore: Recycle Bin |

A restore is **nonauthoritative by default**. An authoritative restore adds an `ntdsutil` step before restarting:

```text
bcdedit /set safeboot dsrepair
shutdown /r /t 0

REM In DSRM: restore the system state without rebooting
wbadmin get versions
wbadmin start systemstaterecovery -version:11/14/2026-21:00

ntdsutil
activate instance ntds
authoritative restore
restore subtree "OU=Sales,DC=contoso,DC=com"
quit
quit

bcdedit /deletevalue safeboot
shutdown /r /t 0
```

`restore object` marks one object, `restore subtree` an object and all its children. Their attribute versions rise by **100,000 per day since the backup**, so they win on every partner (`verinc` overrides that value, only to restore over a previous, incorrect authoritative restore). Ntdsutil also writes an **LDIF file** that restores back-links, such as group memberships held in other domains.

> **Exam trap.** Don't restart in normal mode between the system state restore and the authoritative restore: the deletion replicated from the other DCs would overwrite the restored objects.

A forgotten DSRM password is reset from a running DC: `ntdsutil`, `set dsrm password`, `reset password on server null` (`null` is the local server).

> **Exam tip.** **Restartable AD DS** (stopping the `NTDS` service) is for offline maintenance such as offline defragmentation; a DC in the AD DS Stopped state can't service sign-ins or replicate.

<!-- section: sysvol-recovery | objectives: 7.3.3 -->
## Recovering SYSVOL

A GPO has a **Group Policy container** (an AD object, replicated by AD) and a **Group Policy template** (files under `%SystemRoot%\SYSVOL\Domain\Policies`, replicated by **DFS Replication**). Deleted SYSVOL content replicates like any change, so recovery means choosing which copy wins.

| Situation | Procedure |
| --- | --- |
| One DC has a broken SYSVOL, the others are good | **Nonauthoritative** synchronization of that DC only |
| SYSVOL damaged everywhere, good copy restored on one DC | **Authoritative** synchronization of that DC (preferably the PDC emulator) and nonauthoritative on **all** the others |
| System state restore to the same hardware and OS instance | `wbadmin start systemstaterecovery` with `-authsysvol` |
| Bare metal restore | Set `msDFSR-Options` to 1 after the restore |

The attributes are on `CN=SYSVOL Subscription,CN=Domain System Volume,CN=DFSR-LocalSettings,CN=DC1,OU=Domain Controllers,DC=contoso,DC=com` (ADSI Edit, or the Attribute Editor of Active Directory Users and Computers with **Advanced Features**): `msDFSR-Enabled` (`FALSE` stops SYSVOL replication on the DC) and `msDFSR-Options` (`1` = authoritative).

- **Nonauthoritative**: set `msDFSR-Enabled` to `FALSE`, force AD replication, run `dfsrdiag pollad` (event **4114**); set it back to `TRUE`, force AD replication, run `dfsrdiag pollad` (events **4614** and **4604**).
- **Authoritative**: stop DFSR on **every** DC; on the authoritative DC set `msDFSR-Enabled` to `FALSE` and `msDFSR-Options` to `1`, on the others `msDFSR-Enabled` to `FALSE`; force AD replication; start DFSR on the authoritative DC, set it back to `TRUE`, run `dfsrdiag pollad` (event **4602**); then start DFSR on the others, set `TRUE` and run `dfsrdiag pollad` on each.

> **Exam trap.** Making one DC authoritative without making all the others nonauthoritative creates conflicts. DFS Management and `dfsradmin` can't perform these synchronizations.

<!-- section: replication | objectives: 7.3.4 -->
## Troubleshooting AD replication

Each DC holds at least the domain, configuration and schema partitions; the KCC builds the topology. Replication needs network connectivity, DNS, authentication, time within 5 minutes, a healthy database and a valid topology.

| Tool | Use |
| --- | --- |
| `repadmin /replsummary` | DCs failing inbound or outbound replication: start here |
| `repadmin /showrepl` | Last inbound attempt per partition and partner of one DC, with its error |
| `repadmin /syncall` | Synchronizes a DC with all its partners |
| Active Directory Sites and Services | **Replicate Now** on a connection object |
| `Get-ADReplicationFailure` | The same information as PowerShell objects |

```text
repadmin /replsummary
repadmin /showrepl * /csv > showrepl.csv
repadmin /syncall DC2 /AdeP
```

| Error | Meaning | First check |
| --- | --- | --- |
| 8524 | DNS lookup failure | Source DC's `_msdcs` CNAME or A record, `dcdiag /test:dns`, then `ipconfig /registerdns` and restart Netlogon on the source; or stale metadata of a removed DC |
| 1722 | The RPC server is unavailable | Firewall (TCP 135 and dynamic RPC ports), DNS, NIC; test with `portqry` |
| 8453 | Replication access was denied | **Replicating Directory Changes** permission, non-elevated session; `dcdiag /test:CheckSecurityError` |
| 8614 | Tombstone lifetime exceeded | See the next section |

> **Exam trap.** 1722 and 8524 are reachability problems; 8453 is a permission problem. Opening firewall ports never fixes 8453.

<!-- section: replication-consistency | objectives: 7.3.4 -->
## Lingering objects and USN rollback

A deletion is remembered for the **tombstone lifetime** (180 days in current forests). A DC that misses replication for longer than that can keep objects that the others removed: **lingering objects**.

| Symptom | Meaning | Response |
| --- | --- | --- |
| Error 8614, event **2042** | No replication with this source for longer than the tombstone lifetime; replication stopped | Check for time jumps, remove lingering objects, then temporarily allow replication with the divergent partner |
| Event **2095**, Netlogon paused, `Dsa Not Writable` = 4 | **USN rollback**: an old database copy was put back by an unsupported method (image, copied virtual hard disk, disk snapshot) | Demote and clean up metadata, or restore a supported system state backup |

```text
repadmin /removelingeringobjects DC3 2a1b7c3e-0f45-4d0e-9a8e-0c5d9f1b2e77 "DC=contoso,DC=com" /advisory_mode
repadmin /regkey * +strict
```

`/advisory_mode` only logs; the GUID is the DSA object GUID of a known-good reference DC. **Strict replication consistency** stops destinations from recreating lingering objects. Windows Server 2012 and later detect a Hyper-V **VM-Generation ID** change and reset the invocation ID, which protects virtualized DCs.

> **Exam trap.** Never delete the `Dsa Not Writable` value to revive a rollback DC: it becomes permanently unsupported.

<!-- section: on-premises-ad | objectives: 7.3.5 -->
## Troubleshooting on-premises AD DS

Clients locate DCs through DNS SRV records registered by **Netlogon**. Most "can't find a domain controller" or "can't join the domain" problems are DNS: members and DCs must use DNS servers that resolve the AD zones, never a public resolver.

| Requirement | Tool |
| --- | --- |
| Overall DC health | `dcdiag` |
| DNS registration for AD | `dcdiag /test:dns` |
| Which DC, PDC emulator or GC a client finds | `nltest /dsgetdc:contoso.com` with `/pdc` or `/gc` |
| Re-register a DC's DNS records | `nltest /dsregdns`, or `ipconfig /registerdns` and restart Netlogon |
| Remove a DC that no longer exists | Metadata cleanup: delete its NTDS Settings in Sites and Services, or `ntdsutil` `metadata cleanup` |
| Check the database | `ntdsutil` `semantic database analysis` |

```text
dcdiag /test:DNS /v /e /f:dcdiag-dns.txt
nltest /dsgetdc:contoso.com /pdc /force
net share
```

`net share` on a DC must list **SYSVOL** and **NETLOGON**; otherwise its initial SYSVOL replication isn't finished and Group Policy fails for its clients. When the **PDC emulator** is down, check time synchronization, password updates and GPO editing; if it won't come back, seize the role (`ntdsutil` `roles`).

> **Exam tip.** 8524 errors against a DC that was removed are fixed by metadata cleanup, not by DNS records.

<!-- section: kerberos | objectives: 7.3.6 -->
## Troubleshooting Kerberos and authentication

Kerberos needs clocks within **5 minutes**, correct DNS resolution, and a **service principal name (SPN)** registered on exactly one account.

| Symptom | Cause and fix |
| --- | --- |
| `KRB_AP_ERR_SKEW` | Clock skew over 5 minutes: members sync from DCs, DCs from their PDC emulator, the forest root PDC emulator from an external source |
| `KDC_ERR_S_PRINCIPAL_UNKNOWN` | SPN on no account: `setspn -S` on the service account |
| `KDC_ERR_PRINCIPAL_NOT_UNIQUE` | SPN on several accounts: find it with `setspn -X`, remove the duplicate |
| `KRB_AP_ERR_MODIFIED` | The service can't decrypt the ticket (SPN on the wrong account, DNS name pointing to the wrong server) |
| Access by IP address uses NTLM only | No SPN matches an IP address: use the DNS name |

```powershell
w32tm /query /status
setspn -X
setspn -S HTTP/app1.contoso.com CONTOSO\svc-app1
klist purge
klist -li 0x3e7 purge
```

`klist -li 0x3e7 purge` clears the computer account's tickets, for example after adding the computer to a group.

| Delegation | Configured on | Across domains |
| --- | --- | --- |
| Unconstrained | Front-end; least secure | Supported |
| Kerberos constrained delegation | Front-end lists the back-end SPNs | Not supported |
| Resource-based constrained delegation | Back-end lists the allowed front-ends | Supported |

> **Exam trap.** For a back-end service in another domain or forest, the answer is resource-based constrained delegation. Don't combine it with constrained delegation on the same servers.

<!-- section: secure-channel | objectives: 7.3.7 -->
## Troubleshooting the secure channel and computer account trust

Each member authenticates through a Netlogon **secure channel** with its computer account password, which it changes every **30 days** by default. When the local and AD passwords differ (server reverted to an old checkpoint, account reset in AD, name reused), sign-in fails with "The trust relationship between this workstation and the primary domain failed".

| Need | Tool |
| --- | --- |
| Test a member's channel | `Test-ComputerSecureChannel` |
| Repair it without leaving the domain | `Test-ComputerSecureChannel -Repair -Credential CONTOSO\admin` |
| Reset the computer password | `Reset-ComputerMachinePassword -Server DC1 -Credential CONTOSO\admin` |
| Verify or reset the channel, including on a DC | `nltest /sc_verify:contoso`, `nltest /sc_reset:contoso` |
| Reset a domain controller's machine password | `netdom resetpwd` with the KDC service stopped |

To reset DC2's password: stop the **Kerberos Key Distribution Center** service on DC2 (startup type Manual), purge its tickets, run the command below on DC2, restart DC2, then set the KDC back to Automatic.

```text
netdom resetpwd /s:DC1 /ud:CONTOSO\administrator /pd:*
```

> **Exam trap.** `Test-ComputerSecureChannel` gives false results on domain controllers: use `nltest` or `netdom` there. Rejoining the domain is the last resort, not the first step.

<!-- section: key-points -->
## Key points

- Recycle Bin: 2008 R2 functional level, irreversible, domain naming master, keeps memberships, only for objects deleted after enabling.
- Backup restore = DSRM + system state, nonauthoritative by default; authoritative = `ntdsutil` before restarting.
- SYSVOL: one bad DC = nonauthoritative; authoritative = `msDFSR-Options` 1 (or `-authsysvol`) plus nonauthoritative everywhere else.
- Replication: 8524 = DNS, 1722 = RPC path, 8453 = permissions, 8614 = tombstone lifetime; USN rollback = event 2095.
- Kerberos: 5 minutes, one SPN per account, DNS names. Secure channel: `Test-ComputerSecureChannel -Repair` on members, `nltest` or `netdom` on DCs.
