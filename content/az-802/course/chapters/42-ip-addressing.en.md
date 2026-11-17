The DHCP Server role of Windows Server leases IPv4 addresses and options to on-premises clients; in Azure, the platform assigns addresses itself. Exam questions give a scope, a few servers and a symptom (no lease, wrong gateway, duplicate address, a client that loses its address when a server fails) and ask which DHCP object or setting to change, or where an address must be configured in a hybrid network.

<!-- section: dhcp-role | objectives: 4.2.1 -->
## Implementing and configuring the DHCP Server role

The server needs a static IPv4 address. In an AD DS domain, a DHCP server must be **authorized** in Active Directory: an unauthorized Windows DHCP server in a domain doesn't lease addresses.

```powershell
Install-WindowsFeature DHCP -IncludeManagementTools
Add-DhcpServerSecurityGroup                       # creates DHCP Administrators and DHCP Users
Add-DhcpServerInDC -DnsName DHCP1.corp.contoso.com -IPAddress 10.0.0.3
Get-DhcpServerInDC
Set-DhcpServerv4Binding -BindingState $true -InterfaceAlias "Ethernet"
```

In a workgroup, there is no authorization step: don't run `Add-DhcpServerInDC`.

**DNS registration by the DHCP server** (`Set-DhcpServerv4DnsSetting`, server or scope level):

| Setting | Effect |
| --- | --- |
| `-DynamicUpdates OnClientRequest` | The server registers what the client requests: a Windows client asks the server for its PTR record and registers its A record itself |
| `-DynamicUpdates Always` | The server registers both A and PTR records |
| `-DynamicUpdates Never` | No registration by the server |
| `-UpdateDnsRRForOlderClients $true` | Registers records for clients that don't send the FQDN option (81) |
| `-DeleteDnsRROnLeaseExpiry $true` | Deletes the records when the lease expires |
| `-NameProtection $true` | Fails the update instead of overwriting an existing record with the same name |

In secure zones, the server that registers a record owns it. Configure all DHCP servers with the same **dedicated user account** (`Set-DhcpServerDnsCredential`) so that a partner server can update the records. Do it also when DHCP runs on a domain controller: otherwise the service uses the domain controller's permissions, which can update or delete any record of a secure zone. Adding DHCP servers to **DnsUpdateProxy** leaves their records unsecured.

Other server-level settings:

- **Conflict detection** (`Set-DhcpServerSetting -ConflictDetectionAttempts 1` to `5`, default 0): the server pings an address before leasing it.
- **Filters**: allow or deny lists of MAC addresses (`Add-DhcpServerv4Filter -List Allow`, then enable the list with `Set-DhcpServerv4FilterList -Allow $true`).
- **Policies**: conditions on MAC address, vendor class, user class, client identifier, FQDN or relay agent information assign an IP range and options to a group of clients.
- **DHCP relay**: broadcasts don't cross routers. Configure the router (`ip helper-address`) or install the **Routing** role service of Remote Access on a server of the remote subnet and add the DHCP Relay Agent.

```powershell
Set-DhcpServerv4DnsSetting -DynamicUpdates "Always" -DeleteDnsRROnLeaseExpiry $true -NameProtection $true
Set-DhcpServerDnsCredential -Credential (Get-Credential) -ComputerName DHCP1
Add-DhcpServerv4Policy -Name "HyperVPolicy" -Condition OR -MacAddress EQ,00155D*
Add-DhcpServerv4PolicyIPRange -ScopeId 10.10.10.0 -Name "HyperVPolicy" -StartRange 10.10.10.10 -EndRange 10.10.10.20
```

> **Exam trap.** A new DHCP server in the domain that hands out nothing, with its service running and an active scope, is usually not authorized. Authorize it; don't reinstall the role.

<!-- section: dhcp-scopes | objectives: 4.2.3 -->
## Creating and managing DHCP scopes

A **scope** is the range of addresses of one subnet that the server can lease, with a subnet mask, a lease duration, exclusions, reservations and options. Each subnet has one scope with one continuous range; to keep addresses for static devices, create **exclusion ranges** inside the range.

```powershell
Add-DhcpServerv4Scope -Name "Paris LAN" -StartRange 10.10.10.1 -EndRange 10.10.10.254 `
  -SubnetMask 255.255.255.0 -LeaseDuration 4.00:00:00 -State Active
Add-DhcpServerv4ExclusionRange -ScopeId 10.10.10.0 -StartRange 10.10.10.1 -EndRange 10.10.10.25
Set-DhcpServerv4OptionValue -ScopeId 10.10.10.0 -Router 10.10.10.1 `
  -DnsServer 10.10.0.10, 10.10.0.11 -DnsDomain "corp.contoso.com"
Set-DhcpServerv4OptionValue -OptionId 6 -Value 10.10.0.10       # server level
Set-DhcpServerv4Scope -ScopeId 10.10.10.0 -State InActive
Get-DhcpServerv4ScopeStatistics
```

