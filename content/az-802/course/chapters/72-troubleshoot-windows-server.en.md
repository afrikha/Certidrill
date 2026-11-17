Troubleshooting questions give a symptom on a named server (an application can't reach SQL1, `nslookup` works but the browser doesn't, updates fail with an error code, Kerberos fails after a clock change, an extension is stuck) and ask which command shows the cause or which fix comes first. Work from the bottom up: interface and IP, routing and firewall, name resolution, then the service itself.

<!-- section: connectivity | objectives: 7.2.1 -->
## Troubleshoot connectivity

| Question | Tool |
| --- | --- |
| Which IP, gateway and DNS servers does the server use? | `Get-NetIPConfiguration`, `ipconfig /all` |
| Is a TCP port reachable on the remote host? | `Test-NetConnection SQL1 -Port 1433` |
| Where does the path stop? | `Test-NetConnection SQL1 -TraceRoute`, `tracert`, `pathping` (loss per hop) |
| Which connections and listening ports exist? | `Get-NetTCPConnection -State Listen`, `netstat -ano` |
| Which route is used? | `Get-NetRoute`, `Find-NetRoute -RemoteIPAddress 10.1.2.3` |
| Is the local firewall blocking? | `Get-NetFirewallRule`, firewall log, `Get-NetFirewallProfile` |
| What really goes on the wire? | `pktmon start --capture`, `netsh trace start capture=yes` |

An address in **169.254.0.0/16** (APIPA) means DHCP failed. `ping` can fail while the service works (ICMP is often blocked): test the port.

For **Azure VMs**:

- Never set a static IP inside the guest: keep DHCP and set the private IP on the network interface in Azure. A wrong guest IP configuration makes the VM unreachable.
- The guest must reach **168.63.129.16** (Azure platform: DHCP, DNS, health probes, VM agent).
- Use **Network Watcher**: **IP flow verify** (which NSG rule allows or denies a 5-tuple), **Next hop** (which route, for example a user-defined route to an appliance), **Connection troubleshoot**, plus the network interface's **Effective security rules** and **Effective routes**.
- Without network access to the guest: **Serial console**, **Run command**, or the VM access extension (**Reset configuration only** resets RDP and firewall settings).

> **Exam trap.** `Test-NetConnection` succeeding on port 3389 from another VM but failing from the internet points to an NSG or a missing public path, not to the guest firewall. Check with IP flow verify before touching the guest.

<!-- section: name-resolution | objectives: 7.2.2 -->
## Troubleshoot name resolution

Windows resolves names in this order: DNS client cache (which contains the **hosts** file entries), then the DNS servers, using the suffix search list, then LLMNR and NetBIOS for single-label names.

```powershell
Resolve-DnsName app1.contoso.com -Server 10.0.0.4      # ask a specific server
Resolve-DnsName app1.contoso.com -DnsOnly               # skip hosts, LLMNR and NetBIOS
Resolve-DnsName _ldap._tcp.dc._msdcs.contoso.com -Type SRV
Get-DnsClientCache; Clear-DnsClientCache                # ipconfig /displaydns, /flushdns
Register-DnsClient                                      # ipconfig /registerdns
Get-DnsClientServerAddress; Get-DnsClientNrptPolicy
```

| Symptom | Likely cause |
| --- | --- |
| `nslookup` returns the right address but applications get another | A **hosts** file entry or a stale client cache (`nslookup` bypasses both) |
| Works by FQDN, fails by short name | DNS suffix search list |
| Works on one DNS server, not another | Zone replication or a missing conditional forwarder |
| Clients can't find a domain controller | Missing SRV records: check with `nltest /dsgetdc:contoso.com` and `dcdiag /test:dns`; restart **Netlogon** on the DC to re-register them |
| Negative answer persists after the record was created | Negative caching: flush the client cache (and the server cache, `Clear-DnsServerCache`) |

Hybrid cases: an Azure VNet that uses **custom DNS servers** gives them to VMs through DHCP, so a VM picks up a change only after a lease renewal or a restart. On-premises servers can't query 168.63.129.16; they resolve Azure private DNS zones through a conditional forwarder to an **Azure DNS Private Resolver inbound endpoint**. A private DNS zone answers only VNets that are **linked** to it.

> **Exam trap.** `nslookup` doesn't use the hosts file or the DNS client cache. If `nslookup` is right and `ping` by name is wrong, look at the hosts file and the cache, not at the DNS server.

