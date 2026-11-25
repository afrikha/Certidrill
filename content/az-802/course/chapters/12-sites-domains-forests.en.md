A forest can hold several domains, be linked to other forests by trusts, and span several physical locations described as sites. Exam questions give a topology (forests, trusts, sites, subnets, site links) and ask who can access what, which trust or site link to create, or why a change hasn't reached a domain controller yet.

<!-- section: trusts | objectives: 1.2.1 -->
## Configuring domain and forest trusts

A trust has two sides. The **trusting** domain or forest holds the resources; the **trusted** one holds the accounts. If A trusts B, users of B can access resources in A: access goes in the opposite direction of the trust. A two-way trust is two one-way trusts.

| Trust | Created | Between | Transitive | Direction |
| --- | --- | --- | --- | --- |
| Parent-child | Automatically | A child domain and its parent | Yes | Two-way |
| Tree-root | Automatically | The root domain of a new tree and the forest root domain | Yes | Two-way |
| Shortcut | Manually | Two domains of the same forest | Yes | One-way or two-way |
| Forest | Manually | The forest root domains of two forests | Yes, between the domains of the two forests only | One-way or two-way |
| External | Manually | A domain and a domain of another forest | No | One-way or two-way |
| Realm | Manually | A domain and a non-Windows Kerberos realm | No by default, can be made transitive | One-way or two-way |

Inside a forest, every domain trusts every other domain through the transitive parent-child and tree-root trusts. Authentication follows the trust path, up to the common parent and down again; a **shortcut trust** shortens that path between two deep domains whose users often access each other's resources.

A forest trust doesn't extend to a third forest: if Forest1 trusts Forest2 and Forest2 trusts Forest3, Forest1 and Forest3 have no trust. Use an **external trust** when only one domain of the other forest needs access, or when the other side can't take part in a forest trust.

**Creating a forest trust:**

1. Configure name resolution in both directions: DNS conditional forwarders (or secondary zones, or a shared root DNS server) for each forest's namespace.
2. Open **Active Directory Domains and Trusts** on the forest root domain, domain properties > **Trusts** > **New Trust**, choose **Forest trust**, the direction, and the authentication scope.
3. Create both sides at once if you have Enterprise Admins credentials in the other forest; otherwise each side creates its half with the same trust password.
4. Validate the trust.

To create a forest trust you must be a member of Domain Admins of the forest root domain or of Enterprise Admins. Members of **Incoming Forest Trust Builders** can create incoming one-way forest trusts. `netdom trust` can't create a forest trust; use Active Directory Domains and Trusts.

```powershell
# List trusts and check a trust
Get-ADTrust -Filter *
netdom trust contoso.com /domain:fabrikam.com /verify

# Create a two-way trust between two domains (not available for forest trusts)
netdom trust engineering.contoso.com /domain:marketing.contoso.com /add /twoway /usero:admin@engineering.contoso.com /passwordo:* /userd:admin@marketing.contoso.com /passwordd:*
```

**Authentication scope.** On an outgoing forest or external trust you choose between:

| Scope | Effect |
| --- | --- |
| Domain-wide (forest-wide for a forest trust) | Users of the trusted side are authenticated for every resource of the trusting side; permissions still decide access |
| Selective authentication | Users of the trusted side can authenticate to a computer only if they have the **Allowed to authenticate** permission on that computer object |

`netdom trust ... /selectiveauth:yes` sets selective authentication on an existing trust.

**SID filtering** (quarantine) makes the trusting side accept only SIDs of the trusted domain, so a SID planted in `sIDHistory` by the other side is ignored. It is enforced on external and forest trusts. Migrated users who need their old SIDs require `netdom trust ... /enablesidhistory:yes` on a forest trust, only if you trust the other forest's administrators.

**Name suffix routing.** A forest trust records the name suffixes of the other forest (tree names, UPN and SPN suffixes). A suffix that exists in both forests is in conflict; `netdom trust ... /namesuffixes` lists the suffixes and `/togglesuffix` enables or disables one.

> **Exam trap.** The users must sit in the trusted forest and the resources in the trusting forest. "Users of Fabrikam must access a share in Contoso" requires Contoso to trust Fabrikam: an outgoing trust from Contoso, incoming in Fabrikam.

<!-- section: sites | objectives: 1.2.2 -->
## Configuring and managing AD DS sites

