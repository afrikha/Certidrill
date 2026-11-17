Windows Server DNS resolves names for AD DS, for on-premises clients and, through forwarding, for Azure. Exam questions describe zones, servers and a failing lookup, and ask which zone type, replication scope, forwarder, policy or DNSSEC setting fixes it. Most answers follow from where the zone is stored and from the order in which a DNS server tries to resolve a query.

<!-- section: dns-ad-ds | objectives: 4.1.1 -->
## Integrating DNS with AD DS

AD DS depends on DNS: domain controllers register **SRV records** (LDAP, Kerberos, global catalog, PDC) and a GUID-based **CNAME** under `_msdcs.<domain>` that clients and replication partners use to locate them. Install DNS when you promote the first domain controller; the wizard creates the zones and the delegation.

**Active Directory-integrated zones** are stored in AD DS instead of a file. They are available only on DNS servers that are domain controllers, and give:

- Multimaster updates: every domain controller running DNS can write to the zone. No zone transfer topology is needed: AD DS replication carries the zone.
- **Secure dynamic updates**: only the owner of a record (per its ACL) can update it.

| Replication scope (DNS Manager) | `-ReplicationScope` | Partition |
| --- | --- | --- |
| All DNS servers on domain controllers in this forest | `Forest` | ForestDnsZones |
| All DNS servers on domain controllers in this domain | `Domain` | DomainDnsZones |
| All domain controllers in this domain (Windows 2000 compatibility) | `Legacy` | Domain partition |
| All domain controllers in a specified application partition | `Custom` | A partition you create |

```powershell
Add-DnsServerPrimaryZone -Name "corp.contoso.com" -ReplicationScope "Forest" -DynamicUpdate Secure
Set-DnsServerPrimaryZone -Name "corp.contoso.com" -ReplicationScope "Domain"
```

Troubleshoot domain controller registration:

```powershell
dcdiag /test:dns /v /s:DC1
dcdiag /test:dns /v /s:DC1 /DnsDynamicUpdate
net stop netlogon; net start netlogon    # re-registers the DC locator records
ipconfig /flushdns; ipconfig /registerdns  # re-registers the host (A) record
```

Permissions: the **DnsAdmins** group has full control of all zones by default; any authenticated user can create A and PTR records in a zone that allows secure updates, and then becomes their owner.

> **Exam trap.** A zone that must be available on a DNS server that isn't a domain controller can't be Active Directory-integrated: host a secondary zone there. And a secure dynamic update requires an Active Directory-integrated zone.

<!-- section: zones-records | objectives: 4.1.2 -->
## Creating and managing DNS zones and records

| Zone type | Content | Use |
| --- | --- | --- |
| Primary | Writable copy, in a file (`%windir%\System32\Dns\<zone>.dns`) or in AD DS | Where records are created and changed |
| Secondary | Read-only copy obtained by zone transfer; can't be stored in AD DS | Redundancy and local resolution on a non-DC server or another organization's server |
| Stub | Only the SOA, NS and glue A records of a zone, refreshed from its masters | Keep the list of authoritative servers of a delegated or partner zone current, without copying its records |
| Reverse lookup | PTR records under `in-addr.arpa` (IPv4) | Address-to-name lookups |

A server can't host a secondary or stub zone and a primary zone for the same name. Zone transfers are **full** (AXFR) or **incremental** (IXFR); the primary sends a NOTIFY, and the secondary also checks at the SOA refresh interval. Restrict transfers to the servers of the NS records or to a list of servers.

```powershell
Add-DnsServerPrimaryZone -Name "east.contoso.com" -ZoneFile "east.contoso.com.dns"
Add-DnsServerSecondaryZone -Name "south.contoso.com" -ZoneFile "south.contoso.com.dns" -MasterServers 172.23.90.124
Add-DnsServerStubZone -Name "west.contoso.com" -MasterServers 172.23.90.124 -ZoneFile "west.contoso.com.dns"
Add-DnsServerPrimaryZone -NetworkID "10.1.0.0/24" -ReplicationScope "Forest"
Set-DnsServerPrimaryZone -Name "east.contoso.com" -SecureSecondaries TransferToZoneNameServer
Add-DnsServerZoneDelegation -Name "contoso.com" -ChildZoneName "branch" `
  -NameServer "ns1.branch.contoso.com" -IPAddress 172.23.90.136

