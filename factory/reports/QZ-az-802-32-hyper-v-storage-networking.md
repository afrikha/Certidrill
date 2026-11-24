# QZ-az-802-32-hyper-v-storage-networking — report

File: `content/az-802/quizzes/32-hyper-v-storage-networking.yaml` (10 questions, `az802-qz-32-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 32-hyper-v-storage-networking` → 0 problem(s), 0 warning(s).

## Sources

WebFetch was rate-limited for the whole task (shared hourly limit). Facts were checked against the **source Markdown of the Learn pages**: `MicrosoftDocs/windowsserverdocs` clone in `/tmp/C-az-802-3/wsd` (last commit 2026-11-16), `MicrosoftDocs/windows-powershell-docs` (winserver2025-ps: Hyper-V, NetLbfo) and `MicrosoftDocs/azure-stack-docs` (`azure-local/concepts/host-network-requirements.md`), via raw.githubusercontent.com. Learn URLs derived from file paths and redirection files; titles from the `title:` metadata.

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.1.13 | single | 1 | Private switch (VMs only, no host, no physical network) |
| 2 | 3.1.10 | single | 1 | 3 TB disk → VHDX (VHD limit 2,040 GB) |
| 3 | 3.1.9 | single | 2 | Two-node S2D branch cluster, no other server → cloud witness |
| 4 | 3.1.11 | single | 2 | Egress cap → `-MaximumBandwidth` in bits per second (vs minimum bandwidth weight/absolute, VmqWeight) |
| 5 | 3.1.12 | dropdown | 2 | `Set-VMSwitchTeam -LoadBalancingAlgorithm HyperVPort` for 25-GbE SET members |
| 6 | 3.1.14 | ordering | 3 | Planned failover with PowerShell: Stop-VM, -Prepare, Start-VMFailover, -Reverse, Start-VM |
| 7 | 3.1.9 | multi | 3 | WS2025 upgrade breaks CredSSP live migration; start from a workstation → Kerberos + constrained delegation (cifs + MVSMS) |
| 8 | 3.1.10 | single | 3 | Shared VHDX → VHD Set for Replica and app-consistent checkpoints, offline conversion |
| 9 | 3.1.13 | single | 3 | One NAT network per host: replace it with one NAT whose prefix covers both internal switches |
| 10 | 3.1.14 | multi | 3 | Static IP injection: configure on the replica VM after enabling replication + synthetic adapter required (legacy adapter) |

All 21 mock-exam questions of 3.1.9–3.1.14 (including case-study questions) were read first. Not reused: cluster creation order, processor compatibility, legacy adapter for PXE, VLAN trunk, DHCP guard/port mirroring/spoofing mapping, Optimize-VHD compact, differencing disk command, shrink order, guest teaming, SET creation, SET facts, switch types hotarea, NAT creation command, SR-IOV at creation, Replica certificate auth/firewall, extended replication frequency, unplanned failover order, failover types mapping, Broker for clusters. Q7 tests the same Learn fact as statement e of `az802-3a-ha-lm-statements` (CredSSP breaks after a WS2025 upgrade), but asks for the two configuration actions, which no mock question does.

## Chapter or mock-exam issues against current Learn (not edited)

- **Stale reference title in mock questions**: "Setting Up Hosts for Live Migration Without Failover Clustering" is now titled "Set up hosts for live migration without Failover Clustering" (same URL).
- **Static IP injection, primary vs replica**: "Replicate a virtual machine with Hyper-V Replica" says both "ensure that you set these values on both the primary server and replica server" and "You configure static IP injection on the replica VM after replication is enabled". The chapter only mentions the replica VM. Q10 asks only about the replica side, so the answer holds with either reading.
- **Chapter, VHD Set row**: "supports online resize" — Learn ("Create Hyper-V VHD Set files") says VHD Set files support online resizing of shared virtual disks; fine. The chapter's `-SupportPersistentReservations` for attaching the VHD Set isn't on that page (it's on the `Add-VMHardDiskDrive` reference); not used in the quiz.
- **SET**: Learn (Azure Local host network requirements) now notes that `New-VMSwitch` enables embedded teaming by default when several adapters are listed; the chapter always shows `-EnableEmbeddedTeaming $true`, which is still valid.

## Unverified or weakly sourced

- Q3 distractor c (file share witness hosted on a node): the quorum page doesn't discuss a witness on a cluster node; the explanation reasons from votes (losing HV1 loses two of three votes).
- Q9: the NAT page shows two internal switches sharing one NAT whose prefix covers both (`10.0.0.0/17`, Docker example) and says only one NAT network per host is allowed; the lab scenario applies the same rule to two Hyper-V internal switches.
- Q10: the claim that replacing the legacy adapter **before** enabling replication carries over to the replica comes from the order of operations (the replica VM is created from the primary's configuration at initial replication); not stated on Learn.

## French

- "cmdlet" is still `undecided` in the glossary: the French texts use « commande ».
- « Hyper-V Réplica » kept as in the chapter. "Failover TCP/IP" left in English (Hyper-V Manager label).