| Option | Code |
| --- | --- |
| Router (default gateway) | 003 |
| DNS servers | 006 |
| DNS domain name | 015 |
| WINS servers | 044 |

Options are set at four levels: **server** (all scopes), **scope**, **policy** and **reservation**. A value set at a more specific level overrides the server value for the clients concerned, for example a reservation-level gateway for one device.

| Object | Use |
| --- | --- |
| Superscope | Groups several scopes to serve multiple logical subnets on one physical network (`Add-DhcpServerv4Superscope`) |
| Multicast scope | Leases multicast addresses (class D) |
| Inactive scope | Defined but not answering clients; activate it once it is ready |
| Option 82 sub-option 5 (link selection) | Lets a relay agent request an address from a specific subnet's scope |

Clients renew at **50 %** of the lease (unicast to their server) and rebind at **87.5 %** (broadcast to any server). Short leases suit subnets with many transient devices; changing an option reaches clients only when they renew.

> **Exam trap.** To keep static servers out of DHCP leases, create an exclusion range; to give one device always the same leased address and its own options, create a reservation. A scope range smaller than the subnet doesn't replace exclusions when static addresses sit inside the range.

<!-- section: reservations | objectives: 4.2.4 -->
## Creating IP reservations

A reservation binds an address of a scope to a client identifier, the **MAC address** for IPv4 clients. The device stays a DHCP client: you can change its address or options centrally without signing in to it, but it depends on the DHCP server being available.

```powershell
Add-DhcpServerv4Reservation -ScopeId 10.10.10.0 -IPAddress 10.10.10.30 `
  -ClientId "F0-DE-F1-7A-00-5E" -Description "Printer floor 2"
# Convert an existing lease into a reservation
Get-DhcpServerv4Lease -IPAddress 10.10.10.57 | Add-DhcpServerv4Reservation
# Reservation-level option
Set-DhcpServerv4OptionValue -ReservedIP 10.10.10.30 -Router 10.10.10.254
```

| Rule | Detail |
| --- | --- |
| Address | Must belong to the scope range and be free |
| Type | `DHCP`, `BootP` or `Both` (default `Both`) |
| Bulk creation | `Import-Csv` piped to `Add-DhcpServerv4Reservation` |
| Failover scopes | Replicate the scope after adding a reservation so that the partner knows it |

| Requirement | Answer |
| --- | --- |
| The device needs the same address and is managed from DHCP | Reservation |
| The device must work even when DHCP is down (router, DNS server, DHCP server) | Static address, excluded from the scope |
| Prevent DHCP from leasing addresses used by static devices | Exclusion range |

> **Exam trap.** A reservation is matched on the MAC address. After replacing a printer's network card or moving a VM to a new adapter with another MAC address, the device gets a dynamic address until the reservation is updated.

<!-- section: dhcp-ha | objectives: 4.2.5 -->
## Implementing high availability for DHCP

**DHCP failover** replicates IPv4 scopes and their leases between **two** Windows DHCP servers, both on Windows Server 2016 or later. DHCPv6 scopes can't use failover.

| Mode | Behavior | Settings |
| --- | --- | --- |
| Load balance (default) | Both servers lease addresses; requests are split by a hash of the client MAC address | `-LoadBalancePercent` (default 50) |
| Hot standby | The active server leases; the standby answers only when the active server is unavailable | `-ServerRole Active` or `Standby`; `-ReservePercent` (default 5 %) reserved for the standby |

| Parameter | Default | Meaning |
| --- | --- | --- |
| Maximum client lead time (MCLT) | 1 hour | Lease length granted by a partner that renews a client of the other server, and wait before taking over the whole pool |
| `-AutoStateTransition` / `-StateSwitchInterval` | Off | Move automatically from *communication interrupted* to *partner down* after the interval |
| `-SharedSecret` | None | Authenticates failover messages |

```powershell
Add-DhcpServerv4Failover -ComputerName DHCP1 -Name "DHCP1-DHCP2" -PartnerServer DHCP2 `
  -ScopeId 10.10.10.0, 10.20.20.0 -LoadBalancePercent 70 -MaxClientLeadTime 2:00:00 `
  -SharedSecret "<secret>"