<!-- section: windows-update | objectives: 7.2.3 -->
## Troubleshoot Windows Update

Order of checks:

1. Service **Windows Update** (`wuauserv`) running and not disabled (errors `0x8024002E`, `0x80070422`).
2. Network or update source: `0x8024402C`, `0x8024401C`, `0x8024402F` (connectivity); `0x80072EE2` (WSUS unreachable). Check `WUServer` and `WUStatusServer` under `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` (set by the GPO *Specify intranet Microsoft update service location*).
3. `0x80070005` (access denied): permissions on `%WinDir%\SoftwareDistribution`, disk space on C:.
4. Component store corruption: `DISM /Online /Cleanup-Image /RestoreHealth`, then `sfc /scannow` (log `%WinDir%\Logs\CBS\CBS.log`).

```powershell
Get-WindowsUpdateLog                      # merges the ETW traces into WindowsUpdate.log on the desktop
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

**Azure Update Manager** specifics:

| Symptom | Fix |
| --- | --- |
| Arc-enabled server not assessed | Register the subscription to **Microsoft.Compute**; check that the OS update extension is **Succeeded**, otherwise remove it and run an on-demand operation |
| Scheduled patching doesn't run on an Azure VM | Patch orchestration must be **Customer Managed Schedules** (`AutomaticByPlatform` with `ByPassPlatformSafetyChecksOnUserSchedule`) and the VM must be on at least 15 minutes before the window |
| "Maintenance window exceeded" | Window too short: installation needs time left (10 minutes are always kept for reboot) |
| Extension check fails | `AllowExtensionOperations` must be true; TLS 1.2 and HTTPS to the endpoints |

Logs on an Azure VM: `C:\WindowsAzure\Logs\Plugins\Microsoft.CPlat.Core.WindowsPatchExtension<version>\WindowsUpdateExtension.log`.

> **Exam tip.** If updates fail the same way when run locally, the problem is the Windows Update agent or its source (service, WSUS, proxy), not Update Manager. Fix it locally first.

<!-- section: time-service | objectives: 7.2.4 -->
## Troubleshoot the Time service

Kerberos tolerates a **5-minute** clock difference by default (Kerberos policy *Maximum tolerance for computer clock synchronization*). Beyond that, authentication fails.

Domain hierarchy: members sync from a DC of their domain, DCs from the PDC emulator of their domain or a parent domain, and the **PDC emulator of the forest root** domain from a reliable external source.

```powershell
w32tm /query /status            # source, stratum, last sync
w32tm /query /source
w32tm /query /configuration
w32tm /stripchart /computer:dc1.contoso.com /samples:5 /dataonly
w32tm /resync /rediscover

# Forest root PDC emulator: external source
w32tm /config /manualpeerlist:"time.windows.com,0x8" /syncfromflags:manual /reliable:yes /update

# Any other domain computer: back to the domain hierarchy
w32tm /config /syncfromflags:domhier /update
```

| `/query /source` shows | Meaning |
| --- | --- |
| A domain controller | Domain hierarchy (expected on members) |
| `VM IC Time Synchronization Provider` | Time from the Hyper-V or Azure host |
| `Local CMOS Clock` | Not synchronized (no source reachable, or service just started) |
| `time.windows.com` | Default NTP source of a non-domain machine |

Virtual machines: by default, Azure Marketplace Windows images use both the host (**VMICTimeProvider**) and time.windows.com. A virtualized DC, and particularly the PDC emulator, shouldn't follow its host: disable the VMICTimeProvider (`HKLM\SYSTEM\CurrentControlSet\Services\w32time\TimeProviders\VMICTimeProvider`, `Enabled` = 0) so it uses the domain hierarchy or the configured NTP source.

> **Exam trap.** After moving the PDC emulator role, the new PDC emulator must get the external NTP configuration, and the former one must return to `/syncfromflags:domhier`; otherwise the forest has two "reliable" sources or none.

<!-- section: performance | objectives: 7.2.5 -->
## Troubleshoot performance issues

Method: confirm the symptom, find the saturated resource, then the process, then the cause.

| Tool | Use |
| --- | --- |
| Task Manager | Quick view of CPU, memory, disk and network per process |
| Resource Monitor (`resmon`) | Which process uses which file, port or disk queue |
| Performance Monitor and data collector sets | Counters over time, baseline comparison |
| `Get-Process` and `Get-Counter` | Scripted checks, remote servers |
| Performance Diagnostics (PerfInsights) | Azure VMs: continuous diagnostics or on-demand analysis (Quick performance analysis, Performance analysis, Benchmarking, Azure Files analysis, Advanced performance analysis); results in a storage account |

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, Id, CPU, WorkingSet64
```