Add-DnsServerResourceRecordA -ZoneName "contoso.com" -Name "app1" -IPv4Address 10.1.0.20 -CreatePtr
Add-DnsServerResourceRecordCName -ZoneName "contoso.com" -Name "www" -HostNameAlias "app1.contoso.com"
Add-DnsServerResourceRecordMX -ZoneName "contoso.com" -Name "." -MailExchange "mail.contoso.com" -Preference 10
Add-DnsServerResourceRecord -ZoneName "contoso.com" -Srv -Name "_sip._tcp" -DomainName "sip1.contoso.com" `
  -Priority 0 -Weight 0 -Port 5060
```

**Dynamic updates** (`-DynamicUpdate`): `None`, `Secure` (Active Directory-integrated zones only) or `NonsecureAndSecure`. DHCP clients register when they obtain or renew a lease; statically configured clients register their A and PTR records at startup and every 24 hours; `ipconfig /registerdns` forces a registration.

**Aging and scavenging** removes stale dynamic records. Both are off by default and both must be enabled: scavenging on the server, aging on the zone.

| Setting | Default | Meaning |
| --- | --- | --- |
| No-refresh interval | 7 days | After a timestamp is set, refreshes that change nothing are ignored |
| Refresh interval | 7 days | Period during which the record can be refreshed; after no-refresh + refresh with no refresh, the record is stale |
| Static records | Timestamp zero | Never scavenged |

```powershell
Set-DnsServerScavenging -ScavengingState $true -ScavengingInterval 7.00:00:00 -ApplyOnAllZones
Set-DnsServerZoneAging -Name "contoso.com" -Aging $true -NoRefreshInterval 7.00:00:00 -RefreshInterval 7.00:00:00
Start-DnsServerScavenging
```

> **Exam trap.** A stale record is deleted only if scavenging is enabled on the server **and** aging on the zone, and only once no-refresh + refresh has elapsed since its timestamp. A record created by hand is never scavenged.

<!-- section: forwarding | objectives: 4.1.3 -->
## Configuring DNS forwarding and conditional forwarding

For a recursive query, a Windows DNS server answers from its authoritative zones or cache; otherwise it uses, in order:

1. A matching **conditional forwarder** (forwarder zone for one DNS namespace).
2. An applicable **delegation** (iterative queries to the delegated name servers).
3. The server-level **forwarders**, in their active order.
4. **Root hints**, if recursion is enabled, `UseRootHint` is true and the recursion timeout hasn't expired.

| Requirement | Answer |
| --- | --- |
| Send all internet queries to the ISP or a central DNS server | Server-level forwarders |
| Resolve a partner's or another forest's namespace through specific servers | Conditional forwarder |
| Keep the list of a partner zone's name servers current automatically | Stub zone |
| Hold a full read-only copy of another zone | Secondary zone (needs zone transfers) |
| Never fall back to root hints when forwarders fail | `Set-DnsServerForwarder -UseRootHint $false` |

```powershell
Set-DnsServerForwarder -IPAddress 10.0.0.10, 10.0.0.11    # replaces the list
Add-DnsServerForwarder -IPAddress 10.0.0.12                # appends
Set-DnsServerForwarder -UseRootHint $false
Add-DnsServerConditionalForwarderZone -Name "fabrikam.com" -MasterServers 192.168.20.10, 192.168.20.11 `
  -ReplicationScope "Forest"