Add-DhcpServerv4Failover -ComputerName DHCP1 -Name "HQ-Branch" -PartnerServer DHCP3 `
  -ScopeId 10.30.30.0 -ServerRole Standby -ReservePercent 10
Set-DhcpServerv4Failover -Name "DHCP1-DHCP2" -LoadBalancePercent 50
Invoke-DhcpServerv4FailoverReplication -ComputerName DHCP1 -Name "DHCP1-DHCP2"
```

Deployment rules:

- Scope changes aren't replicated automatically: run **Replicate scope** or `Invoke-DhcpServerv4FailoverReplication` from the server that has the right settings (it overwrites the partner), preferably the one with the newer operating system.
- Clients must reach both servers: configure the relay agent with **both** server addresses.
- Partners talk over **TCP 647** (firewall rules created with the role) and must have clocks within one minute of each other.
- Both servers must use the same DNS update credentials.
- A DHCP failover cluster counts as one server: use the cluster name or IP address as partner, never a node, and replicate the shared secret to all nodes.
- Use load balance when both servers are at the same site; hot standby when a central server backs up a branch server.

> **Exam trap.** In hot standby, during the MCLT the standby server leases new addresses only from its reserve percentage. A standby that "runs out of addresses" shortly after the active server failed needs a higher `ReservePercent` or a transition to partner down, not a new scope.

<!-- section: troubleshoot-ip | objectives: 4.2.2 -->
## Troubleshooting IP addressing in hybrid environments

A DHCP lease follows **DORA**: Discover and Request are broadcasts from 0.0.0.0, Offer and Acknowledgment come from the server (through a relay agent across subnets).

| Symptom | Likely cause and check |
| --- | --- |
| 169.254.x.y address (APIPA) | No DHCP answer: relay agent missing or wrong, server not authorized, scope inactive or full, service stopped. `ipconfig /all`, `ipconfig /renew` |
| Clients of one subnet only fail | Relay agent of that subnet, or server binding (`Get-DhcpServerv4Binding`) |
| BAD_ADDRESS leases, duplicate address warnings | Static devices inside the range: add exclusions; enable conflict detection (`Get-DhcpServerv4Lease -BadLeases`) |
| Scope exhausted | `Get-DhcpServerv4ScopeStatistics`; shorten the lease, extend the range or add a superscope |
| Wrong gateway or DNS server | Option set at the wrong level, or overridden by a reservation or policy; client renews to receive changes |
| DHCP server doesn't answer at all | Another process on UDP 67/68 (`netstat -anb`), IPsec exemption, DHCP Server log in `%windir%\System32\Dhcp` |

Azure specifics:

| Fact | Consequence |
| --- | --- |
| Azure provides DHCP to Azure VMs; broadcast and multicast aren't supported in a virtual network | A Windows DHCP server can't lease addresses to Azure VMs. It can serve **on-premises** clients through a relay agent, but direct client-to-server traffic (UDP 68 to 67) isn't supported, so renewals at T1 time out and succeed at T2 through the relay |
| Azure reserves five addresses per subnet (network, `.1`, `.2`, `.3`, broadcast) | A static address must be one of the others |
| The private IP of an Azure VM is set on its NIC (dynamic or static) | Never set it manually in Windows; a mismatch cuts the VM off |
| Virtual networks connect to other virtual networks and on-premises networks only if address spaces don't overlap | Plan non-overlapping ranges before a VPN, ExpressRoute or peering; peering is refused when ranges overlap |
| The Azure default gateway doesn't answer ping | Test with `Test-NetConnection` to a VM or use Network Watcher instead |

```powershell
ipconfig /all
ipconfig /release; ipconfig /renew
Get-NetIPConfiguration
Test-NetConnection -ComputerName 10.20.1.4 -Port 3389
Get-DhcpServerv4Lease -ScopeId 10.10.10.0 -BadLeases
```

> **Exam trap.** After a DHCP server moves to an Azure VM, on-premises clients get APIPA addresses when the relay agents still point to the old server address: update every relay agent. A DHCP server in Azure serves on-premises clients only, never the VMs of the virtual network.

<!-- section: key-points -->
## Key points

- In a domain, authorize the DHCP server (`Add-DhcpServerInDC`); otherwise it leases nothing.
- One scope per subnet; exclusions for static devices; options at server, scope, policy or reservation level, the most specific wins.
- Reservation = MAC address to IP address, type Both by default; static addresses for infrastructure servers.
- Failover: two servers, IPv4 only, load balance (50 %) or hot standby (5 % reserve), MCLT 1 hour, TCP 647, manual replication of scope changes, relay to both servers.
- APIPA 169.254.x.y = no DHCP answer; BAD_ADDRESS = conflict with a static device.
- Azure assigns VM addresses itself (set static on the NIC), reserves five addresses per subnet, and requires non-overlapping ranges for hybrid connectivity.