A process whose **Private Bytes** grows without limit suggests a memory leak. In Azure, a disk that is slow while the guest shows little load is often **throttled**: the VM size has its own IOPS and throughput limits on top of each disk's limits. Fixes: resize the VM, use a faster disk type or tier, enable host caching where supported, or spread data across several disks. A B-series VM that runs out of CPU credits is capped at its baseline.

> **Exam trap.** Adding a faster disk doesn't help if the VM size limit is the bottleneck: compare the VM's uncached limits with the disks' limits before choosing between resizing the VM and changing the disk.

<!-- section: extensions | objectives: 7.2.6 -->
## Troubleshoot VM and Azure Arc extension issues

**Azure VMs** rely on the **Azure VM agent**: services **WindowsAzureGuestAgent** and **RdAgent**. The portal shows the agent **Ready** or **Not ready**.

| Check | Detail |
| --- | --- |
| Agent status Not ready | Services missing, stopped or not Automatic; reinstall the agent MSI or restart the services |
| Platform connectivity | TCP 80 and 32526 to **168.63.129.16** (WireServer) not blocked by a firewall or proxy |
| Agent logs | `C:\WindowsAzure\Logs\WaAppAgent.log`, `TransparentInstaller.log` |
| Extension logs | `C:\WindowsAzure\Logs\Plugins\<extension>\`; settings and status in `C:\Packages\Plugins\<extension>\` |

```powershell
Get-AzVMExtension -ResourceGroupName RG1 -VMName VM1 -Name AzureMonitorWindowsAgent -Status
Remove-AzVMExtension -ResourceGroupName RG1 -VMName VM1 -Name AzureMonitorWindowsAgent
```

**Azure Arc-enabled servers** use the **Connected Machine agent** and its extension manager:

```powershell
azcmagent show                     # connection status and dependent services
azcmagent check                    # tests the network endpoints
azcmagent config list              # mode, allowlist, blocklist
azcmagent logs                     # collects the logs in a zip file
Remove-AzConnectedMachineExtension -Name AzureMonitorWindowsAgent -ResourceGroupName RG1 -MachineName SRV1
```

- An extension that isn't **Succeeded**: remove it, then install it again. Stuck in **Deleting**: delete it with `az connectedmachine extension delete`, then remove its folder under `C:\Packages\Plugins\` if needed.
- Extension manager logs: `%SystemDrive%\ProgramData\GuestConfig\ext_mgr_logs` (`gc_ext.log` shows download and verification errors); per-extension logs under `C:\ProgramData\GuestConfig`.
- Local security controls refuse installs and report a failure to Azure: an **allowlist** (only listed extensions), a **blocklist**, `extensions.enabled false` (extension manager off) or **monitor mode**. They can be changed only on the server itself, and in monitor mode the lists can't be changed until `azcmagent config set config.mode full`.

```powershell
azcmagent config set extensions.allowlist "Microsoft.Azure.Monitor/AzureMonitorWindowsAgent"
azcmagent config set config.mode full
```

> **Exam trap.** If an Arc extension deployment fails on one server only and the policy is correct, run `azcmagent config list` on that server: a local allowlist or blocklist can't be seen or overridden from Azure.

<!-- section: disk-encryption | objectives: 7.2.7 -->
## Troubleshoot disk encryption issues

**BitLocker on Windows Server**:

| Symptom | Cause and fix |
| --- | --- |
| Server boots into BitLocker recovery after a firmware or boot change | The TPM measurements changed: enter the recovery password; next time run `Suspend-BitLocker -RebootCount 1` before the change |
| Recovery password not found in AD DS | Not backed up: GPO *Choose how BitLocker-protected operating system drives can be recovered* with AD DS backup; for existing volumes, `Backup-BitLockerKeyProtector` |
| Can't see recovery passwords in ADUC | Install the **BitLocker Recovery Password Viewer** feature; the user needs read access to the recovery objects |
| Data volume locked after each restart | Enable automatic unlocking: `Enable-BitLockerAutoUnlock` |

```powershell
manage-bde -status
manage-bde -protectors -get C:
manage-bde -unlock D: -RecoveryPassword 123456-123456-123456-123456-123456-123456-123456-123456
$kp = (Get-BitLockerVolume -MountPoint C:).KeyProtector | Where-Object KeyProtectorType -eq "RecoveryPassword"
Backup-BitLockerKeyProtector -MountPoint C: -KeyProtectorId $kp.KeyProtectorId
```

**Azure Disk Encryption (ADE)** uses BitLocker with keys in Azure Key Vault. ADE is **retired on September 15, 2028**: use **encryption at host** for new VMs and migrate existing ones. Common ADE failures:

- Key vault in another **region or subscription** than the VM, or not enabled for disk encryption.
- A domain GPO that **enforces TPM protectors** (ADE uses an external key protector) or blocks AES-CBC.
- The VM can't reach the extension repository, storage or Key Vault endpoints.
- Unsupported VM: Basic or A-series, less than 2 GB of memory, v6 or later series.

ADE doesn't store recovery keys for you, and you must never decrypt an ADE disk with BitLocker directly.

```powershell
Get-AzVMDiskEncryptionStatus -ResourceGroupName RG1 -VMName VM1
```

> **Exam trap.** A planned BIOS update triggers BitLocker recovery unless protection is **suspended** first. Suspending isn't decrypting: the volume stays encrypted and protection resumes after the set number of restarts.

<!-- section: storage | objectives: 7.2.8 -->
## Troubleshoot storage issues

| Symptom | Check and fix |
| --- | --- |
| New disk not visible in File Explorer | Disk offline (SAN policy) or not initialized: `Set-Disk -Number 2 -IsOffline $false`, `-IsReadOnly $false`, then `Initialize-Disk` and create a volume |
| File system errors (NTFS event 55) | `Repair-Volume -DriveLetter E -Scan`, then `-SpotFix` (short offline repair) or `chkdsk E: /f` |
| Storage Spaces virtual disk Degraded or Unhealthy | `Get-PhysicalDisk` (HealthStatus, OperationalStatus), replace the disk, `Repair-VirtualDisk`, follow with `Get-StorageJob` |
| Failing disk still in a pool | `Set-PhysicalDisk -FriendlyName PD3 -Usage Retired`, repair, then `Remove-PhysicalDisk` |
| Storage Spaces Direct cluster warnings | `Debug-StorageSubSystem` on the cluster storage subsystem lists the Health Service faults |
| iSCSI disk gone after restart | Session not persistent: `Connect-IscsiTarget -IsPersistent $true`; check MPIO paths |
| Azure file share won't mount | Outbound **TCP 445** blocked: `Test-NetConnection storacct.file.core.windows.net -Port 445` |
| Azure data disk slow | Disk or VM size throttling (see performance) |

```powershell
Get-Disk | Select-Object Number, FriendlyName, OperationalStatus, IsOffline, IsReadOnly, PartitionStyle
Get-PhysicalDisk | Select-Object FriendlyName, HealthStatus, OperationalStatus, Usage
Get-VirtualDisk | Select-Object FriendlyName, HealthStatus, OperationalStatus
Repair-VirtualDisk -FriendlyName Data1
Get-StorageJob
```

> **Exam trap.** Retire a failing physical disk **before** removing it: the pool then rebuilds the data on the remaining disks while the old one is still readable. Removing it first leaves the virtual disk degraded during the whole rebuild.

<!-- section: key-points -->
## Key points

- Test the port, not ping; APIPA means DHCP failed; in Azure, keep DHCP in the guest and use Network Watcher.
- `nslookup` ignores the hosts file and the cache; Netlogon registers SRV records.
- Windows Update: service, source, permissions, then DISM and sfc; Update Manager needs Customer Managed Schedules.
- Kerberos fails beyond 5 minutes of skew; only the forest root PDC emulator uses an external source.
- Performance: resource, process, cause; in Azure, check VM and disk throttling.
- Extensions: VM agent Ready and 168.63.129.16; Arc: `azcmagent show`, `check`, local allowlist.
- BitLocker: suspend before firmware changes; ADE retires in 2028, use encryption at host.
- Storage: online and initialize disks; retire, then remove, failing pool disks.