```

- A conditional forwarder stored in AD DS replicates to the chosen scope; without `-ReplicationScope` it exists only on this server. Create an Active Directory-integrated conditional forwarder on a writable domain controller (not an RODC).
- A conditional forwarder can't exist for a name that the server already hosts as a primary, secondary or stub zone.
- Dynamic forwarder reordering moves slow forwarders to the end of the list and resets to the configured order about every 15 minutes.

> **Exam trap.** Two forests that must resolve each other's names before a forest trust is created: a conditional forwarder for the other forest's root domain on each side, stored in AD DS with forest scope so that every DNS server of the forest has it.

<!-- section: hybrid-dns | objectives: 4.1.4 -->
## Configuring DNS name resolution in a hybrid environment

In Azure, the platform DNS service answers at **168.63.129.16**, only from inside Azure. It resolves Azure host names, public names and the **private DNS zones** linked to the virtual network.

| Scenario | Configuration |
| --- | --- |
| Domain-joined Azure VMs | Virtual network (or NIC) DNS servers = the domain controllers' IP addresses; the domain controllers forward other names to 168.63.129.16 |
| On-premises clients resolve an Azure private DNS zone | On-premises conditional forwarder for the zone, targeting the inbound endpoint of an **Azure DNS Private Resolver** (or a DNS server VM in a linked virtual network) |
| Azure VMs using Azure-provided DNS resolve on-premises names | Private Resolver outbound endpoint + DNS forwarding ruleset (rule `corp.contoso.com.` targeting on-premises DNS servers) linked to the virtual network |
| On-premises clients resolve Azure VM names automatically registered | Private DNS zone with autoregistration, linked to the VMs' virtual network, plus the inbound endpoint path |

Private Resolver rules: inbound and outbound endpoints each need a dedicated subnet (/28 to /24) delegated to `Microsoft.Network/dnsResolvers`; a ruleset holds up to 1,000 rules; network connectivity (VPN or ExpressRoute) is required in both directions.

```powershell
# On-premises DNS server: forward the Azure private zone to the inbound endpoint
Add-DnsServerConditionalForwarderZone -Name "azure.contoso.com" -MasterServers 10.10.0.4 `
  -ReplicationScope "Forest"
# Domain controller in Azure: send everything else to Azure DNS
Set-DnsServerForwarder -IPAddress 168.63.129.16
```

- Changing the DNS servers of a virtual network takes effect on a VM after `ipconfig /renew` or a restart.
- With custom DNS servers on the virtual network, private zones are resolved only if those servers forward to 168.63.129.16 from a linked virtual network.

> **Exam trap.** An on-premises DNS server can't forward to 168.63.129.16: the address answers only inside Azure. Forward to the Private Resolver inbound endpoint or to a DNS server in Azure.

<!-- section: dns-policies | objectives: 4.1.5 -->
## Implementing DNS policies

DNS policies (Windows Server 2016 and later, PowerShell only) answer queries differently by client subnet, interface, protocol, FQDN, query type or time of day. Uses: geo-location traffic management, split-brain DNS, time-of-day redirection, application load balancing, filtering and blocking.

| Object | Role |
| --- | --- |
| Client subnet | Named list of IPv4 or IPv6 subnets used as a criterion |
| Zone scope | A separate set of records inside one zone (for example `www` = 172.21.21.21 in one scope, 172.17.97.97 in another) |
| Recursion scope | A set of recursion settings (enabled or not, forwarders) |

| Policy type | Level | Actions |
| --- | --- | --- |
| Query resolution | Server or zone | Allow (default at zone level, with zone scopes and weights), Deny, Ignore. Server-level policies only Deny or Ignore |
| Recursion | Server only | Selects a recursion scope for matching queries |
| Zone transfer | Server or zone | Deny or Ignore |

Policies at one level are evaluated by **processing order**; the first match applies.

```powershell
# Split-brain: queries on the internal interface 10.0.0.56 get the internal scope and recursion
Add-DnsServerZoneScope -ZoneName "contoso.com" -Name "internal"
Add-DnsServerResourceRecord -ZoneName "contoso.com" -A -Name "www" -IPv4Address 10.0.0.39 -ZoneScope "internal"
Add-DnsServerResourceRecord -ZoneName "contoso.com" -A -Name "www" -IPv4Address 65.55.39.10
Add-DnsServerQueryResolutionPolicy -Name "InternalPolicy" -Action ALLOW `
  -ServerInterfaceIP "EQ,10.0.0.56" -ZoneScope "internal,1" -ZoneName "contoso.com"