A **site** is a set of IP subnets with fast, reliable connectivity between them (Microsoft's guidance: about 10 ms of round-trip latency or less). Sites drive three things: which domain controller a client uses, how replication flows between locations, and the site-aware services such as DFS Namespaces.

| Object | Role |
| --- | --- |
| Site | A location; the first one is `Default-First-Site-Name` |
| Subnet | An IP range associated with one site. A computer belongs to the site of the subnet that contains its IP address |
| Site link | Connects two or more sites that replicate with each other, with a cost, a schedule and an interval |
| Site link bridge | Groups site links to define a transitive path explicitly |
| Server object | A DC in a site; move it when the DC moves |

```powershell
New-ADReplicationSite -Name "Lyon"
New-ADReplicationSubnet -Name "10.20.0.0/16" -Site "Lyon"
New-ADReplicationSiteLink -Name "Paris-Lyon" -SitesIncluded Paris, Lyon `
  -Cost 100 -ReplicationFrequencyInMinutes 60 -InterSiteTransportProtocol IP
Get-ADDomainController -Identity "DC5" | Move-ADDirectoryServer -Site "Lyon"
```

| Site link property | Default | Rule |
| --- | --- | --- |
| Cost | 100 (`DEFAULTIPSITELINK`) | The lowest total cost between two sites wins, for replication and for finding the closest DC in another site |
| Replication interval | 180 minutes | Minimum 15 minutes; a shorter interval lowers latency but increases WAN traffic |
| Schedule | Always available | Replication across several links happens only when their schedules overlap |
| Transport | IP (RPC over IP) | SMTP isn't recommended: SMTP replication won't be supported in future versions of AD DS |

All site links are transitive by default (**Bridge all site links** is enabled on the IP transport). Create site link bridges only when the network isn't fully routed: disable **Bridge all site links**, then bridge the links that can actually route traffic.

Good practice:

- Create a site for every location that has a DC, and a subnet object for every IP range, including VPN, Wi-Fi and Azure ranges. A location without a DC can be attached to the site with the best connection to it.
- When you add a site to a new site link, remove it from `DEFAULTIPSITELINK` if it was there, or the KCC routes by both links.
- Every site must be connected to the others by site links, or the Directory Service log reports that the site topology isn't connected.

A **global catalog** server holds a partial, read-only replica of every domain of the forest; sign-in needs it to resolve universal group memberships. In a site without a global catalog, enable **universal group membership caching** on the site (Active Directory Sites and Services > site > **NTDS Site Settings**): the DC caches the memberships of users who sign in there.

> **Exam trap.** A new subnet range that isn't associated with any site leaves its clients without a site: they may authenticate against a DC in a remote location. When a stem says "users in the new building authenticate to a DC in another city", the fix is a subnet object, not a site link.

<!-- section: replication | objectives: 1.2.3 -->
## Configuring and managing AD DS replication

AD DS uses multimaster replication: every writable DC accepts changes and replicates them to its partners through **connection objects**, which the **Knowledge Consistency Checker (KCC)** creates on every DC.

| | Intrasite | Intersite |
| --- | --- | --- |
| Topology | Bidirectional ring between DCs, with shortcuts in large sites | Spanning tree between sites, built by one DC per site, the **intersite topology generator (ISTG)** |
| Trigger | Change notification: the DC notifies its first partner 15 seconds after a change, then each next partner 3 seconds apart | Schedule and interval of the site link (180 minutes by default) |
| Who replicates | Every DC with its partners | **Bridgehead servers**: the KCC picks them among the DCs of each site that host the partition |
| Traffic | Not compressed | Compressed |

Connection objects created by the KCC appear as `automatically generated`. A manual or modified connection object is no longer managed by the KCC. The KCC also routes around a failed DC by creating temporary connections.

To make intersite replication behave like intrasite replication on a fast WAN link, enable **change notification** on the site link (its `options` attribute set to 1):

```powershell
Set-ADReplicationSiteLink -Identity "Paris-Lyon" -Replace @{'options'=1}
```

What replicates where:

| Partition | Replicated to |
| --- | --- |
| Schema, configuration | Every DC of the forest |
| Domain | Every DC of the domain (in full), every global catalog of the forest (partial attribute set) |
| Application (for example `DomainDnsZones`, `ForestDnsZones`) | The DCs that host it |
| SYSVOL | Every DC of the domain, through DFS Replication (FRS is no longer supported) |

Monitoring and forcing replication:

| Need | Command |
| --- | --- |
| Summary of every DC, largest delta and failures | `repadmin /replsummary` |
| Inbound partners and last result of one DC | `repadmin /showrepl DC1` |
| Replicate one partition now from one partner | `repadmin /replicate DC2 DC1 "DC=corp,DC=contoso,DC=com"` |
| Push all partitions from a DC to all partners, across sites | `repadmin /syncall DC1 /AdeP` |
| Recalculate the topology now | `repadmin /kcc` |
| Pending replication requests | `repadmin /queue` |
| Test replication health | `dcdiag /test:replications` |
| PowerShell equivalents | `Get-ADReplicationFailure`, `Get-ADReplicationPartnerMetadata`, `Get-ADReplicationUpToDatenessVectorTable`, `Sync-ADObject` |

In Active Directory Sites and Services, right-click a connection object > **Replicate Now** pulls changes from that partner.

> **Exam trap.** A change made in Paris reaches Lyon only at the next interval of the site link (180 minutes by default), and only inside its schedule. "Replicate as soon as possible across the WAN" calls for a shorter interval or change notification on the site link, not a new connection object.

<!-- section: key-points -->
## Key points

- Access flows against the trust: the trusting side holds the resources, the trusted side holds the accounts.
- Forest trusts: between forest root domains, transitive inside the two forests only; external trusts: one domain to one domain, not transitive; shortcut trusts shorten a path inside a forest.
- Forest trust prerequisites: DNS resolution both ways, Enterprise Admins (or Domain Admins of the root), Active Directory Domains and Trusts.
- Selective authentication requires **Allowed to authenticate** on each target computer; SID filtering is on for external and forest trusts.
- A site is a set of subnets; clients find their site through subnet objects.
- Site link defaults: cost 100, interval 180 minutes (minimum 15), always available, bridged.
- Intrasite: change notification after 15 seconds; intersite: bridgeheads on the site link schedule, or change notification if enabled.
- `repadmin /replsummary`, `/showrepl`, `/syncall /AdeP`, `/kcc`, and `dcdiag /test:replications`.