Set-DnsServerRecursionScope -Name . -EnableRecursion $false
Add-DnsServerRecursionScope -Name "InternalClients" -EnableRecursion $true
Add-DnsServerQueryResolutionPolicy -Name "SplitBrainRecursionPolicy" -Action ALLOW -ApplyOnRecursion `
  -RecursionScope "InternalClients" -ServerInterfaceIP "EQ,10.0.0.56"

# Geo-location and blocking
Add-DnsServerClientSubnet -Name "EuropeSubnet" -IPv4Subnet "172.17.44.0/24"
Add-DnsServerQueryResolutionPolicy -Name "BlockMalicious" -Action IGNORE -FQDN "EQ,*.contosomalicious.com"
```

> **Exam trap.** In an Active Directory-integrated zone, zone scopes and their records replicate through AD DS, but **policies and client subnets don't**: they are stored on each DNS server. Recreate or export them on every server that must apply them. With secondary servers, create the client subnets, zone scopes and policies on each secondary; the records are then transferred scope by scope.

<!-- section: dnssec | objectives: 4.1.6 -->
## Implementing DNSSEC

DNSSEC signs a zone so that resolvers can validate the origin and integrity of answers and authenticated denial of existence. Signing adds these records:

| Record | Purpose |
| --- | --- |
| RRSIG | Signature of a record set |
| DNSKEY | Public key: zone signing key (ZSK) or key signing key (KSK) |
| NSEC / NSEC3 (+ NSEC3PARAM) | Proof that a name doesn't exist; NSEC3 prevents zone walking. A zone uses one or the other |
| DS | Placed in the **parent** zone to create a secure delegation to the child |

- Sign on the primary, authoritative server with the **Zone Signing Wizard** (DNS Manager > DNSSEC > Sign the Zone: customize, use another zone's parameters, or defaults) or `Invoke-DnsServerZoneSign`.
- The **Key Master** generates the keys and performs ZSK and KSK rollovers (KSK: double signature; ZSK: prepublish). One Key Master per zone. In an Active Directory-integrated zone, private keys replicate to all primary servers, each signs its copy, and the role can be transferred or seized; a file-backed zone has one primary and the role can't move.
- **Trust anchors** (DNSKEY or DS) must be on every non-authoritative DNS server that validates. On domain controllers they are stored in the forest directory partition and can replicate to all domain controllers of the forest; on other servers in `TrustAnchors.dns`.
- Clients require validation through the **Name Resolution Policy Table** (NRPT), deployed by Group Policy: the DNS client then accepts only validated answers for that namespace.

```powershell
Invoke-DnsServerZoneSign -ZoneName "secure.contoso.com" -SignWithDefault -PassThru -Force
Get-DnsServerTrustAnchor -Name "secure.contoso.com"
Reset-DnsServerZoneKeyMasterRole -ZoneName "secure.contoso.com" -KeyMasterServer DNS2 -SeizeRole -Force
Add-DnsClientNrptRule -GpoName "DNSSEC Clients" -Namespace ".secure.contoso.com" -DnsSecEnable `
  -DnsSecValidationRequired
Resolve-DnsName finance.secure.contoso.com -Type A -Server dns1.contoso.com -DnssecOk
```

> **Exam trap.** If the NRPT requires validation and the client's DNS server has no trust anchor for the zone, resolution fails ("Unsecured DNS packet"). Distribute the trust anchor, not a new NRPT rule.

<!-- section: key-points -->
## Key points

- Active Directory-integrated zone = DC only, multimaster, secure updates; scopes Forest, Domain, Legacy, Custom.
- Primary writable, secondary read-only by transfer, stub = NS list only; restrict transfers.
- Scavenging needs server scavenging + zone aging; 7 + 7 days by default; static records are never removed.
- Resolution order: conditional forwarder, delegation, forwarders, root hints (`UseRootHint`).
- Hybrid: domain controllers forward to 168.63.129.16; on-premises forwards to a Private Resolver inbound endpoint; Azure to on-premises with an outbound endpoint and a ruleset.
- DNS policies: client subnets, zone scopes, recursion scopes; not replicated by AD DS.
- DNSSEC: Key Master, trust anchors on validating servers, NRPT on clients, DS in the parent zone.
